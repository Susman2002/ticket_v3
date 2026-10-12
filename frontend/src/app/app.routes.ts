import { Routes } from '@angular/router';
import { authGuard, roleGuard, loginGuard } from './core/guards';

export const appRoutes: Routes = [
  {
    path: 'login',
    canActivate: [loginGuard],
    loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'display',
    loadComponent: () => import('./features/display/display.component').then(m => m.DisplayComponent)
  },
  {
    path: 'kiosk/:token',
    loadComponent: () => import('./features/kiosk/kiosk.component').then(m => m.KioskComponent)
  },
  {
    path: 'ticket/:token',
    loadComponent: () => import('./features/ticket/ticket.component').then(m => m.TicketComponent)
  },
  {
    path: 'operator',
    canActivate: [authGuard, roleGuard(['operator', 'admin'])],
    loadComponent: () => import('./features/operator/operator.component').then(m => m.OperatorComponent)
  },
  {
    path: 'operator/panel',
    canActivate: [authGuard, roleGuard(['operator', 'admin'])],
    loadComponent: () => import('./features/operator/operator-panel.component').then(m => m.OperatorPanelComponent)
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard(['admin'])],
    loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent),
    children: [
      { path: '', redirectTo: 'users', pathMatch: 'full' },
      {
        path: 'users',
        loadComponent: () => import('./features/admin/users/admin-users.component').then(m => m.AdminUsersComponent)
      },
      {
        path: 'services',
        loadComponent: () => import('./features/admin/services/admin-services.component').then(m => m.AdminServicesComponent)
      },
      {
        path: 'windows',
        loadComponent: () => import('./features/admin/windows/admin-windows.component').then(m => m.AdminWindowsComponent)
      }
    ]
  },
  { path: '', redirectTo: '/display', pathMatch: 'full' },
  { path: '**', redirectTo: '/display' }
];