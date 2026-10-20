import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../service/auth.service';

@Component({
  selector: 'app-welcome',
  standalone: true,
  templateUrl: './welcome.html',
  styleUrl: './welcome.css',
})
export class WelcomeComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly showLogin = signal(false);
  readonly showRegister = signal(false);

  username = '';
  password = '';
  errorMessage = '';

  openLogin(): void {
    this.showLogin.set(true);
    this.showRegister.set(false);
    this.errorMessage = '';
  }

  openRegister(): void {
    this.showRegister.set(true);
    this.showLogin.set(false);
    this.errorMessage = '';
  }

  closeForms(): void {
    this.showLogin.set(false);
    this.showRegister.set(false);
  }

  login(): void {
    const success = this.auth.login(this.username, this.password);

    if (!success) {
      this.errorMessage = 'Username or password is incorrect.';
      return;
    }

    this.closeForms();
    this.router.navigate(
      [this.auth.isAdmin() ? '/admin-home' : '/user-home']
    );
  }
}