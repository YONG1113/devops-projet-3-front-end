import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./pages/home/home.component').then((module) => module.HomeComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register.component').then((module) => module.RegisterComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then((module) => module.LoginComponent),
  },
  {
    path: 'upload',
    loadComponent: () =>
      import('./pages/upload/upload.component').then((module) => module.UploadComponent),
  },
  {
    path: 'download',
    loadComponent: () =>
      import('./pages/download/download.component').then((module) => module.DownloadComponent),
  },
  {
    path: 'compte',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/compte/compte.component').then((module) => module.CompteComponent),
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
