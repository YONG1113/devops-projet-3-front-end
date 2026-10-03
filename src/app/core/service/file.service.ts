import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FileService {
  selectedFile: File | null = null;

  constructor(private httpClient: HttpClient) {}

  uploadFile(file: File, userId: string, expirationDays: number, password: string): Observable<unknown> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    formData.append('expirationDays', String(expirationDays));
    formData.append('password', password);

    return this.httpClient.post('/api/file', formData);
  }
}
