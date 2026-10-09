import { Injectable, signal } from "@angular/core";

@Injectable({
  providedIn: "root",
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