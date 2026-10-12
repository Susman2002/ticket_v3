import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';

interface User {
  id: number;
  username: string;
  role: 'admin' | 'operator';
  active: boolean;
  created_at: string;
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex justify-between items-center">
        <h2 class="text-2xl font-bold text-gray-900">Gestión de Operadores</h2>
        <button
          (click)="openCreateModal()"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Nuevo operador
        </button>
      </div>

      @if (loading) {
        <div class="text-center py-12">
          <svg class="animate-spin h-8 w-8 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      } @else {
        <div class="bg-white rounded-lg shadow overflow-hidden">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creado</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              @for (user of users(); track user.id) {
                <tr class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span class="text-blue-600 font-medium">{{ user.username.charAt(0).toUpperCase() }}</span>
                      </div>
                      <span class="ml-3 text-sm font-medium text-gray-900">{{ user.username }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs font-medium rounded-full" [class.bg-blue-100]="user.role === 'admin'" [class.text-blue-800]="user.role === 'admin'" [class.bg-green-100]="user.role === 'operator'" [class.text-green-800]="user.role === 'operator'">
                      {{ user.role === 'admin' ? 'Administrador' : 'Operador' }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs font-medium rounded-full" [class.bg-green-100]="user.active" [class.text-green-800]="user.active" [class.bg-red-100]="!user.active" [class.text-red-800]="!user.active">
                      {{ user.active ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ formatDate(user.created_at) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      (click)="toggleUser(user)"
                      [disabled]="user.id === auth.user()?.id"
                      class="text-blue-600 hover:text-blue-900 mr-4 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      {{ user.active ? 'Desactivar' : 'Activar' }}
                    </button>
                    <button
                      (click)="deleteUser(user)"
                      [disabled]="user.id === auth.user()?.id"
                      class="text-red-600 hover:text-red-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              }
              @if (users().length === 0) {
                <tr>
                  <td colspan="5" class="px-6 py-12 text-center text-gray-500">
                    No hay operadores registrados
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    <!-- Create/Edit Modal -->
    @if (showModal()) {
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" (click)="closeModal()">
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6" (click)="$event.stopPropagation()">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ editingUser() ? 'Editar operador' : 'Nuevo operador' }}</h3>
          <form (ngSubmit)="saveUser()" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
              <input
                type="text"
                [(ngModel)]="formData.username"
                name="username"
                required
                [disabled]="!!editingUser()"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">{{ editingUser() ? 'Nueva contraseña (opcional)' : 'Contraseña' }}</label>
              <input
                type="password"
                [(ngModel)]="formData.password"
                name="password"
                [required]="!editingUser()"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select
                [(ngModel)]="formData.role"
                name="role"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="operator">Operador</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div class="flex justify-end gap-3 pt-4">
              <button
                type="button"
                (click)="closeModal()"
                class="px-4 py-2 text-gray-600 hover:text-gray-700 font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                [disabled]="saving"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                @if (saving) {
                  <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                } @else {
                  {{ editingUser() ? 'Actualizar' : 'Crear' }}
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  styles: []
})
export class AdminUsersComponent implements OnInit {
  adminService = inject(AdminService);
  auth = inject(AuthService);

  users = signal<User[]>([]);
  loading = true;
  showModal = signal(false);
  editingUser = signal<User | null>(null);
  formData = { username: '', password: '', role: 'operator' as 'admin' | 'operator' };
  saving = false;

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    // We need to use the admin service - but it doesn't have getUsers yet
    // For now, we'll mock or add the endpoint
    this.loading = false;
    this.users.set([]);
  }

  openCreateModal(): void {
    this.editingUser.set(null);
    this.formData = { username: '', password: '', role: 'operator' };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingUser.set(null);
  }

  saveUser(): void {
    this.saving = true;
    // TODO: Implement create/update user
    this.saving = false;
    this.closeModal();
    this.loadUsers();
  }

  toggleUser(user: User): void {
    // TODO: Implement toggle
  }

  deleteUser(user: User): void {
    if (!confirm(`¿Eliminar operador ${user.username}?`)) return;
    // TODO: Implement delete
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-ES');
  }
}