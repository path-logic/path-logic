import type { Meta, StoryObj } from '@storybook/angular';
import { DriveReauthBannerComponent } from './drive-reauth-banner.component';

const meta: Meta<DriveReauthBannerComponent> = {
    title: 'Sync/DriveReauthBanner',
    component: DriveReauthBannerComponent,
    tags: ['autodocs']
};

export default meta;
type Story = StoryObj<DriveReauthBannerComponent>;

export const Default: Story = {
    render: () => ({
        template: `<drive-reauth-banner />`
    })
};
