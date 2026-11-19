import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { importText, validateBoard, type TaskNode } from '../src/model.ts';

test('all original TXT lists import completely with archived child details', async () => {
  const nodes: TaskNode[] = [];
  for (const [id, file] of [['home', 'to-home.txt'], ['study', 'to-study.txt'], ['work', 'to-work.txt']]) {
    nodes.push({ id, type: 'column', title: id, parentId: null, archived: false });
    nodes.push(...importText(await readFile(new URL(`../${file}`, import.meta.url), 'utf8'), id));
  }
  validateBoard({ version: 1, nodes });
  assert.equal(nodes.filter(n => n.type === 'category').length, 34);
  assert.equal(nodes.filter(n => n.type === 'item').length, 479);
  assert.equal(nodes.filter(n => n.archived).length, 15);
  const electrical = nodes.find(n => n.title === 'Arrumar elétrica (Farias)')!;
  assert.equal(nodes.filter(n => n.parentId === electrical.id && n.archived).length, 5);
  const project = nodes.find(n => n.title === 'Criar Operadora Celular App Web UI Local')!;
  assert.deepEqual(nodes.filter(n => n.parentId === project.id).map(n => n.title), ['Operadora READ', 'Plano atual READ', 'Créditos restantes READ', 'SMS recebidos READ/DELETE']);
  assert.equal(nodes.find(n => n.title === 'Code Review')?.parentId, nodes.find(n => n.title === 'ENGENHARIA DE SOFTWARE')?.id);
});
