import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Ticket } from '../../core/models/ticket.model';

@Component({
  selector: 'app-ticket-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-gray-800 rounded-lg p-4 border-l-4 transition-all duration-300" 
         [class.border-green-500]="isCompleted()"
         [class.border-yellow-500]="isInService()"
         [class.border-blue-500]="isCalledOrTransferred()"
         [class.animate-slide-in]="isNew()">
      <div class="flex justify-between items-start mb-2">
        <span class="text-2xl font-bold font-mono text-white">{{ ticket().display_number }}</span>
        <span class="px-2 py-1 rounded text-xs font-medium" [ngClass]="statusClass()">
          {{ statusLabel() }}
        </span>
      </div>
      <div class="text-gray-300 text-sm">
        <p>{{ ticket().service_name }}</p>
        <p class="font-medium">Ventanilla: {{ ticket().window_name || '—' }}</p>
      </div>
      <div class="mt-2 text-xs text-gray-500">
        Llamado: {{ formatTime(ticket().called_at) }}
      </div>
    </div>
  `,
  styles: [`
    @keyframes slide-in {
      from {
        opacity: 0;
        transform: translateX(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    .animate-slide-in {
      animation: slide-in 0.4s ease-out;
    }
  `]
})
export class TicketCardComponent {
  ticket = input.required<Ticket>();
  isNew = input<boolean>(false);

  isCompleted = computed(() => this.ticket().status === 'completed');
  isInService = computed(() => this.ticket().status === 'in_service');
  isCalledOrTransferred = computed(() => 
    this.ticket().status === 'called' || this.ticket().status === 'transferred'
  );

  statusClass = computed(() => {
    const status = this.ticket().status;
    switch (status) {
      case 'called': return 'bg-blue-900 text-blue-100';
      case 'in_service': return 'bg-yellow-900 text-yellow-100';
      case 'completed': return 'bg-green-900 text-green-100';
      case 'transferred': return 'bg-purple-900 text-purple-100';
      case 'cancelled': return 'bg-red-900 text-red-100';
      default: return 'bg-gray-700 text-gray-300';
    }
  });

  statusLabel = computed(() => {
    const status = this.ticket().status;
    switch (status) {
      case 'waiting': return 'En espera';
      case 'called': return 'Llamado';
      case 'in_service': return 'En atención';
      case 'completed': return 'Completado';
      case 'cancelled': return 'Cancelado';
      case 'transferred': return 'Transferido';
      default: return status;
    }
  });

  formatTime(dateStr: string | null): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString('es-ES', { hour12: false });
  }
}