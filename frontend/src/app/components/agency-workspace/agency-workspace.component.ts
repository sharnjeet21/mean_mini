import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-agency-workspace',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './agency-workspace.component.html',
})
export class AgencyWorkspaceComponent {
  auth = inject(AuthService);

  get userRole(): string {
    return this.auth.currentUser()?.role || '';
  }

  get isTripManager(): boolean {
    return this.userRole === 'trip-manager';
  }

  get isAdmin(): boolean {
    return ['admin', 'superadmin'].includes(this.userRole);
  }

  get isSuperAdmin(): boolean {
    return this.userRole === 'superadmin';
  }
}
