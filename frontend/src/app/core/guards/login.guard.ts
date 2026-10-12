import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const loginGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    const role = auth.user()?.role;
    if (role === 'admin') {
      router.navigate(['/admin']);
    } else if (role === 'operator') {
      router.navigate(['/operator']);
    }
    return false;
  }

  return true;
};