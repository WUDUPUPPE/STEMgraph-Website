import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-welcome',
  imports: [FormsModule],
  templateUrl: './welcome.html',
  styleUrl: './welcome.css',
})

// Die Willkommensseite, die den Login und die Registrierung ermöglicht
export class Welcome {
  readonly auth = inject(AuthService);
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

    this.password = '';
    this.errorMessage = '';
    this.closeForms();

    void this.router.navigate(
      [this.auth.isAdmin() ? '/admin' : '/user']
    );
  }
}
