# Life Tasks

Um quadro pessoal por assunto. **React + TypeScript**, dados em **localStorage**, sem API nem banco no servidor.

**Site:** https://knopmickael.github.io/life-tasks/

## Executar

Requer **Node.js 22.12+** e npm para desenvolver ou gerar o build. O site publicado só precisa de um navegador.

```sh
npm ci
npm run dev
```

Abra **http://127.0.0.1:5173/life-tasks/**.

```sh
npm run build
npm run preview
```

O build estático fica em `dist/`. O caminho base `/life-tasks/` já está configurado para o GitHub Pages.

## Como usar

- Colunas são assuntos: **Casa, Estudos e Trabalho** na primeira abertura.
- O quadro inicial contém apenas as três colunas e a categoria de exemplo **Mercado**, em Casa. Não há tarefas nem itens arquivados predefinidos; cada usuário cria seu próprio conteúdo.
- **+ na coluna** cria um item no topo, sem categoria; **+ na categoria** cria dentro dela; **+ no item** cria um filho. Filhos podem ter outros filhos.
- **Nova categoria** no cabeçalho permite informar nome e coluna. Colunas, categorias e itens têm edição e remoção.
- Marcar o quadradinho conclui e arquiva o item e todos os seus filhos. **Arquivados** alterna somente a coluna clicada. Restaurar um filho reativa seus pais, mantendo os demais filhos arquivados.
- Pais ativos de filhos arquivados aparecem em Arquivados como **Contexto**. Não são cópias, nem entram na contagem de arquivados.
- Adicionar um filho a um pai arquivado mantém o novo filho arquivado. Itens criados diretamente na coluna ou categoria são ativos; a interface volta aos ativos para mostrar o novo item.
- Arraste pelo puxador para reordenar antes de outro item. Solte na coluna para mover ao topo; as áreas de destino permitem mover para dentro de categorias ou criar subtarefas. Categorias transportam todo seu conteúdo.
- O botão **Mover** oferece alternativa por teclado e em dispositivos de toque: escolha um destino ou suba uma posição.
- Remover um pai remove todos os filhos, mediante confirmação. Nomes e conteúdo são **strings simples**, renderizados como texto.
- Busca mantém os ancestrais dos resultados visíveis. Categorias podem ser recolhidas.

## Dados e backups

O quadro é salvo automaticamente na chave **`life-tasks:board:v2`** do localStorage. A estrutura inicial é criada somente quando essa chave não existe. Um quadro vazio salvo não é repopulado. Os TXT não são incluídos no site nem importados automaticamente.

A antiga chave `life-tasks:board:v1`, usada pela versão com tarefas pessoais predefinidas, deixou de ser carregada. Na primeira abertura desta atualização, o usuário começa com a estrutura vazia descrita acima. As alterações feitas a partir daí são preservadas normalmente.

Cada navegador/origem tem seu próprio quadro. Não há sincronização com o GitHub nem entre dispositivos. Limpar os dados do navegador remove suas alterações locais.

Use **Exportar backup** para baixar um JSON com todo o quadro. **Importar backup** substitui o quadro atual por um backup validado. O mesmo formato funciona na branch `sqlite`, permitindo migrar entre as versões. Dados locais corrompidos são preservados e reportados, em vez de substituídos silenciosamente.

## Branches

| Branch | Persistência | Execução |
| --- | --- | --- |
| `main` | localStorage | Site estático / GitHub Pages |
| `sqlite` | SQLite + API Fastify | Node.js; `npm run dev` ou `npm run build && npm start` |

Para usar o backend:

```sh
git switch sqlite
npm ci
npm run dev
```

Consulte o README dessa branch para detalhes da API e do arquivo SQLite.

## GitHub Pages

O workflow `.github/workflows/pages.yml` testa, compila e publica a cada push na `main`. Em **Settings → Pages → Source**, use **GitHub Actions**. A publicação gera o site em https://knopmickael.github.io/life-tasks/.

## Verificar

```sh
npm test
npm run build
npm audit
```

Os testes cobrem importação, hierarquia de arquivamento e restauração, movimentação agrupada, proteção contra ciclos, remoção em cascata, inicialização única, persistência e recuperação de erros de armazenamento.

## Estrutura

- `src/model.ts`: modelo hierárquico, operações e validação.
- `src/seed.ts`: estrutura inicial vazia com três colunas e a categoria Mercado.
- `src/persistence.ts`: armazenamento local versionado e tratamento de falhas.
- `src/storage.ts`: conexão entre interface e persistência.
- `src/App.tsx` / `src/styles.css`: quadro, diálogos, busca e arrastar e soltar.
