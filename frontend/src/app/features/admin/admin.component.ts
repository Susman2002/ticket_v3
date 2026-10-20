import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-slate-50 text-slate-900">
      <!-- ================= DESKTOP SIDEBAR ================= -->
      <aside class="hidden lg:flex fixed inset-y-0 left-0 w-64 z-30 bg-slate-900 text-white flex-col border-r border-slate-800">
        <!-- Brand -->
        <div class="px-5 py-5 border-b border-slate-800">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 flex-shrink-0">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div class="min-w-0">
              <p class="font-bold text-sm truncate">Sistema de Turnos</p>
              <p class="text-xs text-slate-400">Administración</p>
            </div>
          </div>
        </div>

        <!-- Nav -->
        <nav class="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          <p class="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Gestión</p>

          <a routerLink="/admin/users"
             [class]="isActive('users')
               ? 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 transition-all'
               : 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all'">
            <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
            </svg>
            <span>Operadores</span>
          </a>

          <a routerLink="/admin/services"
             [class]="isActive('services')
               ? 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 transition-all'
               : 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all'">
            <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
            </svg>
            <span>Trámites</span>
          </a>

          <a routerLink="/admin/windows"
             [class]="isActive('windows')
               ? 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 transition-all'
               : 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all'">
            <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
            </svg>
            <span>Ventanillas</span>
          </a>
        </nav>

        <!-- Bottom: user + actions -->
        <div class="px-3 py-4 border-t border-slate-800 space-y-1">
          <a routerLink="/operator"
             class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
            </svg>
            <span>Panel Operador</span>
          </a>

          <div class="flex items-center gap-3 px-3 py-2.5 mt-2 rounded-xl bg-slate-800/50">
            <div class="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {{ (auth.user()?.username || 'A').charAt(0).toUpperCase() }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold truncate">{{ auth.user()?.username }}</p>
              <p class="text-xs text-slate-400">Administrador</p>
            </div>
          </div>

          <button (click)="logout()"
             class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
            </svg>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <!-- ================= MOBILE TOP BAR ================= -->
      <div class="lg:hidden sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800">
        <div class="px-4 py-3 flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/30">
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div class="min-w-0">
              <p class="text-sm font-bold truncate">Sistema de Turnos</p>
              <p class="text-[10px] text-slate-400 truncate">{{ auth.user()?.username }} • Admin</p>
            </div>
          </div>
          <button (click)="logout()"
            class="text-xs font-semibold text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors flex-shrink-0">
            Salir
          </button>
        </div>

        <!-- Tabs scrollables -->
        <div class="px-2 pb-2 flex gap-1 overflow-x-auto scrollbar-hide">
          <a routerLink="/admin/users"
             [class]="isActive('users')
               ? 'flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white transition-colors'
               : 'flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 transition-colors'">
            Operadores
          </a>
          <a routerLink="/admin/services"
             [class]="isActive('services')
               ? 'flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white transition-colors'
               : 'flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 transition-colors'">
            Trámites
          </a>
          <a routerLink="/admin/windows"
             [class]="isActive('windows')
               ? 'flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white transition-colors'
               : 'flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 transition-colors'">
            Ventanillas
          </a>
          <a routerLink="/operator"
             class="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 transition-colors">
            Operador
          </a>
        </div>
      </div>

      <!-- ================= MAIN CONTENT ================= -->
      <main class="lg:ml-64 p-4 sm:p-6 lg:p-8 min-h-screen">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  `]
})
export class AdminComponent implements OnInit {
  auth = inject(AuthService);
  router = inject(Router);

  activeTab = signal('users');

  ngOnInit(): void {
    this.router.events.subscribe(() => {
      const url = this.router.url;
      if (url.includes('/users')) this.activeTab.set('users');
      else if (url.includes('/services')) this.activeTab.set('services');
      else if (url.includes('/windows')) this.activeTab.set('windows');
    });
  }

  isActive(tab: string): boolean {
    return this.activeTab() === tab;
  }

  logout(): void {
    this.auth.logout();
  }
}