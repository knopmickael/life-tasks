import { createSeed } from './seed';
import { validateBoard, type Board } from './model';
export const storageLabel = 'SQLite';
let loading: Promise<Board> | undefined;
export function loadBoard(): Promise<Board> {
  if (!loading) loading = initialize().finally(() => { loading = undefined; });
  return loading;
}
async function initialize(): Promise<Board> {
  const response = await fetch('/api/board');
  if (!response.ok) throw new Error('Não foi possível carregar o quadro. Verifique o servidor.');
  const board = await response.json();
  if (board === null) { const seed = createSeed(); await saveBoard(seed); return seed; }
  validateBoard(board); return board;
}
export async function saveBoard(board: Board): Promise<void> {
  validateBoard(board);
  const response = await fetch('/api/board', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(board) });
  if (!response.ok) throw new Error('Não foi possível salvar. Verifique o servidor e tente novamente.');
}
