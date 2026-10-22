import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { toPreviewText } from '../utils/markdown-preview.util';
import { STEMgraphApiService } from './stemgraph-api.service';

// Lädt die README-Vorschau einer Challenge (für Tooltip und Detail-Karussell
@Injectable({
  providedIn: 'root',
})
export class ReadmePreviewService {
  private readonly api = inject(STEMgraphApiService);
  private readonly cache = new Map<string, string>();

  // Gibt die bereits geladene Vorschau zurück (oder undefined)
  getCached(challengeId: string): string | undefined {
    return this.cache.get(challengeId);
  }

  // Lädt die Vorschau immer neu vom Server
  load(challengeId: string): Observable<string> {
    return this.api.challengeContent(challengeId).pipe(
      map((content) => toPreviewText(content.content_markdown ?? '')),
    );
  }

  // Wie load(), merkt sich das Ergebnis aber zusätzlich im Cache
  loadAndCache(challengeId: string): Observable<string> {
    return this.load(challengeId).pipe(
      tap((preview) => this.cache.set(challengeId, preview)),
    );
  }
}
