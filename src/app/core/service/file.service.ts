import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
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
  isProtectPassword: boolean;
  downloadToken: string;
}

@Injectable({
  providedIn: 'root',
})
export class FileService {
  selectedFile: File | null = null;

  constructor(private httpClient: HttpClient) {}

  uploadFile(
    file: File,
    userId: string,
    expirationDays: number,
    password: string,
  ): Observable<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    formData.append('expirationDays', String(expirationDays));
    formData.append('password', password);

    return this.httpClient.post<FileUploadResponse>('/api/file', formData);
  }

  downloadFile(objectPath: string): Observable<HttpResponse<Blob>> {
    return this.httpClient.get('/api/file', {
      params: { objectPath },
      responseType: 'blob',
      observe: 'response',
    });
  }

  downloadFileWtihToken(token: string, password: string): Observable<HttpResponse<Blob>> {
    return this.httpClient.get('/api/file/download', {
      params: { token, password },
      responseType: 'blob',
      observe: 'response',
    });
  }

  getFileInfoByToken(token: string): Observable<FileUploadResponse> {
    const formData = new FormData();
    formData.append('token', token);
    return this.httpClient.get<FileUploadResponse>('/api/file/info', {
      params: { token },
    });
  }
}
