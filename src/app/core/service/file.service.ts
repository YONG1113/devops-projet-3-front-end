import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FileService {
  selectedFile: File | null = null;

  constructor(private httpClient: HttpClient) {}

  uploadFile(file: File, userId: string): Observable<unknown> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);

    return this.httpClient.post('/api/file', formData);
  }
}
