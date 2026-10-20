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
<div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 text-slate-900">
  <!-- Header -->
  <app-operator-header
    [session]="currentSession()"
    [username]="auth.user()?.username || ''"
    [role]="auth.user()?.role || ''"
    (onEndSession)="endSession()"
    (onLogout)="logout()"
    (onStartSession)="startSessionForm()"
  ></app-operator-header>

  <!-- Modal -->
  <app-transfer-modal
    [isOpen]="transferModalOpen"
    [ticketDisplayNumber]="currentTicket()?.display_number || ''"
    [ticketServiceName]="currentTicket()?.service_name || ''"
    [availableWindows]="transferWindows()"
    [loading]="actionLoading === 'transfer'"
    (close)="closeTransferModal()"
    (confirm)="confirmTransfer($event)"
  ></app-transfer-modal>

  <main class="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
    @if (!currentSession()) {
      <!-- ============ START SESSION ============ -->
      <div id="session-form" class="grid lg:grid-cols-5 gap-8 lg:gap-14 items-center max-w-6xl mx-auto py-6 lg:py-10">
        <!-- Left: branding + features -->
        <div class="hidden lg:block lg:col-span-2 space-y-7">
          <span class="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold ring-1 ring-inset ring-indigo-200">
            <span class="relative flex w-1.5 h-1.5">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
            </span>
            Módulo de operador
          </span>

          <h1 class="text-4xl xl:text-5xl font-bold tracking-tight leading-[1.1] text-slate-900">
            Inicia tu
            <span class="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">turno de atención</span>
          </h1>

          <p class="text-slate-600 leading-relaxed">
            Configura tu ventanilla y trámite para comenzar a llamar a los ciudadanos en espera.
          </p>

          <ul class="space-y-4 pt-2">
            <li class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <div>
                <p class="font-semibold text-slate-900 text-sm">Cola inteligente</p>
                <p class="text-xs text-slate-500 mt-0.5">Los turnos se ordenan automáticamente por prioridad</p>
              </div>
            </li>
            <li class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
              </div>
              <div>
                <p class="font-semibold text-slate-900 text-sm">Tiempo real</p>
                <p class="text-xs text-slate-500 mt-0.5">Sincronización instantánea vía WebSocket</p>
              </div>
            </li>
            <li class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center flex-shrink-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
                </svg>
              </div>
              <div>
                <p class="font-semibold text-slate-900 text-sm">Transferencias</p>
                <p class="text-xs text-slate-500 mt-0.5">Deriva turnos a otras ventanillas activas</p>
              </div>
            </li>
          </ul>
        </div>

        <!-- Right: form card -->
        <div class="lg:col-span-3">
          <div class="bg-white rounded-3xl border border-slate-200 shadow-2xl shadow-indigo-100/60 overflow-hidden">
            <div class="px-6 sm:px-8 pt-8 pb-6 border-b border-slate-100 bg-gradient-to-br from-indigo-50/70 via-white to-white">
              <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/30 flex items-center justify-center flex-shrink-0">
                  <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                  </svg>
                </div>
                <div>
                  <h2 class="text-lg sm:text-xl font-semibold tracking-tight text-slate-900">Iniciar sesión de trabajo</h2>
                  <p class="text-xs sm:text-sm text-slate-500 mt-0.5">Selecciona tu ventanilla y trámite</p>
                </div>
              </div>
            </div>

            <form (ngSubmit)="startSession()" class="p-6 sm:p-8 space-y-6">
              @if (error) {
                <div class="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
                  <svg class="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.74-3L13.74 4a2 2 0 00-3.48 0L3.33 16a2 2 0 001.74 3z"/>
                  </svg>
                  <span>{{ error }}</span>
                </div>
              }

              <div class="space-y-2">
                <label class="block text-sm font-semibold text-slate-700">Ventanilla</label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                    </svg>
                  </div>
                  <select
                    [(ngModel)]="selectedWindowId"
                    name="window_id"
                    required
                    class="w-full pl-12 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium appearance-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition cursor-pointer"
                  >
                    <option value="">Seleccione una ventanilla</option>
                    @for (w of availableWindows(); track w.id) {
                      <option [value]="w.id">{{ w.name }}</option>
                    }
                  </select>
                  <div class="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                  </div>
                </div>
              </div>

              <div class="space-y-2">
                <label class="block text-sm font-semibold text-slate-700">Trámite a atender</label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                    </svg>
                  </div>
                  <select
                    [(ngModel)]="selectedServiceId"
                    name="service_id"
                    required
                    class="w-full pl-12 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium appearance-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition cursor-pointer"
                  >
                    <option value="">Seleccione un trámite</option>
                    @for (s of activeServices(); track s.id) {
                      <option [value]="s.id">{{ s.name }} ({{ s.prefix }})</option>
                    }
                  </select>
                  <div class="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                  </div>
                </div>
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
        </div>
      </div>
    } @else {
      <!-- ============ DASHBOARD ============ -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

        <!-- ===== Sidebar ===== -->
        <aside class="lg:col-span-4 xl:col-span-3 space-y-5">

          <!-- Mi sesión -->
          <div class="relative bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400"></div>

            <div class="px-5 py-4 flex items-center justify-between border-b border-slate-100">
              <div class="flex items-center gap-2">
                <span class="relative flex w-2 h-2">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mi sesión</h3>
              </div>
              <app-session-status [session]="currentSession()"></app-session-status>
            </div>

            <div class="p-5 space-y-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center shrink-0">
                  <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                  </svg>
                </div>
                <div class="min-w-0">
                  <p class="text-xs text-slate-500 font-medium">Ventanilla</p>
                  <p class="font-semibold text-slate-900 truncate">{{ currentSession()?.window_name }}</p>
                </div>
              </div>

              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center shrink-0">
                  <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                  </svg>
                </div>
                <div class="min-w-0">
                  <p class="text-xs text-slate-500 font-medium">Trámite</p>
                  <p class="font-semibold text-slate-900 truncate">
                    {{ currentSession()?.service_name }}
                    <span class="text-slate-400 font-normal">({{ currentSession()?.service_prefix }})</span>
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center shrink-0">
                  <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div class="min-w-0">
                  <p class="text-xs text-slate-500 font-medium">Sesión iniciada</p>
                  <p class="font-semibold text-slate-900 font-mono">{{ formatTime(currentSession()?.started_at) }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Colas -->
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="px-5 py-4 border-b border-slate-100">
              <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Colas de espera</h3>
            </div>
            <div class="p-4 space-y-2.5">
              @for (queue of queueSummary(); track queue.service_id) {
                <app-queue-card
                  [queue]="queue"
                  [isActive]="queue.service_id === currentSession()?.service_id">
                </app-queue-card>
              }
              @if (queueSummary().length === 0) {
                <div class="text-center py-8 text-sm text-slate-400">
                  No hay trámites configurados
                </div>
              }
            </div>
          </div>
        </aside>

        <!-- ===== Main ===== -->
        <section class="lg:col-span-8 xl:col-span-9 space-y-6">

          <!-- Turno actual -->
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="px-6 py-4 flex items-center justify-between border-b border-slate-100">
              <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Turno actual</h3>
              @if (currentTicket()) {
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" [ngClass]="statusClass()">
                  <span class="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
                  {{ statusLabel() }}
                </span>
              }
            </div>

            @if (currentTicket()) {
              <!-- Dark hero -->
              <div class="relative overflow-hidden px-6 sm:px-8 py-8 sm:py-10 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-900">
                <div class="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -mr-40 -mt-40 pointer-events-none"></div>
                <div class="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none"></div>

                <div class="relative flex flex-col sm:flex-row sm:items-center gap-8">
                  <div class="shrink-0">
                    <p class="text-[10px] font-bold text-indigo-300 uppercase tracking-[0.2em] mb-2">Ticket actual</p>
                    <p class="text-6xl sm:text-7xl lg:text-8xl font-black font-mono text-white tracking-tighter leading-none">
                      {{ currentTicket()?.display_number }}
                    </p>
                    <p class="text-sm text-slate-300 mt-3 font-medium">{{ currentTicket()?.service_name }}</p>
                  </div>

                  <div class="hidden sm:block w-px h-32 bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>

                  <div class="grid grid-cols-2 gap-x-8 gap-y-4 text-sm flex-1">
                    <div>
                      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ventanilla</p>
                      <p class="font-semibold text-white mt-1">{{ currentTicket()?.window_name }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Llamado</p>
                      <p class="font-semibold text-white mt-1 font-mono">{{ formatTime(currentTicket()?.called_at) }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Iniciado</p>
                      <p class="font-semibold text-white mt-1 font-mono">{{ formatTime(currentTicket()?.started_at) }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Creado</p>
                      <p class="font-semibold text-white mt-1 font-mono">{{ formatTime(currentTicket()?.created_at) }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Acciones -->
              <div class="px-6 py-5 border-t border-slate-100">
                <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Acciones</h3>
                <div class="flex flex-wrap gap-3">
                  @if (['called', 'transferred'].includes(currentTicket()?.status || '')) {
                    <div class="flex-1 min-w-[180px]">
                      <app-action-button
                        label="Iniciar atención"
                        variant="success"
                        size="lg"
                        [loading]="actionLoading === 'start'"
                        icon="play"
                        (onClick)="startService()"
                      ></app-action-button>
                    </div>
                  }

                  @if (currentTicket()?.status === 'in_service') {
                    <div class="flex-1 min-w-[180px]">
                      <app-action-button
                        label="Completar atención"
                        variant="primary"
                        size="lg"
                        [loading]="actionLoading === 'complete'"
                        icon="check"
                        (onClick)="completeService()"
                      ></app-action-button>
                    </div>
                  }

                  @if (['called', 'in_service', 'transferred'].includes(currentTicket()?.status || '')) {
                    <div class="flex-1 min-w-[180px]">
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

                  @if (['waiting', 'called', 'in_service', 'transferred'].includes(currentTicket()?.status || '')) {
                    <div class="flex-1 min-w-[180px]">
                      <app-action-button
                        label="Cancelar"
                        variant="danger"
                        size="lg"
                        [loading]="actionLoading === 'cancel'"
                        icon="x"
                        (onClick)="confirmCancel()"
                      ></app-action-button>
                    </div>
                  }
                </div>
              </div>

              <!-- Historial -->
              <div class="border-t border-slate-100 bg-slate-50/60 px-6 py-5">
                <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Historial del turno</h3>
                <ol class="relative space-y-4 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-slate-200 before:via-slate-200 before:to-transparent">
                  <li class="relative pl-7">
                    <span class="absolute left-0 top-1 w-3.5 h-3.5 rounded-full bg-slate-300 ring-4 ring-slate-50"></span>
                    <div class="flex items-center justify-between gap-3">
                      <p class="text-sm font-medium text-slate-700">Creado</p>
                      <p class="text-xs font-mono text-slate-500">{{ formatTime(currentTicket()?.created_at) }}</p>
                    </div>
                  </li>
                  @if (currentTicket()?.called_at) {
                    <li class="relative pl-7">
                      <span class="absolute left-0 top-1 w-3.5 h-3.5 rounded-full bg-sky-500 ring-4 ring-slate-50"></span>
                      <div class="flex items-center justify-between gap-3">
                        <p class="text-sm font-medium text-slate-700">Llamado · <span class="text-slate-500 font-normal">{{ currentTicket()?.window_name }}</span></p>
                        <p class="text-xs font-mono text-slate-500">{{ formatTime(currentTicket()?.called_at) }}</p>
                      </div>
                    </li>
                  }
                  @if (currentTicket()?.started_at) {
                    <li class="relative pl-7">
                      <span class="absolute left-0 top-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-4 ring-slate-50"></span>
                      <div class="flex items-center justify-between gap-3">
                        <p class="text-sm font-medium text-slate-700">Atención iniciada</p>
                        <p class="text-xs font-mono text-slate-500">{{ formatTime(currentTicket()?.started_at) }}</p>
                      </div>
                    </li>
                  }
                  @if (currentTicket()?.completed_at) {
                    <li class="relative pl-7">
                      <span class="absolute left-0 top-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-4 ring-slate-50"></span>
                      <div class="flex items-center justify-between gap-3">
                        <p class="text-sm font-medium text-slate-700">Completado</p>
                        <p class="text-xs font-mono text-slate-500">{{ formatTime(currentTicket()?.completed_at) }}</p>
                      </div>
                    </li>
                  }
                  @if (currentTicket()?.cancelled_at) {
                    <li class="relative pl-7">
                      <span class="absolute left-0 top-1 w-3.5 h-3.5 rounded-full bg-rose-500 ring-4 ring-slate-50"></span>
                      <div class="flex items-center justify-between gap-3">
                        <p class="text-sm font-medium text-slate-700">Cancelado</p>
                        <p class="text-xs font-mono text-slate-500">{{ formatTime(currentTicket()?.cancelled_at) }}</p>
                      </div>
                    </li>
                  }
                  @if (currentTicket()?.transferred_at) {
                    <li class="relative pl-7">
                      <span class="absolute left-0 top-1 w-3.5 h-3.5 rounded-full bg-violet-500 ring-4 ring-slate-50"></span>
                      <div class="flex items-center justify-between gap-3">
                        <p class="text-sm font-medium text-slate-700">Transferido · <span class="text-slate-500 font-normal">{{ currentTicket()?.window_name }}</span></p>
                        <p class="text-xs font-mono text-slate-500">{{ formatTime(currentTicket()?.transferred_at) }}</p>
                      </div>
                    </li>
                  }
                </ol>
              </div>
            } @else {
              <!-- Empty state -->
              <div class="p-12 sm:p-16 text-center">
                <div class="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center mx-auto mb-5">
                  <svg class="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <p class="text-lg font-semibold text-slate-900">Sin turno en atención</p>
                <p class="text-sm text-slate-500 mt-1.5 max-w-sm mx-auto">Presiona "Llamar siguiente" para comenzar con el primer ciudadano en espera</p>
              </div>
            }
          </div>

          <!-- Llamar siguiente -->
          <div class="bg-gradient-to-br from-indigo-50/80 to-white rounded-2xl border border-indigo-100 shadow-sm p-6">
            <div class="flex flex-col sm:flex-row sm:items-center gap-4">
              <div class="flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <h3 class="font-semibold text-slate-900">Llamar siguiente</h3>
                  @if (!hasActiveTicket() && waitingTickets().length > 0) {
                    <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200">
                      {{ waitingTickets().length }} en cola
                    </span>
                  }
                </div>
                <p class="text-sm text-slate-600 mt-1">
                  {{ hasActiveTicket()
                      ? 'Completa, cancela o transfiere el turno actual para continuar'
                      : 'Se llamará el primer turno en espera de ' + (currentSession()?.service_name || '') }}
                </p>
              </div>
              <app-action-button
                label="Llamar siguiente"
                variant="primary"
                size="lg"
                [loading]="callingNext"
                [disabled]="!canCallNext()"
                [tooltip]="hasActiveTicket() ? 'Completa, cancela o transfiere el turno actual para llamar al siguiente' : ''"
                icon="play"
                (onClick)="callNext()"
              ></app-action-button>
            </div>
          </div>
        </section>
      </div>

      <!-- ===== Turnos en espera ===== -->
      <div class="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 flex-wrap min-w-0">
            <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Turnos en espera
            </h3>
            <span class="text-xs text-slate-400 truncate">
              {{ currentSession()?.service_name }} ({{ currentSession()?.service_prefix }})
            </span>
          </div>
          <span class="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full ring-1 ring-inset ring-amber-200 shrink-0">
            {{ waitingTickets().length }}
          </span>
        </div>

        @if (waitingTickets().length === 0) {
          <div class="p-12 sm:p-16 text-center">
            <div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <p class="text-base font-semibold text-slate-900">No hay turnos en espera</p>
            <p class="text-sm text-slate-500 mt-1">Los turnos aparecerán aquí cuando los ciudadanos los saquen</p>
          </div>
        } @else {
          <ul class="divide-y divide-slate-100">
            @for (ticket of waitingTickets(); track ticket.id; let i = $index) {
              <li class="px-4 sm:px-6 py-4 hover:bg-gradient-to-r hover:from-indigo-50/40 hover:to-transparent flex items-center gap-4 transition-all">
                <span class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-lg shadow-indigo-500/20">
                  {{ i + 1 }}
                </span>
                <div class="flex-1 min-w-0">
                  <p class="font-mono font-bold text-slate-900 truncate text-base">{{ ticket.display_number }}</p>
                  <p class="text-xs text-slate-500 mt-0.5">Creado: {{ formatTime(ticket.created_at) }}</p>
                </div>
                <span class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full ring-1 ring-inset ring-amber-200 shrink-0">
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <span class="hidden sm:inline">En espera</span>
                </span>
              </li>
            }
          </ul>
        }
      </div>
    }
  </main>
</div>
`,
styles: [`
  :host { display: block; }
`]
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
        this.currentTicket.set(null);
        alert(`Turno transferido a ${ticket.window_name}`);
        const session = this.currentSession();
        if (session) this.loadWaitingTickets(session.service_id);
        this.loadActiveSessions();
      } else if (ticket.operator_session_id === this.currentSession()?.id) {
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