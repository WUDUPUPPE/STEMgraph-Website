import { Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-challenge-detail',
  imports: [],
  templateUrl: './challenge-detail.html',
  styleUrl: './challenge-detail.css',
})

export class ChallengeDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);

  readonly challengeId = this.route.snapshot.paramMap.get('id');

  back(): void {
    this.location.back();
  };
}
