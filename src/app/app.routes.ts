import { Routes } from '@angular/router';
import { MainLayout } from './layouts/main-layout/main-layout';
import { authGuard, adminGuard } from './core/auth.guards';

export const routes: Routes = [
  {
    path: '',
    component: MainLayout,
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./pages/user-home/user-home').then(m => m.UserHome),
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/admin-home/admin-home').then(m => m.AdminHome),
      },
      {
        path: 'user-home',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/user-home/user-home').then(m => m.UserHome),
      },
      {
        path: 'keywords',
        loadComponent: () =>
          import('./pages/keywords/keywords').then(m => m.Keywords),
      },
      {
        path: 'challenge/:id/:teaches',
        loadComponent: () =>
          import('./pages/challenge-detail/challenge-detail')
            .then(m => m.ChallengeDetail),
      },
      {
        path: '**',
        redirectTo: '',
      },
    ],
  },
];