import { signal } from '@angular/core';
import type {
    IImportProgress,
    IImportStats
} from '../../../services/import/import-orchestration.service';

export const mockImportProgress = signal<IImportProgress>({
    stage: 'idle',
    pct: 0,
    processed: 0,
    total: 0,
    tier: 'small'
});

export const mockImportStats = signal<IImportStats | null>(null);

export interface IStoryTracker {
    lastStartImportOptions: { deferCategoryMapping?: boolean } | null;
    startImportCalledWithFile: File | null;
    commitImportCalled: boolean;
}

export const storyTracker: IStoryTracker = {
    lastStartImportOptions: null,
    startImportCalledWithFile: null,
    commitImportCalled: false
};

export const mockImportService = {
    progress: mockImportProgress,
    stats: mockImportStats,
    unknownCategories: signal<Array<string>>([]),
    reset: (): void => {
        mockImportProgress.set({
            stage: 'idle',
            pct: 0,
            processed: 0,
            total: 0,
            tier: 'small'
        });
        mockImportStats.set(null);
    },
    startImport: (
        file: File,
        _accountId: string,
        options?: { deferCategoryMapping?: boolean }
    ): void => {
        storyTracker.startImportCalledWithFile = file;
        storyTracker.lastStartImportOptions = options ?? null;
        mockImportProgress.set({
            stage: 'done',
            pct: 100,
            processed: 5,
            total: 5,
            tier: 'small'
        });
        mockImportStats.set({
            totalCount: 5,
            newCount: 5,
            fuzzyCount: 0,
            exactCount: 0
        });
    },
    commitImport: async (): Promise<Array<unknown>> => {
        storyTracker.commitImportCalled = true;
        return [];
    }
};

export const mockSettingsStore = {
    getSetting: (): string => 'false',
    updateSetting: (): void => {
        // no-op for story mock
    }
};

export const mockPostHogService = {
    posthog: {
        capture: (): void => {
            // no-op for story mock
        }
    }
};

export const mockRouter = {
    navigate: async (): Promise<boolean> => true
};
