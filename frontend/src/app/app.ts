import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { ToastService } from './services/toast.service';
import { ConfirmService } from './services/confirm.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, CommonModule],
  templateUrl: './app.html',
})
export class App {
  toastService = inject(ToastService);
  confirmService = inject(ConfirmService);
}
