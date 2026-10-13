import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OperatorSession } from '../../core/models/operator.model';

@Component({
  selector: 'app-session-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (session()) {
      <!-- Active Session -->
      <div class="inline-flex items-center gap-3 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
        <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <div class="text-left">
          <p class="text-sm font-medium text-green-800">Sesión activa</p>
          <p class="text-xs text-green-700">
            {{ session()?.window_name }} • {{ session()?.service_name }}
          </p>
        </div>
      </div>
    } @else {
      <!-- No Session -->
      <div class="inline-flex items-center gap-3 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
        <div class="w-2 h-2 bg-gray-400 rounded-full"></div>
        <div class="text-left">
          <p class="text-sm font-medium text-gray-600">Sin sesión de trabajo</p>
          <p class="text-xs text-gray-500">Seleccione ventanilla y trámite para iniciar</p>
        </div>
      </div>
    }
  `,
  styles: []
})
export class SessionStatusComponent {
  session = input<OperatorSession | null>(null);
}