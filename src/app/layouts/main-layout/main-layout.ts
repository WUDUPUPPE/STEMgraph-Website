import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from '../../components/navbar/navbar';
import { Welcome } from '../../pages/welcome/welcome';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, Navbar, Welcome],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
})

export class MainLayout {
  readonly auth = inject(AuthService);
}
