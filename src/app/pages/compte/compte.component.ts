import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { UserService } from '../../core/service/user.service';
import { Router } from '@angular/router';
import { FileService, UserFile } from '../../core/service/file.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { getRemainingCalendarDays } from '../../core/utils/file-expiration';

type FileFilter = 'all' | 'active' | 'expired';

interface FileItem {
  id: number;
  name: string;
  expirationMessage: string;
  passwordProtected: boolean;
  expired: boolean;
  objectPath: string;
  downloadToken: string;
}

@Component({
  selector: 'app-compte',
  imports: [],
  templateUrl: './compte.component.html',
  styleUrl: './compte.component.css',
})
export class CompteComponent implements OnInit {
  private userService = inject(UserService);
  private fileService = inject(FileService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  activeFilter: FileFilter = 'all';

  files: FileItem[] = [];
  loading = false;
  errorMessage = '';
  deletingFileId: number | null = null;

  ngOnInit(): void {
    this.loadFiles();
  }

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

  goHome(): void {
    this.router.navigate(['/']);
  }

  accessFile(downloadToken: string): void {
    if (!downloadToken) {
      return;
    }
    this.router.navigate(['/download'], {
      queryParams: { downloadToken: downloadToken },
    });
  }

  deleteFile(file: FileItem): void {
    const confirmed = window.confirm(`Voulez-vous vraiment supprimer « ${file.name} » ?`);
    if (!confirmed || this.deletingFileId !== null) {
      return;
    }

    this.deletingFileId = file.id;
    this.errorMessage = '';
    this.fileService
      .deleteFile(file.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.files = this.files.filter((currentFile) => currentFile.id !== file.id);
          this.deletingFileId = null;
        },
        error: () => {
          this.errorMessage = 'Impossible de supprimer ce fichier.';
          this.deletingFileId = null;
        },
      });
  }

  private loadFiles(): void {
    this.loading = true;
    this.errorMessage = '';

    this.fileService
      .getAllFilesByUser()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (files) => {
          this.files = files.map((file) => this.toFileItem(file));
          this.loading = false;
        },
        error: () => {
          this.errorMessage = 'Impossible de charger vos fichiers.';
          this.loading = false;
        },
      });
  }

  private toFileItem(file: UserFile): FileItem {
    const remainingDays = getRemainingCalendarDays(file.expiresAt);
    const expired = remainingDays === null || remainingDays < 0;

    return {
      id: file.id,
      name: file.filename,
      expirationMessage: this.formatExpiration(remainingDays),
      passwordProtected: file.isProtectPassword,
      expired,
      objectPath: file.objectPath,
      downloadToken: file.downloadToken,
    };
  }

  private formatExpiration(remainingDays: number | null): string {
    switch (true) {
      case remainingDays === null || remainingDays < 0:
        return 'Expiré';
      case remainingDays === 0:
        return "Expire aujourd'hui";
      case remainingDays === 1:
        return 'Expire demain';
      default:
        return `Expire dans ${remainingDays} jours`;
    }
  }

  logout(): void {
    this.userService.logout();
    this.router.navigate(['/login']);
  }
}
