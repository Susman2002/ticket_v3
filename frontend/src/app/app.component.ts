import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';
import { WebSocketService } from './core/services/websocket.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  template: `
    <router-outlet></router-outlet>
  `,
  styles: []
})
export class AppComponent implements OnInit {
  private auth = inject(AuthService);
  private ws = inject(WebSocketService);
  private router = inject(Router);

  ngOnInit(): void {
    // Conectar WebSocket si hay token
    if (this.auth.isAuthenticated()) {
      this.ws.connect();
    }

    // Reconectar WebSocket cuando cambie el estado de autenticación
    // (en una app real usaríamos signals o rxjs para reaccionar a cambios)
  }
}