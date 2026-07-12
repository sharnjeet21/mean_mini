import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  profileData: any = null;
  stats: any = { itineraryCount: 0, bookingCount: 0 };
  loading = true;
  updating = false;
  editName = '';
  errorMessage = '';
  successMessage = '';
  hasHistory = false;

  private platformId = inject(PLATFORM_ID);

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private location: Location
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.hasHistory = window.history.length > 1;
    }
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading = true;
    this.api.getUserProfile().subscribe({
      next: (res) => {
        this.profileData = res.user;
        this.stats = res.stats || { itineraryCount: 0, bookingCount: 0 };
        this.editName = res.user?.name || '';
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || err?.message || 'Failed to load profile details.';
        this.loading = false;
      }
    });
  }

  updateProfile(): void {
    if (!this.editName.trim()) {
      this.errorMessage = 'Name cannot be empty.';
      return;
    }

    this.updating = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.api.updateUserProfileName(this.editName).subscribe({
      next: (res) => {
        const updatedUser = res.user;
        if (updatedUser) {
          this.auth.currentUser.set(updatedUser);
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('user', JSON.stringify(updatedUser));
          }
        }
        this.updating = false;
        this.successMessage = 'Display name updated successfully.';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        this.updating = false;
        this.errorMessage = err?.error?.message || err?.message || 'Failed to update name.';
      }
    });
  }

  goBack(): void {
    this.location.back();
  }
}
