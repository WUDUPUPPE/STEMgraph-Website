import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { PROGRESS_STORAGE_KEY_PREFIX } from '../constants/challenge-progress.constants';
import { ChallengeProgressEntry, ChallengeStatus } from '../models/challenge-progress.model';
import { AuthService } from './auth.service';

/**
 * Speichert, welche Challenges der Benutzer als fertig / todo / schwer markiert hat.
 *
 * Es gibt dafür (noch) keinen Endpoint im Backend, deshalb wird alles
 * im localStorage gespeichert – pro Benutzer ein eigener Eintrag.
 */
@Injectable({ providedIn: 'root' })
export class ChallengeProgressService {
  private readonly auth = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  // Alle markierten Challenges (Key = Challenge-ID
  readonly entries = signal<Map<string, ChallengeProgressEntry>>(new Map());

  readonly doneCount = computed(() => this.countByStatus('done'));
  readonly todoCount = computed(() => this.countByStatus('todo'));
  readonly hardCount = computed(() => this.countByStatus('hard'));
  readonly markedCount = computed(() => this.entries().size);

  // Wenn sich der Benutzer ändert (Login/Logout), wird sein Fortschritt geladen
  private readonly userEffect = effect(() => {
    const user = this.auth.user();
    this.entries.set(this.loadEntries(user?.username ?? null));
  });

  getStatus(challengeId: string): ChallengeStatus | null {
    return this.entries().get(challengeId)?.status ?? null;
  }

  setStatus(challengeId: string, teaches: string | null, status: ChallengeStatus): void {
    const newEntries = new Map(this.entries());

    newEntries.set(challengeId, {
      id: challengeId,
      teaches,
      status,
      updatedAt: new Date().toISOString(),
    });

    this.entries.set(newEntries);
    this.saveEntries();
  }

  clearStatus(challengeId: string): void {
    const newEntries = new Map(this.entries());
    newEntries.delete(challengeId);

    this.entries.set(newEntries);
    this.saveEntries();
  }

  /** Alle Einträge mit einem Status, die neuesten zuerst. */
  getEntriesByStatus(status: ChallengeStatus): ChallengeProgressEntry[] {
    return [...this.entries().values()]
      .filter((entry) => entry.status === status)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  private countByStatus(status: ChallengeStatus): number {
    let count = 0;

    this.entries().forEach((entry) => {
      if (entry.status === status) {
        count++;
      }
    });

    return count;
  }

  private getStorageKey(): string | null {
    const username = this.auth.user()?.username;

    if (!username) {
      return null;
    }

    return PROGRESS_STORAGE_KEY_PREFIX + username;
  }

  private loadEntries(username: string | null): Map<string, ChallengeProgressEntry> {
    const entries = new Map<string, ChallengeProgressEntry>();

    if (!this.isBrowser || !username) {
      return entries;
    }

    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY_PREFIX + username);

    if (!raw) {
      return entries;
    }

    try {
      const list = JSON.parse(raw) as ChallengeProgressEntry[];
      list.forEach((entry) => entries.set(entry.id, entry));
    } catch {
      localStorage.removeItem(PROGRESS_STORAGE_KEY_PREFIX + username);
    }

    return entries;
  }

  private saveEntries(): void {
    const key = this.getStorageKey();

    if (!this.isBrowser || !key) {
      return;
    }

    const list = [...this.entries().values()];
    localStorage.setItem(key, JSON.stringify(list));
  }
}
