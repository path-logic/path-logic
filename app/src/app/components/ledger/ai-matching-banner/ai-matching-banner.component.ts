import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MessageService, PrimeTemplate } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { AiAutoCategorizeService } from '../../../services/ai-auto-categorize/ai-auto-categorize.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';

@Component({
    selector: 'ai-matching-banner',
    standalone: true,
    imports: [CommonModule, Dialog, PrimeTemplate],
    templateUrl: './ai-matching-banner.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AiMatchingBannerComponent {
    readonly aiService = inject(AiAutoCategorizeService);
    private readonly ledgerStore = inject(LedgerStore);
    private readonly messageService = inject(MessageService, { optional: true });

    readonly status = this.aiService.status;
    readonly progress = this.aiService.progress;
    readonly suggestions = this.aiService.suggestions;
    readonly error = this.aiService.error;

    readonly isVisible = computed(() => this.status() !== 'idle');

    readonly matchedCount = computed(
        () => this.suggestions().filter(s => !!s.matchedCategoryId).length
    );

    readonly newCategoryCount = computed(
        () => this.suggestions().filter(s => !!s.suggestedNewCategory).length
    );

    readonly isApplying = signal<boolean>(false);
    readonly isReviewOpen = signal<boolean>(false);

    getCategoryName(categoryId: string): string {
        const cat = this.ledgerStore.categories().find(c => c.id === categoryId);
        return cat ? cat.name : categoryId;
    }

    async handleAcceptAll(): Promise<void> {
        if (this.isApplying()) return;
        this.isApplying.set(true);

        try {
            const count = await this.aiService.acceptAll();
            this.messageService?.add({
                severity: 'success',
                summary: 'AI Categories Applied',
                detail: `Successfully updated ${count} transactions with AI categories.`,
                life: 4000
            });
        } catch (err: unknown) {
            console.error('Failed to apply AI categories:', err);
            this.messageService?.add({
                severity: 'error',
                summary: 'Update Failed',
                detail: 'Could not apply category updates to ledger transactions.',
                life: 5000
            });
        } finally {
            this.isApplying.set(false);
        }
    }

    async handleAcceptAllFromReview(): Promise<void> {
        this.isReviewOpen.set(false);
        await this.handleAcceptAll();
    }

    handleCancel(): void {
        this.aiService.cancel();
    }

    handleDismiss(): void {
        this.aiService.dismiss();
    }

    openReview(): void {
        this.isReviewOpen.set(true);
    }
}
