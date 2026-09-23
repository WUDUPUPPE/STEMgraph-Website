import { Component, OnInit, inject, input, signal } from '@angular/core';
import { STEMgraphApiService } from '../../service/stemgraph-api.service';
import { ChallengeListResponse, GraphResponse } from '../../api/models';
import { ChallengeGraph } from '../challenge-graph/challenge-graph';

type ExplorerView = 'sphere' | 'graph' | 'list';

@Component({
  selector: 'app-challenge-explorer',
  imports: [ChallengeGraph],
  templateUrl: './challenge-explorer.html',
  styleUrl: './challenge-explorer.css',
})
export class ChallengeExplorer implements OnInit {
  private readonly stemgraphApi = inject(STEMgraphApiService);

  readonly isAdmin = input(false);

  protected readonly viewMode = signal<ExplorerView>('sphere');
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly openedChallengeId = signal<string | null>(null);

  protected readonly list = signal<ChallengeListResponse[]>([]);
  protected readonly graph = signal<GraphResponse | null>(null);


  ngOnInit(): void {
    this.loadGraph();
  }

  protected showSphere(): void {
    this.viewMode.set('sphere');

    if (this.graph() === null) {
      this.loadGraph();
    }
  }

  protected showGraph(): void {
    this.viewMode.set('graph');

    if (this.graph() === null) {
      this.loadGraph();
    }
  }

  protected showList(): void {
    this.viewMode.set('list');
    this.loadList();
  }

  protected toggleChallenge(challengeId: string): void {
    this.openedChallengeId.update((currentId) =>
    currentId === challengeId ? null : challengeId);
  }

  private loadList(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.stemgraphApi.MainList().subscribe({
      next: (response) => {
        this.list.set(response);
        console.log('Main list:', response);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Challenge list could not be loaded:', error);
        this.errorMessage.set('List could not be loaded');
        this.isLoading.set(false);
      },
    });
  }

  private loadGraph(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.stemgraphApi.MainGraph().subscribe({
      next: (response) => {
        this.graph.set(response);
        console.log('Maingraph:', response);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Main graph could not be loaded:', error);
        this.errorMessage.set('Graph could not be loaded');
        this.isLoading.set(false);
      },
    });
  }
}
