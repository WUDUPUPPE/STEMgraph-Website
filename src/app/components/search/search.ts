import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ChallengeSuggestion, SearchType } from '../../core/models/search.model';
import { GraphSelectionService } from '../../core/services/graph-selection.service';
import { STEMgraphApiService } from '../../core/services/stemgraph-api.service';

// So viele Vorschläge werden maximal unter dem Suchfeld angezeigt
const MAX_SUGGESTIONS = 8;

@Component({
  selector: 'app-search',
  imports: [FormsModule],
  templateUrl: './search.html',
  styleUrl: './search.css',
})

// Zeigt ein Suchfeld an, das Challenges und Keywords durchsuchen kann, mit Autovervollständigung
export class Search implements OnInit {
  private readonly router = inject(Router);
  private readonly api = inject(STEMgraphApiService);
  private readonly graphSelection = inject(GraphSelectionService);

  searchTerm = '';
  searchType: SearchType = 'challenges';

  suggestions: string[] = [];

  private challenges: ChallengeSuggestion[] = [];
  private keywords: string[] = [];

  // Lädt die Liste der Challenges und Keywords, um die Autovervollständigung zu ermöglichen
  ngOnInit(): void {
    forkJoin({
      challenges: this.api.mainList(),
      keywords: this.api.keywordsList(),
    }).subscribe({
      next: ({ challenges, keywords }) => {
        this.challenges = challenges as ChallengeSuggestion[];
        this.keywords = keywords.keywords ?? [];
      },
      error: (error) => {
        console.error('Autocomplete data could not be loaded:', error);
      },
    });
  }
// Aktualisiert die Vorschläge basierend auf dem aktuellen Suchbegriff und dem ausgewählten Suchtyp
  updateSuggestions(): void {
    const query = this.searchTerm.trim().toLowerCase();

    if (!query) {
      this.suggestions = [];
      return;
    }

    if (this.searchType === 'keywords') {
      this.suggestions = this.keywords
        .filter((keyword) => keyword.toLowerCase().includes(query))
        .slice(0, MAX_SUGGESTIONS);
      return;
    }

    this.suggestions = this.challenges
      .filter((challenge) => challenge.teaches?.toLowerCase().includes(query))
      .slice(0, MAX_SUGGESTIONS)
      .map((challenge) => challenge.teaches);
  }

  // Wählt einen Vorschlag aus der Liste aus und öffnet die entsprechende Challenge oder das Keyword
  selectSuggestion(suggestion: string): void {
    this.searchTerm = suggestion;
    this.suggestions = [];

    if (this.searchType === 'challenges') {
      const challenge = this.findChallenge(suggestion);

      if (challenge) {
        this.openChallengeInGraph(challenge.id);
      }
    }

    if (this.searchType === 'keywords') {
      this.openKeyword(suggestion);
    }
  }

  // Führt die Suche aus, basierend auf dem aktuellen Suchbegriff und dem ausgewählten Suchtyp
  submitSearch(): void {
    const query = this.searchTerm.trim();

    if (!query) {
      return;
    }

    switch (this.searchType) {
      case 'keywords':
        this.openKeyword(query);
        break;

      case 'challenges':
        if (!this.searchChallenge(query)) {
          return;
        }
        break;
    }

    this.suggestions = [];
  }

  // Gibt false zurück, wenn die Challenge nicht gefunden wurde
  private searchChallenge(query: string): boolean {
    const challenge = this.findChallenge(query);

    if (!challenge) {
      console.warn('Challenge not found:', query);
      return false;
    }

    this.openChallengeInGraph(challenge.id);

    return true;
  }

  // Öffnet die Keyword-Seite, dort wird das Keyword im Graphen ausgewählt
  private openKeyword(keyword: string): void {
    this.router.navigate(['/keywords'], { queryParams: { kw: keyword } });
  }

  private openChallengeInGraph(id: string): void {
    this.graphSelection.selectChallenge(id);
  }

  private findChallenge(query: string): ChallengeSuggestion | undefined {
    const normalized = query.toLowerCase();

    return this.challenges.find(
      (challenge) =>
        challenge.id.toLowerCase() === normalized ||
        challenge.teaches.toLowerCase() === normalized
    );
  }
}
