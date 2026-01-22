import type { Meta, StoryObj } from '@storybook/react';
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
