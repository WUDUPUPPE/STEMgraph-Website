import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Gibt true zurück, wenn der Benutzer angemeldet ist, andernfalls wird er zur Startseite weitergeleitet
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.user() ? true : router.createUrlTree(['/']);
};

// Gibt true zurück, wenn der Benutzer ein Administrator ist, andernfalls wird er zur Benutzerseite weitergeleitet
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.user()) {
    return router.createUrlTree(['/']);
  }

  return auth.isAdmin()
    ? true
    : router.createUrlTree(['/user']);
};
