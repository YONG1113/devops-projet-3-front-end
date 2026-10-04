import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface FileUploadResponse {
  filename: string;
  size: number;
  contentType: string;
  status: string;
  id: number;
  userId: number;
  bucket: string;
  objectPath: string;
}

@Injectable({
  providedIn: 'root',
})
export class FileService {
  selectedFile: File | null = null;

  constructor(private httpClient: HttpClient) {}

  uploadFile(file: File, userId: string, expirationDays: number, password: string): Observable<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    formData.append('expirationDays', String(expirationDays));
    formData.append('password', password);

    return this.httpClient.post<FileUploadResponse>('/api/file', formData);
  }
}
