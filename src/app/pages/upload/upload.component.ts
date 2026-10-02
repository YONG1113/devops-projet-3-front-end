import { Component, DestroyRef, inject } from '@angular/core';
import { FileService } from '../../core/service/file.service';
import { UserService } from '../../core/service/user.service';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, switchMap } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../shared/material.module';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, MaterialModule, RouterLink],
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

  ngOnInit(): void {
    this.uploadForm = this.formBuilder.group({
      password: [''],
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
  }

  upload(): void {
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

    this.userService
      .getCurrentUser()
      .pipe(
        switchMap((user) => this.fileService.uploadFile(file, user.id)),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.uploading = false;
        }),
      )
      .subscribe({
        next: () => {
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
}
