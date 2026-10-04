import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-download',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './download.component.html',
  styleUrl: './download.component.css',
})
export class DownloadComponent {
  token = inject(ActivatedRoute).snapshot.paramMap.get('token');
  fileName = this.token ? 'Fichier partagé' : 'test-file.jpg';
  fileSize = this.token ? '' : '2,6 Mo';
  expirationMessage = this.token
    ? 'La date d’expiration sera affichée une fois le fichier chargé.'
    : 'Ce fichier expirera dans 3 jours.';
  message = '';
  downloadForm = new FormGroup({ password: new FormControl('', { nonNullable: true }) });

  download(): void {
    this.message = 'Le téléchargement n’est pas encore disponible.';
  }
}
