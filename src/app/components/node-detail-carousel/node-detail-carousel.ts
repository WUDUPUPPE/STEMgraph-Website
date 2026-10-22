import { Component,  EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { Node } from '../../api/models';
import { ReadmePreviewService } from '../../core/services/readme-preview.service';
import { KeywordBackground, KeywordColor } from '../../core/utils/keyword-color.util';

@Component({
  selector: 'app-node-detail-carousel',
  imports: [RouterLink],
  templateUrl: './node-detail-carousel.html',
  styleUrl: './node-detail-carousel.css',
})

// Zeigt die Details eines Keywords an, mit Readme-Vorschau und Links zu den Challenges, die das Keyword haben
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

  // Lädt die Readme-Vorschau, wenn sich das aktuelle Keyword ändert
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['current']) {
      this.loadReadme();
    }
  }

  // Bereinigt die Readme-Vorschau, wenn die Komponente zerstört wird
  ngOnDestroy(): void {
    this.contentSubscription?.unsubscribe();
  }

  selectNode(node: Node): void {
    this.nodeSelected.emit(node);
  }

  // Schließt das Overlay, wenn das X, ein Klick daneben oder Escape gedrückt wird
  close(): void {
    this.closed.emit();
  }

  // Gibt die ID des Keywords zurück, um die Wiederverwendung von DOM-Elementen zu optimieren
  trackByNodeId(_: number, node: Node): string {
    return node.id;
  }

  // Lädt die Readme-Vorschau für das aktuelle Keyword und aktualisiert den Lade- und Fehlerstatus
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
