import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { KeywordChallenges } from '../../components/keyword-challenges/keyword-challenges';
import { KeywordExplorer } from '../../components/keyword-explorer/keyword-explorer';
import { Logo3d } from '../../components/logo-3d/logo-3d';

@Component({
  imports: [Logo3d, KeywordExplorer, KeywordChallenges],
  selector: 'app-keywords',
  styleUrl: './keywords.css',
  templateUrl: './keywords.html',
})

// Seite, die alle Keywords anzeigt und die Suche ermöglicht. Außerdem kann hier ein Keyword ausgewählt werden, um die Challenges zu diesem Keyword anzuzeigen
export class Keywords {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // Das aktuell ausgewählte Keyword (aus der Suche oder per Klick im Graphen
  protected readonly selectedKeyword = signal<string | null>(null);

  constructor() {
    // Die Suche navigiert nach /keywords?kw=<keyword>
    this.route.queryParamMap
      .pipe(takeUntilDestroyed())
      .subscribe((params) => this.selectedKeyword.set(params.get('kw')));
  }

  protected onKeywordSelected(keyword: string): void {
    this.selectedKeyword.set(keyword);
  }

  // Overlay geschlossen: Auswahl löschen und ?kw= aus der URL entfernen
  protected onPanelClosed(): void {
    this.selectedKeyword.set(null);
    this.router.navigate(['/keywords']);
  }
}
