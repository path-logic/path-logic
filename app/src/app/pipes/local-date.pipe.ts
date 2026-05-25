import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';

@Pipe({
    name: 'localDate',
    standalone: true
})
export class LocalDatePipe implements PipeTransform {
    transform(
        value: string | Date | null | undefined,
        format: 'short' | 'medium' | 'long' = 'medium'
    ): string {
        if (!value) return '';

        let d: Date;
        if (typeof value === 'string') {
            const parts = value.split('-');
            if (parts.length === 3) {
                // Parse cleanly to avoid timezone shifts (local midnight)
                d = new Date(
                    parseInt(parts[0] || '0', 10),
                    parseInt(parts[1] || '1', 10) - 1,
                    parseInt(parts[2] || '1', 10)
                );
            } else {
                d = new Date(value);
            }
        } else {
            d = value;
        }

        if (isNaN(d.getTime())) return '';

        if (format === 'short') {
            return new Intl.DateTimeFormat('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric'
            }).format(d);
        }

        if (format === 'long') {
            return new Intl.DateTimeFormat('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            }).format(d);
        }

        // Medium format
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }).format(d);
    }
}
