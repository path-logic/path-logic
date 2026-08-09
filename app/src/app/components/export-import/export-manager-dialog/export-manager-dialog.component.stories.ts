import { importProvidersFrom } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { ExportManagerDialogComponent } from './export-manager-dialog.component';

const meta: Meta<ExportManagerDialogComponent> = {
    title: 'ExportImport/ExportManagerDialogComponent',
    component: ExportManagerDialogComponent,
    decorators: [
        applicationConfig({
            providers: [importProvidersFrom(BrowserAnimationsModule)]
        }),
        moduleMetadata({
            imports: [ExportManagerDialogComponent]
        })
    ],
    tags: ['autodocs'],
    parameters: {
        layout: 'centered'
    }
};

export default meta;
type Story = StoryObj<ExportManagerDialogComponent>;

export const Default: Story = {
    args: {
        visible: true
    },
    render: args => ({
        props: args,
        onNgInit(comp: ExportManagerDialogComponent) {
            comp.folders.set([
                {
                    folderId: 'f1',
                    folderName: '20260808_01',
                    createdAt: '2026-08-08T08:00:00.000Z'
                },
                {
                    folderId: 'f2',
                    folderName: '20260808_02',
                    createdAt: '2026-08-08T12:00:00.000Z'
                }
            ]);
        }
    })
};
