import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) },
  { path: 'new', loadComponent: () => import('./pages/new-group/new-group.component').then(m => m.NewGroupComponent) },
  { path: 'group/:id', loadComponent: () => import('./pages/group-detail/group-detail.component').then(m => m.GroupDetailComponent) },
  { path: '**', redirectTo: '' },
];
