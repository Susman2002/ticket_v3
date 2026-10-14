import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { User, Role } from '../../../core/models/auth.model';

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
                    <span class="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                      {{ getRoleName(user.role_id ?? 0) }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs font-medium rounded-full" [class.bg-green-100]="user.active" [class.text-green-800]="user.active" [class.bg-red-100]="!user.active" [class.text-red-800]="!user.active">
                      {{ user.active ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ formatDate(user.created_at ?? '') }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      (click)="openEditModal(user)"
                      class="text-gray-600 hover:text-gray-900 mr-4"
                    >
                      Editar
                    </button>
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
                [(ngModel)]="formData.role_id"
                name="role_id"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                @for (role of roles(); track role.id) {
                  <option [value]="role.id">{{ role.name }}</option>
                }
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
  roles = signal<Role[]>([]);
  loading = true;
  showModal = signal(false);
  editingUser = signal<User | null>(null);
  formData = { username: '', password: '', role_id: 2 };
  saving = false;

  ngOnInit(): void {
    this.loadUsers();
    this.loadRoles();
  }

  loadUsers(): void {
    this.loading = true;
    this.adminService.getUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading = false;
      },
      error: () => {
        this.users.set([]);
        this.loading = false;
      }
    });
  }

  loadRoles(): void {
    this.adminService.getRoles().subscribe({
      next: (roles) => this.roles.set(roles),
      error: () => this.roles.set([])
    });
  }

  openCreateModal(): void {
    this.editingUser.set(null);
    this.formData = { username: '', password: '', role_id: 2 };
    this.showModal.set(true);
  }

  openEditModal(user: User): void {
    this.editingUser.set(user);
    this.formData = { username: user.username, password: '', role_id: user.role_id ?? 2 };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingUser.set(null);
  }

  saveUser(): void {
    this.saving = true;

    if (this.editingUser()) {
      const request = {
        username: this.formData.username,
        role_id: this.formData.role_id,
        active: this.editingUser()!.active
      };
      this.adminService.updateUser(this.editingUser()!.id, request).subscribe({
        next: () => {
          if (this.formData.password) {
            this.adminService.updateUserPassword(this.editingUser()!.id, this.formData.password).subscribe({
              next: () => {
                this.saving = false;
                this.closeModal();
                this.loadUsers();
              },
              error: (err) => {
                this.saving = false;
                alert(err.error?.error || 'Error al actualizar contraseña');
              }
            });
          } else {
            this.saving = false;
            this.closeModal();
            this.loadUsers();
          }
        },
        error: (err) => {
          this.saving = false;
          alert(err.error?.error || 'Error al actualizar');
        }
      });
    } else {
      const request = {
        username: this.formData.username,
        password: this.formData.password,
        role_id: this.formData.role_id
      };
      this.adminService.createUser(request).subscribe({
        next: () => {
          this.saving = false;
          this.closeModal();
          this.loadUsers();
        },
        error: (err) => {
          this.saving = false;
          alert(err.error?.error || 'Error al crear');
        }
      });
    }
  }

  toggleUser(user: User): void {
    if (user.id === this.auth.user()?.id) return;
    this.adminService.updateUser(user.id, { active: !user.active }).subscribe({
      next: () => this.loadUsers(),
      error: (err) => alert(err.error?.error || 'Error al cambiar estado')
    });
  }

  deleteUser(user: User): void {
    if (user.id === this.auth.user()?.id) return;
    if (!confirm(`¿Eliminar operador ${user.username}?`)) return;
    this.adminService.deleteUser(user.id).subscribe({
      next: () => this.loadUsers(),
      error: (err) => alert(err.error?.error || 'Error al eliminar')
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-ES');
  }

  getRoleName(roleId: number): string {
    const role = this.roles().find(r => r.id === roleId);
    return role ? role.name : 'Desconocido';
  }
}