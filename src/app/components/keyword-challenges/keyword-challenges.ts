import { Component, Input, OnChanges, OnDestroy, SimpleChanges, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChallengeByKeywordListItem } from '../../api/models';
import { STEMgraphApiService } from '../../core/services/stemgraph-api.service';

/** Listet alle Challenges auf, die das ausgewählte Keyword haben. */
@Component({
  selector: 'app-keyword-challenges',
  imports: [RouterLink],
  templateUrl: './keyword-challenges.html',
  styleUrl: './keyword-challenges.css',
})
export class KeywordChallenges implements OnChanges, OnDestroy {
  private readonly stemgraphApi = inject(STEMgraphApiService);
  private loadSubscription?: Subscription;

  @Input() keyword: string | null = null;

  protected readonly challenges = signal<ChallengeByKeywordListItem[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly hasError = signal(false);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['keyword']) {
      this.loadChallenges();
    }
  }

  ngOnDestroy(): void {
    this.loadSubscription?.unsubscribe();
  }

  private loadChallenges(): void {
    this.loadSubscription?.unsubscribe();

    this.challenges.set([]);
    this.hasError.set(false);
    this.isLoading.set(false);

    if (!this.keyword) {
      return;
    }

    this.isLoading.set(true);

    this.loadSubscription = this.stemgraphApi
      .keywordChallengesList(this.keyword)
      .subscribe({
        next: (response) => {
          this.challenges.set(response.items ?? []);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Challenges of keyword could not be loaded:', error);
          this.hasError.set(true);
          this.isLoading.set(false);
        },
      });
  }
}
