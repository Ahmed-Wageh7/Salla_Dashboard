import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats numbers with commas and optional decimal places
 * Example: 12500 | numberFormat → '12,500'
 * Example: 12500.50 | numberFormat:2 → '12,500.50'
 */
@Pipe({
  name: 'numberFormat',
  standalone: true,
})
export class NumberFormatPipe implements PipeTransform {
  transform(value: number | string, decimals: number = 0): string {
    if (value === null || value === undefined) return '0';

    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0';

    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
}

/**
 * Formats currency with symbol
 * Example: 12500 | currencyFormat:'SAR' → '12,500 ريال'
 */
@Pipe({
  name: 'currencyFormat',
  standalone: true,
})
export class CurrencyFormatPipe implements PipeTransform {
  private currencySymbols: Record<string, string> = {
    SAR: 'ريال',
    KWD: 'ريال',
    OMR: 'ريال',
    USD: 'ريال',
    EUR: '€',
    'ر.س': 'ريال',
    '﷼': 'ريال',
    ريال: 'ريال',
  };

  transform(value: number | string, currency: string = 'ريال'): string {
    if (value === null || value === undefined) return '0';

    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0';

    const formatted = num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3,
    });

    const symbol = this.currencySymbols[currency] || currency;
    return `${formatted} ${symbol}`;
  }
}

/**
 * Converts a date string to relative time
 * Example: '2025-03-05' | relativeTime → '2 days ago'
 */
@Pipe({
  name: 'relativeTime',
  standalone: true,
})
export class RelativeTimePipe implements PipeTransform {
  transform(value: string | Date): string {
    if (!value) return '';

    const date = typeof value === 'string' ? new Date(value) : value;
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)} weeks ago`;

    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}

/**
 * Truncates text with ellipsis
 * Example: 'Very long text' | truncate:10 → 'Very long...'
 */
@Pipe({
  name: 'truncate',
  standalone: true,
})
export class TruncatePipe implements PipeTransform {
  transform(value: string, limit: number = 50, suffix: string = '...'): string {
    if (!value) return '';
    if (value.length <= limit) return value;
    return value.substring(0, limit).trim() + suffix;
  }
}

/**
 * Displays star rating as HTML
 * Example: 4 | starRating → '★★★★☆'
 */
@Pipe({
  name: 'starRating',
  standalone: true,
})
export class StarRatingPipe implements PipeTransform {
  transform(value: number, maxStars: number = 5): string {
    const fullStars = Math.floor(value);
    const hasHalfStar = value % 1 >= 0.5;
    const emptyStars = maxStars - fullStars - (hasHalfStar ? 1 : 0);

    return '★'.repeat(fullStars) + (hasHalfStar ? '½' : '') + '☆'.repeat(emptyStars);
  }
}

/**
 * Formats large numbers to compact form
 * Example: 1500000 | compactNumber → '1.5M'
 */
@Pipe({
  name: 'compactNumber',
  standalone: true,
})
export class CompactNumberPipe implements PipeTransform {
  transform(value: number): string {
    if (value === null || value === undefined) return '0';

    const abs = Math.abs(value);

    if (abs >= 1e9) return (value / 1e9).toFixed(1) + 'B';
    if (abs >= 1e6) return (value / 1e6).toFixed(1) + 'M';
    if (abs >= 1e3) return (value / 1e3).toFixed(1) + 'K';

    return value.toString();
  }
}
