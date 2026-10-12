import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QRCodeModule } from 'angularx-qrcode';
import { environment } from '../../../environments/environment';
import { TicketService } from '../../core/services/ticket.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { QRCurrent, Ticket } from '../../core/models/ticket.model';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-display',
  standalone: true,
  imports: [CommonModule, QRCodeModule],
  template: `
    <div class="min-h-screen bg-gray-900 text-white">
      <!-- Header -->
      <header class="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div class="max-w-6xl mx-auto flex justify-between items-center">
          <h1 class="text-2xl font-bold">Sala de Espera</h1>
          <div class="text-right">
            <p class="text-sm text-gray-400">Última actualización</p>
            <p class="font-mono text-lg" id="clock"></p>
          </div>
        </div>
      </header>

      <main class="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- QR Code Section -->
        <section class="lg:col-span-1">
          <div class="bg-gray-800 rounded-xl p-6 text-center">
            <h2 class="text-xl font-semibold mb-4">Escanee para tomar turno</h2>
            
            <!-- QR Code -->
            <div class="bg-white rounded-lg p-4 inline-block mb-4">
              <qrcode
                [qrdata]="qrUrl()"
                [width]="256"
                [errorCorrectionLevel]="'M'"
                [cssClass]="'qr-code'">
              </qrcode>
            </div>

            <!-- Timer -->
            <div class="mb-4">
              <div class="flex justify-center items-center gap-2 mb-2">
                <svg class="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span class="text-3xl font-mono font-bold text-yellow-300">{{ qrTimer() }}s</span>
              </div>
              <p class="text-gray-400 text-sm">Tiempo para nuevo código QR</p>
            </div>

            <p class="text-gray-500 text-sm">{{ qrUrl() }}</p>
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
                @for (ticket of lastCalled(); track ticket.id) {
                  <div class="bg-gray-700 rounded-lg p-4 border-l-4" [class.border-green-500]="ticket.status === 'completed'" [class.border-yellow-500]="ticket.status === 'in_service'" [class.border-blue-500]="ticket.status === 'called' || ticket.status === 'transferred'">
                    <div class="flex justify-between items-start mb-2">
                      <span class="text-2xl font-bold font-mono text-white">{{ ticket.display_number }}</span>
                      <span class="px-2 py-1 rounded text-xs font-medium" [ngClass]="getStatusClass(ticket.status)">
                        {{ getStatusLabel(ticket.status) }}
                      </span>
                    </div>
                    <div class="text-gray-300 text-sm">
                      <p>{{ ticket.service_name }}</p>
                      <p class="font-medium">Ventanilla: {{ ticket.window_name || '—' }}</p>
                    </div>
                    <div class="mt-2 text-xs text-gray-500">
                      Llamado: {{ formatTime(ticket.called_at) }}
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </section>
      </main>

      <!-- Audio for alerts -->
      <audio #alertSound src="assets/alert.mp3" preload="auto"></audio>
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
  private timerInterval: any;

  qrUrl = computed(() => {
    if (!this.qrData()) return '';
    return `${environment.publicFrontendUrl}/kiosk/${this.qrData()!.token}`;
  });

  ngOnInit(): void {
    this.loadInitialData();
    this.setupWebSocket();
    this.startTimer();
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  loadInitialData(): void {
    this.ticketService.getQRCurrent().subscribe(data => {
      this.qrData.set(data);
      this.qrTimer.set(data.remainingSeconds);
    });

    this.ticketService.getQueueSummary().subscribe(summary => {
      // Get last called from each service
      this.ticketService.getQueueSummary().subscribe(() => {});
    });

    // Get called tickets
    this.ticketService.getQueueSummary().subscribe(() => {});
    // We'll use getCalledTickets equivalent via queue summary
    // For now, let's get all tickets and filter
    // Actually we need a specific endpoint - let's use the ticket service to get called
  }

  setupWebSocket(): void {
    this.ws.onQRRotated.pipe(takeUntil(this.destroy$)).subscribe(event => {
      this.qrData.set(event.data);
      this.qrTimer.set(event.data.remainingSeconds);
      this.playAlert();
    });

    this.ws.onTicketCalled.pipe(takeUntil(this.destroy$)).subscribe(event => {
      this.lastCalled.update(tickets => [event.data, ...tickets].slice(0, 10));
      this.playAlert();
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
      this.playAlert();
    });
  }

  startTimer(): void {
    this.timerInterval = setInterval(() => {
      this.qrTimer.update(t => Math.max(0, t - 1));
      if (this.qrTimer() === 0) {
        // Will be updated by QR_ROTATED event
      }
    }, 1000);
  }

  updateClock(): void {
    const now = new Date();
    const clockEl = document.getElementById('clock');
    if (clockEl) {
      clockEl.textContent = now.toLocaleTimeString('es-ES', { hour12: false });
    }
  }

  playAlert(): void {
    const audio = new Audio('assets/alert.mp3');
    audio.play().catch(() => {}); // Ignore autoplay policy errors
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'called': return 'bg-blue-100 text-blue-800';
      case 'in_service': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'transferred': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'waiting': return 'En espera';
      case 'called': return 'Llamado';
      case 'in_service': return 'En atención';
      case 'completed': return 'Completado';
      case 'cancelled': return 'Cancelado';
      case 'transferred': return 'Transferido';
      default: return status;
    }
  }

  formatTime(dateStr: string | null): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString('es-ES', { hour12: false });
  }
}