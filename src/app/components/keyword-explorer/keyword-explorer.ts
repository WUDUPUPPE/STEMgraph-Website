import { Component, EventEmitter, Input,  OnInit, Output, computed, inject, signal } from '@angular/core';
import { GraphResponse, Node } from '../../api/models';
import { KeywordGraphMapper } from '../../core/mappers/keyword-graph.mapper';
import { STEMgraphApiService } from '../../core/services/stemgraph-api.service';
import { KeywordBackground, KeywordColor } from '../../core/utils/keyword-color.util';
import { Graph3d } from '../graph-3d/graph-3d';

type KeywordView = 'sphere' | 'list';

// Zeigt alle Keywords als 3D-Kugel oder als Liste
@Component({
  selector: 'app-keyword-explorer',
  imports: [Graph3d],
  templateUrl: './keyword-explorer.html',
  styleUrl: './keyword-explorer.css',
})

export class KeywordExplorer implements OnInit {
  private readonly stemgraphApi = inject(STEMgraphApiService);
  private readonly keywordGraphMapper = inject(KeywordGraphMapper);

  // Das Keyword, das in der Kugel ausgewählt sein soll (z. B. durch die Suche)
  @Input() selectedKeyword: string | null = null;

  // Wird ausgelöst, wenn ein Keyword angeklickt wurde (Kugel oder Liste
  @Output() keywordSelected = new EventEmitter<string>();

  protected readonly viewMode = signal<KeywordView>('sphere');
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly graph = signal<GraphResponse | null>(null);

  // Alle Keywords von A bis Z für die Listenansicht
  protected readonly keywords = computed(() =>
    (this.graph()?.nodes ?? [])
      .map((node) => node.id)
      .sort((a, b) => a.localeCompare(b)),
  );

  // jedes Keyword bekommt seine eigene Farbe
  protected readonly KeywordColor = KeywordColor;
  protected readonly KeywordBackground = KeywordBackground;

  ngOnInit(): void {
    this.loadGraph();
  }

  protected showSphere(): void {
    this.viewMode.set('sphere');
  }

  protected showList(): void {
    this.viewMode.set('list');
  }

  protected onNodeSelected(node: Node): void {
    this.keywordSelected.emit(node.id);
  }

  protected selectKeyword(keyword: string): void {
    this.keywordSelected.emit(keyword);
  }

  private loadGraph(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.stemgraphApi.keywordsGraph().subscribe({
      next: (response) => {
        this.graph.set(this.keywordGraphMapper.toGraphResponse(response));
        this.isLoading.set(false);
      },
      error: (error) => {
        // /keywords/graph liefert gerade einen Fehler -> Keywords aus /list holen
        console.error('Keyword graph could not be loaded, using /list instead:', error);
        this.loadGraphFromChallengeList();
      },
    });
  }

  private loadGraphFromChallengeList(): void {
    this.stemgraphApi.mainList().subscribe({
      next: (challenges) => {
        this.graph.set(this.keywordGraphMapper.fromChallengeList(challenges));
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Challenge list could not be loaded:', error);
        this.errorMessage.set('Keywords could not be loaded');
        this.isLoading.set(false);
      },
    });
  }
}
