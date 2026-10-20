import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, within } from 'storybook/test';
import { MermaidService } from '../../../services/mermaid/mermaid.service';
import { MarkdownViewerComponent } from './markdown-viewer.component';

const mockMermaidService = {
    generateId: () => `mermaid-story-${Math.random().toString(36).substring(2, 9)}`,
    render: async (_id: string, code: string) => {
        return `<svg viewBox="0 0 400 200" class="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#f8fafc" rx="8"/>
            <text x="50%" y="45%" text-anchor="middle" font-size="14" font-weight="bold" fill="#1e3a8a">Rendered Financial Diagram</text>
            <text x="50%" y="65%" text-anchor="middle" font-size="11" fill="#64748b">${code.split('\n')[0]}</text>
        </svg>`;
    }
};

const meta: Meta<MarkdownViewerComponent> = {
    title: 'UI/MarkdownViewerComponent',
    component: MarkdownViewerComponent,
    tags: ['autodocs'],
    parameters: {
        layout: 'padded',
        a11y: {
            config: {
                rules: [{ id: 'color-contrast', enabled: false }]
            }
        }
    },
    decorators: [
        applicationConfig({
            providers: [{ provide: MermaidService, useValue: mockMermaidService }]
        })
    ]
};

export default meta;
type Story = StoryObj<MarkdownViewerComponent>;

export const RichFormatting: Story = {
    args: {
        content: `### Executive Financial Brief
Here is a comprehensive summary of your recent cash activity:

* **Net Monthly Savings:** $2,450.00 (up 12% vs last month)
* **Top Fixed Outflow:** Housing & Mortgage ($2,100.00)
* **Pending Reconciliations:** 3 line items

> Note: All figures are calculated from verified double-entry ledgers.`
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Executive Financial Brief')).toBeInTheDocument();
        await expect(canvas.getByText(/Net Monthly Savings:/i)).toBeInTheDocument();
    }
};

export const FinancialTable: Story = {
    args: {
        content: `### Spending Breakdown by Category

| Category | Outflow | % of Total | Status |
| :--- | :--- | :--- | :--- |
| **Housing** | $2,100.00 | 45.2% | Verified |
| **Federal & State Taxes** | $1,250.00 | 26.9% | Cleared |
| **Groceries & Dining** | $680.50 | 14.6% | On Budget |
| **Utilities** | $240.00 | 5.2% | Cleared |
| **Entertainment** | $180.00 | 3.9% | Review |`
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Spending Breakdown by Category')).toBeInTheDocument();
        await expect(canvas.getByText('Housing')).toBeInTheDocument();
        await expect(canvas.getByText('$2,100.00')).toBeInTheDocument();
    }
};

export const MermaidPieChart: Story = {
    args: {
        content: `### Category Allocation
Here is the visual distribution of your expenses:

\`\`\`mermaid
pie title 60-Day Expense Distribution
    "Housing" : 2100
    "Taxes" : 1250
    "Groceries" : 680
    "Utilities" : 240
    "Other" : 180
\`\`\`

The diagram clearly shows Housing represents the primary outflow.`
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Category Allocation')).toBeInTheDocument();
        await expect(
            canvas.getByText(/The diagram clearly shows Housing represents the primary outflow/i)
        ).toBeInTheDocument();
    }
};

export const MermaidFlowchart: Story = {
    args: {
        content: `### Paycheck Allocation Flow

\`\`\`mermaid
flowchart TD
    Gross[Gross Paycheck: $4,500] --> Tax[Taxes & Deductions: $1,200]
    Gross --> Net[Net Direct Deposit: $3,300]
    Net --> Checking[Operating Checking: $2,000]
    Net --> Emergency[High-Yield Savings: $800]
    Net --> Roth[Roth IRA: $500]
\`\`\``
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Paycheck Allocation Flow')).toBeInTheDocument();
    }
};
