import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="register-container">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-md-6 col-lg-5">
            <div class="card shadow-lg border-0">
              <div class="card-body p-5">
                <div class="text-center mb-4">
                  <i class="fas fa-user-plus text-success" style="font-size: 4rem;"></i>
                  <h2 class="mt-3 fw-bold">Create Account</h2>
                  <p class="text-muted">Join us and start planning amazing trips</p>
                </div>

                <form (ngSubmit)="onRegister()" #registerForm="ngForm">
                  <div class="mb-3">
                    <label for="name" class="form-label fw-semibold">
                      <i class="fas fa-user me-2"></i>Full Name
                    </label>
                    <input 
                      type="text" 
                      class="form-control form-control-lg" 
                      id="name"
                      name="name"
                      [(ngModel)]="registerData.name"
                      required
                      placeholder="Enter your full name"
                    >
                  </div>

                  <div class="mb-3">
                    <label for="email" class="form-label fw-semibold">
                      <i class="fas fa-envelope me-2"></i>Email Address
                    </label>
                    <input 
                      type="email" 
                      class="form-control form-control-lg" 
                      id="email"
                      name="email"
                      [(ngModel)]="registerData.email"
                      required
                      placeholder="Enter your email"
                    >
                  </div>

                  <div class="mb-3">
                    <label for="password" class="form-label fw-semibold">
                      <i class="fas fa-lock me-2"></i>Password
                    </label>
                    <input 
                      type="password" 
                      class="form-control form-control-lg" 
                      id="password"
                      name="password"
                      [(ngModel)]="registerData.password"
                      required
                      placeholder="Create a strong password"
                    >
                  </div>

                  <div class="mb-4">
                    <label for="confirmPassword" class="form-label fw-semibold">
                      <i class="fas fa-lock me-2"></i>Confirm Password
                    </label>
                    <input 
                      type="password" 
                      class="form-control form-control-lg" 
                      id="confirmPassword"
                      name="confirmPassword"
                      [(ngModel)]="registerData.confirmPassword"
                      required
                      placeholder="Confirm your password"
                    >
                  </div>

                  <div class="mb-3 form-check">
                    <input 
                      type="checkbox" 
                      class="form-check-input" 
                      id="terms"
                      name="terms"
                      [(ngModel)]="registerData.acceptTerms"
                      required
                    >
                    <label class="form-check-label" for="terms">
                      I agree to the <a href="#" class="text-primary">Terms of Service</a> and 
                      <a href="#" class="text-primary">Privacy Policy</a>
                    </label>
                  </div>

                  <div class="d-grid mb-3">
                    <button 
                      type="submit" 
                      class="btn btn-gradient btn-lg"
                      [disabled]="!registerForm.form.valid || registerData.password !== registerData.confirmPassword"
                    >
                      <i class="fas fa-user-plus me-2"></i>Create Account
                    </button>
                  </div>

                  <div class="text-center">
                    <p class="mb-0">Already have an account? 
                      <a routerLink="/login" class="text-primary fw-semibold">Sign in here</a>
                    </p>
                  </div>
                </form>

                <div class="mt-4 pt-4 border-top">
                  <div class="text-center">
                    <small class="text-muted">
                      <i class="fas fa-shield-alt me-1"></i>
                      Your information is safe and secure
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
    .register-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
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
    
    .btn-gradient:disabled {
      opacity: 0.6;
      transform: none;
      box-shadow: none;
    }
    
    .form-control:focus {
      border-color: #667eea;
      box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
    }
    
    .form-check-input:checked {
      background-color: #667eea;
      border-color: #667eea;
    }
  `]
})
export class RegisterComponent {
  registerData = {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
  };

  onRegister() {
    if (this.registerData.password !== this.registerData.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    
    console.log('Registration attempt:', this.registerData);
    // TODO: Implement actual registration logic with backend API
  }
}