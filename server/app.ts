import Fastify from 'fastify';
import { DatabaseSync } from 'node:sqlite';
import { COLUMN_ICON_IDS, validateBoard } from '../src/model.ts';
export async function createApp(path: string) {
  const app = Fastify({ bodyLimit: 5 * 1024 * 1024 });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS board (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL) STRICT;');
  app.addHook('onClose', async () => { db.close(); });
  app.get('/api/board', () => {
    const row = db.prepare('SELECT payload FROM board WHERE id = 1').get();
    return row ? JSON.parse(row.payload as string) : null;
  });
  app.put('/api/board', { schema: { body: {
    type: 'object', required: ['version', 'nodes'], additionalProperties: false,
    properties: { version: { const: 1 }, nodes: { type: 'array', maxItems: 20000, items: {
      type: 'object', required: ['id', 'type', 'title', 'parentId', 'archived'], additionalProperties: false,
      properties: { id: { type: 'string', minLength: 1 }, type: { enum: ['column', 'category', 'item'] }, title: { type: 'string', minLength: 1 }, parentId: { type: ['string', 'null'] }, archived: { type: 'boolean' }, icon: { enum: COLUMN_ICON_IDS } },
    } } },
  } } }, async (request, reply) => {
    try { validateBoard(request.body); }
    catch (error) { return reply.code(400).send({ message: (error as Error).message }); }
    db.prepare('INSERT INTO board (id, payload) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload').run(JSON.stringify(request.body));
    return { saved: true };
  });
  return app;
}
