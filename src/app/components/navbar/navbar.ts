import { Component } from '@angular/core';
import { Router, RouterLink } from "@angular/router";
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, FormsModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  searchTerm = '';
  searchType = 'all';
  menuOpen = false;

  constructor(private readonly router: Router) {}

  submitSearch(): void {
    const query = this.searchTerm.trim();

    if (!query) {
      return;
    }

    this.router.navigate(['/search'], {
      queryParams: {
        q: query,
        type: this.searchType
      }
    });
  }

  toggleMenu(): void{
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }
}
