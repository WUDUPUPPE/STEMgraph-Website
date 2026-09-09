import { Component, OnInit, inject, signal } from '@angular/core';
import { Stemgraph3d } from '../../components/stemgraph-3d/stemgraph-3d';
import { STEMgraphApiService } from '../../service/stemgraph-api.service';

type ApiStatus = 'checking' | 'online' | 'offline';

@Component({
  selector: 'app-admin-home',
  imports: [Stemgraph3d],
  templateUrl: './admin-home.html',
  styleUrl: './admin-home.css',
})

export class AdminHome implements OnInit {
  private readonly stemgraphApi = inject(STEMgraphApiService);

  protected readonly apiStatus = signal<ApiStatus>('checking')

  ngOnInit(): void {
    this.stemgraphApi.healthcheck().subscribe({
      next: () => this.apiStatus.set('online'),
      error: () => this.apiStatus.set('offline'),
    });
  }
}
