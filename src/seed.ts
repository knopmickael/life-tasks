import home from '../to-home.txt?raw';
import study from '../to-study.txt?raw';
import work from '../to-work.txt?raw';
import { importText, type Board, type TaskNode } from './model';
export function createSeed(): Board {
  const sources = [['home', 'Casa', home], ['study', 'Estudos', study], ['work', 'Trabalho', work]];
  return { version: 1, nodes: sources.flatMap(([id, title, text]): TaskNode[] => [
    { id, title, type: 'column', parentId: null, archived: false }, ...importText(text, id),
  ]) };
}
