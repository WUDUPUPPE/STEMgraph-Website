import { Injectable, inject, signal } from "@angular/core";
import { STEMgraphApiService } from "./stemgraph-api.service";

export type ApiStatus = 'checking' | 'online' | 'offline';

@Injectable({
  providedIn: 'root',
})

export class ApiStatusService {
  private readonly stemgraphApi = inject(STEMgraphApiService);

  readonly status = signal<ApiStatus>('checking');

  check(): void {
    this.status.set('checking');

    this.stemgraphApi.Healthcheck().subscribe({
      next: () => this.status.set('online'),
      error: () => this.status.set('offline'),
    });
  }
}
