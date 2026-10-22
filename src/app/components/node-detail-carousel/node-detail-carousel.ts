import { Component,  EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { Node } from '../../api/models';
import { ReadmePreviewService } from '../../core/services/readme-preview.service';
import { KeywordBackground, KeywordColor } from '../../core/utils/keyword-color';

@Component({
  selector: 'app-node-detail-carousel',
  imports: [RouterLink],
  templateUrl: './node-detail-carousel.html',
  styleUrl: './node-detail-carousel.css',
})

export class NodeDetailCarousel implements OnChanges, OnDestroy {
  private readonly readmePreviews = inject(ReadmePreviewService);
  private contentSubscription?: Subscription;

  @Input({ required: true }) current!: Node;
  @Input() predecessors: Node[] = [];
  @Input() successors: Node[] = [];
  @Input() isAdmin = false;

  // jedes Keyword bekommt seine eigene Farbe
  protected readonly KeywordColor = KeywordColor;
  protected readonly KeywordBackground = KeywordBackground;

  @Output() closed = new EventEmitter<void>();
  @Output() nodeSelected = new EventEmitter<Node>();

  readonly readmePreview = signal('');
  readonly readmeLoading = signal(false);
  readonly readmeError = signal(false);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['current']) {
      this.loadReadme();
    }
  }

  ngOnDestroy(): void {
    this.contentSubscription?.unsubscribe();
  }

  selectNode(node: Node): void {
    this.nodeSelected.emit(node);
  }

  close(): void {
    this.closed.emit();
  }

  trackByNodeId(_: number, node: Node): string {
    return node.id;
  }

  private loadReadme(): void {
    this.contentSubscription?.unsubscribe();

    this.readmePreview.set('');
    this.readmeError.set(false);
    this.readmeLoading.set(false);

    if (!this.current?.id) {
      return;
    }

    this.readmeLoading.set(true);

    this.contentSubscription = this.readmePreviews
      .load(this.current.id)
      .subscribe({
        next: (preview) => {
          this.readmePreview.set(preview);
          this.readmeLoading.set(false);
        },
        error: () => {
          this.readmeError.set(true);
          this.readmeLoading.set(false);
        },
      });
  }
}
