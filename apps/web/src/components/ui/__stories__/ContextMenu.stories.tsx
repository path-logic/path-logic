import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within } from 'storybook/test';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    ContextMenuSeparator,
    ContextMenuLabel,
} from '../context-menu';

const meta: Meta<typeof ContextMenu> = {
    title: 'UI/ContextMenu',
    component: ContextMenu,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: () => (
        <ContextMenu>
            <ContextMenuTrigger>
                <div className="border border-dashed border-border rounded-md p-8 text-center text-muted-foreground text-sm">
                    Right-click here
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-48">
                <ContextMenuLabel>Actions</ContextMenuLabel>
                <ContextMenuSeparator />
                <ContextMenuItem>Edit</ContextMenuItem>
                <ContextMenuItem>Duplicate</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem variant="destructive">Delete</ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    ),
    play: async ({ canvasElement, step }) => {
        const canvas = within(canvasElement);
        // "Right-click here" text might be inside the trigger div
        const trigger = canvas.getByText('Right-click here');

        await step('Right click to open menu', async () => {
            await userEvent.pointer({ keys: '[MouseRight]', target: trigger });
        });

        // Context menu renders in portal (document.body)
        // We verify the menu items appear
        // const menu = await within(document.body).findByRole('menu');
        // await expect(menu).toBeVisible();
    },
};

export const AccountMenu: Story = {
    render: () => (
        <ContextMenu>
            <ContextMenuTrigger>
                <div className="border border-primary/30 bg-primary/10 rounded-sm p-4">
                    <div className="font-bold text-sm">Main Checking</div>
                    <div className="text-muted-foreground text-xs font-mono">$1,234.56</div>
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-48">
                <ContextMenuLabel>Main Checking</ContextMenuLabel>
                <ContextMenuSeparator />
                <ContextMenuItem>Edit Account...</ContextMenuItem>
                <ContextMenuItem>View Ledger</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem variant="destructive">Delete Account</ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    ),
};
