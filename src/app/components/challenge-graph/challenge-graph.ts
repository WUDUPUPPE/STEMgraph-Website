import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, input, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import cytoscape, { Core, ElementDefinition } from 'cytoscape';
import { GraphResponse } from '../../api/models';

@Component({
  selector: 'app-challenge-graph',
  imports: [],
  templateUrl: './challenge-graph.html',
  styleUrl: './challenge-graph.css',
})
export class ChallengeGraph implements AfterViewInit, OnDestroy {
  readonly graph = input<GraphResponse | null>(null);

  @ViewChild('graphContainer')
  private graphContainer?: ElementRef<HTMLDivElement>;

  private readonly platformId = inject(PLATFORM_ID);
  private cy?: Core;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    queueMicrotask(() => this.drawGraph());
  }

  ngOnDestroy(): void {
    this.cy?.destroy();
  }

  private drawGraph(): void {
    const container = this.graphContainer?.nativeElement;
    const graphData = this.graph();

    console.log('Graph-Container:', container);
    console.log('Graph-Daten:', graphData);

    if (!container || !graphData) {
      return;
    }

    this.cy?.destroy();

    const elements: ElementDefinition[] = [
      ...graphData.nodes.map((node) => ({
        data: {
          id: node.id, label: node.teaches || node.id, keywords: node.keywords || [],
        },
      })),
      ...graphData.edges.map((edges, index) => ({
        data: {
          id: `edge-${index}`, source: edges.source, target: edges.target,
        },
      })),
    ];

    this.cy = cytoscape({
      container, elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#9333ea',
            label: 'data(label)',
            color: '#f5f3ff',
            'font-size': 10,
            'text-wrap': 'wrap',
            'text-max-width': '110px',
            'text-valign': 'center',
            'text-halign': 'center',
            width: 46,
            height: 46,
            'border-width': 2,
            'border-color': '#d8b4fe',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1.5,
            'line-color': '#7e22ce',
            'target-arrow-color': '#a855f7',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 0.85,
          },
        },
        {
          selector: 'node:selected',
          style: {
            'background-color': '#c084fc',
            'border-color': '#ffffff',
            'border-width': 3,
          },
        },
      ],
      layout: {
        name: 'cose',
        animate: false,
        padding: 40,
      },
    });

    this.cy.on('tap', 'node', (event) => {
      console.log('Selected node:', event.target.data());
    });
  }
}
