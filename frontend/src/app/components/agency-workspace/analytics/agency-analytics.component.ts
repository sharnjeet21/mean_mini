import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { CurrencyService } from '../../../services/currency.service';

@Component({
  selector: 'app-agency-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agency-analytics.component.html',
})
export class AgencyAnalyticsComponent implements OnInit {
  currencyService = inject(CurrencyService);
  private api = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);

  analyticsData: any = null;
  loading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.loading = true;
    this.errorMessage = '';
    this.api.getAgencyAnalytics().pipe(
      finalize(() => { this.loading = false; this.cdr.detectChanges(); })
    ).subscribe({
      next: (res) => {
        this.analyticsData = res;
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to load analytics.';
      },
    });
  }

  formatValue(val: number): string {
    const converted = this.currencyService.convert(val);
    return `${converted.symbol}${converted.amount.toLocaleString()}`;
  }
}
