import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionStatusComponent } from './session-status.component';
import { ActionButtonComponent } from './action-button.component';
import { AuthService } from '../../core/services/auth.service';
import { OperatorSession } from '../../core/models/operator.model';

@Component({
  selector: 'app-operator-header',
  standalone: true,
  imports: [CommonModule, SessionStatusComponent, ActionButtonComponent],
  template: `
    <header class="bg-white shadow-sm sticky top-0 z-10">
      <div class="max-w-7xl mx-auto px-6 py-4">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-xl font-bold text-gray-900">Panel de Operador</h1>
            <p class="text-sm text-gray-500">{{ username() }} • {{ role() }}</p>
          </div>

          <div class="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <app-session-status [session]="session()"></app-session-status>

            <div class="flex items-center gap-2">
              @if (session()) {
                <app-action-button
                  label="Cerrar sesión de trabajo"
                  variant="warning"
                  size="sm"
                  icon="door"
                  (onClick)="onEndSession.emit()"
                ></app-action-button>
                <app-action-button
                  label="Cerrar sesión completa"
                  variant="danger"
                  size="sm"
                  icon="x"
                  (onClick)="onLogout.emit()"
                ></app-action-button>
              } @else {
                <app-action-button
                  label="Iniciar sesión de trabajo"
                  variant="primary"
                  size="sm"
                  icon="play"
                  (onClick)="onStartSession.emit()"
                ></app-action-button>
                <app-action-button
                  label="Cerrar sesión completa"
                  variant="danger"
                  size="sm"
                  icon="x"
                  (onClick)="onLogout.emit()"
                ></app-action-button>
              }
            </div>
          </div>
        </div>
      </div>
    </header>
  `,
  styles: []
})
export class OperatorHeaderComponent {
  private auth = inject(AuthService);

  session = input<OperatorSession | null>(null);
  username = input<string>('');
  role = input<string>('');

  onEndSession = output<void>();
  onLogout = output<void>();
  onStartSession = output<void>();
}