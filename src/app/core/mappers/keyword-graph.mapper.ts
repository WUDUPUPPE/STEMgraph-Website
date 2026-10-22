import { Injectable } from '@angular/core';
import { ChallengeListResponse, GraphResponse, KeywordGraphResponse, Node } from '../../api/models';

/**
 * Wandelt die Antwort der Keyword-API in das Format um, das der 3D-Graph kennt
 * (GraphResponse). Ein Keyword wird dabei zu einem Knoten, dessen id und teaches
 * das Keyword selbst sind
 *
 * Die Keywords werden nur als Kugel angezeigt, deshalb gibt es keine Kanten
 */
@Injectable({
  providedIn: 'root',
})

export class KeywordGraphMapper {
  toGraphResponse(response: KeywordGraphResponse): GraphResponse {
    const keywords = (response.nodes ?? []).map((node) => node.keywords);

    return this.toSphere(keywords);
  }

  /**
   * Ersatz, falls /keywords/graph nicht funktioniert:
   * holt die Keywords aus der Challenge-Liste (/list)
   */
  fromChallengeList(challenges: ChallengeListResponse[]): GraphResponse {
    const keywords: string[] = [];

    challenges.forEach((challenge) => {
      (challenge.keywords ?? []).forEach((keyword) => keywords.push(keyword));
    });

    return this.toSphere(keywords);
  }

  // Jedes Keyword wird genau ein Knoten (doppelte werden ignoriert)
  private toSphere(keywords: string[]): GraphResponse {
    const nodes = new Map<string, Node>();

    keywords.forEach((keyword) => {
      if (!nodes.has(keyword)) {
        nodes.set(keyword, { id: keyword, teaches: keyword, keywords: [] });
      }
    });

    return { nodes: Array.from(nodes.values()), edges: [] };
  }
}
