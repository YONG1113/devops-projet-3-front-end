import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AppComponent } from './app.component';
import { UserService } from './core/service/user.service';

describe('AppComponent', () => {
  let userService: { logout: jest.Mock };

  beforeEach(async () => {
    userService = { logout: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: UserService, useValue: userService }
      ]
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the 'etudiant-frontend' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('etudiant-frontend');
  });

  it('should identify a logged-in user when a token exists', () => {
    localStorage.setItem('token', 'header.payload.signature');
    const fixture = TestBed.createComponent(AppComponent);

    expect(fixture.componentInstance.isLoggedIn()).toBe(true);
  });

  it('should identify a logged-out user when no token exists', () => {
    const fixture = TestBed.createComponent(AppComponent);

    expect(fixture.componentInstance.isLoggedIn()).toBe(false);
  });

  it('should logout and navigate to the login page', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(AppComponent);

    fixture.componentInstance.logout();

    expect(userService.logout).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });
});
