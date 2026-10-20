import { Routes } from '@angular/router';
import { MainLayout } from './layouts/main-layout/main-layout';
import { authGuard } from './service/auth.guards';
import { adminGuard } from './service/auth.guards';

export const routes: Routes = [
  {
    path: '',
    component: MainLayout,
    children: [
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/admin-home/admin-home').then(m => m.AdminHome)
      },
      {
        path: 'user-home',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/user-home/user-home').then(m => m.UserHome)
      },
      {
        path: '',
        redirectTo: 'admin',
        pathMatch: 'full',
      },
      {
        path: 'keywords',
        loadComponent: () =>
          import('./pages/keywords/keywords').then(m => m.Keywords)
      },
      {
        path: 'challenge/:id/:teaches',
        loadComponent: () =>
          import('./pages/challenge-detail/challenge-detail').then(m => m.ChallengeDetail)
      },
    ]
  }
];