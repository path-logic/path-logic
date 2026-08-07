/* eslint-disable @typescript-eslint/no-explicit-any */
import { PlatformLocation } from '@angular/common';
import { Component, ɵReflectionCapabilities as ReflectionCapabilities } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withDisabledInitialNavigation } from '@angular/router';
import { definePreset } from '@primeuix/themes';
import Lara from '@primeuix/themes/lara';
import { setCompodocJson } from '@storybook/addon-docs/angular';
import { applicationConfig, type Preview } from '@storybook/angular';
import { providePrimeNG } from 'primeng/config';

import docJson from '../documentation.json';
import '../src/styles.css';

// Support Angular signal inputs/outputs in Storybook by mapping inputsClass/outputsClass to inputs/outputs
const docJsonClone = JSON.parse(JSON.stringify(docJson));
if (docJsonClone && docJsonClone.components) {
    docJsonClone.components.forEach((component: any) => {
        if (component.inputsClass && component.inputsClass.length > 0) {
            component.inputs = component.inputs || [];
            component.inputsClass.forEach((inputProp: any) => {
                const exists = component.inputs.some((i: any) => i.name === inputProp.name);
                if (!exists) {
                    component.inputs.push({
                        name: inputProp.name,
                        type: inputProp.type,
                        required: inputProp.required || false,
                        description: inputProp.description || ''
                    });
                }
            });
        }
        if (component.outputsClass && component.outputsClass.length > 0) {
            component.outputs = component.outputs || [];
            component.outputsClass.forEach((outputProp: any) => {
                const exists = component.outputs.some((o: any) => o.name === outputProp.name);
                if (!exists) {
                    component.outputs.push({
                        name: outputProp.name,
                        type: outputProp.type,
                        description: outputProp.description || ''
                    });
                }
            });
        }
        if (component.inputs && component.inputs.length > 0) {
            console.log(
                `[Compodoc Map] Mapped component ${component.name}:`,
                component.inputs.map((i: any) => i.name)
            );
        }
    });
}

setCompodocJson(docJsonClone);

const reflectionCapabilities = new ReflectionCapabilities();
const patchedComponents = new Set<any>();

function patchComponentMetadata(component: any): void {
    try {
        if (!component || typeof component !== 'function' || patchedComponents.has(component)) {
            return;
        }
        patchedComponents.add(component);

        const compodocComponent = docJsonClone.components?.find(
            (c: any) => c.name === component.name
        );
        if (compodocComponent) {
            let val = component.ɵcmp;

            Object.defineProperty(component, 'ɵcmp', {
                get() {
                    return val;
                },
                set(newCmp) {
                    if (newCmp) {
                        try {
                            const patched = { ...newCmp };
                            patched.inputs = { ...newCmp.inputs };
                            patched.outputs = { ...newCmp.outputs };

                            compodocComponent.inputs?.forEach((input: any) => {
                                if (!(input.name in patched.inputs)) {
                                    patched.inputs[input.name] = [input.name, 1, null];
                                }
                            });
                            compodocComponent.outputs?.forEach((output: any) => {
                                if (!(output.name in patched.outputs)) {
                                    patched.outputs[output.name] = output.name;
                                }
                            });
                            val = patched;
                        } catch {
                            val = newCmp;
                        }
                    } else {
                        val = newCmp;
                    }
                },
                configurable: true
            });

            if (val) {
                component.ɵcmp = val;
            }
        }

        const annotations = reflectionCapabilities.annotations(component);
        const componentDecorator = annotations.reverse().find((d: any) => d instanceof Component);
        if (componentDecorator && componentDecorator.imports) {
            componentDecorator.imports.forEach((imp: any) => {
                patchComponentMetadata(imp);
            });
        }
    } catch {
        // Ignore
    }
}

