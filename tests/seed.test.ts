import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSeed } from '../src/seed.ts';
import { LocalBoardStore } from '../src/persistence.ts';
import { validateBoard } from '../src/model.ts';

test('new boards contain only three columns and an empty Mercado category in Casa', () => {
  const board = createSeed();
  validateBoard(board);
  assert.deepEqual(board.nodes.filter(n => n.type === 'column').map(n => n.title), ['Casa', 'Estudos', 'Trabalho']);
  assert.deepEqual(board.nodes.filter(n => n.type === 'category').map(n => ({ title: n.title, parentId: n.parentId })), [{ title: 'Mercado', parentId: 'home' }]);
  assert.equal(board.nodes.filter(n => n.type === 'item').length, 0);
  assert.equal(board.nodes.some(n => n.archived), false);
});

test('previous populated storage does not appear in the new empty workspace', () => {
  const values = new Map([['life-tasks:board:v1', JSON.stringify({ version: 1, nodes: [
    { id: 'home', title: 'Casa', type: 'column', parentId: null, archived: false },
    { id: 'home-1', title: 'Tarefa pessoal antiga', type: 'item', parentId: 'home', archived: false },
  ] })]]);
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  const store = new LocalBoardStore(storage, createSeed);
  assert.equal(store.load().nodes.some(n => n.type === 'item'), false);
  store.save({ version: 1, nodes: [] });
  assert.deepEqual(new LocalBoardStore(storage, createSeed).load().nodes, []);
});
