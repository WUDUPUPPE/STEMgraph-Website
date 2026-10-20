import { Component, OnInit, inject, signal } from '@angular/core';
import { ChallengeExplorer } from '../../components/challenge-explorer/challenge-explorer';
import { Logo3d } from '../../components/logo-3d/logo-3d';
import { STEMgraphApiService } from '../../service/stemgraph-api.service';
import { AuthService } from '../../service/auth.service';


type ApiStatus = 'checking' | 'online' | 'offline';

@Component({
  selector: 'app-admin-home',
  imports: [Logo3d, ChallengeExplorer],
  templateUrl: './admin-home.html',
  styleUrl: './admin-home.css',
})

export class AdminHome implements OnInit {
  readonly auth = inject(AuthService);
  
  private readonly stemgraphApi = inject(STEMgraphApiService);

  protected readonly apiStatus = signal<ApiStatus>('checking')

  ngOnInit(): void {
    this.stemgraphApi.Healthcheck().subscribe({
      next: () => this.apiStatus.set('online'),
      error: () => this.apiStatus.set('offline'),
    });
  };
}
