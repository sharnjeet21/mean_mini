import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { ConfirmService } from '../../../services/confirm.service';

@Component({
  selector: 'app-agency-platform',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agency-platform.component.html',
})
export class AgencyPlatformComponent implements OnInit {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private toastService = inject(ToastService);
  private confirmService = inject(ConfirmService);
  private cdr = inject(ChangeDetectorRef);

  activeSection: 'users' | 'ai-runtime' | 'health' = 'users';

  // Users Directory state
  users: any[] = [];
  userSearchTerm = '';
  userLoading = false;
  userErrorMessage = '';

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.userLoading = true;
    this.userErrorMessage = '';
    this.api.getUsers().pipe(
      finalize(() => {
        this.userLoading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (res) => {
        this.users = Array.isArray(res) ? res : [];
      },
      error: (err) => {
        this.userErrorMessage = err?.error?.message || 'Failed to load user directory.';
      }
    });
  }

  changeUserRole(user: any, newRole: string): void {
    this.api.updateUserRole(user._id, newRole).subscribe({
      next: () => {
        user.role = newRole;
        this.toastService.success(`User role updated to ${newRole}.`);
      },
      error: (err) => {
        this.userErrorMessage = err?.error?.message || 'Failed to update user role.';
        this.toastService.error(this.userErrorMessage);
      }
    });
  }

  toggleUserStatus(user: any): void {
    const newStatus = !user.isActive;
    this.api.toggleUserActiveStatus(user._id, newStatus).subscribe({
      next: () => {
        user.isActive = newStatus;
        this.toastService.success(`User status changed to ${newStatus ? 'Active' : 'Inactive'}.`);
      },
      error: (err) => {
        this.userErrorMessage = err?.error?.message || 'Failed to toggle user status.';
        this.toastService.error(this.userErrorMessage);
      }
    });
  }

  async deleteUserAccount(userId: string): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      title: 'Delete Account',
      message: 'Are you sure you want to permanently delete this user account? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!confirmed) return;

    this.api.deleteUser(userId).subscribe({
      next: () => {
        this.users = this.users.filter((u) => u._id !== userId);
        this.toastService.success('User account deleted successfully.');
      },
      error: (err) => {
        this.userErrorMessage = err?.error?.message || 'Failed to delete user account.';
        this.toastService.error(this.userErrorMessage);
      }
    });
  }

  get filteredUsers() {
    const query = this.userSearchTerm.trim().toLowerCase();
    return this.users.filter((u) => {
      return !query
        || u.name?.toLowerCase().includes(query)
        || u.email?.toLowerCase().includes(query)
        || u.role?.toLowerCase().includes(query);
    });
  }
}
