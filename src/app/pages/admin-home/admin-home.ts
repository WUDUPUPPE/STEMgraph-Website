import { Component, OnInit, inject, signal } from '@angular/core';
import { Stemgraph3dComponent } from '../../components/stemgraph-3d/stemgraph-3d.component';
import { STEMgraphApiService } from '../../service/stemgraph-api.service';
import { Navbar } from '../../components/navbar/navbar';

type ApiStatus = 'checking' | 'online' | 'offline';

@Component({
  selector: 'app-admin-home',
  imports: [Stemgraph3dComponent, Navbar],
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
