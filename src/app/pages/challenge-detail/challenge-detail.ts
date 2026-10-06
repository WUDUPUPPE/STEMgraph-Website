import { Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Logo3d } from '../../components/logo-3d/logo-3d';

@Component({
    selector: 'app-challenge-detail',
    imports: [Logo3d],
    templateUrl: './challenge-detail.html',
    styleUrl: './challenge-detail.css',
})

export class ChallengeDetail {
    private readonly route = inject(ActivatedRoute);
    private readonly location = inject(Location);

    readonly challengeId = this.route.snapshot.paramMap.get('id');
    readonly challengeTeaches = this.route.snapshot.paramMap.get('teaches');

    back(): void {
        this.location.back();
    };
}
