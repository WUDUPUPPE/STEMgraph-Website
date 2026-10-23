import { isPlatformBrowser } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy, Output, PLATFORM_ID, SimpleChanges, ViewChild, effect, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { Timer } from 'three';
import { GraphResponse, Node } from '../../api/models';
import { getStatusOption } from '../../core/constants/challenge-progress.constants';
import { AuthService } from '../../core/services/auth.service';
import { ChallengeProgressService } from '../../core/services/challenge-progress.service';
import { ReadmePreviewService } from '../../core/services/readme-preview.service';
import { NodeDetailCarousel } from '../node-detail-carousel/node-detail-carousel';
import { KeywordBackground, KeywordColor } from '../../core/utils/keyword-color.util';
import { DEFAULT_CLUSTER_CONFIG, DEFAULT_GRAPH_CONFIG, Graph3dConfig, GraphClusterConfig, GraphLayoutMode, GraphNodeKind } from './config/graph-3d.config';
import { ClusterLayout } from './layout/cluster-layout';
import { GraphLayout } from './layout/graph-layout';
import { SphereLayout } from './layout/sphere-layout';
import { ClusterPhysics } from './scene/cluster-physics';
import { GraphInteraction } from './scene/graph-interaction';
import { GraphView } from './scene/graph-view';
import { NodeStatusGlow } from './scene/node-status-glow';
import { SceneManager } from './scene/scene-manager';
import { SelectionRing } from './scene/selection-ring';

/**
 * Zeigt den Challenge-Graphen in 3D (three.js).
 *
 * Die Komponente ist nur noch der "Kleber" zwischen Angular und den
 * 3D-Klassen im Ordner scene/ und layout/:
 *  - SceneManager      Szene, Kamera, Renderer, Steuerung
 *  - GraphView         Knoten, Kanten, Animationen
 *  - ClusterPhysics    Physik im Cluster-Modus
 *  - GraphInteraction  Maus (Hover, Klick, Ziehen)
 *  - SelectionRing     Ring um den ausgewählten Knoten
 *  - NodeStatusGlow    leuchtender Schatten je nach Challenge-Status
 */

@Component({
  selector: 'app-graph-3d',
  standalone: true,
  imports: [NodeDetailCarousel],
  templateUrl: './graph-3d.html',
  styleUrl: './graph-3d.css',
})

