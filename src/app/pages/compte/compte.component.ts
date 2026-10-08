import { Component, inject } from '@angular/core';
import { UserService } from '../../core/service/user.service';
import { Router } from '@angular/router';

type FileFilter = 'all' | 'active' | 'expired';

interface FileItem {
  id: number;
  name: string;
  expirationMessage: string;
  passwordProtected: boolean;
  expired: boolean;
}

@Component({
  selector: 'app-compte',
  imports: [],
  templateUrl: './compte.component.html',
  styleUrl: './compte.component.css',
})
export class CompteComponent {
  private userService = inject(UserService);
  private router = inject(Router);

  activeFilter: FileFilter = 'all';

  readonly files: FileItem[] = [
    {
      id: 1,
      name: 'test1.jpg',
      expirationMessage: 'Expire dans 2 jours',
      passwordProtected: true,
      expired: false,
    },
    {
      id: 2,
      name: 'test.mp3',
      expirationMessage: 'Expire demain',
      passwordProtected: false,
      expired: false,
    },
    {
      id: 3,
      name: 'test.mp4',
      expirationMessage: 'Expiré',
      passwordProtected: false,
      expired: true,
    },
  ];

  get filteredFiles(): FileItem[] {
    if (this.activeFilter === 'active') {
      return this.files.filter((file) => !file.expired);
    }
    if (this.activeFilter === 'expired') {
      return this.files.filter((file) => file.expired);
    }
    return this.files;
  }

  setFilter(filter: FileFilter): void {
    this.activeFilter = filter;
  }

  logout(): void {
    this.userService.logout();
    this.router.navigate(['/login']);
  }
}