const PremiumPreset = definePreset(Lara, {
    semantic: {
        primary: {
            50: '#eff6ff',
            100: '#dbeafe',
            200: '#bfdbfe',
            300: '#93c5fd',
            400: '#60a5fa',
            500: '#3b82f6',
            600: '#2563eb',
            700: '#1d4ed8',
            800: '#1e40af',
            900: '#1e3a8a',
            950: '#172554'
        },
        success: {
            50: '#eff6ff',
            100: '#dbeafe',
            200: '#bfdbfe',
            300: '#93c5fd',
            400: '#60a5fa',
            500: '#3b82f6',
            600: '#2563eb',
            700: '#1d4ed8',
            800: '#1e40af',
            900: '#1e3a8a',
            950: '#172554'
        },
        colorScheme: {
            light: {
                surface: {
                    0: '#ffffff',
                    50: '#f8fafc',
                    100: '#f1f5f9',
                    200: '#e2e8f0',
                    300: '#cbd5e1',
                    400: '#94a3b8',
                    500: '#64748b',
                    600: '#475569',
                    700: '#334155',
                    800: '#1e293b',
                    900: '#0f172a',
                    950: '#020617'
                }
            },
            dark: {
                surface: {
                    0: '#1e293b',
                    50: '#0f172a',
                    100: '#1e293b',
                    200: '#293548',
                    300: '#334155',
                    400: '#475569',
                    500: '#64748b',
                    600: '#94a3b8',
                    700: '#cbd5e1',
                    800: '#e2e8f0',
                    900: '#f1f5f9',
                    950: '#f8fafc'
                }
            }
        }
    }
});

const preview: Preview = {
    decorators: [
        (storyFn, context): any => {
            // Synchronize Storybook toolbar backgrounds/theme globals with application data-theme
            const globals = context.globals;
            const bgValue = globals['backgrounds']?.value;
            const themeValue = globals['theme'];

            // Path Logic default is light mode
            let isDark = false;

            if (themeValue === 'light') {
                isDark = false;
            } else if (themeValue === 'dark') {
                isDark = true;
            } else if (bgValue) {
                const lightColors = [
                    '#ffffff',
                    '#f8f9fa',
                    '#f8f8f8',
                    '#f5f5f5',
                    '#e0e0e0',
                    '#f1f1f1'
                ];
                isDark = !lightColors.includes(bgValue.toLowerCase());
            }

            const htmlElement = document.documentElement;
            if (isDark) {
                htmlElement.setAttribute('data-theme', 'dark');
                htmlElement.classList.add('dark');
                htmlElement.classList.add('p-dark');
            } else {
                htmlElement.setAttribute('data-theme', 'light');
                htmlElement.classList.remove('dark');
                htmlElement.classList.remove('p-dark');
            }

            // Apply global app styles to document body
            document.body.style.backgroundColor = 'var(--pl-bg-base)';
            document.body.style.color = 'var(--pl-text-primary)';
            document.body.style.fontFamily = "'Outfit', sans-serif";

            const component = context.component;
            if (component) {
                patchComponentMetadata(component);
            }
            return storyFn();
        },
        applicationConfig({
            providers: [
                provideRouter([], withDisabledInitialNavigation()),
                {
                    provide: PlatformLocation,
                    useValue: {
                        getBaseHrefFromDOM: (): string => '/',
                        onPopState: (): (() => void) => (): void => {
                            /* noop */
                        },
                        onHashChange: (): (() => void) => (): void => {
                            /* noop */
                        },
                        pushState(): void {
                            /* noop */
                        },
                        replaceState(): void {
                            /* noop */
                        },
                        pathname: '/iframe.html',
                        search: '',
                        hash: '',
                        getState: (): null => null
                    }
                },
                provideAnimationsAsync(),
                providePrimeNG({
                    theme: {
                        preset: PremiumPreset,
                        options: {
                            darkModeSelector: '[data-theme="dark"]'
                        }
                    },
                    translation: {
                        accept: 'Yes',
                        reject: 'No',
                        aria: {
                            close: 'Close dialog',
                            previous: 'Previous',
                            next: 'Next',
                            navigation: 'Navigation',
                            selectAll: 'All items selected',
                            unselectAll: 'All items unselected'
                        }
                    }
                })
            ]
        })
    ],
    parameters: {
        actions: { argTypesRegex: '^on[A-Z].*' },
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/
            }
        },
        backgrounds: {
            default: 'light',
            values: [
                { name: 'light', value: '#ffffff' },
                { name: 'dark', value: '#0f172a' }
            ]
        },
        // We use tailwind, so applying padding to the body helps give components breathing room
        layout: 'padded',
        // Global a11y configuration
        a11y: {
            test: 'error',
            config: {
                rules: [
                    { id: 'aria-dialog-name', enabled: false },
                    { id: 'aria-input-field-name', enabled: false },
                    { id: 'aria-required-children', enabled: false },
                    { id: 'button-name', enabled: false },
                    { id: 'color-contrast', enabled: false }
                ]
            }
        }
    }
};

export default preview;
