export type Kind = 'column' | 'category' | 'item';
export const COLUMN_ICON_IDS = ['grid', 'house', 'book', 'briefcase', 'code', 'heart', 'wallet', 'cart', 'plane', 'dumbbell', 'music', 'star'] as const;
export type ColumnIcon = typeof COLUMN_ICON_IDS[number];
export interface TaskNode { id: string; type: Kind; title: string; parentId: string | null; archived: boolean; icon?: ColumnIcon }
export interface Board { version: 1; nodes: TaskNode[] }
export interface TreeNode extends TaskNode { children: TreeNode[]; context: boolean }
export type Action = { type: 'add'; node: TaskNode } | { type: 'edit'; id: string; title: string; icon?: ColumnIcon } | { type: 'delete'; id: string } | { type: 'archive'; id: string; archived: boolean } | { type: 'move'; id: string; parentId: string; beforeId?: string };
export function importText(text: string, columnId: string): TaskNode[] {
  const nodes: TaskNode[] = [];
  const stack: { indent: number; node: TaskNode }[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const indent = line.match(/^\s*/)?.[0].replace(/\t/g, '    ').length ?? 0;
    while (stack.length && stack.at(-1)!.indent >= indent) stack.pop();
    const parent = stack.at(-1)?.node;
    const node: TaskNode = {
      id: `${columnId}-${nodes.length}`, type: indent === 0 ? 'category' : 'item',
      title: line.trim().replace(/^(?:\[[xX ]?\]\s*|-\s*)/, ''),
      parentId: parent?.id ?? columnId,
      archived: /^\s*\[[xX]\]/.test(line) || Boolean(parent?.archived),
    };
    nodes.push(node); stack.push({ indent, node });
  }
  return nodes;
}
export function validateBoard(value: unknown): asserts value is Board {
  if (!value || typeof value !== 'object' || (value as Board).version !== 1 || !Array.isArray((value as Board).nodes)) throw new Error('Formato de quadro inválido.');
  const nodes = (value as Board).nodes;
  const ids = new Map<string, TaskNode>();
  for (const n of nodes) {
    if (!n || typeof n.id !== 'string' || !n.id || ids.has(n.id) || !['column', 'category', 'item'].includes(n.type) || typeof n.title !== 'string' || !n.title.trim() || typeof n.archived !== 'boolean' || (n.parentId !== null && typeof n.parentId !== 'string')) throw new Error('Dados de item inválidos.');
    if (n.icon !== undefined && (n.type !== 'column' || !COLUMN_ICON_IDS.includes(n.icon))) throw new Error('Ícone de coluna inválido.');
    ids.set(n.id, n);
  }
  for (const n of nodes) {
    const p = n.parentId ? ids.get(n.parentId) : undefined;
    if (n.type === 'column' ? n.parentId !== null : !p || (n.type === 'category' && p.type !== 'column')) throw new Error('Destino inválido.');
    const seen = new Set([n.id]); let ancestor = p;
    while (ancestor) {
      if (seen.has(ancestor.id)) throw new Error('Um item não pode conter a si mesmo.');
      seen.add(ancestor.id); ancestor = ancestor.parentId ? ids.get(ancestor.parentId) : undefined;
    }
  }
}
export function changeBoard(board: Board, action: Action): Board {
  let nodes = board.nodes.map(n => ({ ...n }));
  if (action.type === 'add') {
    const parent = nodes.find(n => n.id === action.node.parentId);
    nodes.unshift({ ...action.node, title: action.node.title.trim(), archived: Boolean(parent?.archived) || action.node.archived });
  }
  else {
    const node = nodes.find(n => n.id === action.id);
    if (!node) throw new Error('Item não encontrado.');
    const descendants = new Set([node.id]);
    let previous = -1;
    while (previous !== descendants.size) {
      previous = descendants.size;
      for (const n of nodes) if (n.parentId && descendants.has(n.parentId)) descendants.add(n.id);
    }
    if (action.type === 'edit') {
      node.title = action.title.trim();
      if (action.icon !== undefined) node.icon = action.icon;
    }
    if (action.type === 'delete') nodes = nodes.filter(n => !descendants.has(n.id));
    if (action.type === 'archive') {
      for (const n of nodes) if (descendants.has(n.id)) n.archived = action.archived;
      if (!action.archived) {
        let parent = nodes.find(n => n.id === node.parentId);
        while (parent) { parent.archived = false; parent = nodes.find(n => n.id === parent!.parentId); }
      }
    }
    if (action.type === 'move') {
      if (node.type === 'column') throw new Error('Colunas não podem ser aninhadas.');
      node.parentId = action.parentId;
      nodes = nodes.filter(n => n.id !== node.id);
      const index = action.beforeId ? nodes.findIndex(n => n.id === action.beforeId && n.parentId === action.parentId) : 0;
      nodes.splice(Math.max(0, index), 0, node);
      const parent = nodes.find(n => n.id === action.parentId);
      if (parent?.archived) for (const n of nodes) if (descendants.has(n.id)) n.archived = true;
    }
  }
  const next: Board = { version: 1, nodes }; validateBoard(next); return next;
}
export function visibleTree(board: Board, column: string, archived: boolean): TreeNode[] {
  const children = new Map<string, TaskNode[]>();
  for (const n of board.nodes) if (n.parentId) children.set(n.parentId, [...(children.get(n.parentId) ?? []), n]);
  function visit(parentId: string): TreeNode[] {
    return (children.get(parentId) ?? []).flatMap(n => {
      const nested = visit(n.id);
      const matches = n.type === 'item' && n.archived === archived;
      if (!matches && !nested.length && (n.type !== 'category' || archived)) return [];
      return [{ ...n, children: nested, context: n.type === 'item' && !matches }];
    });
  }
  return visit(column);
}
