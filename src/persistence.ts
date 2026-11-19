import { validateBoard, type Board } from './model';
export const STORAGE_KEY = 'life-tasks:board:v1';
export class LocalBoardStore {
  constructor(private storage: Pick<Storage, 'getItem' | 'setItem'>, private seed: () => Board) {}
  load(): Board {
    let raw: string | null;
    try { raw = this.storage.getItem(STORAGE_KEY); }
    catch { throw new Error('Não foi possível acessar os dados locais. Habilite o armazenamento do navegador.'); }
    if (raw === null) { const board = this.seed(); this.save(board); return board; }
    try { const board: unknown = JSON.parse(raw); validateBoard(board); return board; }
    catch { throw new Error('Dados locais inválidos. Eles foram preservados. Importe um backup válido para recuperar o quadro.'); }
  }
  save(board: Board): void {
    validateBoard(board);
    try { this.storage.setItem(STORAGE_KEY, JSON.stringify(board)); }
    catch { throw new Error('Não foi possível salvar no navegador. Verifique o espaço disponível e a permissão de armazenamento.'); }
  }
}
