import { createSeed } from './seed';
import type { Board } from './model';
import { LocalBoardStore } from './persistence';
export const storageLabel = 'Neste navegador';
function store() { return new LocalBoardStore(window.localStorage, createSeed); }
export async function loadBoard(): Promise<Board> { return store().load(); }
export async function saveBoard(board: Board): Promise<void> {
  store().save(board);
}
