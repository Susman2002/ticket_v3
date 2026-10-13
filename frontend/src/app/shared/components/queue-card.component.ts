import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QueueSummary } from '../../core/models/ticket.model';

@Component({
  selector: 'app-queue-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-4 bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow duration-200" 
         [class.ring-2]="isActive()" [class.ring-blue-500]="isActive()" [class.ring-offset-2]="isActive()">
      <div class="flex items-start justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500">{{ queue().prefix }} - {{ queue().name }}</p>
          <p class="text-3xl font-bold text-blue-600 mt-1">{{ queue().waiting_count }}</p>
          <p class="text-xs text-gray-400">en espera</p>
        </div>
        <div class="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center">
          <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
      </div>
      <div class="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
        <span>Llamados: {{ queue().called_count }}</span>
        <span>En atención: {{ queue().in_service_count }}</span>
      </div>
    </div>
  `,
  styles: []
})
export class QueueCardComponent {
  queue = input.required<QueueSummary>();
  isActive = input<boolean>(false);
}