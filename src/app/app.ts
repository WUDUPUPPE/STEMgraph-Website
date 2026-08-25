import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Stemgraph3dComponent } from './stemgraph-3d/stemgraph-3d.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Stemgraph3dComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('graph-website');
}
