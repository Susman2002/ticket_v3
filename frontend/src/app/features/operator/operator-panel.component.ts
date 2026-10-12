import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OperatorService } from '../../core/services/operator.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { AuthService } from '../../core/services/auth.service';
import { Ticket, OperatorSession } from '../../core/models/operator.model';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-operator-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-100">
      <!-- Header -->
      <header class="bg-white shadow-sm">
        <div class="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <div class="flex items-center gap-4">
            <a routerLink="/operator" class="text-blue-600 hover:underline text-sm font-medium">
              ← Volver al panel
            </a>
            <div>
              <h1 class="text-xl font-bold text-gray-900">Panel de Atención</h1>
              <p class="text-sm text-gray-500">{{ currentSession()?.window_name }} • {{ currentSession()?.service_name }}</p>
            </div>
          </div>
          <div class="flex items-center gap-4">
            @if (currentSession()) {
              <button
                (click)="endSession()"
                class="px-4 py-2 text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Cerrar sesión
              </button>
            }
          </div>
        </div>
      </header>

      <main class="max-w-4xl mx-auto px-6 py-8">
        @if (!currentTicket()) {
          <!-- No active ticket -->
          <div class="bg-white rounded-lg shadow p-12 text-center">
            <svg class="w-20 h-20 text-gray-300 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <h2 class="text-xl font-semibold text-gray-900 mb-2">No hay turno en atención</h2>
            <p class="text-gray-500 mb-6">Vaya al panel principal y presione "Llamar siguiente" para atender un turno</p>
            <a routerLink="/operator" class="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
              </svg>
              Ir al panel
            </a>
          </div>
        } @else {
          <!-- Active Ticket Card -->
          <div class="bg-white rounded-lg shadow mb-8">
            <div class="p-6 border-b border-gray-200">
              <div class="flex justify-between items-start">
                <div>
                  <p class="text-sm text-gray-500 mb-1">Turno en atención</p>
                  <p class="text-4xl font-bold font-mono text-gray-900">{{ currentTicket()?.display_number }}</p>
                </div>
                <div class="text-right">
                  <span class="px-4 py-2 rounded-full text-lg font-medium" [ngClass]="statusClass()">
                    {{ statusLabel() }}
                  </span>
                </div>
              </div>
              <div class="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p class="text-gray-500">Trámite</p>
                  <p class="font-medium">{{ currentTicket()?.service_name }}</p>
                </div>
                <div>
                  <p class="text-gray-500">Ventanilla</p>
                  <p class="font-medium">{{ currentTicket()?.window_name }}</p>
                </div>
                <div>
                  <p class="text-gray-500">Llamado</p>
                  <p class="font-medium">{{ formatTime(currentTicket()?.called_at) }}</p>
                </div>
                <div>
                  <p class="text-gray-500">{{ currentTicket()?.status === 'in_service' ? 'Iniciado' : 'Estado' }}</p>
                  <p class="font-medium">{{ formatTime(currentTicket()?.started_at) || '—' }}</p>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="bg-white rounded-lg shadow p-6 space-y-4">
              <h3 class="font-semibold text-gray-900">Acciones</h3>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <!-- Iniciar Atención -->
                @if (currentTicket()?.status === 'called') {
                  <button
                    (click)="startService()"
                    [disabled]="actionLoading === 'start'"
                    class="w-full py-3 px-6 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    @if (actionLoading === 'start') {
                      <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white inline" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Iniciando...
                    } @else {
                      <svg class="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                      </svg>
                      Iniciar atención
                    }
                  </button>
                }

                <!-- Completar Atención -->
                @if (currentTicket()?.status === 'in_service') {
                  <button
                    (click)="completeService()"
                    [disabled]="actionLoading === 'complete'"
                    class="w-full py-3 px-6 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    @if (actionLoading === 'complete') {
                      <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white inline" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Completando...
                    } @else {
                      <svg class="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      Completar atención
                    }
                  </button>
                }

                <!-- Cancelar Atención -->
                @if (['waiting', 'called', 'in_service'].includes(currentTicket()?.status || '')) {
                  <button
                    (click)="cancelService()"
                    [disabled]="actionLoading === 'cancel'"
                    class="w-full py-3 px-6 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    @if (actionLoading === 'cancel') {
                      <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white inline" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Cancelando...
                    } @else {
                      <svg class="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                      Cancelar atención
                    }
                  </button>
                }

                <!-- Transferir -->
                @if (['called', 'in_service'].includes(currentTicket()?.status || '')) {
                  <div class="sm:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Transferir a otra ventanilla</label>
                    <div class="flex gap-3">
                      <select
                        [(ngModel)]="targetWindowId"
                        class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      >
                        <option value="">Seleccione ventanilla destino</option>
                        @for (w of availableTargetWindows(); track w.window_id) {
                          <option [value]="w.window_id">{{ w.window_name }} ({{ w.service_name }})</option>
                        }
                      </select>
                      <button
                        (click)="transferTicket()"
                        [disabled]="!targetWindowId || actionLoading === 'transfer'"
                        class="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                      >
                        @if (actionLoading === 'transfer') {
                          <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white inline" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        } @else {
                          Transferir
                        }
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- History / Logs -->
          <div class="bg-white rounded-lg shadow">
            <div class="p-6 border-b border-gray-200">
              <h3 class="font-semibold text-gray-900">Historial del turno</h3>
            </div>
            <div class="divide-y divide-gray-200">
              <div class="p-4">
                <p class="text-sm text-gray-500">Creado</p>
                <p class="font-medium">{{ formatTime(currentTicket()?.created_at) }}</p>
              </div>
              @if (currentTicket()?.called_at) {
                <div class="p-4 bg-blue-50">
                  <p class="text-sm text-blue-700">Llamado - Ventanilla: {{ currentTicket()?.window_name }}</p>
                  <p class="font-medium">{{ formatTime(currentTicket()?.called_at) }}</p>
                </div>
              }
              @if (currentTicket()?.started_at) {
                <div class="p-4 bg-green-50">
                  <p class="text-sm text-green-700">Atención iniciada</p>
                  <p class="font-medium">{{ formatTime(currentTicket()?.started_at) }}</p>
                </div>
              }
              @if (currentTicket()?.completed_at) {
                <div class="p-4 bg-gray-50">
                  <p class="text-sm text-gray-700">Completado</p>
                  <p class="font-medium">{{ formatTime(currentTicket()?.completed_at) }}</p>
                </div>
              }
              @if (currentTicket()?.cancelled_at) {
                <div class="p-4 bg-red-50">
                  <p class="text-sm text-red-700">Cancelado</p>
                  <p class="font-medium">{{ formatTime(currentTicket()?.cancelled_at) }}</p>
                </div>
              }
              @if (currentTicket()?.transferred_at) {
                <div class="p-4 bg-purple-50">
                  <p class="text-sm text-purple-700">Transferido a {{ currentTicket()?.window_name }}</p>
                  <p class="font-medium">{{ formatTime(currentTicket()?.transferred_at) }}</p>
                </div>
              }
            </div>
          </div>
        }
      </main>
    </div>
  `,
  styles: []
})
export class OperatorPanelComponent implements OnInit, OnDestroy {
  private operatorService = inject(OperatorService);
  private ws = inject(WebSocketService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  currentSession = signal<OperatorSession | null>(null);
  currentTicket = signal<Ticket | null>(null);
  targetWindowId: number | null = null;
  actionLoading: 'start' | 'complete' | 'cancel' | 'transfer' | null = null;
  activeSessions = signal<any[]>([]);

  availableTargetWindows = computed(() => {
    const currentServiceId = this.currentSession()?.service_id;
    const currentWindowId = this.currentSession()?.window_id;
    return this.activeSessions().filter(s => 
      s.service_id === currentServiceId && 
      s.window_id !== currentWindowId && 
      s.active
    );
  });

  statusClass = computed(() => {
    const status = this.currentTicket()?.status;
    switch (status) {
      case 'waiting': return 'bg-yellow-100 text-yellow-800';
      case 'called': return 'bg-blue-100 text-blue-800';
      case 'in_service': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'transferred': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  });

  statusLabel = computed(() => {
    const status = this.currentTicket()?.status;
    switch (status) {
      case 'waiting': return 'En espera';
      case 'called': return 'Llamado';
      case 'in_service': return 'En atención';
      case 'completed': return 'Completado';
      case 'cancelled': return 'Cancelado';
      case 'transferred': return 'Transferido';
      default: return status || '';
    }
  });

  ngOnInit(): void {
    this.loadCurrentSession();
    this.setupWebSocket();
    this.loadActiveSessions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCurrentSession(): void {
    this.operatorService.getCurrentSession().subscribe({
      next: (session) => {
        this.currentSession.set(session);
        if (session) this.loadCurrentTicket();
      },
      error: () => this.currentSession.set(null)
    });
  }

  loadCurrentTicket(): void {
    this.operatorService.getCurrentTicket().subscribe({
      next: (ticket) => this.currentTicket.set(ticket),
      error: () => this.currentTicket.set(null)
    });
  }

  loadActiveSessions(): void {
    // We need an endpoint for this - for now we'll mock or skip
    // In real app, add endpoint to get active sessions
  }

  setupWebSocket(): void {
    this.ws.onTicketUpdated.pipe(takeUntil(this.destroy$)).subscribe(event => {
      if (event.data.token === this.currentTicket()?.token) {
        this.currentTicket.set({ ...this.currentTicket()!, ...event.data });
      }
    });

    this.ws.onTicketTransferred.pipe(takeUntil(this.destroy$)).subscribe(event => {
      if (event.data.ticket.token === this.currentTicket()?.token) {
        // Ticket was transferred away
        this.currentTicket.set(null);
        this.currentSession.set(null);
        alert(`Turno transferido a ${event.data.ticket.window_name}`);
        this.router.navigate(['/operator']);
      }
    });

    this.ws.onOperatorSessionEnded.pipe(takeUntil(this.destroy$)).subscribe(event => {
      if (event.data.sessionId === this.currentSession()?.id) {
        this.currentSession.set(null);
        this.currentTicket.set(null);
        this.router.navigate(['/operator']);
      }
    });
  }

  startService(): void {
    if (!this.currentTicket()) return;
    this.actionLoading = 'start';
    this.operatorService.startService({ ticket_id: this.currentTicket()!.id }).subscribe({
      next: (ticket) => {
        this.currentTicket.set(ticket);
        this.actionLoading = null;
      },
      error: (err) => {
        this.actionLoading = null;
        alert(err.error?.error || 'Error al iniciar atención');
      }
    });
  }

  completeService(): void {
    if (!this.currentTicket()) return;
    this.actionLoading = 'complete';
    this.operatorService.completeService({ ticket_id: this.currentTicket()!.id }).subscribe({
      next: (ticket) => {
        this.currentTicket.set(ticket);
        this.actionLoading = null;
      },
      error: (err) => {
        this.actionLoading = null;
        alert(err.error?.error || 'Error al completar atención');
      }
    });
  }

  cancelService(): void {
    if (!this.currentTicket()) return;
    if (!confirm('¿Está seguro de cancelar este turno?')) return;
    
    this.actionLoading = 'cancel';
    this.operatorService.cancelService({ ticket_id: this.currentTicket()!.id }).subscribe({
      next: (ticket) => {
        this.currentTicket.set(ticket);
        this.actionLoading = null;
      },
      error: (err) => {
        this.actionLoading = null;
        alert(err.error?.error || 'Error al cancelar atención');
      }
    });
  }

  transferTicket(): void {
    if (!this.currentTicket() || !this.targetWindowId) return;
    this.actionLoading = 'transfer';
    
    this.operatorService.transferTicket({
      ticket_id: this.currentTicket()!.id,
      target_window_id: this.targetWindowId
    }).subscribe({
      next: (result) => {
        this.currentTicket.set(null);
        this.currentSession.set(null);
        this.actionLoading = null;
        alert(`Turno transferido correctamente`);
        this.router.navigate(['/operator']);
      },
      error: (err) => {
        this.actionLoading = null;
        alert(err.error?.error || 'Error al transferir turno');
      }
    });
  }

  endSession(): void {
    if (!confirm('¿Cerrar sesión de trabajo?')) return;
    this.operatorService.endSession().subscribe({
      next: () => {
        this.currentSession.set(null);
        this.currentTicket.set(null);
        this.router.navigate(['/operator']);
      },
      error: (err) => alert(err.error?.error || 'Error al cerrar sesión')
    });
  }

  formatTime(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString('es-ES', { hour12: false });
  }
}