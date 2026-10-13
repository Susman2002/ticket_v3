import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

type TicketStatus = 'waiting' | 'called' | 'in_service' | 'completed' | 'cancelled' | 'transferred';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium" [ngClass]="classes()">
      <span class="mr-2" [class.animate-pulse]="isCalled()">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          @if (isCalled()) {
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z"></path>
          } @else if (isInService()) {
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
          } @else if (isCompleted()) {
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
          } @else if (isTransferred()) {
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm4.707-8.707a1 1 0 00-1.414-1.414L9 11.586 7.707 10.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l5-5z" clip-rule="evenodd"></path>
          } @else if (isCancelled()) {
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
          } @else {
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
          }
        </svg>
      </span>
      {{ label() }}
    </div>
  `,
  styles: []
})
export class StatusBadgeComponent {
  status = input.required<TicketStatus>();

  classes = computed(() => {
    const status = this.status();
    const base = 'inline-flex items-center px-4 py-2 rounded-full text-sm font-medium';
    switch (status) {
      case 'waiting': return `${base} bg-yellow-100 text-yellow-800`;
      case 'called': return `${base} bg-blue-100 text-blue-800 animate-pulse`;
      case 'in_service': return `${base} bg-green-100 text-green-800`;
      case 'completed': return `${base} bg-green-100 text-green-800`;
      case 'cancelled': return `${base} bg-red-100 text-red-800`;
      case 'transferred': return `${base} bg-purple-100 text-purple-800`;
      default: return `${base} bg-gray-100 text-gray-800`;
    }
  });

  label = computed(() => {
    const status = this.status();
    switch (status) {
      case 'waiting': return 'En espera';
      case 'called': return '¡Llamado! Diríjase a la ventanilla';
      case 'in_service': return 'En atención';
      case 'completed': return 'Completado';
      case 'cancelled': return 'Cancelado';
      case 'transferred': return 'Transferido a otra ventanilla';
      default: return status;
    }
  });

  isCalled = computed(() => this.status() === 'called');
  isInService = computed(() => this.status() === 'in_service');
  isCompleted = computed(() => this.status() === 'completed');
  isTransferred = computed(() => this.status() === 'transferred');
  isCancelled = computed(() => this.status() === 'cancelled');
}