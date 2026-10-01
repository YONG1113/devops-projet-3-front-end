import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { UserService } from './core/service/user.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  imports: [
    RouterLink,
    RouterOutlet
  ],
  styleUrl: './app.component.css'
})
export class AppComponent {
  private userService = inject(UserService);
  private router = inject(Router);

  title = 'etudiant-frontend';

  isLoggedIn(): boolean {
    return localStorage.getItem('token') !== null;
  }

  logout(): void {
    this.userService.logout();
    this.router.navigate(['/login']);
  }
}
