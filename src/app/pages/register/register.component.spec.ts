import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { RegisterComponent } from './register.component';
import { UserService } from '../../core/service/user.service';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let userService: { register: jest.Mock };
  let navigateSpy: jest.SpyInstance;

  beforeEach(async () => {
    userService = { register: jest.fn() };
    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        { provide: UserService, useValue: userService },
        provideRouter([])
      ]
    }).compileComponents();

    navigateSpy = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  beforeEach(() => jest.spyOn(window, 'alert').mockImplementation(() => undefined));

  afterEach(() => jest.restoreAllMocks());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not register when the form is invalid', () => {
    component.onSubmit();
    expect(component.submitted).toBe(true);
    expect(userService.register).not.toHaveBeenCalled();
  });

  it('should register and navigate to login', () => {
    userService.register.mockReturnValue(of(null));
    jest.spyOn(window, 'alert').mockImplementation(() => undefined);
    const user = {
      login: 'john@example.com',
      password: 'password'
    };
    component.registerForm.setValue({ ...user, repassword: user.password });

    component.onSubmit();

    expect(userService.register).toHaveBeenCalledWith(user);
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('should reject a seven-character password and display the minimum length', () => {
    component.registerForm.setValue({ login: 'john@example.com', password: '1234567', repassword: '1234567' });
    component.onSubmit();
    fixture.detectChanges();

    expect(userService.register).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Mot de passe : minimum 8 caractères.');
  });

  it('should block mismatched passwords and revalidate changes to either field', () => {
    component.registerForm.setValue({ login: 'john@example.com', password: 'password', repassword: 'different' });
    component.onSubmit();
    fixture.detectChanges();

    expect(userService.register).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Les mots de passe doivent être identiques.');

    component.form['repassword'].setValue('password');
    expect(component.registerForm.valid).toBe(true);

    component.form['password'].setValue('changed-password');
    expect(component.registerForm.hasError('passwordMismatch')).toBe(true);

    component.form['repassword'].setValue('');
    expect(component.form['repassword'].hasError('required')).toBe(true);
    expect(component.registerForm.hasError('passwordMismatch')).toBe(false);
  });

  it.each([0, 400, 500])('should display an error and preserve input for HTTP status %s', (status) => {
    userService.register.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));
    const values = { login: 'john@example.com', password: 'password', repassword: 'password' };
    component.registerForm.setValue(values);

    component.onSubmit();
    fixture.detectChanges();

    expect(component.errorMessage).not.toBe('');
    expect(component.registerForm.value).toEqual(values);
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('should reset the form', () => {
    component.submitted = true;
    component.registerForm.setValue({
      login: 'john@example.com', password: 'password', repassword: 'password'
    });

    component.onReset();

    expect(component.submitted).toBe(false);
    expect(component.registerForm.value).toEqual({
      login: null, password: null, repassword: null
    });
  });
});
