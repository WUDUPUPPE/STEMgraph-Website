import { Component, Input, OnInit, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChallengeListResponse, GraphResponse } from '../../api/models';
import { GraphSelectionService } from '../../core/services/graph-selection.service';
import { STEMgraphApiService } from '../../core/services/stemgraph-api.service';
import { ChallengeGraph } from '../challenge-graph/challenge-graph';

type ExplorerView = 'sphere' | 'graph' | 'list';

@Component({
  selector: 'app-challenge-explorer',
  imports: [ChallengeGraph, RouterLink],
  templateUrl: './challenge-explorer.html',
  styleUrl: './challenge-explorer.css',
})
export class ChallengeExplorer implements OnInit {
  private readonly stemgraphApi = inject(STEMgraphApiService);
  private readonly graphSelection = inject(GraphSelectionService);

  @Input() isAdmin = false;

  protected readonly viewMode = signal<ExplorerView>('sphere');
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly openedChallengeId = signal<string | null>(null);

  protected readonly list = signal<ChallengeListResponse[]>([]);
  protected readonly graph = signal<GraphResponse | null>(null);

  protected readonly selectedChallengeId = signal<string | null>(null);

  /** Wechselt zur Graph-Ansicht, sobald in der Suche eine Challenge gewählt wurde. */
  private readonly selectedChallengeEffect = effect(() => {
    const selectedId = this.graphSelection.selectedChallengeId();

    if (!selectedId) {
      return;
    }

    this.viewMode.set('graph');
    this.selectedChallengeId.set(selectedId);

    if (this.graph() === null) {
      this.loadGraph();
    }

    this.graphSelection.clearSelection();
  });

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
      currentId === challengeId ? null : challengeId
    );
  }

  private loadList(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.stemgraphApi.mainList().subscribe({
      next: (response) => {
        this.list.set(response);
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

    this.stemgraphApi.mainGraph().subscribe({
      next: (response) => {
        this.graph.set(response);
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
