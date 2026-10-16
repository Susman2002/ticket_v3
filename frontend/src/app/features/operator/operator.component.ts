import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { OperatorService } from '../../core/services/operator.service';
import { TicketService } from '../../core/services/ticket.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { OperatorSession, Service, Window, Ticket, QueueSummary, ActiveSession } from '../../core/models';
import { Subject, takeUntil } from 'rxjs';
import { OperatorHeaderComponent, QueueCardComponent, ActionButtonComponent, SessionStatusComponent, TransferModalComponent, WindowOption } from '../../shared/components';

@Component({
  selector: 'app-operator',
  standalone: true,
  imports: [CommonModule, FormsModule, OperatorHeaderComponent, QueueCardComponent, ActionButtonComponent, SessionStatusComponent, TransferModalComponent],
  template: `
    <div class="min-h-screen bg-gray-100">
      <!-- Header -->
      <app-operator-header
        [session]="currentSession()"
        [username]="auth.user()?.username || ''"
        [role]="auth.user()?.role || ''"
        (onEndSession)="endSession()"
        (onLogout)="logout()"
        (onStartSession)="startSessionForm()"
      ></app-operator-header>

      <main class="max-w-7xl mx-auto px-6 py-8">
        @if (!currentSession()) {
          <!-- Start Session Form -->
          <div id="session-form" class="max-w-2xl mx-auto bg-white rounded-xl border border-gray-200 shadow-sm p-8">
            <div class="text-center mb-8">
              <div class="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                </svg>
              </div>
              <h2 class="text-2xl font-bold text-gray-900">Iniciar sesión de trabajo</h2>
              <p class="text-gray-600 mt-1">Seleccione su ventanilla y el trámite a atender</p>
            </div>
            
            @if (error) {
              <div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {{ error }}
              </div>
            }

            <form (ngSubmit)="startSession()" class="space-y-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Ventanilla</label>
                <select
                  [(ngModel)]="selectedWindowId"
                  name="window_id"
                  required
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">Seleccione una ventanilla</option>
                  @for (w of availableWindows(); track w.id) {
                    <option [value]="w.id">{{ w.name }}</option>
                  }
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Trámite a atender</label>
                <select
                  [(ngModel)]="selectedServiceId"
                  name="service_id"
                  required
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">Seleccione un trámite</option>
                  @for (s of activeServices(); track s.id) {
                    <option [value]="s.id">{{ s.name }} ({{ s.prefix }})</option>
                  }
                </select>
              </div>

              <app-action-button
                type="submit"
                label="Iniciar sesión"
                variant="primary"
                size="lg"
                [loading]="loading"
                [disabled]="!selectedWindowId || !selectedServiceId"
                icon="play"
              ></app-action-button>
            </form>
          </div>
        } @else {
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Left: Session info + Queues -->
            <aside class="lg:col-span-1 space-y-6">
              <div class="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide">Mi sesión</h3>
                  <app-session-status [session]="currentSession()"></app-session-status>
                </div>
                <div class="p-5 space-y-4">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                      <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                      </svg>
                    </div>
                    <div class="min-w-0">
                      <p class="text-xs text-gray-500">Ventanilla</p>
                      <p class="font-semibold text-gray-900 truncate">{{ currentSession()?.window_name }}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
                      <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                      </svg>
                    </div>
                    <div class="min-w-0">
                      <p class="text-xs text-gray-500">Trámite</p>
                      <p class="font-semibold text-gray-900 truncate">{{ currentSession()?.service_name }} ({{ currentSession()?.service_prefix }})</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                      <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>
                    <div class="min-w-0">
                      <p class="text-xs text-gray-500">Sesión iniciada</p>
                      <p class="font-semibold text-gray-900">{{ formatTime(currentSession()?.started_at) }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div class="px-5 py-4 border-b border-gray-100">
                  <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide">Colas de espera</h3>
                </div>
                <div class="p-5 space-y-3">
                  @for (queue of queueSummary(); track queue.service_id) {
                    <app-queue-card 
                      [queue]="queue" 
                      [isActive]="queue.service_id === currentSession()?.service_id">
                    </app-queue-card>
                  }
                  @if (queueSummary().length === 0) {
                    <div class="text-center py-8 text-gray-500">
                      <p>No hay trámites configurados</p>
                    </div>
                  }
                </div>
              </div>
            </aside>

            <!-- Right: Current Ticket & Actions -->
            <section class="lg:col-span-2 space-y-6">
              <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide">Turno actual</h3>
                  @if (currentTicket()) {
                    <span class="px-3 py-1 rounded-full text-sm font-medium" [ngClass]="statusClass()">
                      {{ statusLabel() }}
                    </span>
                  }
                </div>

                @if (currentTicket()) {
                  <div class="p-6">
                    <div class="flex flex-col sm:flex-row sm:items-center gap-6">
                      <div class="flex-1">
                        <p class="text-5xl font-bold font-mono text-gray-900 tracking-wider">{{ currentTicket()?.display_number }}</p>
                        <p class="text-gray-500 mt-2">{{ currentTicket()?.service_name }}</p>
                      </div>
                      <div class="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                        <div>
                          <p class="text-gray-500">Ventanilla</p>
                          <p class="font-medium">{{ currentTicket()?.window_name }}</p>
                        </div>
                        <div>
                          <p class="text-gray-500">Llamado</p>
                          <p class="font-medium">{{ formatTime(currentTicket()?.called_at) }}</p>
                        </div>
                        <div>
                          <p class="text-gray-500">Iniciado</p>
                          <p class="font-medium">{{ formatTime(currentTicket()?.started_at) }}</p>
                        </div>
                        <div>
                          <p class="text-gray-500">Creado</p>
                          <p class="font-medium">{{ formatTime(currentTicket()?.created_at) }}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                } @else {
                  <div class="p-12 text-center">
                    <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>
                    <p class="text-lg font-medium text-gray-900 mb-1">No hay turno en atención</p>
                    <p class="text-gray-500">Presione "Llamar siguiente" para atender</p>
                  </div>
                }

                @if (currentTicket()) {
                  <!-- Actions -->
                  <div class="p-6 border-t border-gray-100">
                    <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Acciones</h3>
                    
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <!-- Iniciar Atención -->
                      @if (['called', 'transferred'].includes(currentTicket()?.status || '')) {
                        <app-action-button
                          label="Iniciar atención"
                          variant="success"
                          size="lg"
                          [loading]="actionLoading === 'start'"
                          icon="play"
                          (onClick)="startService()"
                        ></app-action-button>
                      }

                      <!-- Completar Atención -->
                      @if (currentTicket()?.status === 'in_service') {
                        <app-action-button
                          label="Completar atención"
                          variant="primary"
                          size="lg"
                          [loading]="actionLoading === 'complete'"
                          icon="check"
                          (onClick)="completeService()"
                        ></app-action-button>
                      }

                      <!-- Cancelar Atención -->
                      @if (['waiting', 'called', 'in_service', 'transferred'].includes(currentTicket()?.status || '')) {
                        <app-action-button
                          label="Cancelar atención"
                          variant="danger"
                          size="lg"
                          [loading]="actionLoading === 'cancel'"
                          icon="x"
                          (onClick)="confirmCancel()"
                        ></app-action-button>
                      }

                      <!-- Transferir -->
                      @if (['called', 'in_service', 'transferred'].includes(currentTicket()?.status || '')) {
                        <div class="sm:col-span-2">
                          <app-transfer-modal
                            [isOpen]="transferModalOpen"
                            [ticketDisplayNumber]="currentTicket()?.display_number || ''"
                            [ticketServiceName]="currentTicket()?.service_name || ''"
                            [availableWindows]="transferWindows()"
                            [loading]="actionLoading === 'transfer'"
                            (close)="closeTransferModal()"
                            (confirm)="confirmTransfer($event)"
                          ></app-transfer-modal>
                          <app-action-button
                            label="Transferir a otra ventanilla"
                            variant="info"
                            size="lg"
                            [loading]="actionLoading === 'transfer'"
                            icon="door"
                            (onClick)="openTransferModal()"
                          ></app-action-button>
                        </div>
                      }
                    </div>
                  </div>

                  <!-- History / Logs -->
                  <div class="border-t border-gray-100 bg-gray-50/60">
                    <div class="px-6 py-4">
                      <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide">Historial del turno</h3>
                    </div>
                    <div class="px-6 pb-6 space-y-2">
                      <div class="flex items-center justify-between bg-white rounded-lg border border-gray-100 px-4 py-3">
                        <p class="text-sm text-gray-600">Creado</p>
                        <p class="text-sm font-medium text-gray-900">{{ formatTime(currentTicket()?.created_at) }}</p>
                      </div>
                      @if (currentTicket()?.called_at) {
                        <div class="flex items-center justify-between bg-blue-50 rounded-lg border border-blue-100 px-4 py-3">
                          <p class="text-sm text-blue-700">Llamado - Ventanilla: {{ currentTicket()?.window_name }}</p>
                          <p class="text-sm font-medium text-blue-900">{{ formatTime(currentTicket()?.called_at) }}</p>
                        </div>
                      }
                      @if (currentTicket()?.started_at) {
                        <div class="flex items-center justify-between bg-green-50 rounded-lg border border-green-100 px-4 py-3">
                          <p class="text-sm text-green-700">Atención iniciada</p>
                          <p class="text-sm font-medium text-green-900">{{ formatTime(currentTicket()?.started_at) }}</p>
                        </div>
                      }
                      @if (currentTicket()?.completed_at) {
                        <div class="flex items-center justify-between bg-white rounded-lg border border-gray-100 px-4 py-3">
                          <p class="text-sm text-gray-600">Completado</p>
                          <p class="text-sm font-medium text-gray-900">{{ formatTime(currentTicket()?.completed_at) }}</p>
                        </div>
                      }
                      @if (currentTicket()?.cancelled_at) {
                        <div class="flex items-center justify-between bg-red-50 rounded-lg border border-red-100 px-4 py-3">
                          <p class="text-sm text-red-700">Cancelado</p>
                          <p class="text-sm font-medium text-red-900">{{ formatTime(currentTicket()?.cancelled_at) }}</p>
                        </div>
                      }
                      @if (currentTicket()?.transferred_at) {
                        <div class="flex items-center justify-between bg-purple-50 rounded-lg border border-purple-100 px-4 py-3">
                          <p class="text-sm text-purple-700">Transferido a {{ currentTicket()?.window_name }}</p>
                          <p class="text-sm font-medium text-purple-900">{{ formatTime(currentTicket()?.transferred_at) }}</p>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>

              <!-- Call Next Button -->
              <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div class="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div class="flex-1">
                    <h3 class="font-semibold text-gray-900">Llamar siguiente</h3>
                    <p class="text-sm text-gray-500">
                      {{ hasActiveTicket() ? 'Complete, cancele o transfiera el turno actual para continuar' : 'Se llamará el primer turno en espera de ' + (currentSession()?.service_name || '') }}
                    </p>
                  </div>
                  <app-action-button
                    label="Llamar siguiente"
                    variant="primary"
                    size="lg"
                    [loading]="callingNext"
                    [disabled]="!canCallNext()"
                    [tooltip]="hasActiveTicket() ? 'Complete, cancele o transfiera el turno actual para llamar al siguiente' : ''"
                    icon="play"
                    (onClick)="callNext()"
                  ></app-action-button>
                </div>
              </div>
            </section>
          </div>

          <!-- Waiting Tickets Detail -->
          <div class="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide">Turnos en espera — {{ currentSession()?.service_name }} ({{ currentSession()?.service_prefix }})</h3>
              <span class="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">{{ waitingTickets().length }}</span>
            </div>
            <div class="divide-y divide-gray-100">
              @if (waitingTickets().length === 0) {
                <div class="p-10 text-center text-gray-500">
                  <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <p class="text-lg">No hay turnos en espera</p>
                  <p class="text-sm text-gray-400 mt-1">Los turnos aparecerán aquí cuando los ciudadanos los saquen</p>
                </div>
              } @else {
                @for (ticket of waitingTickets(); track ticket.id; let i = $index) {
                  <div class="px-6 py-4 hover:bg-gray-50 flex items-center gap-4 transition-colors">
                    <div class="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center font-mono font-bold text-blue-700">{{ i + 1 }}</div>
                    <div class="flex-1 min-w-0">
                      <p class="font-semibold text-gray-900 truncate">{{ ticket.display_number }}</p>
                      <p class="text-sm text-gray-500">Creado: {{ formatTime(ticket.created_at) }}</p>
                    </div>
                    <span class="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full whitespace-nowrap">En espera</span>
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

  activeSessions = signal<ActiveSession[]>([]);
  actionLoading: 'start' | 'complete' | 'cancel' | 'transfer' | null = null;
  transferModalOpen = false;

  transferWindows = computed<WindowOption[]>(() => {
    const currentServiceId = this.currentSession()?.service_id;
    const currentWindowId = this.currentSession()?.window_id;
    return this.activeSessions()
      .filter(s => s.service_id === currentServiceId && s.window_id !== currentWindowId && s.active)
      .map(s => ({
        window_id: s.window_id,
        window_name: s.window_name || '',
        service_name: s.service_name || '',
        operator_username: s.username
      }));
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

  hasActiveTicket = computed(() => ['called', 'in_service'].includes(this.currentTicket()?.status || ''));

  canCallNext = computed(() => !!this.currentSession() && !this.hasActiveTicket());

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
    this.ticketService.getWindows().subscribe({
      next: (windows) => this.availableWindows.set(windows.filter(w => w.active)),
      error: () => this.availableWindows.set([])
    });
  }

  checkCurrentSession(): void {
    this.operatorService.getCurrentSession().subscribe({
      next: (session) => {
        this.currentSession.set(session);
        if (session) {
          this.loadWaitingTickets(session.service_id);
          this.loadCurrentTicket();
          this.loadActiveSessions();
        }
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

  loadWaitingTickets(serviceId: number): void {
    this.ticketService.getQueue(serviceId).subscribe({
      next: (tickets) => this.waitingTickets.set(tickets),
      error: () => this.waitingTickets.set([])
    });
  }

  loadActiveSessions(): void {
    this.operatorService.getActiveSessions().subscribe({
      next: (sessions) => this.activeSessions.set(sessions),
      error: () => this.activeSessions.set([])
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

    this.ws.onTicketTransferred.pipe(takeUntil(this.destroy$)).subscribe(event => {
      const ticket = event.data.ticket;
      if (this.currentTicket() && ticket.token === this.currentTicket()!.token) {
        // Ticket was transferred away: keep session, clear current ticket
        this.currentTicket.set(null);
        alert(`Turno transferido a ${ticket.window_name}`);
        const session = this.currentSession();
        if (session) this.loadWaitingTickets(session.service_id);
        this.loadActiveSessions();
      } else if (ticket.operator_session_id === this.currentSession()?.id) {
        // Ticket transferred to this session
        this.currentTicket.set(ticket);
        const session = this.currentSession();
        if (session) this.loadWaitingTickets(session.service_id);
      }
    });

    this.ws.onOperatorSessionStarted.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadActiveSessions();
    });

    this.ws.onOperatorSessionEnded.pipe(takeUntil(this.destroy$)).subscribe(event => {
      if (event.data.sessionId === this.currentSession()?.id) {
        this.currentSession.set(null);
        this.currentTicket.set(null);
        this.waitingTickets.set([]);
      }
      this.loadActiveSessions();
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
        this.loadActiveSessions();
        // Reset form
        this.selectedWindowId = null;
        this.selectedServiceId = null;
      },
      error: (err) => {
        this.error = err.error?.error || 'Error al iniciar sesión';
        this.loading = false;
      }
    });
  }

  endSession(): void {
    if (!confirm('¿Cerrar sesión de trabajo?')) return;
    this.operatorService.endSession().subscribe({
      next: () => {
        this.currentSession.set(null);
        this.currentTicket.set(null);
        this.waitingTickets.set([]);
        this.activeSessions.set([]);
      },
      error: (err) => alert(err.error?.error || 'Error al cerrar sesión de trabajo')
    });
  }

  logout(): void {
    this.auth.logout();
  }

  startSessionForm(): void {
    const formElement = document.getElementById('session-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
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

  confirmCancel(): void {
    if (!this.currentTicket()) return;
    if (!confirm('¿Está seguro de cancelar este turno?')) return;
    this.cancelService();
  }

  cancelService(): void {
    if (!this.currentTicket()) return;
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

  openTransferModal(): void {
    this.transferModalOpen = true;
  }

  closeTransferModal(): void {
    this.transferModalOpen = false;
  }

  confirmTransfer(windowId: number): void {
    if (!this.currentTicket()) return;
    this.actionLoading = 'transfer';
    this.transferModalOpen = false;
    
    this.operatorService.transferTicket({
      ticket_id: this.currentTicket()!.id,
      target_window_id: windowId
    }).subscribe({
      next: () => {
        this.currentTicket.set(null);
        this.actionLoading = null;
        alert(`Turno transferido correctamente`);
        const session = this.currentSession();
        if (session) this.loadWaitingTickets(session.service_id);
        this.loadActiveSessions();
      },
      error: (err) => {
        this.actionLoading = null;
        alert(err.error?.error || 'Error al transferir turno');
      }
    });
  }

  formatTime(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString('es-ES', { hour12: false });
  }
}
