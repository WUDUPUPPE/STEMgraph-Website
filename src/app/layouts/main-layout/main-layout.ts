import { Component } from '@angular/core';
import { RouterOutlet } from "@angular/router";
import { Navbar } from "../../components/navbar/navbar";
import { Welcome } from '../../pages/welcome/welcome';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, Navbar, Welcome],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
})

export class MainLayout {
}
