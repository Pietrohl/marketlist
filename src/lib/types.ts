export type ShoppingItem = {
  id: string;
  name: string;
  checked: boolean;
  addedAt: string;
  checkedAt?: string;
};

export type ShoppingList = {
  id: string;
  name: string;
  icon: string;
  createdAt: string;
  items: ShoppingItem[];
};

export type AppState = {
  version: 1;
  activeListId: string;
  lists: ShoppingList[];
};

export type SimilarItem = {
  item: ShoppingItem;
  list: ShoppingList;
  score: number;
};
