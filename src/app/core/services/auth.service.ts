import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { AUTH_STORAGE_KEY, TEST_ACCOUNTS } from '../constants/auth.constants';
import { AppUser } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly user = signal<AppUser | null>(this.loadUser());

  login(username: string, password: string): boolean {
    const account = TEST_ACCOUNTS.find(
      (a) => a.username === username && a.password === password
    );

    if (!account) {
      return false;
    }

    const currentUser: AppUser = {
      username: account.username,
      role: account.role,
    };

    this.user.set(currentUser);

    if (this.isBrowser) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
    }

    return true;
  }

  logout(): void {
    this.user.set(null);

    if (this.isBrowser) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }

  isAdmin(): boolean {
    return this.user()?.role === 'admin';
  }

  private loadUser(): AppUser | null {
    if (!this.isBrowser) {
      return null;
    }

    const raw = localStorage.getItem(AUTH_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AppUser;
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
  }
}
