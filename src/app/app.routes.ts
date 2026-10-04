import { Routes } from '@angular/router';
import { RegisterComponent } from './pages/register/register.component';
import { LoginComponent } from './pages/login/login.component';
import { HomeComponent } from './pages/home/home.component';
import { UploadComponent } from './pages/upload/upload.component';
import { DownloadComponent } from './pages/download/download.component';
import { CompteComponent } from './pages/compte/compte.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, pathMatch: 'full' },
  { path: 'register', component: RegisterComponent },
  { path: 'login', component: LoginComponent },
  { path: 'upload', component: UploadComponent },
  { path: 'download', component: DownloadComponent },
  { path: 'compte', component: CompteComponent },
  { path: '**', redirectTo: 'login' },
];
