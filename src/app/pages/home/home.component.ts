import { Component, DestroyRef, inject } from '@angular/core';
import { FileService } from '../../core/service/file.service';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  private fileService = inject(FileService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  uploading = false;
  message = '';

  upload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    input.value = '';

    if (!file || this.uploading) {
      return;
    }

    if (!localStorage.getItem('token')) {
      this.router.navigate(['/login']);
      return;
    }

    this.uploading = true;
    this.message = 'Envoi en cours...';

    this.fileService
      .uploadFile(file)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.uploading = false;
        }),
      )
      .subscribe({
        next: () => {
          this.message = 'Fichier envoyé avec succès.';
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
