import { Component } from '@angular/core';
import { Stemgraph3dComponent } from '../../components/stemgraph-3d/stemgraph-3d.component';

@Component({
  selector: 'app-home',
  imports: [Stemgraph3dComponent],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {}
