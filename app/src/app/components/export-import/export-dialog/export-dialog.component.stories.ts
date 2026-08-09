import { importProvidersFrom } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { ExportDialogComponent } from './export-dialog.component';

const meta: Meta<ExportDialogComponent> = {
    title: 'ExportImport/ExportDialogComponent',
    component: ExportDialogComponent,
    decorators: [
        applicationConfig({
            providers: [importProvidersFrom(BrowserAnimationsModule)]
        }),
        moduleMetadata({
            imports: [ExportDialogComponent]
        })
    ],
    tags: ['autodocs'],
    parameters: {
        layout: 'centered'
    }
};

export default meta;
type Story = StoryObj<ExportDialogComponent>;

export const Default: Story = {
    args: {
        visible: true
    }
};

export const ExportingState: Story = {
    args: {
        visible: true
    },
    render: args => ({
        props: args,
        onNgInit(comp: ExportDialogComponent) {
            comp.isProcessing.set(true);
            comp.statusMessage.set('Encrypting accounts and settings...');
        }
    })
};

export const ErrorState: Story = {
    args: {
        visible: true
    },
    render: args => ({
        props: args,
        onNgInit(comp: ExportDialogComponent) {
            comp.isProcessing.set(false);
            comp.statusMessage.set('Export failed: Network error connecting to storage provider.');
        }
    })
};
