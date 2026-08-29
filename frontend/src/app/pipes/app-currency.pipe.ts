import { Pipe, PipeTransform, inject } from '@angular/core';
import { CurrencyService } from '../services/currency.service';

@Pipe({
  name: 'appCurrency',
  standalone: true,
  pure: false // Impure to update when currency changes
})
export class AppCurrencyPipe implements PipeTransform {
  private currencyService = inject(CurrencyService);

  transform(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    const numValue = Number(value);
    if (isNaN(numValue)) {
      return String(value);
    }
    const converted = this.currencyService.convert(numValue);
    // Format with commas, e.g., "₹ 1,000"
    return `${converted.symbol} ${converted.amount.toLocaleString()}`;
  }
}
