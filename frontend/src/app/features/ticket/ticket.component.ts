import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { TicketService } from '../../core/services/ticket.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { Ticket } from '../../core/models/ticket.model';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-ticket',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-12">
      <div class="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        @if (loading) {
          <div class="text-center py-8">
            <svg class="animate-spin h-10 w-10 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="text-gray-600">Cargando su turno...</p>
          </div>
        } @else if (error) {
          <div class="text-center py-8">
            <svg class="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            <h2 class="text-xl font-semibold text-gray-900 mb-2">Turno no encontrado</h2>
            <p class="text-gray-600 mb-6">{{ error }}</p>
            <a routerLink="/kiosk" class="text-blue-600 hover:underline">Tomar nuevo turno</a>
          </div>
        } @else if (ticket()) {
          <div class="text-center">
            <!-- Status Badge -->
            <div class="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium mb-6" [ngClass]="statusClass()">
              <span class="mr-2" [class.animate-pulse]="ticket()?.status === 'called'">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  @if (ticket()?.status === 'called') {
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z"></path>
                  } @else if (ticket()?.status === 'in_service') {
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                  } @else if (ticket()?.status === 'completed') {
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                  } @else {
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                  }
                </svg>
              </span>
              {{ statusLabel() }}
            </div>

            <!-- Ticket Number -->
            <div class="mb-6">
              <p class="text-sm text-gray-500 mb-1">NÚMERO DE TURNO</p>
              <p class="text-5xl font-bold font-mono text-gray-900 tracking-wider">{{ ticket()?.display_number }}</p>
            </div>

            <!-- Service Info -->
            <div class="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <p class="text-sm text-gray-600 mb-1">Trámite</p>
              <p class="font-medium text-gray-900">{{ ticket()?.service_name }}</p>
            </div>

            <!-- Window Info (when called/in_service) -->
            @if (showWindow() && ticket()?.window_name) {
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                <div class="flex items-center gap-2 mb-2">
                  <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                  </svg>
                  <p class="font-medium text-blue-900">{{ ticket()?.status === 'in_service' ? 'Siendo atendido en' : 'Diríjase a la' }}</p>
                </div>
                <p class="text-2xl font-bold text-blue-800">{{ ticket()?.window_name }}</p>
              </div>
            }

            <!-- Position in queue (when waiting) -->
            @if (ticket()?.status === 'waiting' && position() !== null) {
              <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
                <p class="text-sm text-yellow-800 mb-1">Su posición en la cola</p>
                <p class="text-3xl font-bold text-yellow-700">{{ position() }}°</p>
                <p class="text-sm text-yellow-600 mt-1">Personas delante: {{ position() - 1 }}</p>
              </div>
            }

            <!-- Timestamps -->
            <div class="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <p class="text-xs text-gray-400">Creado</p>
                <p class="font-medium">{{ formatTime(ticket()?.created_at) }}</p>
              </div>
              @if (ticket()?.called_at) {
                <div>
                  <p class="text-xs text-gray-400">Llamado</p>
                  <p class="font-medium">{{ formatTime(ticket()?.called_at) }}</p>
                </div>
              }
              @if (ticket()?.started_at) {
                <div>
                  <p class="text-xs text-gray-400">Iniciado</p>
                  <p class="font-medium">{{ formatTime(ticket()?.started_at) }}</p>
                </div>
              }
              @if (ticket()?.completed_at) {
                <div>
                  <p class="text-xs text-gray-400">Completado</p>
                  <p class="font-medium">{{ formatTime(ticket()?.completed_at) }}</p>
                </div>
              }
            </div>

            <!-- Tracking code -->
            <div class="mt-6 pt-6 border-t border-gray-200">
              <p class="text-xs text-gray-500 mb-1">Código de seguimiento</p>
              <p class="font-mono text-xs text-gray-700 break-all">{{ ticket()?.token }}</p>
            </div>
          </div>
        }
      </div>

      <audio #alertSound src="assets/alert.mp3" preload="auto"></audio>
    </div>
  `,
  styles: []
})
export class TicketComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private ticketService = inject(TicketService);
  private ws = inject(WebSocketService);
  private destroy$ = new Subject<void>();

  ticket = signal<Ticket | null>(null);
  loading = true;
  error = '';
  private token = '';

  statusClass = computed(() => {
    const status = this.ticket()?.status;
    switch (status) {
      case 'waiting': return 'bg-yellow-100 text-yellow-800';
      case 'called': return 'bg-blue-100 text-blue-800 animate-pulse';
      case 'in_service': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'transferred': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  });

  statusLabel = computed(() => {
    const status = this.ticket()?.status;
    switch (status) {
      case 'waiting': return 'En espera';
      case 'called': return '¡Llamado! Diríjase a la ventanilla';
      case 'in_service': return 'En atención';
      case 'completed': return 'Completado';
      case 'cancelled': return 'Cancelado';
      case 'transferred': return 'Transferido a otra ventanilla';
      default: return status || '';
    }
  });

  showWindow = computed(() => {
    const status = this.ticket()?.status;
    return status === 'called' || status === 'in_service' || status === 'transferred';
  });

  position = computed(() => {
    // This would need queue data - for now return 0
    // In a real implementation, you'd fetch queue position
    return 0;
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.token = params.get('token') || '';
      if (this.token) {
        this.loadTicket();
        this.setupWebSocket();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTicket(): void {
    this.loading = true;
    this.ticketService.getTicket(this.token).subscribe({
      next: (ticket) => {
        this.ticket.set(ticket);
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.error || 'Error al cargar turno';
        this.loading = false;
      }
    });
  }

  setupWebSocket(): void {
    this.ws.onTicketUpdated.pipe(takeUntil(this.destroy$)).subscribe(event => {
      if (event.data.token === this.token) {
        const wasWaiting = this.ticket()?.status === 'waiting';
        const nowCalled = event.data.status === 'called';
        
        this.ticket.set({ ...this.ticket()!, ...event.data });
        
        if (wasWaiting && nowCalled) {
          this.playAlert();
        }
      }
    });

    this.ws.onTicketTransferred.pipe(takeUntil(this.destroy$)).subscribe(event => {
      if (event.data.ticket.token === this.token) {
        this.ticket.set({ ...this.ticket()!, ...event.data.ticket });
        this.playAlert();
      }
    });
  }

  playAlert(): void {
    const audio = new Audio('assets/alert.mp3');
    audio.play().catch(() => {});
  }

  formatTime(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString('es-ES', { hour12: false });
  }
}