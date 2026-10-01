import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Register } from '../models/Register';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(UserService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should register a user', () => {
    const user: Register = {
      firstName: 'John',
      lastName: 'Doe',
      login: 'john.doe',
      password: 'password'
    };

    service.register(user).subscribe(response => {
      expect(response).toBeNull();
    });

    const request = httpTestingController.expectOne('/api/register');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(user);
    request.flush(null);
  });

  it('should login a user and return a token', () => {
    const token = 'header.payload.signature';

    service.login('john.doe', 'password').subscribe(response => {
      expect(response).toBe(token);
    });

    const request = httpTestingController.expectOne('/api/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      login: 'john.doe',
      password: 'password'
    });
    expect(request.request.responseType).toBe('text');
    request.flush(token);
  });

  it('should remove the token on logout', () => {
    localStorage.setItem('token', 'header.payload.signature');

    service.logout();

    expect(localStorage.getItem('token')).toBeNull();
  });
});
