import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { OperatorService } from '../../core/services/operator.service';
import { TicketService } from '../../core/services/ticket.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { OperatorSession, Service, Window, Ticket, QueueSummary } from '../../core/models';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-operator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-100">
      <!-- Header -->
      <header class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 class="text-xl font-bold text-gray-900">Panel de Operador</h1>
            <p class="text-sm text-gray-500">{{ auth.user()?.username }} • {{ auth.user()?.role }}</p>
          </div>
          <div class="flex items-center gap-4">
            @if (currentSession()) {
              <span class="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                Sesión activa: {{ currentSession()?.window_name }} • {{ currentSession()?.service_name }}
              </span>
              <button
                (click)="endSession()"
                class="px-4 py-2 text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Cerrar sesión
              </button>
            } @else {
              <button
                (click)="router.navigate(['/login'])"
                class="px-4 py-2 text-gray-600 hover:text-gray-700 text-sm font-medium"
              >
                Cerrar sesión
              </button>
            }
          </div>
        </div>
      </header>

      <main class="max-w-7xl mx-auto px-6 py-8">
        @if (!currentSession()) {
          <!-- Start Session Form -->
          <div class="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-6">Iniciar sesión de trabajo</h2>
            
            <form (ngSubmit)="startSession()" class="space-y-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Ventanilla</label>
                <select
                  [(ngModel)]="selectedWindowId"
                  name="window_id"
                  required
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">Seleccione una ventanilla</option>
                  @for (w of availableWindows(); track w.id) {
                    <option [value]="w.id">{{ w.name }}</option>
                  }
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Trámite a atender</label>
                <select
                  [(ngModel)]="selectedServiceId"
                  name="service_id"
                  required
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">Seleccione un trámite</option>
                  @for (s of activeServices(); track s.id) {
                    <option [value]="s.id">{{ s.name }} ({{ s.prefix }})</option>
                  }
                </select>
              </div>

              <button
                type="submit"
                [disabled]="!selectedWindowId || !selectedServiceId || loading"
                class="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                @if (loading) {
                  <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white inline" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Iniciando...
                } @else {
                  Iniciar sesión
                }
              </button>

              @if (error) {
                <p class="text-red-600 text-sm text-center">{{ error }}</p>
              }
            </form>
          </div>
        } @else {
          <!-- Active Session Dashboard -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Queue Summary -->
            <section class="lg:col-span-1">
              <div class="bg-white rounded-lg shadow p-6">
                <h3 class="font-semibold text-gray-900 mb-4">Colas de espera</h3>
                <div class="space-y-3">
                  @for (queue of queueSummary(); track queue.service_id) {
                    <div class="p-4 bg-gray-50 rounded-lg border" [class.border-blue-300]="queue.service_id === currentSession()?.service_id">
                      <div class="flex justify-between items-center">
                        <div>
                          <p class="font-medium text-gray-900">{{ queue.name }}</p>
                          <p class="text-sm text-gray-500">{{ queue.prefix }}</p>
                        </div>
                        <div class="text-right">
                          <p class="text-2xl font-bold text-blue-600">{{ queue.waiting_count }}</p>
                          <p class="text-xs text-gray-500">en espera</p>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </section>

            <!-- Current Ticket & Call Next -->
            <section class="lg:col-span-2">
              <div class="bg-white rounded-lg shadow p-6">
                <div class="flex justify-between items-center mb-4">
                  <h3 class="font-semibold text-gray-900">Turno actual</h3>
                  <a routerLink="/operator/panel" class="text-blue-600 hover:underline text-sm">
                    Ver panel de atención →
                  </a>
                </div>

                @if (currentTicket()) {
                  <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div class="flex justify-between items-center">
                      <div>
                        <p class="text-sm text-blue-800">Turno en atención</p>
                        <p class="text-2xl font-bold font-mono text-blue-900">{{ currentTicket()?.display_number }}</p>
                      </div>
                      <span class="px-3 py-1 rounded-full text-sm font-medium" [ngClass]="getStatusClass(currentTicket()?.status)">
                        {{ getStatusLabel(currentTicket()?.status) }}
                      </span>
                    </div>
                  </div>
                } @else {
                  <div class="text-center py-8 text-gray-500">
                    <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <p class="text-lg">No hay turno en atención</p>
                    <p class="text-sm">Presione "Llamar siguiente" para atender</p>
                  </div>
                }

                <div class="flex gap-4">
                  <button
                    (click)="callNext()"
                    [disabled]="callingNext || !currentSession()"
                    class="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    @if (callingNext) {
                      <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white inline" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Llamando...
                    } @else {
                      Llamar siguiente
                    }
                  </button>

                  <button
                    (click)="router.navigate(['/operator/panel'])"
                    class="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    Panel de atención
                  </button>
                </div>
              </div>
            </section>
          </div>

          <!-- Waiting Tickets Detail -->
          <div class="mt-8 bg-white rounded-lg shadow">
            <div class="p-6 border-b border-gray-200">
              <h3 class="font-semibold text-gray-900">Detalle de cola - {{ currentSession()?.service_name }} ({{ currentSession()?.service_prefix }})</h3>
            </div>
            <div class="divide-y divide-gray-200">
              @if (waitingTickets().length === 0) {
                <div class="p-8 text-center text-gray-500">
                  <p>No hay turnos en espera para este trámite</p>
                </div>
              } @else {
                @for (ticket of waitingTickets(); track ticket.id; let i = $index) {
                  <div class="p-4 hover:bg-gray-50 flex justify-between items-center">
                    <div class="flex items-center gap-4">
                      <span class="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-mono font-bold text-gray-700">{{ i + 1 }}</span>
                      <div>
                        <p class="font-medium text-gray-900">{{ ticket.display_number }}</p>
                        <p class="text-sm text-gray-500">Creado: {{ formatTime(ticket.created_at) }}</p>
                      </div>
                    </div>
                    <span class="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">En espera</span>
                  </div>
                }
              }
            </div>
          </div>
        }
      </main>
    </div>
  `,
  styles: []
})
export class OperatorComponent implements OnInit, OnDestroy {
  auth = inject(AuthService);
  router = inject(Router);
  private operatorService = inject(OperatorService);
  private ticketService = inject(TicketService);
  private ws = inject(WebSocketService);
  private destroy$ = new Subject<void>();

  currentSession = signal<OperatorSession | null>(null);
  activeServices = signal<Service[]>([]);
  availableWindows = signal<Window[]>([]);
  queueSummary = signal<QueueSummary[]>([]);
  waitingTickets = signal<Ticket[]>([]);
  currentTicket = signal<Ticket | null>(null);

  selectedWindowId: number | null = null;
  selectedServiceId: number | null = null;
  loading = false;
  error = '';
  callingNext = false;

  ngOnInit(): void {
    this.loadInitialData();
    this.setupWebSocket();
    this.checkCurrentSession();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadInitialData(): void {
    this.ticketService.getServices().subscribe(s => this.activeServices.set(s.filter(x => x.active)));
    this.ticketService.getQueueSummary().subscribe(q => this.queueSummary.set(q));
    this.loadWindows();
  }

  loadWindows(): void {
    this.ticketService.getServices().subscribe(); // dummy to trigger
    // We need a windows endpoint - let's use the admin service or create one
    // For now, we'll fetch from a simple endpoint
  }

  checkCurrentSession(): void {
    this.operatorService.getCurrentSession().subscribe({
      next: (session) => {
        this.currentSession.set(session);
        if (session) {
          this.loadWaitingTickets(session.service_id);
        }
      },
      error: () => this.currentSession.set(null)
    });
  }

  loadWaitingTickets(serviceId: number): void {
    this.ticketService.getQueue(serviceId).subscribe({
      next: (tickets) => this.waitingTickets.set(tickets),
      error: () => this.waitingTickets.set([])
    });
  }

  setupWebSocket(): void {
    this.ws.onTicketCalled.pipe(takeUntil(this.destroy$)).subscribe(event => {
      if (event.data.operator_session_id === this.currentSession()?.id) {
        this.currentTicket.set(event.data);
        this.waitingTickets.update(t => t.filter(x => x.id !== event.data.id));
      }
    });

    this.ws.onTicketUpdated.pipe(takeUntil(this.destroy$)).subscribe(event => {
      if (event.data.operator_session_id === this.currentSession()?.id) {
        this.currentTicket.set(event.data);
      }
      this.waitingTickets.update(tickets =>
        tickets.map(t => t.id === event.data.id ? { ...t, ...event.data } : t)
      );
    });

    this.ws.onOperatorSessionEnded.pipe(takeUntil(this.destroy$)).subscribe(event => {
      if (event.data.sessionId === this.currentSession()?.id) {
        this.currentSession.set(null);
        this.currentTicket.set(null);
        this.waitingTickets.set([]);
      }
    });
  }

  startSession(): void {
    if (!this.selectedWindowId || !this.selectedServiceId) return;
    this.loading = true;
    this.error = '';

    this.operatorService.startSession({
      window_id: this.selectedWindowId,
      service_id: this.selectedServiceId
    }).subscribe({
      next: (session) => {
        this.currentSession.set(session);
        this.loading = false;
        this.loadWaitingTickets(session.service_id);
      },
      error: (err) => {
        this.error = err.error?.error || 'Error al iniciar sesión';
        this.loading = false;
      }
    });
  }

  endSession(): void {
    this.operatorService.endSession().subscribe({
      next: () => {
        this.currentSession.set(null);
        this.currentTicket.set(null);
        this.waitingTickets.set([]);
      },
      error: (err) => alert(err.error?.error || 'Error al cerrar sesión')
    });
  }

  callNext(): void {
    if (!this.currentSession()) return;
    this.callingNext = true;

    this.operatorService.callNext().subscribe({
      next: (ticket) => {
        this.currentTicket.set(ticket);
        this.callingNext = false;
        this.waitingTickets.update(t => t.filter(x => x.id !== ticket.id));
      },
      error: (err) => {
        this.callingNext = false;
        alert(err.error?.error || 'Error al llamar siguiente');
      }
    });
  }

  getStatusClass(status?: string): string {
    switch (status) {
      case 'called': return 'bg-blue-100 text-blue-800';
      case 'in_service': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'transferred': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusLabel(status?: string): string {
    switch (status) {
      case 'waiting': return 'En espera';
      case 'called': return 'Llamado';
      case 'in_service': return 'En atención';
      case 'completed': return 'Completado';
      case 'cancelled': return 'Cancelado';
      case 'transferred': return 'Transferido';
      default: return status || '';
    }
  }

  formatTime(dateStr: string | null): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString('es-ES', { hour12: false });
  }
}