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
  readonly databaseMessage = signal('Checking Database status ...');

  check(): void {
    this.status.set('checking');
    this.apiMessage.set('Checking API status ...');
    this.databaseMessage.set('Checking Database status ...');

    this.stemgraphApi.Healthcheck().subscribe({
      next: () => {
        this.apiMessage.set('API is running');
        this.checkDatabase();
      },
      error: () => {
        this.status.set('offline');
        this.apiMessage.set('API unreachable');
        this.databaseMessage.set('Database status unavailable');
      },
    });
  }

  private checkDatabase(): void {
    this.stemgraphApi.Databasecheck().subscribe({
      next: response => {
        if (response.status === 'online') {
          this.status.set('online');
          this.databaseMessage.set(response.message ?? 'API and Neo4j database are reachable');
          return;
        }

        this.status.set('degraded');
        this.databaseMessage.set(response.message ?? 'API is reachable, but the Neo4j database is unavailable');
      },
      error: () => {
        this.status.set('degraded');
        this.databaseMessage.set('API is reachable, but the database status could´nt be checked');
      },
    });
  }
}
