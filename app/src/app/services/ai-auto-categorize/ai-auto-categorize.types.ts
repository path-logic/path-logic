export interface IAiCategorySuggestion {
    unknownCategory: string;
    matchedCategoryId: string | null;
    suggestedNewCategory?: {
        name: string;
        parentName: string | null;
    } | null;
    confidence: 'high' | 'medium' | 'low';
    source: 'heuristic' | 'ai';
}

export type AiAutoCategorizeStatus = 'idle' | 'running' | 'completed' | 'error';

export interface IAiCategorizeProgress {
    pct: number;
    processed: number;
    total: number;
    message: string;
}

export interface IAiCategorizeError {
    message: string;
    isQuota: boolean;
}

export type WorkerInboundMessage =
    | {
          type: 'start';
          items: Array<string>;
          categories: Array<{ id: string; name: string; parentId: string | null }>;
          apiKey: string;
      }
    | {
          type: 'cancel';
      };

export type WorkerOutboundMessage =
    | {
          type: 'progress';
          pct: number;
          processed: number;
          total: number;
          message: string;
      }
    | {
          type: 'done';
          suggestions: Array<IAiCategorySuggestion>;
      }
    | {
          type: 'error';
          message: string;
          isQuota: boolean;
      };
