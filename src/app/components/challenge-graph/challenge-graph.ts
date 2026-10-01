import { Component, input, Input } from '@angular/core';
import { GraphResponse } from '../../api/models';
import { Graph3d, GraphLayoutMode } from '../../graph-3d/graph-3d';

@Component({
  selector: 'app-challenge-graph',
  imports: [Graph3d],
  templateUrl: './challenge-graph.html',
  styleUrl: './challenge-graph.css',
})
export class ChallengeGraph {
  readonly graph = input<GraphResponse | null>(null);
  
  @Input() layoutMode: GraphLayoutMode = 'sphere';
  @Input() isAdmin = false;
}