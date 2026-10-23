import { Component, Input, computed, inject, signal } from '@angular/core';
import { CHALLENGE_STATUS_OPTIONS } from '../../core/constants/challenge-progress.constants';
import { ChallengeStatus } from '../../core/models/challenge-progress.model';
import { AuthService } from '../../core/services/auth.service';
import { ChallengeProgressService } from '../../core/services/challenge-progress.service';

/**
 * Kleine Auswahl oben rechts in einer Challenge:
 * Done (grün), Todo (gelb), Repeat (rot) oder kein Status.
 */
@Component({
  selector: 'app-challenge-status-picker',
  templateUrl: './challenge-status-picker.html',
  styleUrl: './challenge-status-picker.css',
})
export class ChallengeStatusPicker {
  private readonly progress = inject(ChallengeProgressService);
  readonly auth = inject(AuthService);

  readonly statusOptions = CHALLENGE_STATUS_OPTIONS;

  private readonly challengeIdSignal = signal<string | null>(null);

  @Input() set challengeId(value: string | null) {
    this.challengeIdSignal.set(value);
  }

  @Input() teaches: string | null = null;

  /** Aktueller Status der Challenge (oder null, wenn keiner gesetzt ist). */
  readonly currentStatus = computed(() => {
    const id = this.challengeIdSignal();

    // entries() lesen, damit computed bei Änderungen neu rechnet
    this.progress.entries();

    return id ? this.progress.getStatus(id) : null;
  });

  selectStatus(status: ChallengeStatus): void {
    const id = this.challengeIdSignal();

    if (!id) {
      return;
    }

    // Nochmal auf den aktiven Status klicken = Status entfernen
    if (this.currentStatus() === status) {
      this.progress.clearStatus(id);
      return;
    }

    this.progress.setStatus(id, this.teaches, status);
  }

  clearStatus(): void {
    const id = this.challengeIdSignal();

    if (id) {
      this.progress.clearStatus(id);
    }
  }
}
