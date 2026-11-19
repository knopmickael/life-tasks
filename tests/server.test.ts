import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/app.ts';

test('API persists plain strings and order in SQLite across server restarts', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'life-tasks-'));
  let app = await createApp(join(dir, 'test.sqlite'));
  try {
    assert.equal((await app.inject('/api/board')).json(), null);
    const board = { version: 1, nodes: [{ id: 'col', title: '<script>texto</script>', type: 'column', parentId: null, archived: false }] };
    assert.equal((await app.inject({ method: 'PUT', url: '/api/board', payload: board })).statusCode, 200);
    await app.close(); app = await createApp(join(dir, 'test.sqlite'));
    assert.deepEqual((await app.inject('/api/board')).json(), board);
    assert.equal((await app.inject({ method: 'PUT', url: '/api/board', payload: { version: 1, nodes: [{ id: 'bad' }] } })).statusCode, 400);
    assert.deepEqual((await app.inject('/api/board')).json(), board);
  } finally { await app.close(); await rm(dir, { recursive: true, force: true }); }
});
