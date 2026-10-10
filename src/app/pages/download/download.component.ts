import { Component, DestroyRef, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { FileService } from '../../core/service/file.service';
import { getRemainingCalendarDays } from '../../core/utils/file-expiration';

type ExpirationState = 'expired' | 'today' | 'tomorrow' | 'active';

@Component({
  selector: 'app-download',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './download.component.html',
  styleUrl: './download.component.css',
})
export class DownloadComponent {
  private formBuilder = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private fileService = inject(FileService);
  private destroyRef = inject(DestroyRef);

  submitted = false;
  fileName = '';
  size = '';
  downloadToken = this.route.snapshot.queryParamMap.get('downloadToken') ?? '';
  expirationState: ExpirationState = 'expired';
  expirationMessage = '';
  isProtectPassword = false;
  message = '';
  downloading = false;
  downloadForm: FormGroup = new FormGroup({});

  ngOnInit(): void {
    if (!this.downloadToken || this.downloading) {
      this.message = 'Le chemin nest pas correct.';
      return;
    }
    this.fileService
      .getFileInfoByToken(this.downloadToken)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => (this.downloading = false)),
      )
      .subscribe({
        next: (response) => {
          if (!response) {
            return;
          }
          this.fileName = response.filename;
          this.size = response.size != null ? response.size.toString() : '';
          this.isProtectPassword = response.isProtectPassword;
          this.expirationMessage = this.formatExpirationMessage(response.expiresAt);
          if (response.isProtectPassword) {
            this.downloadForm = this.formBuilder.group({
              password: ['', Validators.required],
            });
          }
        },
        error: (error) => {
          if (error.status === 401) {
            this.message = 'Veuillez vous connecter pour télécharger ce fichier.';
          } else if (error.status === 404) {
            this.message = 'Fichier introuvable.';
          } else if (error.status === 410) {
            this.expirationState = 'expired';
            this.expirationMessage =
              "Ce fichier n'est plus disponible en téléchargement car il a expiré.";
            this.message = 'Ce fichier a expiré.';
          } else {
            this.message = 'Le téléchargement a échoué.';
          }
        },
      });
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.downloadForm.invalid) {
      return;
    }

    this.downloading = true;
    this.fileService
      .downloadFileWtihToken(this.downloadToken, this.downloadForm.get('password')?.value)
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

  formatExpirationMessage(expiresAt: string | null): string {
    const expiredMessage = "Ce fichier n'est plus disponible en téléchargement car il a expiré.";

    if (!expiresAt) {
      this.expirationState = 'expired';
      return expiredMessage;
    }

    const days = getRemainingCalendarDays(expiresAt);
    if (days === null) {
      this.expirationState = 'expired';
      return "La date d'expiration de ce fichier n'est pas disponible.";
    }

    switch (true) {
      case days < 0:
        this.expirationState = 'expired';
        return expiredMessage;

      case days === 0:
        this.expirationState = 'today';
        return "Ce fichier expirera aujourd'hui.";

      case days === 1:
        this.expirationState = 'tomorrow';
        return 'Ce fichier expirera demain.';

      default:
        this.expirationState = 'active';
        return `Ce fichier expirera dans ${days} jours.`;
    }
  }

  get form() {
    return this.downloadForm.controls;
  }
}
