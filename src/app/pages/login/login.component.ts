import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MaterialModule } from '../../shared/material.module';
import { UserService } from '../../core/service/user.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private userService = inject(UserService);
  private destroyRef = inject(DestroyRef);

  loginForm: FormGroup = new FormGroup({});
  submitted = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loginForm = this.formBuilder.group({
      login: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  get form() {
    return this.loginForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;

    if (this.loginForm.invalid) {
      return;
    }

    this.errorMessage = '';
    const { login, password } = this.loginForm.getRawValue();

    this.userService.login(login, password)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: token => {
          localStorage.setItem('token', token);
          alert('Login successful!');
          this.onReset();
        },
        error: () => {
          this.errorMessage = 'Invalid login or password';
        }
      });
  }

  onReset(): void {
    this.submitted = false;
    this.errorMessage = '';
    this.loginForm.reset();
  }
}
