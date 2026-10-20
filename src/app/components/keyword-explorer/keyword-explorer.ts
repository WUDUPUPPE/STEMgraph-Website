import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { GraphResponse, Node } from '../../api/models';
import { KeywordGraphMapper } from '../../core/mappers/keyword-graph.mapper';
import { STEMgraphApiService } from '../../core/services/stemgraph-api.service';
import { Graph3d } from '../graph-3d/graph-3d';

type KeywordView = 'sphere' | 'graph';

/** Zeigt alle Keywords als 3D-Graph (Kugel oder Cluster), wie bei den Challenges. */
@Component({
  selector: 'app-keyword-explorer',
  imports: [Graph3d],
  templateUrl: './keyword-explorer.html',
  styleUrl: './keyword-explorer.css',
})
export class KeywordExplorer implements OnInit, OnChanges {
  private readonly stemgraphApi = inject(STEMgraphApiService);
  private readonly keywordGraphMapper = inject(KeywordGraphMapper);

  /** Das Keyword, das im Graphen ausgewählt sein soll (z. B. durch die Suche). */
  @Input() selectedKeyword: string | null = null;

  /** Wird ausgelöst, wenn im Graphen ein Keyword angeklickt wurde. */
  @Output() keywordSelected = new EventEmitter<string>();

  protected readonly viewMode = signal<KeywordView>('sphere');
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly graph = signal<GraphResponse | null>(null);

  /** Das zuletzt angeklickte Keyword, um Klick und Suche zu unterscheiden. */
  private lastClickedKeyword: string | null = null;

  ngOnInit(): void {
    this.loadGraph();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const change = changes['selectedKeyword'];

    // Kommt die Auswahl aus der Suche (nicht aus einem Klick), zeigen wir den Graph-Modus.
    if (change && this.selectedKeyword && this.selectedKeyword !== this.lastClickedKeyword) {
      this.viewMode.set('graph');
    }
  }

  protected showSphere(): void {
    this.viewMode.set('sphere');
  }

  protected showGraph(): void {
    this.viewMode.set('graph');
  }

  protected onNodeSelected(node: Node): void {
    this.lastClickedKeyword = node.id;
    this.keywordSelected.emit(node.id);
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
        console.error('Keyword graph could not be loaded:', error);
        this.errorMessage.set('Keyword graph could not be loaded');
        this.isLoading.set(false);
      },
    });
  }
}
