import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { Window, CreateWindowRequest, UpdateWindowRequest } from '../../../core/models/admin.model';

@Component({
  selector: 'app-admin-windows',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex justify-between items-center">
        <h2 class="text-2xl font-bold text-gray-900">Gestión de Ventanillas</h2>
        <button
          (click)="openCreateModal()"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Nueva ventanilla
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
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creado</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              @for (window of windows(); track window.id) {
                <tr class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                        <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                        </svg>
                      </div>
                      <span class="text-sm font-medium text-gray-900">{{ window.name }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs font-medium rounded-full" [class.bg-green-100]="window.active" [class.text-green-800]="window.active" [class.bg-red-100]="!window.active" [class.text-red-800]="!window.active">
                      {{ window.active ? 'Activa' : 'Inactiva' }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ formatDate(window.created_at) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      (click)="toggleWindow(window)"
                      class="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      {{ window.active ? 'Desactivar' : 'Activar' }}
                    </button>
                    <button
                      (click)="openEditModal(window)"
                      class="text-gray-600 hover:text-gray-900 mr-4"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              }
              @if (windows().length === 0) {
                <tr>
                  <td colspan="4" class="px-6 py-12 text-center text-gray-500">
                    No hay ventanillas configuradas
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
          <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ editingWindow() ? 'Editar ventanilla' : 'Nueva ventanilla' }}</h3>
          <form (ngSubmit)="saveWindow()" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nombre de la ventanilla</label>
              <input
                type="text"
                [(ngModel)]="formData.name"
                name="name"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div class="flex items-center">
              <input
                type="checkbox"
                [(ngModel)]="formData.active"
                name="active"
                id="active"
                class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label for="active" class="ml-2 text-sm text-gray-700">Activa</label>
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
                  {{ editingWindow() ? 'Actualizar' : 'Crear' }}
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
export class AdminWindowsComponent implements OnInit {
  private adminService = inject(AdminService);

  windows = signal<Window[]>([]);
  loading = true;
  showModal = signal(false);
  editingWindow = signal<Window | null>(null);
  formData: CreateWindowRequest & { active: boolean } = { name: '', active: true };
  saving = false;

  ngOnInit(): void {
    this.loadWindows();
  }

  loadWindows(): void {
    this.loading = true;
    this.adminService.getWindows().subscribe({
      next: (windows) => {
        this.windows.set(windows);
        this.loading = false;
      },
      error: () => {
        this.windows.set([]);
        this.loading = false;
      }
    });
  }

  openCreateModal(): void {
    this.editingWindow.set(null);
    this.formData = { name: '', active: true };
    this.showModal.set(true);
  }

  openEditModal(window: Window): void {
    this.editingWindow.set(window);
    this.formData = { name: window.name, active: window.active };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingWindow.set(null);
  }

  saveWindow(): void {
    this.saving = true;
    
    if (this.editingWindow()) {
      const request: UpdateWindowRequest = {
        name: this.formData.name,
        active: this.formData.active
      };
      this.adminService.updateWindow(this.editingWindow()!.id, request).subscribe({
        next: () => {
          this.saving = false;
          this.closeModal();
          this.loadWindows();
        },
        error: (err) => {
          this.saving = false;
          alert(err.error?.error || 'Error al guardar');
        }
      });
    } else {
      const request: CreateWindowRequest = {
        name: this.formData.name
      };
      this.adminService.createWindow(request).subscribe({
        next: () => {
          this.saving = false;
          this.closeModal();
          this.loadWindows();
        },
        error: (err) => {
          this.saving = false;
          alert(err.error?.error || 'Error al guardar');
        }
      });
    }
  }

  toggleWindow(window: Window): void {
    this.adminService.updateWindow(window.id, { active: !window.active }).subscribe({
      next: () => this.loadWindows(),
      error: (err) => alert(err.error?.error || 'Error al cambiar estado')
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-ES');
  }
}