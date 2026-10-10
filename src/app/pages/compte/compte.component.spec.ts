import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { FileService, UserFile } from '../../core/service/file.service';
import { UserService } from '../../core/service/user.service';
import { CompteComponent } from './compte.component';

describe('CompteComponent', () => {
  let component: CompteComponent;
  let fixture: ComponentFixture<CompteComponent>;
  const fileService = { getAllFilesByUser: jest.fn(), deleteFile: jest.fn() };
  const userService = { logout: jest.fn() };
  const router = { navigate: jest.fn() };
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const files: UserFile[] = [
    { id: 1, filename: 'active.txt', size: 2, contentType: 'text/plain', objectPath: 'a', expiresAt: tomorrow.toISOString(), isProtectPassword: true, downloadToken: 'active-token' },
    { id: 2, filename: 'expired.txt', size: 2, contentType: 'text/plain', objectPath: 'b', expiresAt: yesterday.toISOString(), isProtectPassword: false, downloadToken: 'expired-token' },
  ];

  beforeEach(async () => {
    fileService.getAllFilesByUser.mockReset().mockReturnValue(of(files));
    fileService.deleteFile.mockReset();
    userService.logout.mockReset();
    router.navigate.mockReset();
    await TestBed.configureTestingModule({
      imports: [CompteComponent],
      providers: [
        { provide: FileService, useValue: fileService },
        { provide: UserService, useValue: userService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CompteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads and maps current-user files', () => {
    expect(fileService.getAllFilesByUser).toHaveBeenCalled();
    expect(component.files).toHaveLength(2);
    expect(component.files[0].expirationMessage).toBe('Expire demain');
    expect(component.files[1].expired).toBe(true);
  });

  it('filters active and expired files', () => {
    component.setFilter('active');
    expect(component.filteredFiles.map(file => file.id)).toEqual([1]);
    component.setFilter('expired');
    expect(component.filteredFiles.map(file => file.id)).toEqual([2]);
    component.setFilter('all');
    expect(component.filteredFiles).toHaveLength(2);
  });

  it('navigates home and to a download token', () => {
    component.goHome();
    component.accessFile('active-token');
    expect(router.navigate).toHaveBeenCalledWith(['/']);
    expect(router.navigate).toHaveBeenCalledWith(['/download'], { queryParams: { downloadToken: 'active-token' } });
  });

  it('does not navigate without a download token', () => {
    component.accessFile('');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('deletes a confirmed file from the displayed list', () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    fileService.deleteFile.mockReturnValue(of(undefined));
    component.deleteFile(component.files[0]);
    expect(fileService.deleteFile).toHaveBeenCalledWith(1);
    expect(component.files.map(file => file.id)).toEqual([2]);
    expect(component.deletingFileId).toBeNull();
  });

  it('does not delete when confirmation is refused', () => {
    jest.spyOn(window, 'confirm').mockReturnValue(false);
    component.deleteFile(component.files[0]);
    expect(fileService.deleteFile).not.toHaveBeenCalled();
  });

  it('shows an error when deletion fails', () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    fileService.deleteFile.mockReturnValue(throwError(() => new Error('failed')));
    component.deleteFile(component.files[0]);
    expect(component.errorMessage).toBe('Impossible de supprimer ce fichier.');
  });

  it('shows an error when loading fails', () => {
    fileService.getAllFilesByUser.mockReturnValue(throwError(() => new Error('failed')));
    component.ngOnInit();
    expect(component.loading).toBe(false);
    expect(component.errorMessage).toBe('Impossible de charger vos fichiers.');
  });

  it('logs out and navigates to login', () => {
    component.logout();
    expect(userService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
