import { ChallengeStatus, ChallengeStatusOption } from '../models/challenge-progress.model';

// Vor den Benutzernamen gehängt, damit jeder Benutzer seinen eigenen Fortschritt hat
export const PROGRESS_STORAGE_KEY_PREFIX = 'stemgraph_progress_';

/**
 * Alle Status mit Text und Farben.
 * cssColor  = Farbe für HTML/CSS (gleiche Farben wie die API-Status-LED)
 * glowColor = Farbe für den leuchtenden Schatten im 3D-Graphen
 */
export const CHALLENGE_STATUS_OPTIONS: ChallengeStatusOption[] = [
  {
    status: 'done',
    label: 'Done',
    description: 'Challenge completed',
    cssColor: '#1ed260',
    glowColor: 0x1ed260,
  },
  {
    status: 'todo',
    label: 'Todo',
    description: 'Still to do',
    cssColor: '#facc15',
    glowColor: 0xfacc15,
  },
  {
    status: 'hard',
    label: 'Repeat',
    description: 'Difficult, repeat for better understanding',
    cssColor: '#ec2d2d',
    glowColor: 0xec2d2d,
  },
];

export function getStatusOption(status: ChallengeStatus): ChallengeStatusOption {
  return CHALLENGE_STATUS_OPTIONS.find((option) => option.status === status)!;
}