export class Graph3d implements AfterViewInit, OnChanges, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly readmePreviews = inject(ReadmePreviewService);
  private readonly progress = inject(ChallengeProgressService);

  readonly auth = inject(AuthService);

  @ViewChild('canvas', { static: true })
  private canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() graphData?: GraphResponse | null = null;
  @Input() autoRotate = true;
  @Input() interactive = true;
  @Input() layoutMode: GraphLayoutMode = 'sphere';
  @Input() isAdmin = false;
  @Input() nodeKind: GraphNodeKind = 'challenge';

  /** ID des Knotens, der von außen (z. B. durch die Suche) ausgewählt werden soll. */
  @Input() selectedNodeId: string | null = null;

  /** Wird ausgelöst, wenn der Benutzer im Keyword-Graph einen Knoten anklickt. */
  @Output() nodeSelected = new EventEmitter<Node>();

  readonly config: Graph3dConfig = { ...DEFAULT_GRAPH_CONFIG };
  readonly clusterConfig: GraphClusterConfig = { ...DEFAULT_CLUSTER_CONFIG };

  // Tooltip beim Hover (wird im Template angezeigt)
  readonly hoverTooltip = {
    visible: false,
    x: 0,
    y: 0,
    node: null as Node | null,
  };
  readonly hoverReadme = signal('');

  // jedes Keyword bekommt seine eigene Farbe (für die Chips im Tooltip)
  readonly KeywordColor = KeywordColor;
  readonly KeywordBackground = KeywordBackground;
  readonly hoverReadmeLoading = signal(false);

  private hoverReadmeSubscription?: Subscription;
  private hoverReadmeNodeId: string | null = null;

  // Detail-Karussell
  carouselOpen = false;
  carouselCurrent: Node | null = null;
  carouselPredecessors: Node[] = [];
  carouselSuccessors: Node[] = [];

  private selectedNode: Node | null = null;

  // 3D-Klassen (werden erst in ngAfterViewInit erzeugt)
  private sceneManager!: SceneManager;
  private graphView!: GraphView;
  private physics!: ClusterPhysics;
  private interaction!: GraphInteraction;
  private selectionRing!: SelectionRing;
  private statusGlow!: NodeStatusGlow;

  private readonly timer = new Timer();
  private animationId = 0;
  private destroyed = false;
  private viewInitialized = false;

  // Sobald der Benutzer einen Status ändert, werden die Glows neu gesetzt.
  private readonly progressEffect = effect(() => {
    this.progress.entries();

    if (this.viewInitialized) {
      this.applyStatusGlows();
    }
  });

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // three.js läuft außerhalb von Angular, damit nicht bei jedem Frame
    // die Change Detection startet.
    this.zone.runOutsideAngular(() => {
      this.createSceneObjects();
      this.syncInputs();
      this.interaction.bind();
      this.viewInitialized = true;

      if (this.graphData) {
        this.buildGraph(this.graphData);
        this.selectRequestedNode();
      }

      this.animate();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.viewInitialized) {
      return;
    }

    this.syncInputs();

    if (changes['layoutMode'] && !changes['layoutMode'].firstChange) {
      this.closeCarousel();
    }

    if (changes['graphData'] && this.graphData) {
      this.buildGraph(this.graphData);
    }

    if (changes['selectedNodeId'] && this.selectedNodeId) {
      this.selectRequestedNode();
    }
  }

  ngOnDestroy(): void {
    this.hoverReadmeSubscription?.unsubscribe();
    this.destroyed = true;

    if (typeof cancelAnimationFrame !== 'undefined' && this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    if (isPlatformBrowser(this.platformId)) {
      this.interaction?.unbind();
    }

    this.statusGlow?.dispose();
    this.graphView?.dispose();
    this.sceneManager?.dispose();
  }

  // ---------------------------------------------------------------------------
  // Aufbau
  // ---------------------------------------------------------------------------

  private createSceneObjects(): void {
    const canvas = this.canvasRef.nativeElement;

    this.sceneManager = new SceneManager(canvas, this.config, {
      interactive: this.interactive,
      autoRotate: this.autoRotate,
    });

    this.graphView = new GraphView(
      this.sceneManager.graphGroup,
      this.config,
      this.clusterConfig
    );

    this.physics = new ClusterPhysics(this.graphView, this.clusterConfig);

    this.selectionRing = new SelectionRing(
      this.sceneManager.graphGroup,
      this.graphView.nodes,
      this.config
    );

    this.statusGlow = new NodeStatusGlow(
      this.sceneManager.graphGroup,
      this.graphView.nodes,
      this.config
    );

    this.interaction = new GraphInteraction(
      canvas,
      this.sceneManager,
      this.graphView,
      this.physics,
      {
        onHover: (node, event) => this.updateHoverTooltip(node, event),
        onNodeClick: (node) => this.onNodeClicked(node),
      }
    );
  }

  /** Gibt die aktuellen Input-Werte an die 3D-Klassen weiter. */
  private syncInputs(): void {
    this.graphView.layoutMode = this.layoutMode;
    this.graphView.colorByKeyword = this.nodeKind === 'keyword';
    this.physics.layoutMode = this.layoutMode;
    this.interaction.layoutMode = this.layoutMode;
    this.interaction.interactive = this.interactive;
  }

  private createLayout(): GraphLayout {
    return this.layoutMode === 'sphere'
      ? new SphereLayout(this.config)
      : new ClusterLayout(this.clusterConfig);
  }

  private buildGraph(data: GraphResponse): void {
    this.graphView.build(data, this.createLayout());
    this.physics.reset();
    this.applyStatusGlows();

    const isCluster = this.layoutMode === 'cluster';

    this.sceneManager.setZoomLimits(
      isCluster ? this.clusterConfig.minZoom : this.config.minZoom,
      isCluster ? this.clusterConfig.maxZoom : this.config.maxZoom
    );
  }

  /** Gibt jedem Knoten mit Status (fertig / todo / schwer) seinen farbigen Glow. */
  private applyStatusGlows(): void {
    const colorById = new Map<string, number>();

    // Keywords haben keinen Status, nur Challenges
    if (this.nodeKind === 'challenge') {
      this.progress.entries().forEach((entry) => {
        colorById.set(entry.id, getStatusOption(entry.status).glowColor);
      });
    }

    this.statusGlow.setColors(colorById);
  }

  // ---------------------------------------------------------------------------
  // Animation
  // ---------------------------------------------------------------------------

  private animate = (): void => {
    if (this.destroyed) {
      return;
    }

    this.animationId = requestAnimationFrame(this.animate);
    this.timer.update();

    const elapsed = this.timer.getElapsed();

    this.graphView.updateNodeAnimation();
    this.graphView.updateEdgeFlows(elapsed);
    this.statusGlow.update(elapsed);
    this.selectionRing.update(
      this.selectedNode?.id ?? null,
      elapsed,
      this.sceneManager.camera.position
    );
    this.physics.update(this.interaction.draggedNode);

    this.sceneManager.render();
  };

  // ---------------------------------------------------------------------------
  // Tooltip beim Hover
  // ---------------------------------------------------------------------------

  private updateHoverTooltip(node: Node | null, event?: PointerEvent): void {
    if (!node || !event) {
      this.hoverTooltip.visible = false;
      this.hoverTooltip.node = null;

      this.hoverReadmeSubscription?.unsubscribe();
      this.hoverReadmeNodeId = null;
      this.hoverReadme.set('');
      this.hoverReadmeLoading.set(false);

      this.cdr.detectChanges();
      return;
    }

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();

    this.hoverTooltip.visible = true;
    this.hoverTooltip.node = node;
    this.hoverTooltip.x = event.clientX - rect.left + 16;
    this.hoverTooltip.y = event.clientY - rect.top + 16;

    if (this.nodeKind === 'challenge') {
      this.loadHoverReadme(node.id);
    }

    this.cdr.detectChanges();
  }

  private loadHoverReadme(nodeId: string): void {
    if (this.hoverReadmeNodeId === nodeId) {
      return;
    }

    this.hoverReadmeSubscription?.unsubscribe();
    this.hoverReadmeNodeId = nodeId;

    this.hoverReadme.set('');
    this.hoverReadmeLoading.set(false);

    const cached = this.readmePreviews.getCached(nodeId);

    if (cached !== undefined) {
      this.hoverReadme.set(cached);
      return;
    }

    this.hoverReadmeLoading.set(true);

    this.hoverReadmeSubscription = this.readmePreviews
      .loadAndCache(nodeId)
      .subscribe({
        next: (preview) => {
          if (this.hoverReadmeNodeId !== nodeId) {
            return;
          }

          this.zone.run(() => {
            this.hoverReadme.set(preview);
            this.hoverReadmeLoading.set(false);
            this.cdr.markForCheck();
          });
        },
        error: () => {
          if (this.hoverReadmeNodeId !== nodeId) {
            return;
          }

          this.zone.run(() => {
            this.hoverReadme.set('');
            this.hoverReadmeLoading.set(false);
            this.cdr.markForCheck();
          });
        },
      });
  }

  // ---------------------------------------------------------------------------
  // Detail-Karussell
  // ---------------------------------------------------------------------------

  /** Klick auf einen Knoten: Challenges öffnen das Karussell, Keywords werden nur ausgewählt. */
  private onNodeClicked(node: Node): void {
    if (this.nodeKind === 'keyword') {
      this.selectKeywordNode(node, true);
    } else {
      this.openCarouselFor(node);
    }
  }

  /** Markiert einen Keyword-Knoten mit dem Ring (ohne Karussell). */
  private selectKeywordNode(node: Node, notifyParent: boolean): void {
    this.zone.run(() => {
      this.selectedNode = node;

      if (notifyParent) {
        this.nodeSelected.emit(node);
      }

      this.cdr.detectChanges();
    });
  }

  /** Öffnet das Karussell für einen Knoten und markiert ihn mit dem Ring. */
  private openCarouselFor(node: Node): void {
    const connections = this.graphView.getConnections(node.id, this.graphData);

    this.zone.run(() => {
      this.selectedNode = node;
      this.carouselCurrent = node;
      this.carouselPredecessors = connections.predecessors;
      this.carouselSuccessors = connections.successors;
      this.carouselOpen = true;
      this.cdr.detectChanges();
    });
  }

  /** Wird aufgerufen, wenn von außen (z. B. Suche) ein Knoten gewählt wurde. */
  private selectRequestedNode(): void {
    const id = this.selectedNodeId;

    if (!id) {
      return;
    }

    const node = this.graphView.getNode(id);

    if (!node) {
      return;
    }

    if (this.nodeKind === 'keyword') {
      this.selectKeywordNode(node, false);
    } else {
      this.openCarouselFor(node);
    }
  }

  closeCarousel(): void {
    this.carouselOpen = false;
    this.carouselCurrent = null;
    this.carouselPredecessors = [];
    this.carouselSuccessors = [];
  }

  selectCarouselNode(node: Node): void {
    const connections = this.graphView.getConnections(node.id, this.graphData);

    this.carouselCurrent = node;
    this.carouselPredecessors = connections.predecessors;
    this.carouselSuccessors = connections.successors;
  }
}
