import { Location } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MarkdownComponent } from 'ngx-markdown';
import { ChallengeContentResponse } from '../../api/models';
import { Logo3d } from '../../components/logo-3d/logo-3d';
import { STEMgraphApiService } from '../../core/services/stemgraph-api.service';

@Component({
  selector: 'app-challenge-detail',
  imports: [Logo3d, MarkdownComponent],
  templateUrl: './challenge-detail.html',
  styleUrl: './challenge-detail.css',
})
export class ChallengeDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly apiService = inject(STEMgraphApiService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  readonly challengeId = this.route.snapshot.paramMap.get('id');
  readonly challengeTeaches = this.route.snapshot.paramMap.get('teaches');

  content: ChallengeContentResponse | null = null;
  loading = false;
  error = false;

  ngOnInit(): void {
    if (!this.challengeId) {
      this.error = true;
      return;
    }

    this.loading = true;

    this.apiService.challengeContent(this.challengeId).subscribe({
      next: (content) => {
        this.content = content;
        this.loading = false;
        this.changeDetectorRef.markForCheck();
      },
      error: (error) => {
        console.error('Challenge content could not be loaded:', error);
        this.error = true;
        this.loading = false;
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  getAssetUrl(fileName: string): string {
    return `/api/challenges/${this.challengeId}/assets/${encodeURIComponent(fileName)}`;
  }

  back(): void {
    this.location.back();
  }
}
