import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { from } from 'rxjs';
import { Api } from '../../api/api';
import { adminUpdateChallengesAdminUpdateChallengesPost, getScheduleAdminScheduleGet, getUpdateStatusAdminUpdateStatusGet, updateScheduleAdminSchedulePut } from '../../api/functions';
import { ScheduleRequest } from '../../api/models';
import { ADMIN_API_KEY_STORAGE_KEY } from '../constants/admin.constants';

/**
 * Schicht über den Admin-Endpoints (Scheduler, Instant Update, Update-Status).
 *
 * Alle Admin-Endpoints brauchen den Header "x-api-key".
 * Der Key wird NICHT im Code gespeichert, sondern vom Admin eingegeben
 * und nur für die aktuelle Browser-Sitzung (sessionStorage) gemerkt.
 */
@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly api = inject(Api);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly apiKey = signal<string>(this.loadApiKey());

  setApiKey(key: string): void {
    const trimmedKey = key.trim();
    this.apiKey.set(trimmedKey);

    if (this.isBrowser) {
      sessionStorage.setItem(ADMIN_API_KEY_STORAGE_KEY, trimmedKey);
    }
  }

  clearApiKey(): void {
    this.apiKey.set('');

    if (this.isBrowser) {
      sessionStorage.removeItem(ADMIN_API_KEY_STORAGE_KEY);
    }
  }

  hasApiKey(): boolean {
    return this.apiKey().length > 0;
  }

  getSchedule() {
    return from(
      this.api.invoke(getScheduleAdminScheduleGet, {
        'x-api-key': this.apiKey(),
      }),
    );
  }

  updateSchedule(schedule: ScheduleRequest) {
    return from(
      this.api.invoke(updateScheduleAdminSchedulePut, {
        'x-api-key': this.apiKey(),
        body: schedule,
      }),
    );
  }

  startInstantUpdate() {
    return from(
      this.api.invoke(adminUpdateChallengesAdminUpdateChallengesPost, {
        'x-api-key': this.apiKey(),
      }),
    );
  }

  getUpdateStatus() {
    return from(
      this.api.invoke(getUpdateStatusAdminUpdateStatusGet, {
        'x-api-key': this.apiKey(),
      }),
    );
  }

  private loadApiKey(): string {
    if (!this.isBrowser) {
      return '';
    }

    return sessionStorage.getItem(ADMIN_API_KEY_STORAGE_KEY) ?? '';
  }
}
