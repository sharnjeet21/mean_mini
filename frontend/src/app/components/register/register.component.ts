import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  showPassword = false;
  loading = false;
  error = '';

  constructor(private auth: AuthService, private router: Router) {}

  onRegister() {
    if (this.name.trim().length < 2) { this.error = 'Please enter your full name.'; return; }
    if (this.password.length < 8) { this.error = 'Password must contain at least 8 characters.'; return; }
    if (this.password !== this.confirmPassword) { this.error = 'Passwords do not match.'; return; }
    this.error = '';
    this.loading = true;
    this.auth.register(this.name, this.email, this.password).subscribe({
      next: (res) => { this.loading = false; if (res.success) this.router.navigate(['/dashboard']); },
      error: (err) => { this.loading = false; this.error = err.error?.message || 'Registration failed.'; }
    });
  }
}
