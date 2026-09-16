import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, input, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { GraphResponse } from '../../api/models';
import { Graph3d, GraphData } from '../../graph-3d/graph-3d';

@Component({
  selector: 'app-challenge-graph',
  imports: [Graph3d],
  templateUrl: './challenge-graph.html',
  styleUrl: './challenge-graph.css',
})
export class ChallengeGraph {
  readonly graph = input<GraphResponse | null>(null);

  get graphData3D(): GraphData | null {
    const data = this.graph();
    if (!data) return null;

    return {
      nodes: data.nodes.map(n => ({
        id: n.id,
        teaches: n.teaches ?? undefined,
        author: Array.isArray(n.author) ? n.author[0] : n.author ?? undefined,
        keywords: n.keywords ?? undefined,
        firstused: n.firstused ?? undefined,
      })),
      edges: data.edges.map(e => ({
        source: e.source,
        target: e.target,
      })),
    };
  }
}