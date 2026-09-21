import { Injectable, inject, signal } from "@angular/core";
import { STEMgraphApiService } from "./stemgraph-api.service";

export type ApiStatus = 'checking' | 'online' | 'degraded' | 'offline';

@Injectable({
  providedIn: 'root',
})

export class ApiStatusService {
  private readonly stemgraphApi = inject(STEMgraphApiService);

  readonly status = signal<ApiStatus>('checking');
  readonly message = signal('Check API- and Databasestatus');

  check(): void {
    this.status.set('checking');
    this.message.set('Check API- and Databasestatus');

    this.stemgraphApi.Healthcheck().subscribe({
      next: () => this.status.set('online'),
      error: () => this.status.set('offline'),
    });
  }
}
