import { Component, HostListener, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, FormsModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {

  private readonly platformId = inject(PLATFORM_ID);

  searchTerm = '';
  searchType = 'all';
  menuOpen = false;

  constructor(private readonly router: Router) {}

  submitSearch(): void {
    const query = this.searchTerm.trim();

    if (!query) {
      return;
    }

    this.menuOpen = false;

    this.router.navigate(['/search'], {
      queryParams: {
        q: query,
        type: this.searchType
      }
    });
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  // closed sidebar only in desktop view
  @HostListener('window:resize')
  onWindowResize(): void {
    if (
      isPlatformBrowser(this.platformId) &&
      window.innerWidth >= 769
    ) {
      this.menuOpen = false;
    }
  }

  //closed the sidebar every time
  /*@HostListener('window:resize')
  onWindowResize(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.menuOpen = false;
    }
  }*/
}
