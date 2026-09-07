import { Component, OnInit, inject } from '@angular/core';
import { Stemgraph3dComponent } from '../../components/stemgraph-3d/stemgraph-3d.component';
import { STEMgraphApiService } from '../../service/stemgraph-api.service';


@Component({
  selector: 'app-admin-home',
  imports: [Stemgraph3dComponent],
  templateUrl: './admin-home.html',
  styleUrl: './admin-home.css',
})
export class AdminHome implements OnInit {
  private readonly stemgraphApi = inject(STEMgraphApiService);

  ngOnInit(): void {
    this.stemgraphApi.healthcheck().subscribe({
      next: (response) => {
        console.log('API erreichbar:', response.body);
      },
      error: (error) => {
        console.error('API nicht erreichbar:', error);
      },
    });
  }
}
