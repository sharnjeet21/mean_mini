import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  showPassword = false;
  error = '';
  loading = false;
  logoutToast = '';

  constructor(public auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    const msg = this.auth.logoutMessage();
    if (msg) {
      this.logoutToast = msg;
      this.auth.logoutMessage.set(null);
      // Auto-dismiss after 5 s
      setTimeout(() => { this.logoutToast = ''; }, 5000);
    }
  }

  onSubmit() {
    if (!this.email || !this.password) return;
    this.loading = true;
    this.error = '';
    this.auth.login(this.email, this.password).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) this.router.navigate(['/dashboard']);
        else this.error = res.message || 'Login failed';
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Invalid credentials';
      }
    });
  }
}
