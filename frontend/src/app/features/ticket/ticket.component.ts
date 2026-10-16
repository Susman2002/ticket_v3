import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TicketService } from '../../core/services/ticket.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { Ticket } from '../../core/models/ticket.model';
import { Subject, takeUntil } from 'rxjs';
import { StatusBadgeComponent, AlertSoundComponent } from '../../shared/components';

@Component({
  selector: 'app-ticket',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent, AlertSoundComponent],
  template: `
    <div class="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-12">
      <div class="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        @if (loading) {
          <!-- Loading -->
          <div class="text-center py-12">
            <div class="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-6"></div>
            <p class="text-gray-600 text-lg">Cargando su turno...</p>
          </div>
        } @else if (error) {
          <!-- Error -->
          <div class="text-center py-12">
            <div class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg class="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            <h2 class="text-2xl font-bold text-gray-900 mb-3">Turno no encontrado</h2>
            <p class="text-gray-600 mb-8">{{ error }}</p>
            <a routerLink="/kiosk" class="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
              Tomar nuevo turno
            </a>
          </div>
        } @else if (ticket()) {
          <!-- Ticket Info -->
          <div class="text-center">
            <!-- Status Badge -->
            <div class="mb-8">
              <app-status-badge [status]="ticket()!.status"></app-status-badge>
            </div>

            <!-- Ticket Number -->
            <div class="mb-8">
              <p class="text-sm text-gray-500 mb-2 tracking-wide uppercase">NÚMERO DE TURNO</p>
              <p class="text-7xl font-bold font-mono text-gray-900 tracking-widest">{{ ticket()?.display_number }}</p>
            </div>

            <!-- Service Info -->
            <div class="bg-gray-50 rounded-xl p-5 mb-8 text-left border border-gray-200">
              <div class="flex items-center gap-3 mb-3">
                <div class="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                  </svg>
                </div>
                <div>
                  <p class="text-sm text-gray-500">Trámite</p>
                  <p class="font-semibold text-gray-900">{{ ticket()?.service_name }}</p>
                </div>
              </div>
            </div>

            <!-- Window Info (when called/in_service/transferred) -->
            @if (showWindow() && ticket()?.window_name) {
              <div class="mb-8 p-6 rounded-xl border-2" 
                   [class.bg-blue-50]="ticket()?.status === 'called'"
                   [class.border-blue-300]="ticket()?.status === 'called'"
                   [class.bg-green-50]="ticket()?.status === 'in_service'"
                   [class.border-green-300]="ticket()?.status === 'in_service'"
                   [class.bg-purple-50]="ticket()?.status === 'transferred'"
                   [class.border-purple-300]="ticket()?.status === 'transferred'">
                <div class="flex items-center justify-center gap-3 mb-3">
                  <div class="w-12 h-12" [class.bg-blue-100]="ticket()?.status === 'called'" [class.bg-green-100]="ticket()?.status === 'in_service'" [class.bg-purple-100]="ticket()?.status === 'transferred'" class="rounded-xl flex items-center justify-center">
                    <svg class="w-6 h-6" [class.text-blue-600]="ticket()?.status === 'called'" [class.text-green-600]="ticket()?.status === 'in_service'" [class.text-purple-600]="ticket()?.status === 'transferred'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                    </svg>
                  </div>
                  <div class="text-center">
                    <p class="text-sm" [class.text-blue-700]="ticket()?.status === 'called'" [class.text-green-700]="ticket()?.status === 'in_service'" [class.text-purple-700]="ticket()?.status === 'transferred'">
                      {{ ticket()?.status === 'in_service' ? 'Siendo atendido en' : 'Diríjase a la' }}
                    </p>
                    <p class="text-3xl font-bold" [class.text-blue-900]="ticket()?.status === 'called'" [class.text-green-900]="ticket()?.status === 'in_service'" [class.text-purple-900]="ticket()?.status === 'transferred'">
                      {{ ticket()?.window_name }}
                    </p>
                  </div>
                </div>
              </div>
            }

            <!-- Position in queue (when waiting) -->
            @if (ticket()?.status === 'waiting' && position() !== null && position()! > 0) {
              <div class="mb-8 p-6 rounded-xl bg-yellow-50 border-2 border-yellow-200">
                <div class="flex items-center justify-center gap-3 mb-3">
                  <div class="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                    <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm text-yellow-700">Su posición en la cola</p>
                    <p class="text-4xl font-bold text-yellow-800">{{ position() }}°</p>
                  </div>
                </div>
                <p class="text-sm text-yellow-600 text-center">Personas delante: {{ (position() ?? 1) - 1 }}</p>
              </div>
            }

            <!-- Timestamps Grid -->
            <div class="grid grid-cols-2 gap-4 mb-8 text-sm">
              <div class="p-4 bg-gray-50 rounded-xl">
                <p class="text-xs text-gray-400 mb-1">Creado</p>
                <p class="font-semibold text-gray-900">{{ formatTime(ticket()?.created_at) }}</p>
              </div>
              @if (ticket()?.called_at) {
                <div class="p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <p class="text-xs text-blue-700 mb-1">Llamado</p>
                  <p class="font-semibold text-blue-900">{{ formatTime(ticket()?.called_at) }}</p>
                </div>
              }
              @if (ticket()?.started_at) {
                <div class="p-4 bg-green-50 rounded-xl border border-green-200">
                  <p class="text-xs text-green-700 mb-1">Iniciado</p>
                  <p class="font-semibold text-green-900">{{ formatTime(ticket()?.started_at) }}</p>
                </div>
              }
              @if (ticket()?.completed_at) {
                <div class="p-4 bg-gray-50 rounded-xl">
                  <p class="text-xs text-gray-400 mb-1">Completado</p>
                  <p class="font-semibold text-gray-900">{{ formatTime(ticket()?.completed_at) }}</p>
                </div>
              }
              @if (ticket()?.cancelled_at) {
                <div class="p-4 bg-red-50 rounded-xl border border-red-200">
                  <p class="text-xs text-red-700 mb-1">Cancelado</p>
                  <p class="font-semibold text-red-900">{{ formatTime(ticket()?.cancelled_at) }}</p>
                </div>
              }
              @if (ticket()?.transferred_at) {
                <div class="p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <p class="text-xs text-purple-700 mb-1">Transferido</p>
                  <p class="font-semibold text-purple-900">{{ formatTime(ticket()?.transferred_at) }}</p>
                </div>
              }
            </div>

            <!-- Tracking code -->
            <div class="pt-6 border-t border-gray-200">
              <div class="flex items-center justify-between mb-2">
                <p class="text-xs text-gray-500">Código de seguimiento</p>
                <button
                  (click)="copyTrackingCode()"
                  class="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                >
                  Copiar
                </button>
              </div>
              <p class="font-mono text-sm text-gray-700 break-all bg-gray-50 p-3 rounded-lg">{{ ticket()?.token }}</p>
              <p class="text-xs text-gray-500 mt-2 text-center">Comparta este código para consultar el estado</p>
            </div>
          </div>
        }
      </div>

      <app-alert-sound [trigger]="soundTrigger()"></app-alert-sound>
    </div>
  `,
  styles: []
})
export class TicketComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ticketService = inject(TicketService);
  private ws = inject(WebSocketService);
  private destroy$ = new Subject<void>();

  ticket = signal<Ticket | null>(null);
  loading = true;
  error = '';
  private token = '';
  soundTrigger = signal(0);

  position = computed(() => {
    // In a real implementation, you'd fetch queue position
    // For now return a mock position based on ticket number
    return this.ticket()?.number || null;
  });

  showWindow = computed(() => {
    const status = this.ticket()?.status;
    return status === 'called' || status === 'in_service' || status === 'transferred';
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
    this.ws.onTicketCalled.pipe(takeUntil(this.destroy$)).subscribe(event => {
      if (event.data.token === this.token) {
        const current = this.ticket();
        this.ticket.set(current ? { ...current, ...event.data } : event.data);
        if (!current || current.status === 'waiting') {
          this.playSound();
        }
      }
    });

    this.ws.onTicketUpdated.pipe(takeUntil(this.destroy$)).subscribe(event => {
      if (event.data.token === this.token) {
        const wasWaiting = this.ticket()?.status === 'waiting';
        const nowCalled = event.data.status === 'called';
        const nowTransferred = event.data.status === 'transferred';
        
        this.ticket.set({ ...this.ticket()!, ...event.data });
        
        if (wasWaiting && (nowCalled || nowTransferred)) {
          this.playSound();
        }
      }
    });

    this.ws.onTicketTransferred.pipe(takeUntil(this.destroy$)).subscribe(event => {
      if (event.data.ticket.token === this.token) {
        this.ticket.set({ ...this.ticket()!, ...event.data.ticket });
        this.playSound();
      }
    });
  }

  playSound(): void {
    this.soundTrigger.update(t => t + 1);
  }

  copyTrackingCode(): void {
    if (this.ticket()) {
      navigator.clipboard.writeText(this.ticket()!.token).then(() => {
        // Could show a toast here
      });
    }
  }

  formatTime(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString('es-ES', { hour12: false });
  }
}