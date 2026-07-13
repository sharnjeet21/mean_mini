import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { ToastService } from './services/toast.service';
import { ConfirmService } from './services/confirm.service';
import { toastAnimation, modalFadeScale, overlayFade } from './utils/animations';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, CommonModule],
  templateUrl: './app.html',
  animations: [toastAnimation, modalFadeScale, overlayFade],
})
export class App {
  toastService = inject(ToastService);
  confirmService = inject(ConfirmService);
}
