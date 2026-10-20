import { Injectable, inject, signal } from '@angular/core';
import { Money } from '@core';
import { GeminiService } from '../gemini/gemini.service';
import { LedgerStore } from '../ledger-store/ledger.store';

export interface IMessage {
    sender: 'user' | 'assistant';
    text: string;
    timestamp: Date;
}

@Injectable({ providedIn: 'root' })
export class AiAssistantService {
    private readonly geminiService = inject(GeminiService);
    private readonly ledgerStore = inject(LedgerStore);

    readonly isOpen = signal<boolean>(false);
    readonly messages = signal<Array<IMessage>>([
        {
            sender: 'assistant',
            text: 'Hello! I am your Path Logic financial assistant. I have access to your accounts, transactions, and scheduled bills. How can I help you optimize your finances today?',
            timestamp: new Date()
        }
    ]);
    readonly isSending = signal<boolean>(false);

    toggle(): void {
        this.isOpen.update(open => !open);
    }

    open(): void {
        this.isOpen.set(true);
    }

    close(): void {
        this.isOpen.set(false);
    }

    clearChat(): void {
        this.messages.set([
            {
                sender: 'assistant',
                text: 'Hello! I am your Path Logic financial assistant. I have access to your accounts, transactions, and scheduled bills. How can I help you optimize your finances today?',
                timestamp: new Date()
            }
        ]);
    }

    async sendMessage(userText: string): Promise<void> {
        if (!userText.trim() || this.isSending()) return;

        // Add user message
        this.messages.update(msgs => [
            ...msgs,
            { sender: 'user', text: userText, timestamp: new Date() }
        ]);

        this.isSending.set(true);

        try {
            // Build Context
            const context = this.buildFinancialContext();
            const conversationHistory = this.messages()
                .slice(-10) // Limit history to last 10 messages
                .map(m => `${m.sender === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
                .join('\n');

            const systemPrompt = `
You are a premium AI financial assistant embedded inside Path Logic, a local-first accounting application.
You are professional, analytical, concise, and helpful. You speak to the user about their exact financial data.

Client Financial Context:
=========================
${context}

Recent Chat History:
====================
${conversationHistory}

User Query:
===========
${userText}

Instruction & Presentation Guidelines:
1. STRUCTURE & TYPOGRAPHY:
   - Provide a concise, highly analytical, and professional response.
   - Use bold text for key dollar amounts and metrics.
   - Use bullet points for key takeaways, insights, or risks.
   - Always format dollar amounts using standard currency format ($#,##0.00).
2. TABULAR DATA:
   - When comparing categories, balances, or line items, ALWAYS use clean GitHub-flavored Markdown tables (| Category | Amount |) with clear headers.
3. VISUAL CHARTS & DIAGRAMS (MERMAID):
   - Whenever the user asks for a chart, diagram, visual breakdown, graphic, or flow, or when financial data is best visualized, ALWAYS include a valid Mermaid diagram enclosed in \`\`\`mermaid code blocks.
   - For category spending distribution: use 'pie title <Title>'.
   - For money flows, paycheck allocations, or account transfers: use 'flowchart TD' or 'flowchart LR'.
   - For timelines, schedules, or comparisons: use 'xychart-beta' or 'flowchart'.
4. STRICT PROHIBITION:
   - NEVER generate ASCII bar charts, ASCII block art (such as '██████'), or pseudographics. Always use Mermaid charts and Markdown tables instead.
5. CONCISENESS:
   - Keep narrative explanations to 2-3 focused paragraphs maximum.
`;

            const reply = await this.geminiService.generateContent(systemPrompt);
            this.messages.update(msgs => [
                ...msgs,
                { sender: 'assistant', text: reply.trim(), timestamp: new Date() }
            ]);
        } catch (err: unknown) {
            console.error('Failed to get Gemini response:', err);
            const errMsg = err instanceof Error ? err.message : 'Unknown error';
            this.messages.update(msgs => [
                ...msgs,
                {
                    sender: 'assistant',
                    text: `Sorry, I encountered an error communicating with Gemini: ${errMsg}. Please ensure your API key in Settings is valid.`,
                    timestamp: new Date()
                }
            ]);
        } finally {
            this.isSending.set(false);
        }
    }

    private buildFinancialContext(): string {
        const accounts = this.ledgerStore.accounts();
        const transactions = this.ledgerStore.transactions();
        const schedules = this.ledgerStore.schedules();
        const categories = this.ledgerStore.categories();

        // 1. Summarize Accounts
        const accountSummary = accounts
            .map(
                a =>
                    `- ${a.name} (${a.type}): Cleared Bal: ${Money.formatCurrency(a.clearedBalance)}, Pending: ${Money.formatCurrency(a.pendingBalance)}`
            )
            .join('\n');

        // 2. Spending by Category (last 60 days)
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        const recentTxs = transactions.filter(t => new Date(t.date) >= sixtyDaysAgo);

        const categorySpends = new Map<string, number>();
        let totalExpenses = 0;
        let totalIncome = 0;

        for (const tx of recentTxs) {
            const isExpense = tx.totalAmount < 0;
            if (isExpense) {
                totalExpenses += Math.abs(tx.totalAmount);
            } else {
                totalIncome += tx.totalAmount;
            }

            for (const split of tx.splits) {
                if (split.categoryId) {
                    const catName =
                        categories.find(c => c.id === split.categoryId)?.name ?? 'Unknown';
                    const amount = split.amount;
                    categorySpends.set(catName, (categorySpends.get(catName) || 0) + amount);
                }
            }
        }

        const categorySummary = Array.from(categorySpends.entries())
            .sort((a, b) => a[1] - b[1]) // Sort expenses (most negative first)
            .slice(0, 8) // Top 8 categories
            .map(([name, amount]) => `- ${name}: ${Money.formatCurrency(amount)}`)
            .join('\n');

        // 3. Upcoming recurring bills / schedules
        const scheduleSummary = schedules
            .filter(s => s.isActive)
            .map(
                s =>
                    `- ${s.payee} (${s.frequency}): ${Money.formatCurrency(s.amount)} due on ${s.nextDueDate}`
            )
            .join('\n');

        return `
Accounts & Balances:
${accountSummary || 'No accounts configured.'}

Totals over the last 60 days:
- Total Expenses: ${Money.formatCurrency(totalExpenses)}
- Total Income: ${Money.formatCurrency(totalIncome)}

Top Spending Categories (Last 60 Days):
${categorySummary || 'No categorizations recorded.'}

Active Recurring Bills & Schedules:
${scheduleSummary || 'No scheduled bills configured.'}
`;
    }
}
