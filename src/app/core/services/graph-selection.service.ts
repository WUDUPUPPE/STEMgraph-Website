import { Injectable, signal } from '@angular/core';

/**
 * Verbindet die Suche (Navbar) mit dem Graphen:
 * Die Suche setzt die Auswahl, der Explorer liest sie aus.
 */
@Injectable({
  providedIn: 'root',
})

export class GraphSelectionService {
  readonly selectedChallengeId = signal<string | null>(null);

  selectChallenge(id: string): void {
    this.selectedChallengeId.set(id);
  }

  clearSelection(): void {
    this.selectedChallengeId.set(null);
  }
}
