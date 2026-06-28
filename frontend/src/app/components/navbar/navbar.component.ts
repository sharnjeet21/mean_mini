import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatTooltipModule],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent {
  mobileOpen = false;
  profileDropdownOpen = false;

  constructor(public auth: AuthService, private router: Router) {}

  get initials(): string {
    const name = this.auth.currentUser()?.name || '';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  }

  closeMobile(): void {
    this.mobileOpen = false;
  }

  toggleDropdown(): void {
    this.profileDropdownOpen = !this.profileDropdownOpen;
  }

  closeDropdown(): void {
    this.profileDropdownOpen = false;
  }

  navigateTo(path: string, queryParams?: any): void {
    this.closeDropdown();
    this.closeMobile();
    this.router.navigate([path], queryParams ? { queryParams } : {});
  }

  logout(): void {
    this.closeDropdown();
    this.closeMobile();
    this.auth.logout();
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('#profile-menu-wrapper')) {
      this.profileDropdownOpen = false;
    }
  }
}
