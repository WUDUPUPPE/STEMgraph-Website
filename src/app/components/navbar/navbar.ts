import { isPlatformBrowser } from '@angular/common';
import { Component, ElementRef, HostListener, inject, PLATFORM_ID, ViewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiStatusService } from './../../service/api-status.service';
import { AuthService } from './../../service/auth.service';
import { Search } from '../search/search';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, Search],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {

  readonly apiStatusService = inject(ApiStatusService);
  readonly auth = inject(AuthService);

  readonly apiStatus = this.apiStatusService.status;
  readonly apiStatusMessage = this.apiStatusService.apiMessage;
  readonly databaseStatusMessage = this.apiStatusService.databaseMessage;

  private readonly platformId = inject(PLATFORM_ID);

  menuOpen = false;
  profileMenuOpen = false;

  constructor(readonly router: Router) {
    this.apiStatusService.check();
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  toggleProfileMenu(): void {
    this.profileMenuOpen = !this.profileMenuOpen;
  }

  closeProfileMenu(): void {
    this.profileMenuOpen = false;
  }

  logout(): void {
    this.auth.logout();
    this.profileMenuOpen = false;
    this.router.navigate(['/']);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (
      isPlatformBrowser(this.platformId) &&
      window.innerWidth >= 769
    ) {
      this.menuOpen = false;
    }
  }

  @ViewChild('menuButton')
  private menuButton?: ElementRef<HTMLElement>;

  @ViewChild('mobileMenu')
  private mobileMenu?: ElementRef<HTMLElement>;

  @ViewChild('profileMenu')
  private profileMenu?: ElementRef<HTMLElement>;

  @ViewChild('profileButton')
  private profileButton?: ElementRef<HTMLElement>;

  @HostListener('document:click', ['$event.target'])
  onDocumentClick(target: EventTarget | null): void {
    if (!(target instanceof Node)) {
      return;
    }

    if (this.menuOpen) {
      const clickMenu = this.mobileMenu?.nativeElement.contains(target);
      const clickButton = this.menuButton?.nativeElement.contains(target);

      if (!clickMenu && !clickButton) {
        this.closeMenu();
      }
    }

    if (this.profileMenuOpen) {
      const clickProfileMenu = this.profileMenu?.nativeElement.contains(target);
      const clickProfileButton = this.profileButton?.nativeElement.contains(target);

      if (!clickProfileMenu && !clickProfileButton) {
        this.closeProfileMenu();
      }
    }
  }
}