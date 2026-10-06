import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Node } from '../../api/models';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-node-detail-carousel',
    standalone: true,
    imports: [RouterLink],
    templateUrl: './node-detail-carousel.html',
    styleUrl: './node-detail-carousel.css',
})

export class NodeDetailCarousel {
    @Input({ required: true }) current!: Node;
    @Input() predecessors: Node[] = [];
    @Input() successors: Node[] = [];
    @Input() isAdmin = false;

    @Output() closed = new EventEmitter<void>();
    @Output() nodeSelected = new EventEmitter<Node>();

    selectNode(node: Node): void {
        this.nodeSelected.emit(node);
    };
    
    close(): void {
        this.closed.emit();
    };

    trackByNodeId(_: number, node: Node): string {
        return node.id;
    };
}