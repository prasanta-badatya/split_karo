import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', title: 'Split Karo — Free Expense Splitter for Roommates', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) },
  { path: 'groups', title: 'Your Groups — Split Karo', loadComponent: () => import('./pages/groups/groups.component').then(m => m.GroupsComponent) },
  { path: 'new', title: 'New Group — Split Karo', loadComponent: () => import('./pages/new-group/new-group.component').then(m => m.NewGroupComponent) },
  { path: 'group/:id', title: 'Group — Split Karo', loadComponent: () => import('./pages/group-detail/group-detail.component').then(m => m.GroupDetailComponent) },
  { path: 'trips', title: 'Trip Expenses — Split Karo', loadComponent: () => import('./pages/trips/trips.component').then(m => m.TripsComponent) },
  { path: 'trips/new', title: 'New Trip — Split Karo', loadComponent: () => import('./pages/new-trip/new-trip.component').then(m => m.NewTripComponent) },
  { path: 'trip/:id', title: 'Trip — Split Karo', loadComponent: () => import('./pages/trip-detail/trip-detail.component').then(m => m.TripDetailComponent) },
  { path: 'settings', title: 'Settings — Split Karo', loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent) },
  { path: '**', redirectTo: '' },
];
