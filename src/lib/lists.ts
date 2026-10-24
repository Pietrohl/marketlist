import type { ShoppingItem, ShoppingList, AppState } from './types';

export const LIST_ICONS = ['🛒', '🥑', '🥐', '🏠', '🎉', '💊', '🐾', '🌿'] as const;
export const STORAGE_KEY = 'gather-shopping-v1';
export const LANGUAGE_KEY = 'gather-language-v1';

export const newId = () => crypto.randomUUID();

export function fold(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase();
}

export function sortItems(items: ShoppingItem[], locale?: string): ShoppingItem[] {
  return [...items].sort((a, b) => {
    if (a.checked !== b.checked) return Number(a.checked) - Number(b.checked);
    return a.name.localeCompare(b.name, locale, { sensitivity: 'base', numeric: true });
  });
}

export const remainingCount = (list: ShoppingList) => list.items.filter(item => !item.checked).length;

export function dateAgo(iso: string, locale = 'en', now = Date.now(), labels: { recently?: string; justNow?: string } = {}): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  if (!Number.isFinite(diff)) return labels.recently ?? 'recently';
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return labels.justNow ?? 'just now';
  if (mins < 60) return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-mins, 'minute');
  const hours = Math.floor(mins / 60);
  if (hours < 24) return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-hours, 'hour');
  const days = Math.floor(hours / 24);
  if (days < 7) return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-days, 'day');
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(new Date(iso));
}

export function formatAddedAt(iso: string, locale: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

export function createInitialState(): AppState {
  return { version: 1, activeListId: '', lists: [] };
}

export function isAppState(value: unknown): value is AppState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<AppState>;
  if (state.version !== 1 || typeof state.activeListId !== 'string' || !Array.isArray(state.lists)) return false;
  const validLists = state.lists.every((list: unknown) => {
    if (!list || typeof list !== 'object') return false;
    const candidate = list as Partial<ShoppingList>;
    return typeof candidate.id === 'string' && typeof candidate.name === 'string' &&
      typeof candidate.icon === 'string' && typeof candidate.createdAt === 'string' &&
      Array.isArray(candidate.items) && candidate.items.every((item: unknown) => {
        if (!item || typeof item !== 'object') return false;
        const entry = item as Partial<ShoppingItem>;
        return typeof entry.id === 'string' && typeof entry.name === 'string' &&
          typeof entry.checked === 'boolean' && typeof entry.addedAt === 'string';
      });
  });
  return validLists && (state.lists.length === 0 || state.lists.some(list => list.id === state.activeListId));
}

export function isPristineExampleState(state: AppState): boolean {
  const examples: Record<string, Record<string, boolean>> = {
    'Weekly groceries': {
      Avocados: false, Bread: false, Eggs: false, 'Oat milk': false, 'Cherry tomatoes': false,
      'Greek yogurt': false, Bananas: true, 'Olive oil': true, Pasta: true,
    },
    'Weekend dinner': { 'Parmesan cheese': false, 'Fresh basil': false, Pasta: false, 'Tomato sauce': true },
    'Home essentials': { 'Dish soap': false, 'Paper towels': false, 'Laundry detergent': true },
  };
  if (state.lists.length !== Object.keys(examples).length) return false;
  return state.lists.every(list => {
    const expectedItems = examples[list.name];
    if (!expectedItems || list.items.length !== Object.keys(expectedItems).length) return false;
    return list.items.every(item => expectedItems[item.name] === item.checked);
  });
}
