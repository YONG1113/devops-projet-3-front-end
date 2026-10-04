import { Component, DestroyRef, inject } from '@angular/core';
import { FileService } from '../../core/service/file.service';
import { UserService } from '../../core/service/user.service';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, switchMap } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../shared/material.module';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './upload.component.html',
  styleUrl: './upload.component.css',
})
export class UploadComponent {
  private fileService = inject(FileService);
  private userService = inject(UserService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private formBuilder = inject(FormBuilder);

  uploadForm: FormGroup = new FormGroup({});
  submitted = false;
  file = this.fileService.selectedFile;
  uploaded = false;
  downloadUrl = '';
  copyMessage = '';
  uploadedExpirationDays = 7;

  ngOnInit(): void {
    this.uploadForm = this.formBuilder.group({
      password: [''],
      expirationDays: [7, [Validators.required, Validators.min(1), Validators.max(7)]],
    });
  }

  get form() {
    return this.uploadForm.controls;
  }

  uploading = false;
  message = '';

  onSubmit(): void {
    this.submitted = true;
    this.upload();
  }
  changeFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.uploading) return;
    this.file = file;
    this.fileService.selectedFile = file;
    this.uploaded = false;
    this.message = '';
    this.downloadUrl = '';
    this.copyMessage = '';
  }

  upload(): void {
    if (this.uploadForm.invalid) {
      this.uploadForm.markAllAsTouched();
      return;
    }
    const file = this.file;
    if (!file || this.uploading || this.uploaded) {
      return;
    }

    if (!localStorage.getItem('token')) {
      this.router.navigate(['/login']);
      return;
    }

    this.uploading = true;
    this.message = 'Envoi en cours...';
    const { expirationDays, password } = this.uploadForm.getRawValue();

    this.userService
      .getCurrentUser()
      .pipe(
        switchMap((user) => this.fileService.uploadFile(file, user.id, expirationDays, password)),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.uploading = false;
        }),
      )
      .subscribe({
        next: (response) => {
          const token = response.objectPath?.split('/').pop();
          this.downloadUrl = token
            ? new URL(`download/${encodeURIComponent(token)}`, document.baseURI).href
            : '';
          this.uploadedExpirationDays = expirationDays;
          this.message = 'Fichier envoyé avec succès.';
          this.uploaded = true;
          this.fileService.selectedFile = null;
        },
        error: (error) => {
          if (error.status === 401) {
            this.message = 'Veuillez vous reconnecter.';
            this.router.navigate(['/login']);
          } else {
            this.message = 'Échec de l’envoi. Veuillez réessayer.';
          }
        },
      });
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

  async copyLink(): Promise<void> {
    if (!this.downloadUrl) return;
    try {
      await navigator.clipboard.writeText(this.downloadUrl);
      this.copyMessage = 'Lien copié !';
    } catch {
      this.copyMessage = 'Copie impossible. Veuillez sélectionner et copier le lien manuellement.';
    }
  }
}
