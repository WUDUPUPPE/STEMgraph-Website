import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  PLATFORM_ID,
  ViewChild,
  inject,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiStatusService } from '../../core/services/api-status.service';
import { AuthService } from '../../core/services/auth.service';
import { Search } from '../search/search';

// Ab dieser Fensterbreite (px) wird das Desktop-Layout benutzt
const DESKTOP_MIN_WIDTH = 769;

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, Search],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})

// Zeigt die Navigationsleiste oben auf der Seite an, mit Logo, Suche, Links und Profilmenü
export class Navbar {
  readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly apiStatusService = inject(ApiStatusService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly apiStatus = this.apiStatusService.status;
  readonly apiStatusMessage = this.apiStatusService.apiMessage;
  readonly databaseStatusMessage = this.apiStatusService.databaseMessage;

  menuOpen = false;
  profileMenuOpen = false;

  @ViewChild('menuButton')
  private menuButton?: ElementRef<HTMLElement>;

  @ViewChild('mobileMenu')
  private mobileMenu?: ElementRef<HTMLElement>;

  @ViewChild('profileMenu')
  private profileMenu?: ElementRef<HTMLElement>;

  @ViewChild('profileButton')
  private profileButton?: ElementRef<HTMLElement>;

  constructor() {
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

  // Auf großen Bildschirmen wird das mobile Menü immer geschlossen
  @HostListener('window:resize')
  onWindowResize(): void {
    if (
      isPlatformBrowser(this.platformId) &&
      window.innerWidth >= DESKTOP_MIN_WIDTH
    ) {
      this.menuOpen = false;
    }
  }

  // Klick außerhalb eines offenen Menüs schließt es
  @HostListener('document:click', ['$event.target'])
  onDocumentClick(target: EventTarget | null): void {
    if (!(target instanceof Node)) {
      return;
    }

    if (this.menuOpen && !this.isInside(target, this.mobileMenu, this.menuButton)) {
      this.closeMenu();
    }

    if (
      this.profileMenuOpen &&
      !this.isInside(target, this.profileMenu, this.profileButton)
    ) {
      this.closeProfileMenu();
    }
  }

  // Überprüft, ob das angeklickte Element innerhalb des Menüs oder des Buttons liegt
  private isInside(
    target: Node,
    menu?: ElementRef<HTMLElement>,
    button?: ElementRef<HTMLElement>
  ): boolean {
    const clickedMenu = menu?.nativeElement.contains(target);
    const clickedButton = button?.nativeElement.contains(target);

    return !!clickedMenu || !!clickedButton;
  }
}
