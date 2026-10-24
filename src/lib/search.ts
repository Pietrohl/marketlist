import Fuse from 'fuse.js';
import type { ShoppingList, SimilarItem } from './types';
import { fold } from './lists';

/** Run the same fuzzy matching against items in ALL lists, including checked items. */
export function findSimilarItems(query: string, lists: ShoppingList[], limit = 5): SimilarItem[] {
  const normalizedQuery = fold(query);
  if (normalizedQuery.length < 2) return [];

  const candidates = lists.flatMap(list => list.items.map(item => ({
    item, list, normalizedName: fold(item.name),
  })));
  if (!candidates.length) return [];

  const fuse = new Fuse(candidates, {
    keys: ['normalizedName'],
    includeScore: true,
    threshold: 0.38,
    distance: 100,
    ignoreLocation: true,
    minMatchCharLength: 2,
    shouldSort: true,
  });

  return fuse.search(normalizedQuery)
    .filter(result => (result.score ?? 1) <= 0.38 || result.item.normalizedName.includes(normalizedQuery))
    .sort((a, b) => {
      const exactA = a.item.normalizedName === normalizedQuery ? 0 : 1;
      const exactB = b.item.normalizedName === normalizedQuery ? 0 : 1;
      if (exactA !== exactB) return exactA - exactB;
      return (a.score ?? 1) - (b.score ?? 1);
    })
    .slice(0, limit)
    .map(({ item: match, score }) => ({
      item: match.item, list: match.list, score: score ?? 0,
    }));
}
