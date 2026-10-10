import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { FileService } from '../../core/service/file.service';
import { UserService } from '../../core/service/user.service';
import { UploadComponent } from './upload.component';

describe('UploadComponent', () => {
  let component: UploadComponent;
  let fixture: ComponentFixture<UploadComponent>;
  let fileService: { selectedFile: File | null; uploadFile: jest.Mock };
  const userService = { getCurrentUser: jest.fn() };
  const router = { navigate: jest.fn(), createUrlTree: jest.fn() };
  const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });

  beforeEach(async () => {
    localStorage.clear();
    fileService = { selectedFile: file, uploadFile: jest.fn() };
    userService.getCurrentUser.mockReset();
    router.navigate.mockReset();
    router.createUrlTree.mockReturnValue({ toString: () => '/download?downloadToken=abc' });
    await TestBed.configureTestingModule({
      imports: [UploadComponent],
      providers: [
        { provide: FileService, useValue: fileService },
        { provide: UserService, useValue: userService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(UploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('initializes the upload form', () => {
    expect(component.form['expirationDays'].value).toBe(7);
    expect(component.uploadForm.valid).toBe(true);
  });

  it('blocks an invalid expiration period', () => {
    component.form['expirationDays'].setValue(8);
    component.upload();
    expect(userService.getCurrentUser).not.toHaveBeenCalled();
  });

  it('redirects to login without a token', () => {
    component.upload();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('does not upload without a file or while an upload is already finished', () => {
    component.file = null;
    component.upload();
    component.file = file;
    component.uploaded = true;
    component.upload();
    expect(userService.getCurrentUser).not.toHaveBeenCalled();
  });

  it('uploads using the current user and exposes the download link', () => {
    localStorage.setItem('token', 'jwt');
    userService.getCurrentUser.mockReturnValue(of({ id: '4' }));
    fileService.uploadFile.mockReturnValue(of({ downloadToken: 'abc' }));
    component.uploadForm.setValue({ expirationDays: 3, password: 'secret' });
    component.onSubmit();
    expect(fileService.uploadFile).toHaveBeenCalledWith(file, '4', 3, 'secret');
    expect(component.uploaded).toBe(true);
    expect(component.downloadUrl).toContain('/download?downloadToken=abc');
    expect(component.message).toBe('Fichier envoyé avec succès.');
    expect(fileService.selectedFile).toBeNull();
    expect(component.uploading).toBe(false);
  });

  it('redirects to login on a 401 upload error', () => {
    localStorage.setItem('token', 'jwt');
    userService.getCurrentUser.mockReturnValue(of({ id: '4' }));
    fileService.uploadFile.mockReturnValue(throwError(() => ({ status: 401 })));
    component.upload();
    expect(component.message).toBe('Veuillez vous reconnecter.');
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('shows a generic upload error', () => {
    localStorage.setItem('token', 'jwt');
    userService.getCurrentUser.mockReturnValue(throwError(() => ({ status: 500 })));
    component.upload();
    expect(component.message).toBe('Échec de l’envoi. Veuillez réessayer.');
  });

  it('replaces the selected file', () => {
    const replacement = new File(['new'], 'new.txt');
    component.uploaded = true;
    component.changeFile({ target: { files: [replacement], value: 'x' } } as unknown as Event);
    expect(component.file).toBe(replacement);
    expect(fileService.selectedFile).toBe(replacement);
    expect(component.uploaded).toBe(false);
  });

  it('rejects a forbidden replacement file', () => {
    const forbidden = new File(['content'], 'virus.exe');
    component.changeFile({ target: { files: [forbidden], value: 'x' } } as unknown as Event);
    expect(component.file).toBe(file);
    expect(component.message).toContain('ne sont pas autorisés');
  });

  it('validates the file again before sending it', () => {
    localStorage.setItem('token', 'jwt');
    component.file = new File(['content'], 'script.bat');
    component.upload();
    expect(component.message).toContain('ne sont pas autorisés');
    expect(userService.getCurrentUser).not.toHaveBeenCalled();
  });

  it.each([[10, '10 B'], [2048, '2.00 KB'], [2 * 1024 * 1024, '2.00 MB']])(
    'formats %s bytes as %s', (bytes, expected) => expect(component.formatFileSize(bytes as number)).toBe(expected),
  );

  it('copies the download link', async () => {
    Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } });
    component.downloadUrl = 'https://example.test/download';
    await component.copyLink();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(component.downloadUrl);
    expect(component.copyMessage).toBe('Lien copié !');
  });

  it('reports clipboard errors and ignores an absent link', async () => {
    Object.assign(navigator, { clipboard: { writeText: jest.fn().mockRejectedValue(new Error('denied')) } });
    await component.copyLink();
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    component.downloadUrl = 'https://example.test/download';
    await component.copyLink();
    expect(component.copyMessage).toContain('Copie impossible');
  });
});
