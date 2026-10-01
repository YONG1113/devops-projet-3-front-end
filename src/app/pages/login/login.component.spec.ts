import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { UserService } from '../../core/service/user.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let userService: { login: jest.Mock };

  beforeEach(async () => {
    userService = { login: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: UserService, useValue: userService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not login when the form is invalid', () => {
    component.onSubmit();
    expect(component.submitted).toBe(true);
    expect(userService.login).not.toHaveBeenCalled();
  });

  it('should store the token and clear the form after login', () => {
    const token = 'header.payload.signature';
    userService.login.mockReturnValue(of(token));
    jest.spyOn(window, 'alert').mockImplementation(() => undefined);
    component.loginForm.setValue({ login: 'john@example.com', password: 'password' });

    component.onSubmit();

    expect(userService.login).toHaveBeenCalledWith('john@example.com', 'password');
    expect(localStorage.getItem('token')).toBe(token);
    expect(window.alert).toHaveBeenCalledWith('Login successful!');
    expect(component.loginForm.value).toEqual({ login: null, password: null });
  });

  it('should display an error when login fails', () => {
    userService.login.mockReturnValue(throwError(() => new Error('Unauthorized')));
    component.loginForm.setValue({ login: 'john@example.com', password: 'wrong-password' });

    component.onSubmit();

    expect(component.errorMessage).toBe('Email ou mot de passe incorrect');
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('should reset the form', () => {
    component.submitted = true;
    component.errorMessage = 'error';
    component.loginForm.setValue({ login: 'john', password: 'password' });

    component.onReset();

    expect(component.submitted).toBe(false);
    expect(component.errorMessage).toBe('');
    expect(component.loginForm.value).toEqual({ login: null, password: null });
  });
});
