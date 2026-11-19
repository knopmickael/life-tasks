import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importText, changeBoard, visibleTree, validateBoard, type Board } from '../src/model.ts';

test('TXT import preserves categories, checked parents and nested plain text', () => {
  const nodes = importText('Carro\n    [x] Elétrica\n        - Freio\n    [] Rodas\n        - Pneus\n', 'home');
  assert.equal(nodes.length, 5);
  assert.equal(nodes[0].type, 'category');
  assert.equal(nodes[1].archived, true);
  assert.equal(nodes[2].archived, true);
  assert.equal(nodes[2].parentId, nodes[1].id);
  assert.equal(nodes[4].title, 'Pneus');
});
const fixture = (): Board => ({ version: 1, nodes: [
  { id: 'a', type: 'column', title: 'Casa', parentId: null, archived: false },
  { id: 'b', type: 'column', title: 'Trabalho', parentId: null, archived: false },
  { id: 'cat', type: 'category', title: 'Carro', parentId: 'a', archived: false },
  { id: 'p', type: 'item', title: 'Motor', parentId: 'cat', archived: false },
  { id: 'c', type: 'item', title: 'Óleo', parentId: 'p', archived: false },
] });
test('archiving a subtree hides active items and retains archived hierarchy', () => {
  const board = changeBoard(fixture(), { type: 'archive', id: 'p', archived: true });
  assert.equal(visibleTree(board, 'a', false)[0].children.length, 0);
  assert.equal(visibleTree(board, 'a', true)[0].children[0].children[0].title, 'Óleo');
});
test('archived child shows its active parent as context only', () => {
  const board = changeBoard(fixture(), { type: 'archive', id: 'c', archived: true });
  const parent = visibleTree(board, 'a', true)[0].children[0];
  assert.equal(parent.context, true);
  assert.equal(parent.children[0].context, false);
});
test('moving a category moves descendants as a group and prevents cycles', () => {
  const board = changeBoard(fixture(), { type: 'move', id: 'cat', parentId: 'b' });
  assert.equal(visibleTree(board, 'a', false).length, 0);
  assert.equal(visibleTree(board, 'b', false)[0].children[0].children[0].title, 'Óleo');
  assert.throws(() => changeBoard(board, { type: 'move', id: 'p', parentId: 'c' }));
});
test('add inserts at top; removing parent removes descendants', () => {
  const board = changeBoard(fixture(), { type: 'add', node: { id: 'new', title: '<b>texto</b>', type: 'item', parentId: 'cat', archived: false } });
  assert.equal(visibleTree(board, 'a', false)[0].children[0].title, '<b>texto</b>');
  assert.deepEqual(changeBoard(board, { type: 'delete', id: 'cat' }).nodes.map(n => n.id), ['a', 'b']);
});
test('validation rejects orphan nodes, duplicate ids and cyclic graphs', () => {
  assert.throws(() => validateBoard({ version: 1, nodes: [{ ...fixture().nodes[4], parentId: 'missing' }] }));
  assert.throws(() => validateBoard({ version: 1, nodes: [...fixture().nodes, fixture().nodes[0]] }));
  const board = fixture(); board.nodes[3].parentId = 'c';
  assert.throws(() => validateBoard(board));
});
test('adding a child to an archived parent retains the archive hierarchy', () => {
  const archived = changeBoard(fixture(), { type: 'archive', id: 'p', archived: true });
  const board = changeBoard(archived, { type: 'add', node: { id: 'extra', title: 'Novo detalhe', type: 'item', parentId: 'p', archived: false } });
  assert.equal(board.nodes.find(n => n.id === 'extra')!.archived, true);
  assert.equal(visibleTree(board, 'a', false)[0].children.length, 0);
});
test('restoring one child restores ancestor context without restoring its siblings', () => {
  let board = changeBoard(fixture(), { type: 'add', node: { id: 'sibling', title: 'Outra tarefa', type: 'item', parentId: 'p', archived: false } });
  board = changeBoard(board, { type: 'archive', id: 'p', archived: true });
  board = changeBoard(board, { type: 'archive', id: 'c', archived: false });
  assert.equal(board.nodes.find(n => n.id === 'p')!.archived, false);
  assert.equal(board.nodes.find(n => n.id === 'sibling')!.archived, true);
  assert.equal(visibleTree(board, 'a', false)[0].children[0].children[0].title, 'Óleo');
});
