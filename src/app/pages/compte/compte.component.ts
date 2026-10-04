import { Component, inject } from '@angular/core';
import { UserService } from '../../core/service/user.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-compte',
  imports: [],
  templateUrl: './compte.component.html',
  styleUrl: './compte.component.css',
})
export class CompteComponent {
  private userService = inject(UserService);
  private router = inject(Router);

  logout(): void {
    this.userService.logout();
    this.router.navigate(['/login']);
  }
}
