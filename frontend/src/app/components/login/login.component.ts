import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-md-6 col-lg-5">
            <div class="card shadow-lg border-0">
              <div class="card-body p-5">
                <div class="text-center mb-4">
                  <i class="fas fa-user-circle text-primary" style="font-size: 4rem;"></i>
                  <h2 class="mt-3 fw-bold">Welcome Back</h2>
                  <p class="text-muted">Sign in to your account</p>
                </div>

                <form (ngSubmit)="onLogin()" #loginForm="ngForm">
                  <div class="mb-3">
                    <label for="email" class="form-label fw-semibold">
                      <i class="fas fa-envelope me-2"></i>Email Address
                    </label>
                    <input 
                      type="email" 
                      class="form-control form-control-lg" 
                      id="email"
                      name="email"
                      [(ngModel)]="loginData.email"
                      required
                      placeholder="Enter your email"
                    >
                  </div>

                  <div class="mb-4">
                    <label for="password" class="form-label fw-semibold">
                      <i class="fas fa-lock me-2"></i>Password
                    </label>
                    <input 
                      type="password" 
                      class="form-control form-control-lg" 
                      id="password"
                      name="password"
                      [(ngModel)]="loginData.password"
                      required
                      placeholder="Enter your password"
                    >
                  </div>

                  <div class="d-grid mb-3">
                    <button 
                      type="submit" 
                      class="btn btn-gradient btn-lg"
                      [disabled]="!loginForm.form.valid"
                    >
                      <i class="fas fa-sign-in-alt me-2"></i>Sign In
                    </button>
                  </div>

                  <div class="text-center">
                    <p class="mb-0">Don't have an account? 
                      <a routerLink="/register" class="text-primary fw-semibold">Sign up here</a>
                    </p>
                  </div>
                </form>

                <div class="mt-4 pt-4 border-top">
                  <div class="text-center">
                    <small class="text-muted">
                      <i class="fas fa-shield-alt me-1"></i>
                      Your data is secure with us
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      padding: 100px 0 50px;
      display: flex;
      align-items: center;
    }
    
    .card {
      border-radius: 15px;
      overflow: hidden;
    }
    
    .btn-gradient {
      background: linear-gradient(45deg, #667eea, #764ba2);
      border: none;
      color: white;
      transition: all 0.3s ease;
    }
    
    .btn-gradient:hover {
      background: linear-gradient(45deg, #764ba2, #667eea);
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
    }
    
    .form-control:focus {
      border-color: #667eea;
      box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
    }
  `]
})
export class LoginComponent {
  loginData = {
    email: '',
    password: ''
  };

  onLogin() {
    console.log('Login attempt:', this.loginData);
    // TODO: Implement actual login logic with backend API
  }
}