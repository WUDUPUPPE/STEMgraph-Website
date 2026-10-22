// Weitere Suchtypen (Dependencies, Subgraph)
// sind noch nicht umgesetzt, die Seiten dafür fehlen.
export type SearchType = 'challenges' | 'keywords';

/** Minimale Challenge-Daten, die für die Autovervollständigung gebraucht werden. */
export interface ChallengeSuggestion {
  id: string;
  teaches: string;
  keywords: string[];
}
