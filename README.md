# Life Tasks

Quadro pessoal por assunto, com React + TypeScript, Fastify e SQLite.

## Executar

Requer **Node.js 22.12+** e npm. O script habilita `node:sqlite`, experimental nas primeiras versões do Node 22.

```sh
npm ci
npm run dev
```

Abra **http://127.0.0.1:5173/life-tasks/**. O Vite encaminha `/api` para o Fastify na porta 3001.

Para executar o build servido pelo próprio Fastify:

```sh
npm run build
npm start
```

Abra **http://127.0.0.1:3001/life-tasks/**. O banco fica em `data/life-tasks.sqlite` (fora do Git). `DATABASE_PATH` e `PORT` são opcionais. O servidor é de uso pessoal local e escuta em `127.0.0.1`.

## Organização

- Colunas são assuntos: **Casa, Estudos e Trabalho** na primeira abertura.
- Os TXT originais alimentam o quadro inicial: **34 categorias e 479 itens**, dos quais **15 arquivados**. Texto, acentos e hierarquia são preservados; marcadores de lista e conclusão são convertidos em estrutura.
- A importação inicial só acontece quando ainda não há quadro salvo. Alterar os TXT depois não sobrescreve seu trabalho.
- **+ na coluna** cria um item no topo, sem categoria; **+ na categoria** cria dentro dela; **+ no item** cria um filho. Filhos podem ter outros filhos.
- **Nova categoria** no cabeçalho permite informar nome e coluna. Colunas e categorias também podem ser editadas e removidas.
- Marcar o quadradinho conclui e arquiva o item e todos os seus filhos. **Arquivados** alterna somente a coluna clicada. Restaurar um filho reativa seus pais, mantendo os demais filhos arquivados.
- Pais ativos de filhos arquivados aparecem em Arquivados como **Contexto**. Não são cópias, nem entram na contagem de arquivados.
- Adicionar um filho a um pai arquivado mantém o novo filho arquivado. Itens criados diretamente na coluna ou categoria são ativos.
- Arraste pelo puxador para reordenar antes de outro item. Solte na coluna para mover ao topo; as áreas de destino permitem mover para dentro de categorias ou criar subtarefas. Categorias transportam todo seu conteúdo.
- O botão **Mover** oferece alternativa por teclado e em dispositivos de toque. É possível escolher um destino e subir uma posição.
- Remover um pai remove todos os filhos, mediante confirmação. Nomes e conteúdo são **strings simples**, renderizados como texto.
- Busca mantém os ancestrais dos resultados visíveis. Categorias podem ser recolhidas.
- **Exportar backup** baixa JSON com todo o quadro. **Importar backup** substitui o quadro atual por um backup validado. O formato é compartilhado com a versão localStorage.

## Branches

- `sqlite`: aplicação completa com API Fastify e persistência em SQLite.
- `main`: versão estática com localStorage, preparada para GitHub Pages.

## Verificação

```sh
npm test
npm run build
npm audit
```

Os testes cobrem importação, hierarquia de arquivamento e restauração, movimentação em grupo, proteção contra ciclos, remoção em cascata, validação e persistência real em SQLite após reiniciar a aplicação.

## Estrutura

`src/model.ts` concentra operações e validação do quadro; `src/seed.ts` importa os TXT; `src/storage.ts` faz a persistência; `src/App.tsx` e `src/styles.css` implementam a interface. `server/app.ts` expõe `GET /api/board` e `PUT /api/board`. O quadro versionado é armazenado atomicamente em um documento JSON dentro do SQLite, preservando a ordem dos itens.
