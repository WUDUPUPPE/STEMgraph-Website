import { Location } from '@angular/common';
import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Logo3d } from '../../components/logo-3d/logo-3d';
import { MarkdownComponent } from 'ngx-markdown';
import { STEMgraphApiService } from '../../service/stemgraph-api.service';
import { ChallengeContentResponse } from '../../api/models';

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

  content: any = null;
  loading = false;
  error = false;

  ngOnInit(): void {
    if (!this.challengeId) {
      this.error = true;
      return;
    }

    this.loading = true;

    this.apiService.ChallengeContent(this.challengeId).subscribe({
      next: (content) => {
        this.content = content;
        this.loading = false;
        this.changeDetectorRef.markForCheck();
      },
      error: (error) => {
        console.error("Challenge Content can´t load:", error);
        this.error = true;
        this.loading = false;
        this.changeDetectorRef.markForCheck();
      },
    });
  };

  getAssetUrl(fileName: string): string {
    return `http://localhost:8000/challenges/${this.challengeId}/assets/${encodeURIComponent(fileName)}`;
  };

  back(): void {
    this.location.back();
  };
}
