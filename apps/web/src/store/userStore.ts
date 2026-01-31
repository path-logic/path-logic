import { create } from 'zustand';
import { getUserSetting, setUserSetting } from '@/lib/storage/SQLiteAdapter';

interface IUserState {
    settings: Record<string, string>;
    isLoading: boolean;

    // Actions
    loadSettings: () => void;
    getSetting: (key: string, defaultValue?: string) => string | undefined;
    updateSetting: (key: string, value: string) => void;
}

export const useUserStore = create<IUserState>((set, get) => ({
    settings: {},
    isLoading: false,

    loadSettings: (): void => {
        // Since we don't have a broad SELECT * for settings, we'll load them on demand or as needed.
        // But for common ones like guides, we can load them here if we know the keys.
        // For simplicity, we'll just keep the store as a reactive wrapper around the DB.
    },

    getSetting: (key: string, defaultValue?: string): string | undefined => {
        const { settings } = get();
        if (settings[key] !== undefined) return settings[key];

        // Try DB
        try {
            const value = getUserSetting(key);
            if (value !== null) {
                set(state => ({ settings: { ...state.settings, [key]: value } }));
                return value;
            }
        } catch (e) {
            console.error('Failed to get setting from DB:', e);
        }

        return defaultValue;
    },

    updateSetting: (key: string, value: string): void => {
        try {
            setUserSetting(key, value);
            set(state => ({ settings: { ...state.settings, [key]: value } }));
        } catch (e) {
            console.error('Failed to update setting in DB:', e);
        }
    },
}));
