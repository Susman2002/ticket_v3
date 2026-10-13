import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OperatorService } from '../../core/services/operator.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { AuthService } from '../../core/services/auth.service';
import { Ticket, OperatorSession } from '../../core/models/operator.model';
import { Subject, takeUntil } from 'rxjs';
import { OperatorHeaderComponent, ActionButtonComponent, TransferModalComponent, SessionStatusComponent } from '../../shared/components';

interface WindowOption {
  window_id: number;
  window_name: string;
  service_name: string;
  operator_username?: string;
}

@Component({
  selector: 'app-operator-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, OperatorHeaderComponent, ActionButtonComponent, TransferModalComponent, SessionStatusComponent],
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

      <main class="max-w-4xl mx-auto px-6 py-8">
        @if (!currentTicket()) {
          <!-- No active ticket -->
          <div class="bg-white rounded-xl shadow-sm p-12 text-center">
            <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h2 class="text-xl font-semibold text-gray-900 mb-2">No hay turno en atención</h2>
            <p class="text-gray-500 mb-6">Vaya al panel principal y presione "Llamar siguiente" para atender un turno</p>
            <app-action-button
              label="Ir al panel"
              variant="primary"
              size="lg"
              icon="arrowRight"
              (onClick)="router.navigate(['/operator'])"
            ></app-action-button>
          </div>
        } @else {
          <!-- Active Ticket Card -->
          <div class="bg-white rounded-xl shadow-sm mb-8">
            <div class="p-6 border-b border-gray-200">
              <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <p class="text-sm text-gray-500 mb-1">Turno en atención</p>
                  <p class="text-4xl font-bold font-mono text-gray-900">{{ currentTicket()?.display_number }}</p>
                </div>
                <div class="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                  <span class="px-4 py-2 rounded-full text-lg font-medium" [ngClass]="statusClass()">
                    {{ statusLabel() }}
                  </span>
                  <div class="text-sm text-gray-500">Ventanilla: {{ currentTicket()?.window_name }}</div>
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
            <div class="bg-white rounded-xl shadow-sm p-6 space-y-4">
              <h3 class="font-semibold text-gray-900">Acciones</h3>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <!-- Iniciar Atención -->
                @if (currentTicket()?.status === 'called') {
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
                @if (['waiting', 'called', 'in_service'].includes(currentTicket()?.status || '')) {
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
                @if (['called', 'in_service'].includes(currentTicket()?.status || '')) {
                  <div class="sm:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Transferir a otra ventanilla</label>
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
                      label="Transferir"
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
            <div class="bg-white rounded-xl shadow-sm mt-6">
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
  auth = inject(AuthService);
  router = inject(Router);
  private destroy$ = new Subject<void>();

  currentSession = signal<OperatorSession | null>(null);
  currentTicket = signal<Ticket | null>(null);
  targetWindowId: number | null = null;
  actionLoading: 'start' | 'complete' | 'cancel' | 'transfer' | null = null;
  activeSessions = signal<any[]>([]);
  transferModalOpen = false;

  transferWindows = computed(() => {
    const currentServiceId = this.currentSession()?.service_id;
    const currentWindowId = this.currentSession()?.window_id;
    return this.activeSessions()
      .filter(s => s.service_id === currentServiceId && s.window_id !== currentWindowId && s.active)
      .map(s => ({
        window_id: s.window_id,
        window_name: s.window_name,
        service_name: s.service_name,
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
      error: (err) => alert(err.error?.error || 'Error al cerrar sesión de trabajo')
    });
  }

  startSessionForm(): void {
    this.router.navigate(['/operator']);
  }

  logout(): void {
    this.auth.logout();
  }

  formatTime(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString('es-ES', { hour12: false });
  }
}