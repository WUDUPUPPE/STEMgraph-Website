import { Component, OnInit, inject, input, signal } from '@angular/core';
import { STEMgraphApiService } from '../../service/stemgraph-api.service';
import { ChallengeListResponse } from '../../api/models';

type ExplorerView = 'graph' | 'list';

@Component({
  selector: 'app-challenge-explorer',
  imports: [],
  templateUrl: './challenge-explorer.html',
  styleUrl: './challenge-explorer.css',
})
export class ChallengeExplorer implements OnInit {
  private readonly stemgraphApi = inject(STEMgraphApiService);

  readonly isAdmin = input(false);

  protected readonly viewMode = signal<ExplorerView>('graph');
  protected readonly challenges = signal<ChallengeListResponse[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly openedChallengeId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadList();
  }

  protected showList(): void {
    this.viewMode.set('list');
    this.loadList();
  }

  protected showGraph(): void {
    this.viewMode.set('graph');
  }

  protected toogleChallenge(challengeId: string): void {
    this.openedChallengeId.update((currentId) =>
    currentId === challengeId ? null : challengeId);
  }

  private loadList(): void{
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.stemgraphApi.MainList().subscribe({
      next: (response) => {
        this.challenges.set(response);
        console.log('Main list:', response);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Challenge list could not be loaded:', error);
        this.errorMessage.set('Challenge list could not be loaded');
        this.isLoading.set(false);
      },
    });
  }
}
