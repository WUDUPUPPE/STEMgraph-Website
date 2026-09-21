import { Injectable, inject, signal } from "@angular/core";
import { STEMgraphApiService } from "./stemgraph-api.service";

export type ApiStatus = 'checking' | 'online' | 'degraded' | 'offline';

@Injectable({
  providedIn: 'root',
})

export class ApiStatusService {
  private readonly stemgraphApi = inject(STEMgraphApiService);

  readonly status = signal<ApiStatus>('checking');
  readonly message = signal('Checking API status ...');

  check(): void {
    this.status.set('checking');
    this.message.set('Checking API and database status ...');

    this.stemgraphApi.Healthcheck().subscribe({
      next: () => this.checkDatabase(),
      error: () => {
        this.status.set('offline');
        this.message.set('API unreachable');
      },
    });
  }

  private checkDatabase(): void {
    this.stemgraphApi.Databasecheck().subscribe({
      next: response => {
        if (response.status === 'online') {
          this.status.set('online');
          this.message.set(response.message ?? 'API and Neo4j database are reachable');
          return;
        }

        this.status.set('degraded');
        this.message.set(response.message ?? 'API is reachable, but the Neo4j database is unavailable');
      },
      error: () => {
        this.status.set('degraded');
        this.message.set('API is reachable, but the database status could´nt be checked');
      },
    });
  }
}
