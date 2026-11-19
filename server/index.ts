import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import staticFiles from '@fastify/static';
import { createApp } from './app.ts';
await mkdir('data', { recursive: true });
const app = await createApp(process.env.DATABASE_PATH ?? resolve('data/life-tasks.sqlite'));
if (existsSync('dist')) {
  await app.register(staticFiles, { root: resolve('dist'), prefix: '/life-tasks/' });
  app.get('/', async (_request, reply) => reply.redirect('/life-tasks/'));
}
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void app.close(); });
await app.listen({ port: Number(process.env.PORT ?? 3001), host: '127.0.0.1' });
console.log('Life Tasks: http://127.0.0.1:3001/life-tasks/');
