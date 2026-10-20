import { signal } from '@angular/core';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, within } from 'storybook/test';
import { ImportOrchestrationService } from '../../../services/import/import-orchestration.service';
import type { IImportProgress } from '../../../services/import/import.types';
import { ImportProgressOverlayComponent } from './import-progress-overlay.component';

const createMockImportService = (progress: IImportProgress) => ({
    progress: signal(progress),
    cancel: () => {}
});

const meta: Meta<ImportProgressOverlayComponent> = {
    title: 'Ledger/ImportProgressOverlay',
    component: ImportProgressOverlayComponent,
    decorators: [
        applicationConfig({
            providers: [
                {
                    provide: ImportOrchestrationService,
                    useValue: createMockImportService({
                        stage: 'reconciling',
                        processed: 42,
                        total: 100,
                        pct: 42,
                        tier: 'medium'
                    })
                }
            ]
        })
    ],
    parameters: {
        a11y: {
            config: {
                rules: [{ id: 'color-contrast', enabled: true }]
            }
        }
    }
};

export default meta;
type Story = StoryObj<ImportProgressOverlayComponent>;

export const ReconcilingStage3: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Checking for Duplicates')).toBeInTheDocument();
        await expect(canvas.getByText(/42 \/ 100 transactions/i)).toBeInTheDocument();
        const stage3 = canvas.getByText('3');
        await expect(stage3).toBeInTheDocument();
        await expect(stage3.className).not.toContain('animate-pulse');
    }
};

export const ParsingStage2: Story = {
    decorators: [
        applicationConfig({
            providers: [
                {
                    provide: ImportOrchestrationService,
                    useValue: createMockImportService({
                        stage: 'parsing',
                        processed: 15,
                        total: 100,
                        pct: 15,
                        tier: 'medium'
                    })
                }
            ]
        })
    ]
};
