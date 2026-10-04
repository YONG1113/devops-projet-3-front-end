import { Component, DestroyRef, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { FileService } from '../../core/service/file.service';

@Component({
  selector: 'app-download',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './download.component.html',
  styleUrl: './download.component.css',
})
export class DownloadComponent {
  private route = inject(ActivatedRoute);
  private fileService = inject(FileService);
  private destroyRef = inject(DestroyRef);

  objectPath = this.route.snapshot.queryParamMap.get('objectPath') ?? '';
  fileName =
    this.route.snapshot.queryParamMap.get('filename') ||
    this.objectPath.split('/').pop() ||
    'Fichier partagé';
  expirationDays = this.route.snapshot.queryParamMap.get('expiration');
  private size = Number(this.route.snapshot.queryParamMap.get('size'));
  fileSize = Number.isFinite(this.size) && this.size >= 0 ? this.formatFileSize(this.size) : '';
  expirationMessage = this.formatExpirationMessage(this.expirationDays);
  isProtectPassword =
    this.route.snapshot.queryParamMap.get('isProtectPassword') === 'true';
  message = '';
  downloading = false;
  downloadForm = new FormGroup({ password: new FormControl('', { nonNullable: true }) });

  download(): void {
    if (!this.objectPath || this.downloading) {
      this.message = 'Le chemin nest pas correct.';
      return;
    }

    this.downloading = true;
    this.fileService
      .downloadFile(this.objectPath)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => (this.downloading = false)),
      )
      .subscribe({
        next: (response) => {
          if (!response.body) {
            this.message = 'Le fichier reçu est vide.';
            return;
          }
          const filename = this.getFilename(response.headers.get('Content-Disposition'));
          const url = URL.createObjectURL(response.body);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(url), 0);
          this.message = 'Téléchargement terminé.';
        },
        error: (error) => {
          if (error.status === 401) {
            this.message = 'Veuillez vous connecter pour télécharger ce fichier.';
          } else if (error.status === 404) {
            this.message = 'Fichier introuvable.';
          } else if (error.status === 410) {
            this.message = 'Ce fichier a expiré.';
          } else {
            this.message = 'Le téléchargement a échoué.';
          }
        },
      });
  }

  private getFilename(contentDisposition: string | null): string {
    const encoded = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
    if (encoded) {
      try {
        return decodeURIComponent(encoded);
      } catch {
        return this.fileName;
      }
    }
    return contentDisposition?.match(/filename="?([^";]+)"?/i)?.[1] ?? this.fileName;
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  formatExpirationMessage(expirationDays: string | null): string {
    const days = Number(expirationDays);

    if (!Number.isInteger(days) || days < 1) {
      return "La date d'expiration de ce fichier n'est pas disponible.";
    }

    return days === 1 ? 'Ce fichier expirera demain.' : `Ce fichier expirera dans ${days} jours.`;
  }
}
