import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-gray-100">
      <!-- Header -->
      <header class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 class="text-xl font-bold text-gray-900">Panel de Administración</h1>
            <p class="text-sm text-gray-500">{{ auth.user()?.username }} • Administrador</p>
          </div>
          <div class="flex items-center gap-4">
            <a routerLink="/operator" class="px-4 py-2 text-gray-600 hover:text-gray-700 text-sm font-medium">
              Panel Operador
            </a>
            <button
              (click)="logout()"
              class="px-4 py-2 text-red-600 hover:text-red-700 text-sm font-medium"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <!-- Navigation -->
      <nav class="bg-white border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-6">
          <ul class="flex space-x-8">
            <li>
              <a routerLink="/admin/users" routerLinkActive="border-blue-500 text-blue-600" class="flex items-center px-1 py-4 border-b-2 font-medium text-sm" [class.border-transparent]="!isActive('users')" [class.text-gray-500]="!isActive('users')" [class.hover:text-gray-700]="!isActive('users')" [class.hover:border-gray-300]="!isActive('users')">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                </svg>
                Operadores
              </a>
            </li>
            <li>
              <a routerLink="/admin/services" routerLinkActive="border-blue-500 text-blue-600" class="flex items-center px-1 py-4 border-b-2 font-medium text-sm" [class.border-transparent]="!isActive('services')" [class.text-gray-500]="!isActive('services')" [class.hover:text-gray-700]="!isActive('services')" [class.hover:border-gray-300]="!isActive('services')">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                </svg>
                Trámites
              </a>
            </li>
            <li>
              <a routerLink="/admin/windows" routerLinkActive="border-blue-500 text-blue-600" class="flex items-center px-1 py-4 border-b-2 font-medium text-sm" [class.border-transparent]="!isActive('windows')" [class.text-gray-500]="!isActive('windows')" [class.hover:text-gray-700]="!isActive('windows')" [class.hover:border-gray-300]="!isActive('windows')">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                </svg>
                Ventanillas
              </a>
            </li>
          </ul>
        </div>
      </nav>

      <main class="max-w-7xl mx-auto px-6 py-8">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: []
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