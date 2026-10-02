import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FileService {
  constructor(private httpClient: HttpClient) {}

  uploadFile(file: File): Observable<unknown> {
    const formData = new FormData();
    formData.append('file', file);

    return this.httpClient.post('/api/file', formData);
  }
}
