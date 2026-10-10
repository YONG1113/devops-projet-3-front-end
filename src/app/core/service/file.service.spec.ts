import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { FileService } from './file.service';

describe('FileService', () => {
  let service: FileService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(FileService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uploads a file with all form fields', () => {
    const file = new File(['content'], 'report.txt', { type: 'text/plain' });
    service.uploadFile(file, '4', 3, 'secret').subscribe();

    const request = http.expectOne('/api/file');
    const body = request.request.body as FormData;
    expect(request.request.method).toBe('POST');
    expect(body.get('file')).toBe(file);
    expect(body.get('userId')).toBe('4');
    expect(body.get('expirationDays')).toBe('3');
    expect(body.get('password')).toBe('secret');
    request.flush({});
  });

  it('downloads a file by object path', () => {
    service.downloadFile('users/4/file-id').subscribe();
    const request = http.expectOne(
      (candidate) => candidate.url === '/api/file' && candidate.params.get('objectPath') === 'users/4/file-id',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.responseType).toBe('blob');
    request.flush(new Blob());
  });

  it('downloads a file with its public token and password', () => {
    service.downloadFileWtihToken('token-1', 'secret').subscribe();
    const request = http.expectOne(
      (candidate) => candidate.url === '/api/file/download' && candidate.params.get('token') === 'token-1',
    );
    expect(request.request.params.get('password')).toBe('secret');
    request.flush(new Blob());
  });

  it('gets file information by token', () => {
    service.getFileInfoByToken('token-1').subscribe();
    const request = http.expectOne(
      (candidate) => candidate.url === '/api/file/info' && candidate.params.get('token') === 'token-1',
    );
    expect(request.request.method).toBe('GET');
    request.flush({});
  });

  it('gets all current-user files', () => {
    service.getAllFilesByUser().subscribe();
    const request = http.expectOne('/api/files');
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('deletes a file by id', () => {
    service.deleteFile(12).subscribe();
    const request = http.expectOne('/api/file/12');
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });
});
