export type Role = 'user' | 'admin';

export interface AppUser {
  username: string;
  role: Role;
}

// Demo-Account mit Passwort (nur für die Testanmeldung, kein echtes Backend)
export interface TestAccount extends AppUser {
  password: string;
}
