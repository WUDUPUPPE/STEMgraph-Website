/**
 * Status, den ein Benutzer einer Challenge geben kann:
 * 'done' = fertig (grün), 'todo' = noch machen (gelb),
 * 'hard' = schwer / wiederholen für besseres Verständnis (rot).
 */
export type ChallengeStatus = 'done' | 'todo' | 'hard';

// Ein gespeicherter Eintrag für eine Challenge
export interface ChallengeProgressEntry {
  id: string;
  teaches: string | null;
  status: ChallengeStatus;
  updatedAt: string;
}

// Anzeige-Infos für einen Status (Text und Farben)
export interface ChallengeStatusOption {
  status: ChallengeStatus;
  label: string;
  description: string;
  cssColor: string;
  glowColor: number;
}
