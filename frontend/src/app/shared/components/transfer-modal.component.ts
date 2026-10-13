import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActionButtonComponent } from './action-button.component';

export interface WindowOption {
  window_id: number;
  window_name: string;
  service_name: string;
  operator_username?: string;
}

@Component({
  selector: 'app-transfer-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ActionButtonComponent],
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4" (click)="onBackdropClick($event)">
        <div class="bg-white rounded-xl shadow-xl max-w-md w-full" (click)="$event.stopPropagation()">
          <!-- Header -->
          <div class="p-6 border-b border-gray-200">
            <h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
              </svg>
              Transferir turno
            </h3>
          </div>

          <!-- Content -->
          <div class="p-6 space-y-4">
            <div class="bg-gray-50 rounded-lg p-4">
              <p class="text-sm text-gray-600 mb-2">Turno a transferir</p>
              <p class="text-2xl font-bold font-mono text-gray-900">{{ ticketDisplayNumber() }}</p>
              <p class="text-sm text-gray-500 mt-1">{{ ticketServiceName() }}</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Ventanilla destino <span class="text-red-500">*</span>
              </label>
              <select
                [(ngModel)]="selectedWindowId"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              >
                <option value="">Seleccione ventanilla destino</option>
                @for (w of availableWindows(); track w.window_id) {
                  <option [value]="w.window_id">
                    {{ w.window_name }} ({{ w.service_name }}) {{ w.operator_username ? '- ' + w.operator_username : '' }}
                  </option>
                }
              </select>
              @if (selectedWindowId() === null && submitted()) {
                <p class="mt-1 text-sm text-red-600">Debe seleccionar una ventanilla destino</p>
              }
            </div>

            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p class="text-sm text-yellow-800 flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
                La ventanilla destino debe tener una sesión activa y atender el mismo servicio.
              </p>
            </div>
          </div>

          <!-- Actions -->
          <div class="p-6 border-t border-gray-200 flex justify-end gap-3">
            <app-action-button
              label="Cancelar"
              variant="secondary"
              (onClick)="onCancel()"
            ></app-action-button>
            <app-action-button
              label="Transferir"
              variant="info"
              [loading]="loading()"
              [disabled]="!selectedWindowId()"
              (onClick)="onConfirm()"
            ></app-action-button>
          </div>
        </div>
      </div>
    }
  `,
  styles: []
})
export class TransferModalComponent {
  isOpen = input.required<boolean>();
  ticketDisplayNumber = input.required<string>();
  ticketServiceName = input.required<string>();
  availableWindows = input.required<WindowOption[]>();
  loading = input<boolean>(false);

  close = output<void>();
  confirm = output<number>();

  selectedWindowId = signal<number | null>(null);
  submitted = signal(false);

  onCancel(): void {
    this.selectedWindowId.set(null);
    this.submitted.set(false);
    this.close.emit();
  }

  onConfirm(): void {
    this.submitted.set(true);
    if (this.selectedWindowId()) {
      this.confirm.emit(this.selectedWindowId()!);
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('fixed')) {
      this.onCancel();
    }
  }
}