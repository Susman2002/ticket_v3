import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard = (allowedRoles: ('admin' | 'operator')[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
      router.navigate(['/login']);
      return false;
    }

    const userRole = auth.user()?.role;
    if (userRole && allowedRoles.includes(userRole)) {
      return true;
    }

    router.navigate(['/login']);
    return false;
  };
};