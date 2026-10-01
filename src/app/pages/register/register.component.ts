import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MaterialModule } from '../../shared/material.module';
import { UserService } from '../../core/service/user.service';
import { Register } from '../../core/models/Register';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';

const passwordsMatch: ValidatorFn = (form) => {
  const password = form.get('password')?.value;
  const confirmation = form.get('repassword')?.value;
  return password && confirmation && password !== confirmation ? { passwordMismatch: true } : null;
};

@Component({
  selector: 'app-register',
  imports: [CommonModule, MaterialModule, RouterLink],
  templateUrl: './register.component.html',
  standalone: true,
  styleUrl: './register.component.css',
})
export class RegisterComponent implements OnInit {
  private userService = inject(UserService);
  private formBuilder = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  registerForm: FormGroup = new FormGroup({});
  submitted: boolean = false;
  errorMessage = '';

  ngOnInit() {
    this.registerForm = this.formBuilder.group(
      {
        login: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(8)]],
        repassword: ['', Validators.required],
      },
      { validators: passwordsMatch },
    );
  }

  get form() {
    return this.registerForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.registerForm.invalid) {
      return;
    }
    this.errorMessage = '';
    const registerUser: Register = {
      login: this.registerForm.get('login')?.value,
      password: this.registerForm.get('password')?.value,
    };
    this.userService
      .register(registerUser)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          alert('SUCCESS!! :-)');
          this.router.navigate(['/login']);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage =
            error.error?.message ?? 'Une erreur est survenue. Veuillez réessayer.';
          alert(this.errorMessage);
        },
      });
  }

  onReset(): void {
    this.submitted = false;
    this.registerForm.reset();
    this.errorMessage = '';
  }
}
