import { Injectable, inject, signal } from "@angular/core";
import { STEMgraphApiService } from "./stemgraph-api.service";

export type ApiStatus = 'checking' | 'online' | 'degraded' | 'offline';

@Injectable({
  providedIn: 'root',
})

export class ApiStatusService {
  private readonly stemgraphApi = inject(STEMgraphApiService);

  readonly status = signal<ApiStatus>('checking');
  readonly apiMessage = signal('Checking API status ...');
  readonly databaseMessage = signal('Checking Neo4j status ...');

  check(): void {
    this.status.set('checking');
    this.apiMessage.set('Checking API status ...');
    this.databaseMessage.set('Checking Neo4j status ...');

    this.stemgraphApi.Healthcheck().subscribe({
      next: () => {
        this.apiMessage.set('API is running');
        this.checkDatabase();
      },
      error: () => {
        this.status.set('offline');
        this.apiMessage.set('API unreachable');
        this.databaseMessage.set('Neo4j unavailable');
      },
    });
  }

  private checkDatabase(): void {
    this.stemgraphApi.Databasecheck().subscribe({
      next: response => {
        if (response.status === 'online') {
          this.status.set('online');
          this.databaseMessage.set(response.message ?? 'API and Neo4j are reachable');
          return;
        }

        this.status.set('degraded');
        this.databaseMessage.set(response.message ?? 'API is reachable, but Neo4j is unavailable');
      },
      error: () => {
        this.status.set('degraded');
        this.databaseMessage.set('API is reachable, but Neo4j could´nt be checked');
      },
    });
  }
}
