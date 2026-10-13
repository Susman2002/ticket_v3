import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { OperatorService } from '../../core/services/operator.service';
import { TicketService } from '../../core/services/ticket.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { OperatorSession, Service, Window, Ticket, QueueSummary } from '../../core/models';
import { Subject, takeUntil } from 'rxjs';
import { OperatorHeaderComponent, QueueCardComponent, ActionButtonComponent, SessionStatusComponent } from '../../shared/components';

@Component({
  selector: 'app-operator',
  standalone: true,
  imports: [CommonModule, FormsModule, OperatorHeaderComponent, QueueCardComponent, ActionButtonComponent, SessionStatusComponent],
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
          <div id="session-form" class="max-w-2xl mx-auto bg-white rounded-xl shadow-sm p-8">
            <div class="text-center mb-8">
              <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
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
          <!-- Active Session Dashboard -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Queue Summary -->
            <section class="lg:col-span-1">
              <div class="bg-white rounded-xl shadow-sm p-6">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="font-semibold text-gray-900">Colas de espera</h3>
                  <app-session-status [session]="currentSession()"></app-session-status>
                </div>
                <div class="space-y-3">
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
            </section>

            <!-- Current Ticket & Call Next -->
            <section class="lg:col-span-2 space-y-6">
              <!-- Current Ticket Card -->
              <div class="bg-white rounded-xl shadow-sm p-6">
                <div class="flex justify-between items-center mb-4">
                  <h3 class="font-semibold text-gray-900">Turno actual</h3>
                  <a routerLink="/operator/panel" class="text-blue-600 hover:underline text-sm font-medium">
                    Ver panel de atención →
                  </a>
                </div>

                @if (currentTicket()) {
                  <div class="bg-blue-50 border border-blue-200 rounded-xl p-5">
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <p class="text-sm text-blue-800">Turno en atención</p>
                        <p class="text-3xl font-bold font-mono text-blue-900">{{ currentTicket()?.display_number }}</p>
                      </div>
                      <div class="flex items-center gap-3">
                        <span class="px-3 py-1 rounded-full text-sm font-medium" [ngClass]="getStatusClass(currentTicket()?.status)">
                          {{ getStatusLabel(currentTicket()?.status) }}
                        </span>
                        <span class="text-sm text-gray-500">Ventanilla: {{ currentTicket()?.window_name }}</span>
                      </div>
                    </div>
                  </div>
                } @else {
                  <div class="text-center py-10">
                    <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>
                    <p class="text-lg font-medium text-gray-900 mb-1">No hay turno en atención</p>
                    <p class="text-gray-500">Presione "Llamar siguiente" para atender</p>
                  </div>
                }
              </div>

              <!-- Call Next Button -->
              <div class="bg-white rounded-xl shadow-sm p-6">
                <div class="flex flex-col sm:flex-row gap-4">
                  <app-action-button
                    label="Llamar siguiente"
                    variant="primary"
                    size="lg"
                    [loading]="callingNext"
                    [disabled]="!currentSession()"
                    icon="play"
                    class="flex-1"
                    (onClick)="callNext()"
                  ></app-action-button>
                  <app-action-button
                    label="Panel de atención"
                    variant="secondary"
                    size="lg"
                    icon="arrowRight"
                    (onClick)="router.navigate(['/operator/panel'])"
                  ></app-action-button>
                </div>
              </div>
            </section>
          </div>

          <!-- Waiting Tickets Detail -->
          <div class="mt-8 bg-white rounded-xl shadow-sm">
            <div class="p-6 border-b border-gray-200">
              <h3 class="font-semibold text-gray-900">Detalle de cola - {{ currentSession()?.service_name }} ({{ currentSession()?.service_prefix }})</h3>
            </div>
            <div class="divide-y divide-gray-200">
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
                  <div class="p-5 hover:bg-gray-50 flex items-center gap-4 border-b border-gray-100 last:border-0 transition-colors">
                    <div class="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center font-mono font-bold text-blue-700">{{ i + 1 }}</div>
                    <div class="flex-1 min-w-0">
                      <p class="font-medium text-gray-900 truncate">{{ ticket.display_number }}</p>
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