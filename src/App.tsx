import { useEffect, useRef, useState, type DragEvent, type FormEvent, type ReactNode } from 'react';
import { Archive, ArrowDownUp, ArrowLeft, ArrowUp, BookOpen, BriefcaseBusiness, Check, ChevronDown, ChevronRight, CircleCheck, Download, FolderPlus, GripVertical, House, LayoutGrid, ListPlus, Pencil, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { changeBoard, validateBoard, visibleTree, type Action, type Board, type Kind, type TaskNode, type TreeNode } from './model';
import { loadBoard, saveBoard, storageLabel } from './storage';

type Editor = { mode: 'add' | 'edit' | 'move' | 'delete'; type: Kind; id?: string; parentId: string | null; title: string };
function IconButton({ label, children, onClick, className = '' }: { label: string; children: ReactNode; onClick: () => void; className?: string }) {
  return <button type="button" className={`icon-button ${className}`} aria-label={label} title={label} onClick={onClick}>{children}</button>;
}
function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
  if (!query) return nodes;
  return nodes.flatMap(n => {
    if (n.title.toLocaleLowerCase('pt-BR').includes(query)) return [n];
    const children = filterTree(n.children, query);
    return children.length ? [{ ...n, children }] : [];
  });
}
export default function App() {
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [archives, setArchives] = useState<Record<string, boolean>>({});
  const [editor, setEditor] = useState<Editor | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [dragId, setDragId] = useState<string | null>(null);
  const busy = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const latest = useRef<Board | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const originColumn = useRef<HTMLElement | null>(null);
  const loadSequence = useRef(0);
  async function load() {
    const sequence = ++loadSequence.current;
    setError('');
    try { const data = await loadBoard(); if (sequence !== loadSequence.current) return; latest.current = data; setBoard(data); }
    catch (e) { if (sequence === loadSequence.current) setError((e as Error).message); }
  }
  useEffect(() => { void load(); return () => { loadSequence.current++; }; }, []);
  useEffect(() => {
    if (editor) {
      returnFocus.current = document.activeElement as HTMLElement;
      originColumn.current = returnFocus.current?.closest('.column') ?? null;
      dialog.current?.showModal();
    } else {
      dialog.current?.close();
      const target = returnFocus.current?.isConnected ? returnFocus.current : originColumn.current?.isConnected ? originColumn.current.querySelector<HTMLElement>('.column-controls button') : document.querySelector<HTMLElement>('.header-actions .primary');
      target?.focus();
    }
  }, [editor !== null]);
  async function persist(next: Board) {
    if (busy.current) return false;
    busy.current = true; setSaving(true); setError('');
    try { await saveBoard(next); latest.current = next; setBoard(next); return true; }
    catch (e) { setError((e as Error).message); return false; }
    finally { busy.current = false; setSaving(false); }
  }
  async function act(action: Action) {
    if (!latest.current || busy.current) return false;
    try { return await persist(changeBoard(latest.current, action)); }
    catch (e) { setError((e as Error).message); return false; }
  }
  function add(type: Kind, parentId: string | null) {
    setEditor({ mode: 'add', type, parentId, title: '' });
  }
  function edit(node: TaskNode, mode: Editor['mode']) {
    setEditor({ mode, type: node.type, id: node.id, parentId: node.parentId, title: node.title });
  }
  function toggle(id: string) {
    setCollapsed(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editor) return;
    const data = new FormData(event.currentTarget);
    const title = String(data.get('title') ?? editor.title);
    const parentId = String(data.get('parentId') ?? editor.parentId ?? '') || null;
    let action: Action;
    if (editor.mode === 'delete') action = { type: 'delete', id: editor.id! };
    else if (editor.mode === 'move') action = { type: 'move', id: editor.id!, parentId: parentId! };
    else if (editor.mode === 'edit') action = { type: 'edit', id: editor.id!, title };
    else action = { type: 'add', node: { id: crypto.randomUUID(), type: editor.type, title, parentId, archived: false } };
    if (await act(action)) {
      if (action.type === 'add') {
        const ancestorIds: string[] = []; let ancestor = latest.current?.nodes.find(n => n.id === action.node.parentId);
        while (ancestor) { ancestorIds.push(ancestor.id); ancestor = latest.current?.nodes.find(n => n.id === ancestor!.parentId); }
        const columnId = ancestorIds.at(-1);
        const created = latest.current?.nodes.find(n => n.id === action.node.id);
        if (columnId && created?.type === 'item') setArchives(previous => ({ ...previous, [columnId]: created.archived }));
        setCollapsed(previous => new Set([...previous].filter(id => !ancestorIds.includes(id))));
        setQuery('');
      }
      setEditor(null); setNotice(editor.mode === 'delete' ? 'Removido.' : 'Salvo.');
    }
  }
  function drop(event: DragEvent, target: TaskNode, nest: boolean) {
    event.preventDefault(); event.stopPropagation();
    const id = event.dataTransfer.getData('text/plain'); setDragId(null);
    if (!board || id === target.id) return;
    const source = board.nodes.find(n => n.id === id); if (!source) return;
    if (source.type === 'category' && target.type === 'item') {
      let ancestor = board.nodes.find(n => n.id === target.parentId);
      while (ancestor?.type === 'item') ancestor = board.nodes.find(n => n.id === ancestor!.parentId);
      if (!ancestor || ancestor.id === source.id) return;
      target = ancestor; nest = ancestor.type === 'column';
    }
    const parentId = nest ? target.id : target.parentId;
    if (!parentId) return;
    void act({ type: 'move', id, parentId, beforeId: nest ? undefined : target.id });
  }
  function download() {
    if (!board) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(board, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `life-tasks-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url);
  }
  async function importFile(file?: File) {
    if (!file) return;
    try { const data: unknown = JSON.parse(await file.text()); validateBoard(data); if (await persist(data)) setNotice('Backup importado.'); }
    catch (e) { setError(`Não foi possível importar: ${(e as Error).message}`); }
    if (upload.current) upload.current.value = '';
  }
  const columns = board?.nodes.filter(n => n.type === 'column') ?? [];
  const active = board?.nodes.filter(n => n.type === 'item' && !n.archived).length ?? 0;
  const archivedCount = board?.nodes.filter(n => n.type === 'item' && n.archived).length ?? 0;
  function renderNode(node: TreeNode, depth = 0): ReactNode {
    const category = node.type === 'category';
    const folded = collapsed.has(node.id) && !query;
    return <div key={node.id} className={`${category ? 'category' : 'task'} ${node.context ? 'context-item' : ''} ${dragId === node.id ? 'dragging' : ''}`} data-node-id={node.id}
      onDragOver={event => { if (dragId !== node.id) event.preventDefault(); }} onDrop={event => drop(event, node, false)}>
      <div className={category ? 'category-heading' : 'task-row'}>
        <span className="drag-handle" draggable={!saving} title="Arraste para reordenar" onDragStart={event => { event.stopPropagation(); event.dataTransfer.setData('text/plain', node.id); event.dataTransfer.effectAllowed = 'move'; setDragId(node.id); }} onDragEnd={() => setDragId(null)}><GripVertical size={14} /></span>
        {category ? <button className="category-title" onClick={() => toggle(node.id)} aria-expanded={!folded}>{folded ? <ChevronRight size={15} /> : <ChevronDown size={15} />}<span>{node.title}</span><span className="category-count">{node.children.length}</span></button>
          : <><button className={`check-button ${node.archived ? 'checked' : ''}`} disabled={saving || node.context} onClick={() => { void act({ type: 'archive', id: node.id, archived: !node.archived }); }} aria-label={`${node.archived ? 'Restaurar' : 'Arquivar'} ${node.title}`} title={node.archived ? 'Restaurar item e filhos' : 'Concluir e arquivar item e filhos'}>{node.archived && <Check size={12} />}</button><span className="task-title">{node.title}{node.context && <small>Contexto</small>}</span></>}
        <div className="node-actions">
          <IconButton label={`Adicionar ${category ? 'item em' : 'filho de'} ${node.title}`} onClick={() => add('item', node.id)}><Plus size={14} /></IconButton>
          <IconButton label={`Editar ${node.title}`} onClick={() => edit(node, 'edit')}><Pencil size={12} /></IconButton>
          <IconButton label={`Mover ${node.title}`} onClick={() => edit(node, 'move')}><ArrowDownUp size={12} /></IconButton>
          <IconButton label={`Remover ${node.title}`} onClick={() => edit(node, 'delete')} className="danger-hover"><Trash2 size={12} /></IconButton>
        </div>
      </div>
      {!folded && <div className={category ? 'category-items' : 'children'}>
        {node.children.map(child => renderNode(child, depth + 1))}
        {category && !node.children.length && <button className="empty-category" onClick={() => add('item', node.id)}><Plus size={13} /> Adicionar primeiro item</button>}
        {dragId && dragId !== node.id && board?.nodes.find(n => n.id === dragId)?.type === 'item' && <div className="drop-inside" onDragOver={event => event.preventDefault()} onDrop={event => drop(event, node, true)}>Soltar {category ? 'nesta categoria' : 'como subtarefa'}</div>}
      </div>}
    </div>;
  }
  const typeName = editor?.type === 'column' ? 'coluna' : editor?.type === 'category' ? 'categoria' : 'item';
  const editorHeading = editor?.mode === 'delete' ? `Remover ${typeName}` : editor?.mode === 'move' ? `Mover ${typeName}` : editor?.mode === 'edit' ? `Editar ${typeName}` : `Adicionar ${typeName}`;
  const eligible = board?.nodes.filter(n => {
    if (n.type === 'item' && editor?.mode !== 'move') return false;
    if (editor?.type === 'category' && n.type !== 'column') return false;
    let current: TaskNode | undefined = n;
    while (current) { if (current.id === editor?.id) return false; current = board.nodes.find(p => p.id === current!.parentId); }
    return true;
  }) ?? [];
  function path(node: TaskNode): string {
    const names = [node.title]; let parent = board?.nodes.find(n => n.id === node.parentId);
    while (parent) { names.unshift(parent.title); parent = board?.nodes.find(n => n.id === parent!.parentId); }
    return names.join(' / ');
  }
  return <div className="app-shell">
    <header className="app-header"><a className="brand" href="./"><span className="brand-mark"><Check size={22} strokeWidth={3} /></span>life<span className="brand-light">tasks</span></a><span className="header-divider"/><span className="workspace-name">Meu espaço pessoal</span><div className="header-actions"><button className="button secondary" onClick={() => add('category', columns[0]?.id ?? null)} disabled={!columns.length}><FolderPlus size={16} /> Nova categoria</button><button className="button primary" onClick={() => add('column', null)}><Plus size={17} /> Nova coluna</button></div></header>
    <main><section className="intro"><div><div className="intro-label"><LayoutGrid size={15}/> Seu quadro, do seu jeito</div><h1>Um espaço para cada assunto<span>.</span></h1><p>Organize o que precisa fazer. Abra espaço para o que importa.</p></div><div className="summary"><span><strong>{active}</strong> em aberto</span><span className="summary-divider"/><span><CircleCheck size={16}/><strong>{archivedCount}</strong> arquivados</span></div></section>
    <section className="toolbar" aria-label="Ferramentas do quadro"><div className="board-label"><LayoutGrid size={17}/><h2>Meu quadro</h2><span className="pill">{columns.length} assuntos</span></div><div className="board-tools"><label className="search"><Search size={16}/><input aria-label="Buscar itens" placeholder="Buscar no quadro…" value={query} onChange={e => setQuery(e.target.value)} />{query && <IconButton label="Limpar busca" onClick={() => setQuery('')}><X size={14}/></IconButton>}</label><IconButton label="Exportar backup" onClick={download}><Download size={17}/></IconButton><IconButton label="Importar backup (substitui o quadro)" onClick={() => upload.current?.click()}><Upload size={17}/></IconButton><input hidden ref={upload} type="file" accept="application/json,.json" onChange={e => { void importFile(e.target.files?.[0]); }}/></div></section>
    {error && <div role="alert" className="error-banner">{error}{!board && <button onClick={() => { void load(); }}>Tentar novamente</button>}<IconButton label="Fechar erro" onClick={() => setError('')}><X size={16}/></IconButton></div>}
    {!board && !error && <p className="loading" role="status">Preparando seu espaço…</p>}
    <div className="board" role="region" aria-label="Quadro de assuntos" aria-busy={saving}>
      {columns.map((column, index) => {
        const archived = archives[column.id] ?? false;
        const tree = filterTree(visibleTree(board!, column.id, archived), query.trim().toLocaleLowerCase('pt-BR'));
        const fullTree = visibleTree(board!, column.id, archived);
        const countItems = (nodes: TreeNode[]): number => nodes.reduce((sum, n) => sum + (n.type === 'item' && !n.context ? 1 : 0) + countItems(n.children), 0);
        const Icon = [House, BookOpen, BriefcaseBusiness][index % 3];
        return <section key={column.id} className={`column tone-${index % 4} ${archived ? 'archive-mode' : ''}`} aria-label={`Coluna ${column.title}`} onDragOver={event => event.preventDefault()} onDrop={event => drop(event, column, true)}>
          <header className="column-header"><div className="column-name"><span className="column-icon"><Icon size={18}/></span><h2>{column.title}</h2><span className="column-count">{countItems(fullTree)}</span></div><div className="column-controls"><IconButton label={`Adicionar item em ${column.title}`} onClick={() => add('item', column.id)}><Plus size={19}/></IconButton><IconButton label={`Editar coluna ${column.title}`} onClick={() => edit(column, 'edit')}><Pencil size={13}/></IconButton><IconButton label={`Remover coluna ${column.title}`} onClick={() => edit(column, 'delete')} className="danger-hover"><Trash2 size={13}/></IconButton></div></header>
          <div className="column-subheader"><span>{archived ? 'Itens concluídos' : 'Uma coisa de cada vez'}</span><button className={`archive-toggle ${archived ? 'selected' : ''}`} aria-pressed={archived} onClick={() => setArchives(a => ({ ...a, [column.id]: !archived }))}>{archived ? <ArrowLeft size={13}/> : <Archive size={13}/>} {archived ? 'Voltar aos ativos' : 'Arquivados'}</button></div>
          <div className="column-content">{tree.map(node => renderNode(node))}{!tree.length && <div className="empty-state">{archived ? <Archive size={28}/> : <ListPlus size={28}/>}<strong>{query ? 'Nenhum resultado' : archived ? 'Nenhum item arquivado' : 'Tudo começa com um item'}</strong><p>{query ? 'Experimente buscar por outro termo.' : archived ? 'Os itens concluídos aparecem aqui.' : 'Use o + para adicionar sua primeira tarefa.'}</p></div>}</div>
          <button className="add-bottom" onClick={() => add('item', column.id)}><Plus size={15}/> Adicionar item</button>
        </section>;
      })}
      {board && !columns.length && <button className="new-column-empty" onClick={() => add('column', null)}><Plus size={24}/> Criar meu primeiro assunto</button>}
    </div>
    <footer className="app-footer"><span><GripVertical size={14}/> Arraste pelo puxador para organizar. Categorias levam seus itens junto.</span><span role="status" aria-live="polite"><span className={`status-dot ${error ? 'has-error' : ''}`}/>{saving ? 'Salvando…' : error ? 'Alteração não salva' : `${storageLabel} · salvo`}</span></footer>
    <span className="sr-only" role="status" aria-live="polite">{notice}</span>
    </main>
    <dialog ref={dialog} onCancel={() => setEditor(null)} className="editor-dialog" aria-labelledby="editor-heading">
      {editor && <form onSubmit={submit} key={`${editor.mode}-${editor.id}-${editor.parentId}`}><div className="dialog-header"><span className="dialog-icon">{editor.mode === 'delete' ? <Trash2 size={20}/> : <Pencil size={20}/>}</span><IconButton label="Fechar" onClick={() => setEditor(null)}><X size={20}/></IconButton></div><h2 id="editor-heading">{editorHeading}</h2>
        {editor.mode === 'delete' ? <p className="delete-description">Remover “{editor.title}” e todos os seus itens e subtarefas? Esta ação não pode ser desfeita.</p> : <>
          {editor.mode !== 'move' && <label className="field">{editor.type === 'item' ? 'Texto do item' : 'Nome'}<textarea name="title" aria-label={editor.type === 'item' ? 'Texto do item' : 'Nome'} required autoFocus defaultValue={editor.title} rows={editor.type === 'item' ? 3 : 2} placeholder={editor.type === 'item' ? 'O que você precisa fazer?' : 'Dê um nome…'}/></label>}
          {editor.type !== 'column' && (editor.mode === 'move' || (editor.mode === 'add' && editor.type === 'category')) && <label className="field">{editor.type === 'category' ? 'Coluna' : 'Destino'}<select name="parentId" defaultValue={editor.parentId ?? ''} required>{eligible.map(n => <option key={n.id} value={n.id}>{path(n)}</option>)}</select></label>}
          {editor.mode === 'add' && editor.type === 'item' && <p className="field-hint">Será adicionado no topo de {board?.nodes.find(n => n.id === editor.parentId)?.title}. Texto puro, do seu jeito.</p>}
          {editor.mode === 'move' && <p className="field-hint">O item será movido para o topo do destino, junto com todos os filhos. Para reordenar, use o puxador ou o botão abaixo.</p>}
        </>}
        {error && <p role="alert" className="dialog-error">{error}</p>}
        <div className="dialog-footer">{editor.mode === 'move' && <button type="button" className="button secondary" disabled={saving} onClick={() => { const siblings = board!.nodes.filter(n => n.parentId === editor.parentId); const at = siblings.findIndex(n => n.id === editor.id); if (at > 0) void act({ type: 'move', id: editor.id!, parentId: editor.parentId!, beforeId: siblings[at - 1].id }).then(ok => { if (ok) setEditor(null); }); }}><ArrowUp size={14}/> Subir</button>}<button type="button" className="button secondary" onClick={() => setEditor(null)}>Cancelar</button><button className={`button ${editor.mode === 'delete' ? 'danger' : 'primary'}`} disabled={saving}>{saving ? 'Salvando…' : editor.mode === 'delete' ? 'Remover' : editor.mode === 'move' ? 'Mover' : 'Salvar'}</button></div>
      </form>}
    </dialog>
  </div>;
}
