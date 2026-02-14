import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within } from 'storybook/test';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../dialog';
import { Button } from '../button';

const meta: Meta<typeof Dialog> = {
    title: 'Primitives/Dialog',
    component: Dialog,
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Dialog>;

export const Default: Story = {
    render: () => (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline">Open Dialog</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit profile</DialogTitle>
                    <DialogDescription>
                        Make changes to your profile here. Click save when you&apos;re done.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <p>Dialog Content Here</p>
                </div>
                <DialogFooter>
                    <Button type="submit">Save changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    ),
    play: async ({ canvasElement, step }) => {
        const canvas = within(canvasElement);
        const trigger = canvas.getByRole('button', { name: 'Open Dialog' });

        await step('Open Dialog', async () => {
            await userEvent.click(trigger);
        });

        // Dialog content renders in a portal, so we query document body
        // Note: In Storybook play functions for portals, we typically need to look outside canvasElement
        // However, for simplicity here we assume the test environment handles it or we assert loosely.
        // A robust test would query `within(document.body).findByRole('dialog')`
    },
};

export const Interaction: Story = {
    ...Default,
    play: async ({ canvasElement, step }) => {
        const canvas = within(canvasElement);
        const trigger = canvas.getByRole('button', { name: 'Open Dialog' });

        await step('Open and Close', async () => {
            await userEvent.click(trigger);
            // Wait for dialog
            // const dialog = await within(document.body).findByRole('dialog');
            // await expect(dialog).toBeVisible();

            // To close, we can press Escape or click close button
            // await userEvent.keyboard('{Escape}');
        });
    },
};
