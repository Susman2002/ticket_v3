import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TicketService } from '../../core/services/ticket.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { QRCurrent, Ticket } from '../../core/models/ticket.model';
import { Subject, takeUntil } from 'rxjs';
import { QRDisplayComponent, TimerCircularComponent, TicketCardComponent, AlertSoundComponent } from '../../shared/components';

@Component({
  selector: 'app-display',
  standalone: true,
  imports: [CommonModule, QRDisplayComponent, TimerCircularComponent, TicketCardComponent, AlertSoundComponent],
  template: `
    <div class="min-h-screen bg-gray-900 text-white">
      <!-- Header -->
      <header class="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div class="max-w-6xl mx-auto flex justify-between items-center">
          <h1 class="text-2xl font-bold">Sala de Espera</h1>
          <div class="text-right">
            <p class="text-sm text-gray-400">Hora actual</p>
            <p class="font-mono text-lg" id="clock"></p>
          </div>
        </div>
      </header>

      <main class="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- QR Code Section -->
        <section class="lg:col-span-1">
          <div class="bg-gray-800 rounded-xl p-6 text-center">
            <h2 class="text-xl font-semibold mb-6">Escanee para tomar turno</h2>
            
            <!-- QR Code with rotation animation -->
            <div class="mb-6">
              <app-qr-display 
                [qrData]="qrUrl()" 
                [size]="280"
                [rotating]="qrRotating()">
              </app-qr-display>
            </div>

            <!-- Circular Timer -->
            <div class="mb-6">
              <app-timer-circular 
                [seconds]="qrTimer()" 
                [totalSeconds]="90">
              </app-timer-circular>
              <p class="text-gray-400 text-sm mt-2">Tiempo para nuevo código QR</p>
            </div>

            <p class="text-gray-500 text-sm break-all">{{ qrUrl() }}</p>
          </div>
        </section>

        <!-- Last Called Tickets -->
        <section class="lg:col-span-2">
          <div class="bg-gray-800 rounded-xl p-6">
            <div class="flex justify-between items-center mb-6">
              <h2 class="text-xl font-semibold">Últimos turnos llamados</h2>
              <span class="bg-blue-600 px-3 py-1 rounded-full text-sm">{{ lastCalled().length }} llamados</span>
            </div>

            @if (lastCalled().length === 0) {
              <div class="text-center py-12 text-gray-500">
                <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p class="text-lg">No hay turnos llamados aún</p>
                <p class="text-sm">Los turnos aparecerán aquí cuando sean llamados</p>
              </div>
            } @else {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                @for (ticket of lastCalled(); track ticket.id; let i = $index) {
                  <app-ticket-card 
                    [ticket]="ticket" 
                    [isNew]="i === 0 && ticketJustCalled()">
                  </app-ticket-card>
                }
              </div>
            }
          </div>
        </section>
      </main>

      <!-- Alert sound -->
      <app-alert-sound [trigger]="soundTrigger()"></app-alert-sound>
    </div>
  `,
  styles: []
})
export class DisplayComponent implements OnInit, OnDestroy {
  private ticketService = inject(TicketService);
  private ws = inject(WebSocketService);
  private destroy$ = new Subject<void>();

  qrData = signal<QRCurrent | null>(null);
  lastCalled = signal<Ticket[]>([]);
  qrTimer = signal(0);
  qrRotating = signal(false);
  ticketJustCalled = signal(false);
  soundTrigger = signal(0);
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private clockInterval: ReturnType<typeof setInterval> | null = null;
  private qrRefreshInProgress = false;

  qrUrl = computed(() => {
    if (!this.qrData()) return '';
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/kiosk/${this.qrData()!.token}`;
  });

  ngOnInit(): void {
    this.loadInitialData();
    this.setupWebSocket();
    this.ws.connect();
    this.startTimer();
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.clockInterval) clearInterval(this.clockInterval);
  }

  loadInitialData(): void {
    this.ticketService.getQRCurrent().subscribe(data => {
      this.qrData.set(data);
      this.qrTimer.set(data.remainingSeconds);
    });

    // Get last called tickets
    this.ticketService.getQueueSummary().subscribe(() => {
      // We'll populate via WebSocket events
    });
  }

  setupWebSocket(): void {
    this.ws.onQRRotated.pipe(takeUntil(this.destroy$)).subscribe(event => {
      this.qrData.set(event.data);
      this.qrTimer.set(event.data.remainingSeconds);
      this.qrRotating.set(true);
      setTimeout(() => this.qrRotating.set(false), 500);
      this.playSound();
    });

    this.ws.onConnected.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.ticketService.getQRCurrent().subscribe(data => {
        this.qrData.set(data);
        this.qrTimer.set(data.remainingSeconds);
      });
    });

    this.ws.onTicketCalled.pipe(takeUntil(this.destroy$)).subscribe(event => {
      this.lastCalled.update(tickets => [event.data, ...tickets].slice(0, 10));
      this.ticketJustCalled.set(true);
      setTimeout(() => this.ticketJustCalled.set(false), 1000);
      this.playSound();
    });

    this.ws.onTicketUpdated.pipe(takeUntil(this.destroy$)).subscribe(event => {
      this.lastCalled.update(tickets =>
        tickets.map(t => t.id === event.data.id ? { ...t, ...event.data } : t)
      );
    });

    this.ws.onTicketTransferred.pipe(takeUntil(this.destroy$)).subscribe(event => {
      this.lastCalled.update(tickets =>
        tickets.map(t => t.id === event.data.ticket.id ? { ...t, ...event.data.ticket } : t)
      );
      this.playSound();
    });
  }

  startTimer(): void {
    this.timerInterval = setInterval(() => {
      this.qrTimer.update(t => {
        if (t <= 1) {
          if (!this.qrRefreshInProgress) {
            this.qrRefreshInProgress = true;
            this.ticketService.getQRCurrent().subscribe({
              next: data => {
                this.qrData.set(data);
                this.qrTimer.set(data.remainingSeconds);
                this.qrRefreshInProgress = false;
              },
              error: () => {
                this.qrRefreshInProgress = false;
              }
            });
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  updateClock(): void {
    const now = new Date();
    const clockEl = document.getElementById('clock');
    if (clockEl) {
      clockEl.textContent = now.toLocaleTimeString('es-ES', { hour12: false });
    }
  }

  playSound(): void {
    this.soundTrigger.update(t => t + 1);
  }
}