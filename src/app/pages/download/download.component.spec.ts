import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { FileDownloadResponse, FileService } from '../../core/service/file.service';
import { DownloadComponent } from './download.component';

describe('DownloadComponent', () => {
  let component: DownloadComponent;
  let fixture: ComponentFixture<DownloadComponent>;
  const fileService = { getFileInfoByToken: jest.fn(), downloadFileWtihToken: jest.fn() };
  const response: FileDownloadResponse = {
    filename: 'report.txt', size: 2048, contentType: 'text/plain', status: 'stored', id: 1,
    userId: 4, bucket: 'documents', objectPath: 'users/4/report', isProtectPassword: true,
    downloadToken: 'token-1', expiresAt: new Date(Date.now() + 2 * 86400000).toISOString(),
  };

  async function create(token = 'token-1'): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [DownloadComponent],
      providers: [
        { provide: FileService, useValue: fileService },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => token } } } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DownloadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    fileService.getFileInfoByToken.mockReset().mockReturnValue(of(response));
    fileService.downloadFileWtihToken.mockReset();
  });

  afterEach(() => jest.restoreAllMocks());

  it('loads file information and creates a required password control', async () => {
    await create();
    expect(fileService.getFileInfoByToken).toHaveBeenCalledWith('token-1');
    expect(component.fileName).toBe('report.txt');
    expect(component.isProtectPassword).toBe(true);
    expect(component.form['password'].hasError('required')).toBe(true);
  });

  it('supports an unprotected file without creating a password control', async () => {
    fileService.getFileInfoByToken.mockReturnValue(of({ ...response, isProtectPassword: false }));
    await create();
    expect(component.isProtectPassword).toBe(false);
    expect(component.downloadForm.valid).toBe(true);
  });

  it('reports an empty file-info response', async () => {
    fileService.getFileInfoByToken.mockReturnValue(of(null));
    await create();
    expect(component.message).toBe('Le fichier n4a pas trouve.');
  });

  it('reports a missing token without calling the API', async () => {
    await create('');
    expect(component.message).toBe('Le chemin nest pas correct.');
    expect(fileService.getFileInfoByToken).not.toHaveBeenCalled();
  });

  it.each([
    [401, 'Veuillez vous connecter pour télécharger ce fichier.'],
    [404, 'Fichier introuvable.'],
    [410, 'Ce fichier a expiré.'],
    [500, 'Le téléchargement a échoué.'],
  ])('maps file-info status %s to its message', async (status, message) => {
    fileService.getFileInfoByToken.mockReturnValue(throwError(() => ({ status })));
    await create();
    expect(component.message).toBe(message);
  });

  it('does not download while the password form is invalid', async () => {
    await create();
    component.onSubmit();
    expect(component.submitted).toBe(true);
    expect(fileService.downloadFileWtihToken).not.toHaveBeenCalled();
  });

  it('downloads the blob with the supplied password', async () => {
    await create();
    component.form['password'].setValue('secret');
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: jest.fn(() => 'blob:url') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: jest.fn() });
    fileService.downloadFileWtihToken.mockReturnValue(of(new HttpResponse({
      body: new Blob(['content']),
      headers: new HttpHeaders({ 'Content-Disposition': "attachment; filename*=UTF-8''report%20final.txt" }),
    })));

    component.onSubmit();

    expect(fileService.downloadFileWtihToken).toHaveBeenCalledWith('token-1', 'secret');
    expect(click).toHaveBeenCalled();
    expect(component.message).toBe('Téléchargement terminé.');
    expect(component.downloading).toBe(false);
  });

  it('reports an empty download response', async () => {
    await create();
    component.form['password'].setValue('secret');
    fileService.downloadFileWtihToken.mockReturnValue(of(new HttpResponse({ body: null })));
    component.onSubmit();
    expect(component.message).toBe('Le fichier reçu est vide.');
  });

  it.each([
    [401, 'Veuillez vous connecter pour télécharger ce fichier.'],
    [404, 'Fichier introuvable.'],
    [410, 'Ce fichier a expiré.'],
    [500, 'Le téléchargement a échoué.'],
  ])('maps download status %s to its message', async (status, message) => {
    await create();
    component.form['password'].setValue('secret');
    fileService.downloadFileWtihToken.mockReturnValue(throwError(() => ({ status })));
    component.onSubmit();
    expect(component.message).toBe(message);
    if (status === 410) expect(component.expirationState).toBe('expired');
  });

  it.each([[10, '10 B'], [2048, '2.00 KB'], [2097152, '2.00 MB']])(
    'formats %s bytes as %s', async (bytes, expected) => {
      await create();
      expect(component.formatFileSize(bytes as number)).toBe(expected);
    },
  );

  it('formats expired, today, tomorrow and active dates', async () => {
    await create();
    const date = (offset: number) => {
      const value = new Date();
      value.setDate(value.getDate() + offset);
      return value.toISOString();
    };
    expect(component.formatExpirationMessage(date(-1))).toContain('expiré');
    expect(component.formatExpirationMessage(date(0))).toContain("aujourd'hui");
    expect(component.formatExpirationMessage(date(1))).toContain('demain');
    expect(component.formatExpirationMessage(date(3))).toContain('3 jours');
    expect(component.formatExpirationMessage(null)).toContain('expiré');
    expect(component.formatExpirationMessage('invalid')).toContain("n'est pas disponible");
  });
});
