import test from 'node:test';
import assert from 'node:assert/strict';
import { fold, sortItems, remainingCount, createInitialState, dateAgo } from '../src/lib/lists.ts';

const item = (name, checked) => ({ id: name, name, checked, addedAt: new Date().toISOString() });

test('unchecked items always precede checked ones', () => {
  const result = sortItems([item('Zucchini', true), item('Bread', false), item('Apples', true), item('Carrots', false)]);
  assert.deepEqual(result.map(x => x.name), ['Bread', 'Carrots', 'Apples', 'Zucchini']);
});

test('alphabetical sort ignores case/accents and does not mutate the original array', () => {
  const input = [item('ZEBRA', false), item('Água', false), item('bread', false)];
  assert.deepEqual(sortItems(input).map(x => x.name), ['Água', 'bread', 'ZEBRA']);
  assert.equal(input[0].name, 'ZEBRA');
});

test('name normalization helps duplicate matching with accents', () => {
  assert.equal(fold('  CAFÉ  '), 'cafe');
  assert.equal(fold('ÁGUA'), 'agua');
});

test('new app state has no placeholder lists or items', () => {
  const state = createInitialState();
  assert.equal(state.lists.length, 0);
  assert.equal(state.activeListId, '');
});

test('relative time labels handle invalid and recent timestamps', () => {
  assert.equal(dateAgo('not-a-date'), 'recently');
  assert.equal(dateAgo(new Date().toISOString()), 'just now');
});
