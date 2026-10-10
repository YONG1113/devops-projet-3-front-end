import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { FileService } from '../../core/service/file.service';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  const fileService = { selectedFile: null as File | null };
  const router = { navigate: jest.fn() };

  beforeEach(async () => {
    localStorage.clear();
    fileService.selectedFile = null;
    router.navigate.mockReset();
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        { provide: FileService, useValue: fileService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
  });

  it('redirects unauthenticated users instead of opening the picker', () => {
    const input = { click: jest.fn() } as unknown as HTMLInputElement;
    component.chooseFile(input);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(input.click).not.toHaveBeenCalled();
  });

  it('opens the picker for an authenticated user', () => {
    localStorage.setItem('token', 'jwt');
    const input = { click: jest.fn() } as unknown as HTMLInputElement;
    component.chooseFile(input);
    expect(input.click).toHaveBeenCalled();
  });

  it('stores the selected file and navigates to upload', () => {
    const file = new File(['a'], 'a.txt');
    const input = { files: [file], value: 'selected' } as unknown as HTMLInputElement;
    component.upload({ target: input } as unknown as Event);
    expect(fileService.selectedFile).toBe(file);
    expect(input.value).toBe('');
    expect(router.navigate).toHaveBeenCalledWith(['/upload']);
  });

  it('does nothing when no file was selected', () => {
    const input = { files: [], value: 'selected' } as unknown as HTMLInputElement;
    component.upload({ target: input } as unknown as Event);
    expect(fileService.selectedFile).toBeNull();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
