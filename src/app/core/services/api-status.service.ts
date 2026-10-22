import { Injectable, inject, signal } from '@angular/core';
import { ApiStatus } from '../models/api-status.model';
import { STEMgraphApiService } from './stemgraph-api.service';

@Injectable({
  providedIn: 'root',
})

// Service, der den Status der API und der Datenbank überprüft und den Status als Signal bereitstellt
export class ApiStatusService {
  private readonly stemgraphApi = inject(STEMgraphApiService);

  readonly status = signal<ApiStatus>('checking');
  readonly apiMessage = signal('Checking API status ...');
  readonly databaseMessage = signal('Checking Neo4j status ...');

  check(): void {
    this.status.set('checking');
    this.apiMessage.set('Checking API status ...');
    this.databaseMessage.set('Checking Neo4j status ...');

    this.stemgraphApi.healthcheck().subscribe({
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

  // Prüft den Status der Datenbank und aktualisiert die Signale entsprechend
  private checkDatabase(): void {
    this.stemgraphApi.databasecheck().subscribe({
      next: (response) => {
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
        this.databaseMessage.set('API is reachable, but Neo4j could not be checked');
      },
    });
  }
}
