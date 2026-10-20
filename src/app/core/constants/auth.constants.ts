import { TestAccount } from '../models/auth.model';

export const TEST_ACCOUNTS: TestAccount[] = [
  { username: 'testuser', password: 'user123', role: 'user' },
  { username: 'testadmin', password: 'admin123', role: 'admin' },
];

export const AUTH_STORAGE_KEY = 'stemgraph_demo_user';
