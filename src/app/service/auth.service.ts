import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

export type Role = 'user' | 'admin';

export interface AppUser {
  username: string;
  role: Role;
}

interface TestAccount extends AppUser {
  password: string;
}

const TEST_ACCOUNTS: TestAccount[] = [
  { username: 'user', password: 'user123', role: 'user' },
  { username: 'admin', password: 'admin123', role: 'admin' },
];

const STORAGE_KEY = 'stemgraph_demo_user';

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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
    }

    return true;
  }

  logout(): void {
    this.user.set(null);

    if (this.isBrowser) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  isAdmin(): boolean {
    return this.user()?.role === 'admin';
  }

  private loadUser(): AppUser | null {
    if (!this.isBrowser) {
      return null;
    }

    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AppUser;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }
}