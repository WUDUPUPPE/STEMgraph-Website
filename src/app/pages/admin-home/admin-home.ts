import { Component, inject } from '@angular/core';
import { ChallengeExplorer } from '../../components/challenge-explorer/challenge-explorer';
import { Logo3d } from '../../components/logo-3d/logo-3d';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-home',
  imports: [Logo3d, ChallengeExplorer],
  templateUrl: './admin-home.html',
  styleUrl: './admin-home.css',
})
export class AdminHome {
  readonly auth = inject(AuthService);
}
