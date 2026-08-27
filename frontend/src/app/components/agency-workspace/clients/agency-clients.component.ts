import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-agency-clients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agency-clients.component.html',
})
export class AgencyClientsComponent implements OnInit {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  clients: any[] = [];
  loading = false;
  errorMessage = '';
  searchTerm = '';
  hasAccess = false;

  ngOnInit(): void {
    const role = this.auth.currentUser()?.role;
    this.hasAccess = ['admin', 'superadmin'].includes(role || '');
    if (this.hasAccess) {
      this.loadClients();
    }
  }

  loadClients(): void {
    this.loading = true;
    this.errorMessage = '';
    const isSuperadmin = this.auth.currentUser()?.role === 'superadmin';
    const request = isSuperadmin ? this.api.getUsers() : this.api.getAdminUsers();

    request.pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (data: any[]) => {
        // Filter for travelers (role === 'user')
        this.clients = (data || [])
          .filter(u => u.role === 'user')
          .map(u => ({
            id: u._id || u.id,
            name: u.name,
            email: u.email,
            isActive: u.isActive !== false,
            createdAt: u.createdAt,
          }));
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to load user list.';
      }
    });
  }

  get filteredClients(): any[] {
    const query = this.searchTerm.trim().toLowerCase();
    return this.clients.filter(c => 
      !query || 
      c.name?.toLowerCase().includes(query) || 
      c.email?.toLowerCase().includes(query)
    );
  }
}
