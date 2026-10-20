import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { WebSocketService } from '../../core/services/websocket.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen relative overflow-hidden bg-slate-900 flex items-center justify-center px-4 py-12">
      <!-- Fondo animado -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute -top-40 -right-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div class="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div class="absolute top-1/2 left-1/2 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div class="relative w-full max-w-5xl grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
        <!-- Branding -->
        <div class="hidden lg:block text-white space-y-6">
          <div class="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
            <span class="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
            <span class="text-sm font-medium">Sistema en línea</span>
          </div>
          <h1 class="text-5xl font-bold leading-tight">
            Sistema de
            <span class="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">Turnos</span>
          </h1>
          <p class="text-lg text-slate-300 leading-relaxed">
            Gestiona y organiza tus turnos de forma inteligente, rápida y segura.
          </p>
          <div class="grid grid-cols-3 gap-4 pt-4">
            <div class="p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
              <p class="text-2xl font-bold">100%</p>
              <p class="text-xs text-slate-400 mt-1">Seguro</p>
            </div>
            <div class="p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
              <p class="text-2xl font-bold">24/7</p>
              <p class="text-xs text-slate-400 mt-1">Disponible</p>
            </div>
            <div class="p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
              <p class="text-2xl font-bold">Live</p>
              <p class="text-xs text-slate-400 mt-1">WebSocket</p>
            </div>
          </div>
        </div>

        <!-- Card login -->
        <div class="w-full max-w-md mx-auto">
          <div class="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 sm:p-10 border border-white/20">
            <div class="text-center mb-6 lg:hidden">
              <h1 class="text-2xl font-bold text-slate-900">Sistema de Turnos</h1>
            </div>
            <div class="mb-8">
              <h2 class="text-2xl font-bold text-slate-900">Bienvenido de nuevo</h2>
              <p class="text-slate-500 mt-1 text-sm">Ingresa tus credenciales para continuar</p>
            </div>

            <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-5">
              @if (error) {
                <div class="flex items-start gap-3 bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm" role="alert">
                  <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span>{{ error }}</span>
                </div>
              }

              <!-- Usuario -->
              <div>
                <label for="username" class="block text-sm font-semibold text-slate-700 mb-2">Usuario</label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                  </div>
                  <input
                    id="username"
                    type="text"
                    formControlName="username"
                    class="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    placeholder="admin / operador1"
                    [class.border-red-500]="loginForm.get('username')?.invalid && loginForm.get('username')?.touched"
                  />
                </div>
                @if (loginForm.get('username')?.invalid && loginForm.get('username')?.touched) {
                  <p class="mt-1.5 text-sm text-red-600">El usuario es requerido</p>
                }
              </div>

              <!-- Contraseña -->
              <div>
                <label for="password" class="block text-sm font-semibold text-slate-700 mb-2">Contraseña</label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                  </div>
                  <input
                    id="password"
                    [type]="showPassword ? 'text' : 'password'"
                    formControlName="password"
                    class="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    placeholder="••••••••"
                    [class.border-red-500]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched"
                  />
                  <button
                    type="button"
                    (click)="showPassword = !showPassword"
                    class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition"
                    [attr.aria-label]="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                  >
                    @if (showPassword) {
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>
                      </svg>
                    } @else {
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                      </svg>
                    }
                  </button>
                </div>
                @if (loginForm.get('password')?.invalid && loginForm.get('password')?.touched) {
                  <p class="mt-1.5 text-sm text-red-600">La contraseña es requerida</p>
                }
              </div>

              <button
                type="submit"
                [disabled]="loginForm.invalid || loading"
                class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50"
              >
                @if (loading) {
                  <span class="inline-flex items-center justify-center gap-2">
                    <svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Iniciando sesión...
                  </span>
                } @else {
                  Iniciar sesión
                }
              </button>
            </form>

            <div class="mt-8 pt-6 border-t border-slate-200">
              <p class="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Credenciales demo</p>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div class="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <p class="font-semibold text-slate-700 mb-1">Admin</p>
                  <p class="font-mono text-slate-500">admin / admin123</p>
                </div>
                <div class="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <p class="font-semibold text-slate-700 mb-1">Operador</p>
                  <p class="font-mono text-slate-500">operador1 / operador123</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes blob {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33%      { transform: translate(30px, -50px) scale(1.1); }
      66%      { transform: translate(-20px, 20px) scale(0.9); }
    }
    .animate-blob { animation: blob 7s infinite; }
    .animation-delay-2000 { animation-delay: 2s; }
    .animation-delay-4000 { animation-delay: 4s; }
  `]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private ws = inject(WebSocketService);
  private router = inject(Router);

  loginForm: FormGroup = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required]
  });

  loading = false;
  error = '';
  showPassword = false; // ← nuevo, solo UI (toggle de visibilidad)

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.loading = true;
    this.error = '';

    this.auth.login(this.loginForm.value).subscribe({
      next: () => {
        this.ws.connect();
        const role = this.auth.user()?.role;
        if (role === 'admin') {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/operator']);
        }
      },
      error: (err) => {
        this.error = err.error?.error || 'Error al iniciar sesión';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }
}