import { Component, inject } from '@angular/core';
import { FileService } from '../../core/service/file.service';
import { Router } from '@angular/router';
import { validateSelectedFile } from '../../core/utils/file-validation';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  private fileService = inject(FileService);
  private router = inject(Router);
  message = '';

  chooseFile(input: HTMLInputElement): void {
    if (!localStorage.getItem('token')) {
      this.router.navigate(['/login']);
      return;
    }
    input.click();
  }

  upload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const validationError = validateSelectedFile(file);
    if (validationError) {
      this.message = validationError;
      return;
    }

    this.message = '';
    this.fileService.selectedFile = file;
    this.router.navigate(['/upload']);
  }
}
