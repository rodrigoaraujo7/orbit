# Tela de projeto — tabs Financeiro/Ferramentas + tabela de faturas

## Contexto

Hoje `/projetos/$projectId` mostra dois cards lado a lado num grid de 2
colunas: "Valor fechado" (com lista de faturas em `<ul>`/`InvoiceCard`) e
"Ferramentas" (lista de `ToolDetails`). Vamos separar isso em duas abas —
Financeiro e Ferramentas — e, só no lado Financeiro, trocar a lista de
faturas por uma tabela com filtro, ordenação e paginação. O card de
Ferramentas não muda nada, só passa a viver sozinho na sua aba.

Esse é o primeiro lugar do projeto com tabela — a base (`Table`, hook de
paginação, controles de paginação) é construída aqui mas pensada pra ser
reaproveitada por qualquer tabela futura, com um tamanho de página padrão
único pro projeto inteiro.

## Decisões

- **Tabs:** `@base-ui/react` `Tabs` (já é dependência instalada, mesmo pacote
  do `Menu` usado em `RowActionsMenu`/`InvoiceActionsMenu` — sem lib nova).
  Wrapper padrão em `src/components/ui/tabs.tsx` (`Tabs`, `TabsList`,
  `TabsTrigger`, `TabsPanel`), estilo shadcn-like consistente com o resto de
  `components/ui`.
- **Layout:** o grid `lg:grid-cols-2` da página some. Cada `Card` (Valor
  fechado / Ferramentas) vira o conteúdo de uma aba, largura total. O card de
  Ferramentas e o `ToolDetails` não são tocados — só a posição na árvore
  muda.
- **Paginação padrão do projeto:** `DEFAULT_PAGE_SIZE = 10`, num hook
  genérico `usePagination<T>(items: T[], pageSize = DEFAULT_PAGE_SIZE)` em
  `src/lib/pagination.ts`, retornando `{ page, setPage, pageCount, pageItems }`.
  Controles visuais em `src/components/ui/pagination.tsx` ("‹ Página X de Y ›").
  Qualquer tabela futura no projeto reusa esses dois arquivos.
- **Primitivas de tabela:** `src/components/ui/table.tsx` com `Table`,
  `TableHeader`, `TableBody`, `TableRow`, `TableHead` (aceita `sortable` +
  `sortDirection` + `onSort` opcionais pra virar header clicável),
  `TableCell`. HTML `<table>` estilizado, sem lib de data-grid.
- **Tabela de faturas** (`InvoicesTable`, em `src/components/projetos/`):
  - Colunas: Referência, Valor, Método, Status, Ações.
  - Ações: reaproveita `InvoiceActionsMenu` (já existe em `invoice-card.tsx`)
    tal como está — os 3 pontinhos continuam os mesmos itens de menu.
  - **Ordenação:** clique no header de Valor/Data(Referência)/Método/Status
    alterna asc → desc → sem ordenação. Coluna única (sem multi-sort — lista
    curta, no máximo ~12 faturas por projeto).
  - **Filtro de status:** `Select` existente (`components/ui/select.tsx`),
    opções Todos/Pendente/Paga/Atrasada.
  - **Filtro de data:** dois `<input type="month">` nativos (de/até).
    Comparados contra o "mês efetivo" da fatura: `referenceMonth ??
    generatedAt.slice(0, 7)` — cobre o caso de deal à vista, que não tem
    `referenceMonth` (só 1 fatura sem parcela).
  - **Paginação:** usa `usePagination` com `DEFAULT_PAGE_SIZE`.
  - Filtro + ordenação + paginação operam em memória sobre o array já
    calculado por `generateInvoices(project)` — sem chamada nova, mesma fonte
    de dado de hoje.
  - `InvoiceCard` (o componente antigo em lista) fica sem uso depois dessa
    mudança — remover junto, pra não deixar código morto.

## Fora de escopo

- Aba Ferramentas: zero mudança de componente/lógica, só reposicionamento.
- Multi-sort, filtro salvo, exportação, tamanho de página configurável pelo
  usuário (fica fixo em 10 — se um dia precisar de seletor, é extensão
  pequena do hook).
