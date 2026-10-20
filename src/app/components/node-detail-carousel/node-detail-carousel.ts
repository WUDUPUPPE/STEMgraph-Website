import { Component, EventEmitter, inject, Input, OnChanges, OnDestroy, Output, signal, SimpleChanges } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { Node } from '../../api/models';
import { STEMgraphApiService } from '../../service/stemgraph-api.service';

@Component({
  selector: 'app-node-detail-carousel',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './node-detail-carousel.html',
  styleUrl: './node-detail-carousel.css',
})

export class NodeDetailCarousel implements OnChanges, OnDestroy {
  private readonly api = inject(STEMgraphApiService);
  private contentSubscription?: Subscription;

  @Input({ required: true }) current!: Node;
  @Input() predecessors: Node[] = [];
  @Input() successors: Node[] = [];
  @Input() isAdmin = false;

  @Output() closed = new EventEmitter<void>();
  @Output() nodeSelected = new EventEmitter<Node>();

  readonly readmePreview = signal('');
  readonly readmeLoading = signal(false);
  readonly readmeError = signal(false);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['current']) {
      this.loadReadme();
    }
  };

  private loadReadme(): void {
    this.contentSubscription?.unsubscribe();

    this.readmePreview.set('');
    this.readmeError.set(false);
    this.readmeLoading.set(false);

    if (!this.current?.id) {
      return;
    }

    this.readmeLoading.set(true);

    this.contentSubscription = this.api
      .ChallengeContent(this.current.id)
      .subscribe({
        next: (content) => {
          this.readmePreview.set(
            this.toPreviewText(content.content_markdown ?? '')
          );

          this.readmeLoading.set(false);
        },
        error: () => {
          this.readmeError.set(true);
          this.readmeLoading.set(false);
        },
      });
  };

  private toPreviewText(markdown: string): string {
    return markdown
      .split(/\r?\n/)
      .slice(1)
      .join('\n')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/~~~[\s\S]*?~~~/g, '')
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/^\s{0,3}#{1,6}\s+/gm, '')
      .replace(/^\s*>\s?/gm, '')
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/[*_`]/g, '')
      .replace(/\s+/g, ' ').replace(/<!--[\s\S]*?-->/g, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/~~~[\s\S]*?~~~/g, '')
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/^\s{0,3}#{1,6}\s+/gm, '')
      .replace(/^\s*>\s?/gm, '')
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/[*_`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  selectNode(node: Node): void {
    this.nodeSelected.emit(node);
  };

  close(): void {
    this.closed.emit();
  };

  trackByNodeId(_: number, node: Node): string {
    return node.id;
  };

  ngOnDestroy(): void {
    this.contentSubscription?.unsubscribe();
  };
}