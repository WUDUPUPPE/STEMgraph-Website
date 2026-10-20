import { Injectable } from '@angular/core';
import { Edge, GraphResponse, KeywordGraphResponse, Node } from '../../api/models';

/** So können die Kanten der Keyword-API aussehen (je nachdem, was das Backend liefert). */
interface RawKeywordEdge {
  id?: string;
  keywords?: string;
  source?: string;
  target?: string;
}

/**
 * Wandelt die Antwort der Keyword-API in das Format um, das der 3D-Graph kennt
 * (GraphResponse). Ein Keyword wird dabei zu einem Knoten, dessen id und teaches
 * das Keyword selbst sind.
 */
@Injectable({
  providedIn: 'root',
})
export class KeywordGraphMapper {
  toGraphResponse(response: KeywordGraphResponse): GraphResponse {
    const nodes = new Map<string, Node>();

    (response.nodes ?? []).forEach((node) => this.addNode(nodes, node.keywords));

    const edges = this.buildEdges(response.edges ?? [], nodes);

    return { nodes: Array.from(nodes.values()), edges };
  }

  private addNode(nodes: Map<string, Node>, keyword: string): void {
    if (!nodes.has(keyword)) {
      nodes.set(keyword, { id: keyword, teaches: keyword, keywords: [] });
    }
  }

  /**
   * Fall 1: Die Kante hat source und target -> direkt übernehmen.
   * Fall 2: Die Kante besteht aus (Challenge-ID, Keyword) -> alle Keywords mit
   *         derselben Challenge-ID werden miteinander verbunden.
   */
  private buildEdges(rawEdges: unknown[], nodes: Map<string, Node>): Edge[] {
    const edges: Edge[] = [];
    const knownPairs = new Set<string>();
    const keywordsByChallenge = new Map<string, string[]>();

    const addEdge = (a: string, b: string): void => {
      const key = [a, b].sort().join('|');

      if (a === b || knownPairs.has(key)) {
        return;
      }

      knownPairs.add(key);
      this.addNode(nodes, a);
      this.addNode(nodes, b);
      edges.push({ source: a, target: b });
    };

    (rawEdges as RawKeywordEdge[]).forEach((edge) => {
      if (edge.source && edge.target) {
        addEdge(edge.source, edge.target);
        return;
      }

      if (edge.id && edge.keywords) {
        const group = keywordsByChallenge.get(edge.id) ?? [];
        group.push(edge.keywords);
        keywordsByChallenge.set(edge.id, group);
      }
    });

    keywordsByChallenge.forEach((group) => {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          addEdge(group[i], group[j]);
        }
      }
    });

    return edges;
  }
}
