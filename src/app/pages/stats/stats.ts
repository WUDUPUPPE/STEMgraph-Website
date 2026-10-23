import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Logo3d } from '../../components/logo-3d/logo-3d';
import { CHALLENGE_STATUS_OPTIONS, getStatusOption } from '../../core/constants/challenge-progress.constants';
import { ChallengeProgressEntry, ChallengeStatus } from '../../core/models/challenge-progress.model';
import { AuthService } from '../../core/services/auth.service';
import { ChallengeProgressService } from '../../core/services/challenge-progress.service';
import { STEMgraphApiService } from '../../core/services/stemgraph-api.service';

// 'all' zeigt alle markierten Challenges, sonst nur einen Status
type StatsFilter = 'all' | ChallengeStatus;

@Component({
  selector: 'app-stats',
  imports: [Logo3d, RouterLink, DatePipe],
  templateUrl: './stats.html',
  styleUrl: './stats.css',
})
export class Stats implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly stemgraphApi = inject(STEMgraphApiService);

  readonly auth = inject(AuthService);
  readonly progress = inject(ChallengeProgressService);

  readonly statusOptions = CHALLENGE_STATUS_OPTIONS;
  readonly getStatusOption = getStatusOption;

  readonly filter = signal<StatsFilter>('all');

  // Anzahl aller Challenges im Graphen (kommt von der API)
  readonly totalChallenges = signal<number | null>(null);

  readonly notMarkedCount = computed(() => {
    const total = this.totalChallenges();

    if (total === null) {
      return null;
    }

    return Math.max(total - this.progress.markedCount(), 0);
  });

  // Prozent der fertigen Challenges (von allen Challenges)
  readonly donePercent = computed(() => this.getPercent(this.progress.doneCount()));
  readonly todoPercent = computed(() => this.getPercent(this.progress.todoCount()));
  readonly hardPercent = computed(() => this.getPercent(this.progress.hardCount()));

  readonly filteredEntries = computed<ChallengeProgressEntry[]>(() => {
    const currentFilter = this.filter();

    // entries() lesen, damit die Liste bei Änderungen neu berechnet wird
    const allEntries = [...this.progress.entries().values()];

    if (currentFilter === 'all') {
      return allEntries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }

    return this.progress.getEntriesByStatus(currentFilter);
  });

  constructor() {
    // Der Todo-Button im Profil öffnet /stats?status=todo
    this.route.queryParamMap
      .pipe(takeUntilDestroyed())
      .subscribe((params) => this.filter.set(this.readFilter(params.get('status'))));
  }

  ngOnInit(): void {
    this.stemgraphApi.mainList().subscribe({
      next: (list) => this.totalChallenges.set(list.length),
      error: (error) => console.error('Challenge list could not be loaded:', error),
    });
  }

  setFilter(filter: StatsFilter): void {
    const status = filter === 'all' ? null : filter;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { status },
    });
  }

  getCount(status: ChallengeStatus): number {
    if (status === 'done') {
      return this.progress.doneCount();
    }

    if (status === 'todo') {
      return this.progress.todoCount();
    }

    return this.progress.hardCount();
  }

  removeStatus(entry: ChallengeProgressEntry): void {
    this.progress.clearStatus(entry.id);
  }

  private getPercent(count: number): number {
    const total = this.totalChallenges();

    if (!total) {
      return 0;
    }

    return Math.round((count / total) * 100);
  }

  private readFilter(value: string | null): StatsFilter {
    if (value === 'done' || value === 'todo' || value === 'hard') {
      return value;
    }

    return 'all';
  }
}
