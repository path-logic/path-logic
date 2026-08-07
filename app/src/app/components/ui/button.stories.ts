import { Component } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { ButtonModule } from 'primeng/button';

@Component({
    selector: 'app-button-demo',
    standalone: true,
    imports: [ButtonModule],
    template: `
        <div class="flex flex-col gap-10 p-8 max-w-4xl">
            <!-- Header -->
            <div>
                <h1
                    class="text-3xl font-black text-surface-900 dark:text-white uppercase tracking-widest mb-2"
                >
                    Button Design System
                </h1>
                <p class="text-surface-500 dark:text-surface-400">
                    Path Logic implementations of PrimeNG buttons.
                </p>
            </div>

            <!-- Severities -->
            <section class="space-y-4">
                <h2
                    class="text-xs font-bold text-surface-500 uppercase tracking-widest border-b border-surface-200 pb-2"
                >
                    Severities
                </h2>
                <div class="flex flex-wrap gap-4 items-center">
                    <p-button label="Primary" />
                    <p-button label="Secondary" severity="secondary" />
                    <p-button label="Success" severity="success" />
                    <p-button label="Info" severity="info" />
                    <p-button label="Warning" severity="warn" />
                    <p-button label="Danger" severity="danger" />
                    <p-button label="Contrast" severity="contrast" />
                </div>
            </section>

            <!-- Variants -->
            <section class="space-y-4">
                <h2
                    class="text-xs font-bold text-surface-500 uppercase tracking-widest border-b border-surface-200 pb-2"
                >
                    Variants
                </h2>
                <div class="flex flex-wrap gap-4 items-center">
                    <p-button label="Solid Primary" />
                    <p-button label="Outlined Primary" [outlined]="true" />
                    <p-button label="Text Primary" [text]="true" />
                    <p-button label="Link Primary" [link]="true" />
                </div>
                <div class="flex flex-wrap gap-4 items-center pt-2">
                    <p-button label="Solid Secondary" severity="secondary" />
                    <p-button label="Outlined Secondary" severity="secondary" [outlined]="true" />
                    <p-button label="Text Secondary" severity="secondary" [text]="true" />
                    <p-button label="Link Secondary" severity="secondary" [link]="true" />
                </div>
            </section>

            <!-- Sizes -->
            <section class="space-y-4">
                <h2
                    class="text-xs font-bold text-surface-500 uppercase tracking-widest border-b border-surface-200 pb-2"
                >
                    Sizes
                </h2>
                <div class="flex flex-wrap gap-4 items-end">
                    <p-button label="Small Button" size="small" />
                    <p-button label="Normal Button" />
                    <p-button label="Large Button" size="large" />
                </div>
            </section>

            <!-- States -->
            <section class="space-y-4">
                <h2
                    class="text-xs font-bold text-surface-500 uppercase tracking-widest border-b border-surface-200 pb-2"
                >
                    States & Features
                </h2>
                <div class="flex flex-wrap gap-4 items-center">
                    <p-button label="Disabled" [disabled]="true" />
                    <p-button label="Loading" [loading]="true" />
                    <p-button label="Icon Left" icon="pi pi-check" />
                    <p-button label="Icon Right" icon="pi pi-arrow-right" iconPos="right" />
                    <p-button icon="pi pi-search" ariaLabel="Search" [attr.aria-label]="'Search'">
                        <span class="sr-only">Search</span>
                    </p-button>
                </div>
            </section>
        </div>
    `
})
class ButtonDemoComponent {}

const meta: Meta<ButtonDemoComponent> = {
    title: 'UI/Button',
    component: ButtonDemoComponent,
    decorators: [
        moduleMetadata({
            imports: [ButtonDemoComponent]
        })
    ],
    parameters: {
        layout: 'fullscreen'
    }
};

export default meta;
type Story = StoryObj<ButtonDemoComponent>;

export const Gallery: Story = {};
