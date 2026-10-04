import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { UserService } from './core/service/user.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  imports: [RouterLink, RouterOutlet],
  styleUrl: './app.component.css',
})
export class AppComponent {
  private userService = inject(UserService);
  private router = inject(Router);

  title = 'DataShare';

  isLoggedIn(): boolean {
    return localStorage.getItem('token') !== null;
  }

  compte(): void {
    this.router.navigate(['/compte']);
  }

  showLayout(): boolean {
    return !this.router.url.startsWith('/compte');
  }
}
