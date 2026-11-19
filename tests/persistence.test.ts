import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LocalBoardStore, STORAGE_KEY } from '../src/persistence.ts';
import type { Board } from '../src/model.ts';
const seed = (): Board => ({ version: 1, nodes: [{ id: 'a', type: 'column', title: 'Casa', parentId: null, archived: false }] });
function memoryStorage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}
test('seeds once and reloads edited data instead of repopulating deleted columns', () => {
  const storage = memoryStorage();
  const store = new LocalBoardStore(storage, seed);
  assert.equal(store.load().nodes[0].title, 'Casa');
  store.save({ version: 1, nodes: [] });
  assert.deepEqual(new LocalBoardStore(storage, seed).load(), { version: 1, nodes: [] });
});
test('corrupt data is preserved and reported instead of silently overwritten', () => {
  const storage = memoryStorage(); storage.setItem(STORAGE_KEY, '{broken');
  assert.throws(() => new LocalBoardStore(storage, seed).load(), /inválidos/);
  assert.equal(storage.getItem(STORAGE_KEY), '{broken');
});
test('storage failures surface without claiming successful persistence', () => {
  const store = new LocalBoardStore({ getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } }, seed);
  assert.throws(() => store.save(seed()), /salvar/);
});
test('invalid imported boards cannot replace existing storage', () => {
  const storage = memoryStorage(); const store = new LocalBoardStore(storage, seed); store.load();
  assert.throws(() => store.save({ version: 2, nodes: [] } as unknown as Board));
  assert.equal(new LocalBoardStore(storage, seed).load().nodes[0].title, 'Casa');
});
