import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UpdateStatusResponse } from '../../api/models';
import { Logo3d } from '../../components/logo-3d/logo-3d';
import { AdminTab, SCHEDULE_MAX_MINUTES, SCHEDULE_MIN_MINUTES, SCHEDULE_PRESETS, UPDATE_STATUS_POLL_INTERVAL } from '../../core/constants/admin.constants';
import { AdminApiService } from '../../core/services/admin-api.service';

// Eine Zeile aus fetch_stats / export_stats für die Tabelle
interface StatRow {
  key: string;
  value: string;
}

/**
 * Admin-Seite für die Admin-Endpoints:
 *  - Scheduler   (GET/PUT /admin/schedule)
 *  - Instant Update (POST /admin/update-challenges)
 *  - Update Status  (GET /admin/update-status)
 */
@Component({
  selector: 'app-admin-tools',
  imports: [Logo3d, FormsModule],
  templateUrl: './admin-tools.html',
  styleUrl: './admin-tools.css',
})
export class AdminTools implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly adminApi = inject(AdminApiService);

  readonly tabs: { id: AdminTab; label: string }[] = [
    { id: 'scheduler', label: 'Scheduler Update' },
    { id: 'update', label: 'Instant Update' },
    { id: 'status', label: 'Status' },
  ];

  readonly activeTab = signal<AdminTab>('scheduler');

  // API-Key -----
  apiKeyInput = '';

  // Scheduler -----
  readonly minMinutes = SCHEDULE_MIN_MINUTES;
  readonly maxMinutes = SCHEDULE_MAX_MINUTES;
  readonly presets = SCHEDULE_PRESETS;

  scheduleEnabled = false;
  scheduleMinutes = SCHEDULE_MIN_MINUTES;

  readonly scheduleLoading = signal(false);
  readonly scheduleSaving = signal(false);
  readonly scheduleMessage = signal<string | null>(null);
  readonly scheduleError = signal<string | null>(null);

  // Instant Update -----
  readonly updateStarting = signal(false);
  readonly updateMessage = signal<string | null>(null);
  readonly updateError = signal<string | null>(null);

  // Update-Status -----
  readonly status = signal<UpdateStatusResponse | null>(null);
  readonly statusLoading = signal(false);
  readonly statusError = signal<string | null>(null);
  readonly lastChecked = signal<Date | null>(null);
  readonly isPolling = signal(false);

  readonly fetchStatsRows = computed(() => this.toRows(this.status()?.fetch_stats));
  readonly exportStatsRows = computed(() => this.toRows(this.status()?.export_stats));

  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Die Buttons im Profil öffnen /admin/tools?tab=...
    this.route.queryParamMap
      .pipe(takeUntilDestroyed())
      .subscribe((params) => {
        this.activeTab.set(this.readTab(params.get('tab')));
        this.loadActiveTab();
      });
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  // Tabs und API-Key -----

  selectTab(tab: AdminTab): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
    });
  }

  saveApiKey(): void {
    if (!this.apiKeyInput.trim()) {
      return;
    }

    this.adminApi.setApiKey(this.apiKeyInput);
    this.apiKeyInput = '';
    this.loadActiveTab();
  }

  clearApiKey(): void {
    this.adminApi.clearApiKey();
    this.stopPolling();
    this.status.set(null);
  }

  // Lädt die Daten für den Tab, der gerade offen ist
  private loadActiveTab(): void {
    if (!this.adminApi.hasApiKey()) {
      return;
    }

    if (this.activeTab() === 'scheduler') {
      this.loadSchedule();
    } else {
      this.loadStatus();
    }
  }

  // Scheduler -----

  loadSchedule(): void {
    this.scheduleLoading.set(true);
    this.scheduleError.set(null);
    this.scheduleMessage.set(null);

    this.adminApi.getSchedule().subscribe({
      next: (schedule) => {
        this.scheduleEnabled = schedule.enabled;
        this.scheduleMinutes = schedule.interval_minutes;
        this.scheduleLoading.set(false);
      },
      error: (error) => {
        this.scheduleError.set(this.getErrorMessage(error, 'Schedule could not be loaded'));
        this.scheduleLoading.set(false);
      },
    });
  }

  saveSchedule(): void {
    if (!this.isScheduleValid()) {
      this.scheduleError.set(
        `Interval must be between ${this.minMinutes} and ${this.maxMinutes} minutes`,
      );
      return;
    }

    this.scheduleSaving.set(true);
    this.scheduleError.set(null);
    this.scheduleMessage.set(null);

    this.adminApi
      .updateSchedule({
        enabled: this.scheduleEnabled,
        interval_minutes: this.scheduleMinutes,
      })
      .subscribe({
        next: (response) => {
          this.scheduleEnabled = response.schedule.enabled;
          this.scheduleMinutes = response.schedule.interval_minutes;
          this.scheduleMessage.set(response.message);
          this.scheduleSaving.set(false);
        },
        error: (error) => {
          this.scheduleError.set(this.getErrorMessage(error, 'Schedule could not be saved'));
          this.scheduleSaving.set(false);
        },
      });
  }

  usePreset(minutes: number): void {
    this.scheduleMinutes = minutes;
  }

  isScheduleValid(): boolean {
    return (
      Number.isInteger(this.scheduleMinutes) &&
      this.scheduleMinutes >= this.minMinutes &&
      this.scheduleMinutes <= this.maxMinutes
    );
  }

  // Macht aus Minuten einen lesbaren Text, z. B. 1500 -> "1 d 1 h"
  formatInterval(minutes: number): string {
    if (!minutes || minutes < 0) {
      return '–';
    }

    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const rest = minutes % 60;

    const parts: string[] = [];

    if (days > 0) {
      parts.push(`${days} d`);
    }

    if (hours > 0) {
      parts.push(`${hours} h`);
    }

    if (rest > 0) {
      parts.push(`${rest} min`);
    }

    return parts.join(' ');
  }

  // Instant Update -----

  startInstantUpdate(): void {
    this.updateStarting.set(true);
    this.updateError.set(null);
    this.updateMessage.set(null);

    this.adminApi.startInstantUpdate().subscribe({
      next: (response) => {
        this.updateMessage.set(response.message);
        this.updateStarting.set(false);

        // Nach dem Start den Status beobachten, bis das Update fertig ist
        this.loadStatus();
        this.startPolling();
      },
      error: (error) => {
        this.updateError.set(this.getErrorMessage(error, 'Update could not be started'));
        this.updateStarting.set(false);
      },
    });
  }

  // Update-Status -----

  loadStatus(): void {
    this.statusLoading.set(true);
    this.statusError.set(null);

    this.adminApi.getUpdateStatus().subscribe({
      next: (response) => {
        this.status.set(response);
        this.lastChecked.set(new Date());
        this.statusLoading.set(false);

        if (this.isPolling() && !this.isRunning(response.status)) {
          this.stopPolling();
        }
      },
      error: (error) => {
        this.statusError.set(this.getErrorMessage(error, 'Status could not be loaded'));
        this.statusLoading.set(false);
        this.stopPolling();
      },
    });
  }

  // Farbe des Status-Badges: läuft = gelb, fertig = grün, Fehler = rot
  getStatusClass(status: string | undefined): string {
    const value = (status ?? '').toLowerCase();

    if (this.isRunning(value)) {
      return 'badge--running';
    }

    if (value.includes('error') || value.includes('fail')) {
      return 'badge--error';
    }

    if (
      value.includes('success') ||
      value.includes('done') ||
      value.includes('complete') ||
      value.includes('finish')
    ) {
      return 'badge--success';
    }

    return 'badge--idle';
  }

  private isRunning(status: string): boolean {
    const value = status.toLowerCase();

    return value.includes('run') || value.includes('start') || value.includes('pending');
  }

  private startPolling(): void {
    this.stopPolling();
    this.isPolling.set(true);

    this.pollTimer = setInterval(() => this.loadStatus(), UPDATE_STATUS_POLL_INTERVAL);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    this.isPolling.set(false);
  }

  // Wandelt die Stats-Objekte aus der API in Zeilen für eine Tabelle um
  private toRows(stats: { [key: string]: any } | null | undefined): StatRow[] {
    if (!stats) {
      return [];
    }

    return Object.entries(stats).map(([key, value]) => ({
      key: key.replaceAll('_', ' '),
      value: typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value),
    }));
  }

  // Hilfsfunktionen -----

  private readTab(value: string | null): AdminTab {
    if (value === 'update' || value === 'status') {
      return value;
    }

    return 'scheduler';
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (!(error instanceof HttpErrorResponse)) {
      return fallback;
    }

    if (error.status === 401 || error.status === 403) {
      return 'API key is not valid';
    }

    if (error.status === 422) {
      return 'Request was not accepted (check API key and values)';
    }

    if (error.status === 409) {
      return 'An update is already running';
    }

    if (error.status === 0) {
      return 'API unreachable';
    }

    const detail = error.error?.detail;
    return typeof detail === 'string' ? detail : fallback;
  }
}
