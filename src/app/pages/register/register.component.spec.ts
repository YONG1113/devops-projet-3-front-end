import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { RegisterComponent } from './register.component';
import { UserService } from '../../core/service/user.service';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let userService: { register: jest.Mock };
  let router: { navigate: jest.Mock };

  beforeEach(async () => {
    userService = { register: jest.fn() };
    router = { navigate: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        { provide: UserService, useValue: userService },
        { provide: Router, useValue: router }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

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
      firstName: 'John',
      lastName: 'Doe',
      login: 'john',
      password: 'password'
    };
    component.registerForm.setValue(user);

    component.onSubmit();

    expect(userService.register).toHaveBeenCalledWith(user);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should reset the form', () => {
    component.submitted = true;
    component.registerForm.setValue({
      firstName: 'John', lastName: 'Doe', login: 'john', password: 'password'
    });

    component.onReset();

    expect(component.submitted).toBe(false);
    expect(component.registerForm.value).toEqual({
      firstName: null, lastName: null, login: null, password: null
    });
  });
});
