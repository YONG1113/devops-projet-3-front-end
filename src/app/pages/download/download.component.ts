import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { FileDownloadResponse, FileService, UserFile } from '../../core/service/file.service';
import { getRemainingCalendarDays } from '../../core/utils/file-expiration';

type ExpirationState = 'expired' | 'today' | 'tomorrow' | 'active';

@Component({
  selector: 'app-download',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './download.component.html',
  styleUrl: './download.component.css',
})
export class DownloadComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private fileService = inject(FileService);
  private destroyRef = inject(DestroyRef);

  submitted = false;
  fileName = '';
  objectPath = '';
  size = '';
  downloadToken = this.route.snapshot.queryParamMap.get('downloadToken') ?? '';
  fileId = this.route.snapshot.queryParamMap.get('fileId') ?? '';
  expirationState: ExpirationState = 'expired';
  expirationMessage = '';
  isProtectPassword = false;
  message = '';
  downloading = false;
  downloadForm: FormGroup = new FormGroup({});

  ngOnInit(): void {
    if (this.fileId) {
      this.loadFileById();
      return;
    }

    if (!this.downloadToken) {
      this.message = 'Le chemin nest pas correct.';
      return;
    }

    this.loadFileByToken();
  }

  private loadFileById(): void {
    const id = Number(this.fileId);
    if (!Number.isInteger(id) || id <= 0) {
      this.message = 'Identifiant de fichier incorrect.';
      return;
    }

    this.downloading = true;
    this.fileService
      .getFileById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => (this.downloading = false)),
      )
      .subscribe({
        next: (file) => this.initializeFile(file),
        error: (error) => this.handleFileInformationError(error),
      });
  }

  private loadFileByToken(): void {
    this.downloading = true;
    this.fileService
      .getFileInfoByToken(this.downloadToken)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => (this.downloading = false)),
      )
      .subscribe({
        next: (file) => this.initializeFile(file),
        error: (error) => this.handleFileInformationError(error),
      });
  }

  private initializeFile(file: UserFile | FileDownloadResponse | null): void {
    if (!file) {
      return;
    }

    this.fileName = file.filename;
    this.size = file.size != null ? this.formatFileSize(file.size) : '';
    this.objectPath = file.objectPath;
    this.isProtectPassword = file.isProtectPassword;
    this.expirationMessage = this.formatExpirationMessage(file.expiresAt);
    this.downloadForm = file.isProtectPassword
      ? this.formBuilder.group({ password: ['', Validators.required] })
      : this.formBuilder.group({});
  }

  private handleFileInformationError(error: { status?: number }): void {
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
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.downloadForm.invalid) {
      return;
    }

    this.downloading = true;
    const downloadRequest = this.fileId
      ? this.fileService.downloadFileWithObjectPath(
          this.objectPath,
          this.downloadForm.get('password')?.value,
        )
      : this.fileService.downloadFileWithToken(
          this.downloadToken,
          this.downloadForm.get('password')?.value,
        );

    downloadRequest
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
