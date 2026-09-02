import { Routes } from '@angular/router';
import { MainLayout } from './layouts/main-layout/main-layout';

export const routes: Routes = [
  {
    path: '',
    component: MainLayout,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/home/home').then(m => m.Home)
      },
      /*
      {
        path: 'search',
        loadComponent: () =>
          import('./pages/search/search').then(m => m.Keywords)
      },*/
      {
        path: 'keywords',
        loadComponent: () =>
          import('./pages/keywords/keywords').then(m => m.Keywords)
      }
    ]
  }
];
