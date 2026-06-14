import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';

@Component({
    selector: 'app-animation-demo',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="flex flex-col gap-10 p-8 max-w-4xl bg-slate-900 text-white min-h-screen">
            <!-- Header -->
            <div>
                <h1 class="text-3xl font-black uppercase tracking-widest mb-2 text-primary">
                    Animation Design System
                </h1>
                <p class="text-slate-400">
                    A centralized, pure CSS animation system replacing deprecated Angular
                    animations.
                </p>
            </div>

            <!-- Duration Scale -->
            <section class="space-y-4">
                <h2
                    class="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-700 pb-2"
                >
                    Duration Scale
                </h2>
                <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div class="bg-slate-800 p-4 rounded-sm border border-slate-700">
                        <div class="text-[10px] font-black uppercase text-primary mb-1">
                            Instant
                        </div>
                        <div class="text-lg font-bold font-mono">100ms</div>
                        <div
                            class="text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-tight"
                        >
                            Micro-interactions, focus rings
                        </div>
                    </div>
                    <div class="bg-slate-800 p-4 rounded-sm border border-slate-700">
                        <div class="text-[10px] font-black uppercase text-primary mb-1">Fast</div>
                        <div class="text-lg font-bold font-mono">200ms</div>
                        <div
                            class="text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-tight"
                        >
                            Buttons, hover toggles
                        </div>
                    </div>
                    <div class="bg-slate-800 p-4 rounded-sm border border-slate-700">
                        <div class="text-[10px] font-black uppercase text-primary mb-1">Normal</div>
                        <div class="text-lg font-bold font-mono">300ms</div>
                        <div
                            class="text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-tight"
                        >
                            Panels, cards, reveals
                        </div>
                    </div>
                    <div class="bg-slate-800 p-4 rounded-sm border border-slate-700">
                        <div class="text-[10px] font-black uppercase text-primary mb-1">Slow</div>
                        <div class="text-lg font-bold font-mono">450ms</div>
                        <div
                            class="text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-tight"
                        >
                            Dialogs, major transitions
                        </div>
                    </div>
                    <div class="bg-slate-800 p-4 rounded-sm border border-slate-700">
                        <div class="text-[10px] font-black uppercase text-primary mb-1">Slower</div>
                        <div class="text-lg font-bold font-mono">600ms</div>
                        <div
                            class="text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-tight"
                        >
                            Accordion expands, list staggers
                        </div>
                    </div>
                </div>
            </section>

            <!-- Easing Curves -->
            <section class="space-y-4">
                <h2
                    class="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-700 pb-2"
                >
                    Easing Curves
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div class="bg-slate-800 p-4 rounded-sm border border-slate-700 space-y-2">
                        <div class="text-[10px] font-black uppercase text-primary">Standard</div>
                        <div class="text-[10px] font-mono opacity-60">
                            cubic-bezier(0.4, 0, 0.2, 1)
                        </div>
                        <div class="h-1 bg-slate-700 w-full rounded-full overflow-hidden">
                            <div class="h-full bg-primary animate-pulse w-full"></div>
                        </div>
                    </div>
                    <div class="bg-slate-800 p-4 rounded-sm border border-slate-700 space-y-2">
                        <div class="text-[10px] font-black uppercase text-primary">Decelerate</div>
                        <div class="text-[10px] font-mono opacity-60">
                            cubic-bezier(0, 0, 0.2, 1)
                        </div>
                        <div class="h-1 bg-slate-700 w-full rounded-full overflow-hidden">
                            <div class="h-full bg-primary animate-pulse w-full"></div>
                        </div>
                    </div>
                    <div class="bg-slate-800 p-4 rounded-sm border border-slate-700 space-y-2">
                        <div class="text-[10px] font-black uppercase text-primary">Accelerate</div>
                        <div class="text-[10px] font-mono opacity-60">
                            cubic-bezier(0.4, 0, 1, 1)
                        </div>
                        <div class="h-1 bg-slate-700 w-full rounded-full overflow-hidden">
                            <div class="h-full bg-primary animate-pulse w-full"></div>
                        </div>
                    </div>
                    <div class="bg-slate-800 p-4 rounded-sm border border-slate-700 space-y-2">
                        <div class="text-[10px] font-black uppercase text-primary">Spring</div>
                        <div class="text-[10px] font-mono opacity-60">
                            cubic-bezier(0.175, 0.885, 0.32, 1.275)
                        </div>
                        <div class="h-1 bg-slate-700 w-full rounded-full overflow-hidden">
                            <div class="h-full bg-primary animate-pulse w-full"></div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Composable Entrance Animations -->
            <section class="space-y-4">
                <div class="flex justify-between items-center border-b border-slate-700 pb-2">
                    <h2 class="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Composable Entrances (animate-in)
                    </h2>
                    <button
                        (click)="triggerReplay()"
                        class="px-3 py-1.5 bg-primary hover:bg-primary/95 text-[10px] font-black uppercase tracking-widest rounded-sm active:scale-95 transition-all outline-none"
                    >
                        Replay Animations
                    </button>
                </div>

                @if (showElements()) {
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div
                            class="bg-slate-800 p-6 rounded-sm border border-slate-700 flex flex-col items-center justify-center min-h-[120px] text-center animate-in fade-in"
                        >
                            <span
                                class="text-xs font-bold uppercase tracking-widest text-primary mb-1"
                                >Fade In</span
                            >
                            <span class="text-[9px] text-slate-400 font-mono"
                                >.animate-in .fade-in</span
                            >
                        </div>

                        <div
                            class="bg-slate-800 p-6 rounded-sm border border-slate-700 flex flex-col items-center justify-center min-h-[120px] text-center animate-in fade-in zoom-in"
                        >
                            <span
                                class="text-xs font-bold uppercase tracking-widest text-primary mb-1"
                                >Zoom In</span
                            >
                            <span class="text-[9px] text-slate-400 font-mono"
                                >.animate-in .zoom-in</span
                            >
                        </div>

                        <div
                            class="bg-slate-800 p-6 rounded-sm border border-slate-700 flex flex-col items-center justify-center min-h-[120px] text-center animate-in fade-in slide-in-from-top-2"
                        >
                            <span
                                class="text-xs font-bold uppercase tracking-widest text-primary mb-1"
                                >Slide Top 2</span
                            >
                            <span class="text-[9px] text-slate-400 font-mono"
                                >.slide-in-from-top-2</span
                            >
                        </div>

                        <div
                            class="bg-slate-800 p-6 rounded-sm border border-slate-700 flex flex-col items-center justify-center min-h-[120px] text-center animate-in fade-in slide-in-from-bottom-4"
                        >
                            <span
                                class="text-xs font-bold uppercase tracking-widest text-primary mb-1"
                                >Slide Bottom 4</span
                            >
                            <span class="text-[9px] text-slate-400 font-mono"
                                >.slide-in-from-bottom-4</span
                            >
                        </div>

                        <div
                            class="bg-slate-800 p-6 rounded-sm border border-slate-700 flex flex-col items-center justify-center min-h-[120px] text-center animate-in fade-in slide-in-from-left-2"
                        >
                            <span
                                class="text-xs font-bold uppercase tracking-widest text-primary mb-1"
                                >Slide Left 2</span
                            >
                            <span class="text-[9px] text-slate-400 font-mono"
                                >.slide-in-from-left-2</span
                            >
                        </div>

                        <div
                            class="bg-slate-800 p-6 rounded-sm border border-slate-700 flex flex-col items-center justify-center min-h-[120px] text-center animate-in fade-in slide-in-from-right-4"
                        >
                            <span
                                class="text-xs font-bold uppercase tracking-widest text-primary mb-1"
                                >Slide Right 4</span
                            >
                            <span class="text-[9px] text-slate-400 font-mono"
                                >.slide-in-from-right-4</span
                            >
                        </div>

                        <div
                            class="bg-slate-800 p-6 rounded-sm border border-slate-700 flex flex-col items-center justify-center min-h-[120px] text-center animate-in fade-in zoom-in duration-700"
                        >
                            <span
                                class="text-xs font-bold uppercase tracking-widest text-primary mb-1"
                                >Slow Duration</span
                            >
                            <span class="text-[9px] text-slate-400 font-mono">.duration-700</span>
                        </div>

                        <div
                            class="bg-slate-800 p-6 rounded-sm border border-slate-700 flex flex-col items-center justify-center min-h-[120px] text-center animate-in fade-in slide-in-from-bottom-4 duration-150"
                        >
                            <span
                                class="text-xs font-bold uppercase tracking-widest text-primary mb-1"
                                >Fast Duration</span
                            >
                            <span class="text-[9px] text-slate-400 font-mono">.duration-150</span>
                        </div>
                    </div>
                }
            </section>
        </div>
    `
})
class AnimationDemoComponent {
    readonly showElements = signal(true);

    triggerReplay(): void {
        this.showElements.set(false);
        setTimeout(() => {
            this.showElements.set(true);
        }, 50);
    }
}

const meta: Meta<AnimationDemoComponent> = {
    title: 'UI/Animations',
    component: AnimationDemoComponent,
    decorators: [
        moduleMetadata({
            imports: [AnimationDemoComponent, CommonModule]
        })
    ],
    parameters: {
        layout: 'fullscreen'
    }
};

export default meta;
type Story = StoryObj<AnimationDemoComponent>;

export const Gallery: Story = {};
