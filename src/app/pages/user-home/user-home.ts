import { Component } from '@angular/core';
import { ChallengeExplorer } from '../../components/challenge-explorer/challenge-explorer';
import { Logo3d } from '../../components/logo-3d/logo-3d';

@Component({
  selector: 'app-user-home',
  imports: [Logo3d, ChallengeExplorer],
  templateUrl: './user-home.html',
  styleUrl: './user-home.css',
})
export class UserHome {}