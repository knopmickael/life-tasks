import type { Board } from './model';
export function createSeed(): Board {
  return { version: 1, nodes: [
    { id: 'home', title: 'Casa', type: 'column', parentId: null, archived: false },
    { id: 'study', title: 'Estudos', type: 'column', parentId: null, archived: false },
    { id: 'work', title: 'Trabalho', type: 'column', parentId: null, archived: false },
    { id: 'example-market', title: 'Mercado', type: 'category', parentId: 'home', archived: false },
  ] };
}
