# Cadastros Gerais — contatos e ferramentas customizadas

## Contexto

A plataforma não tem hoje um jeito de cadastrar coisas que não têm um lugar
fixo na estrutura: uma ferramenta que não está no catálogo do form de
Projetos (só dá pra digitar avulso via "Outra", sem reaproveitar depois) e um
contato de cliente pra referenciar em mais de um projeto (hoje é texto livre
repetido a cada cadastro). "Cadastros Gerais" é a tela que resolve isso: um
lugar pra cadastrar essas entidades de apoio uma vez e reaproveitar em toda a
plataforma.

Escopo da v1: **Contatos** e **Ferramentas customizadas**. Outros tipos de
cadastro (contas/logins como entidade própria, etc.) ficam pra uma rodada
futura.

Este documento é o desenho aprovado; a implementação fica pra quando
chegarmos nessa etapa do build page-by-page — ainda não tem plano de
execução escrito.

## Decisões

- **Estado:** nova store em memória, mesmo padrão do `ProjectsProvider`
  (`src/lib/projects-store.tsx`): `RegistryProvider`/`useRegistry()` em
  `src/lib/registry-store.tsx`, expondo
  `{ contacts, addContact, removeContact, customTools, addCustomTool, removeCustomTool }`.
  Entra no `__root.tsx` ao lado do `ProjectsProvider`. Sem persistência —
  mesma limitação que os projetos hoje (some no F5).
- **Sem edição** nesta v1, só criar e excluir — mesmo grau de acabamento que
  a tela de Projetos atual (que também só cria).
- **Ferramenta customizada sem ícone próprio:** cai no fallback genérico
  (`Wrench`) que `toolIcon()` já usa pra ids desconhecidos. Sem picker de
  ícone — YAGNI.

## Modelo de dados

```ts
// src/data/contacts.ts
type Contact = {
  id: string
  name: string       // único obrigatório
  email?: string
  phone?: string
  company?: string
}
```

```ts
// custom tool — mesmo shape do CatalogTool (src/data/tool-catalog.ts),
// mas vive na store (é dado do usuário, não catálogo estático)
type CustomTool = {
  id: string
  name: string
  category: ToolCategory   // uma das 8 categorias já existentes
}
```

## Migração do "Contato principal" (o que mexe no que já existe)

`Project.client: string` vira `Project.clientId: string`, referenciando um
`Contact.id`. Isso toca:

- **`src/data/projects.ts`**: os 8 mocks precisam de contatos correspondentes
  criados em `src/data/contacts.ts`, com a referência trocada.
- **Listagem e detalhe de Projetos** (`projetos.index.tsx`,
  `projetos.$projectId.tsx`): onde hoje leem `project.client` direto, passam
  a resolver o nome via `useRegistry()` (uma função tipo `findContact(id)`).
- **Form de criar projeto**: o campo texto livre vira `ContactSelect` — select
  rico no mesmo padrão do `ToolSelect` (`src/components/projetos/tool-select.tsx`),
  onde cada opção mostra nome + e-mail + telefone + empresa, não só o nome.
  Ganha um atalho **"+ Novo contato"** no fim da lista de opções, que abre um
  dialog (Base UI `Dialog`) empilhado por cima do dialog de criar projeto; ao
  salvar, o contato criado já entra selecionado no campo, sem fechar o form
  de projeto.

## Ferramentas customizadas no select de Projetos

`ToolSelect` passa a mesclar, por categoria, o catálogo estático
(`toolsByCategory()`) com as ferramentas customizadas da mesma categoria
vindas de `useRegistry()`. Cada uma aparece no grupo que o usuário escolheu
no cadastro (deploy, banco de dados, observabilidade, etc.) — não existe uma
categoria "Personalizadas" separada.

No submit do form de projeto, a resolução de nome/categoria do `toolId`
selecionado (hoje `findCatalogTool` em `src/lib/project-schema.ts`) passa a
considerar também as ferramentas customizadas. `toProject()` ganha um
parâmetro opcional `customTools: CustomTool[] = []`, mantendo a função pura e
testável — o self-check (`project-schema.check.ts`) continua chamando sem
esse argumento nos casos que não precisam dele.

## Tela "Cadastros Gerais"

- Rota `/cadastros`, 5º item da sidebar (depois de Financeiro,
  `src/components/layout/sidebar-nav.tsx`).
- Duas abas — `Tabs` do Base UI (`@base-ui/react/tabs`, disponível mas ainda
  não usado no projeto): **Contatos** e **Ferramentas customizadas**.
- Cada aba: tabela densa (mesmo visual da tabela de Projetos) + botão que
  abre um dialog pequeno de criação (mesmo padrão do `CreateProjectDialog`,
  bem mais simples):
  - **Contato**: Nome\* (min 2 chars), E-mail (validado se preenchido),
    Telefone (texto livre, sem máscara — YAGNI), Empresa.
  - **Ferramenta customizada**: Nome\* (min 2 chars), Categoria (select com
    as 8 categorias de `TOOL_CATEGORY_ORDER`).
- Cada linha da tabela tem botão de excluir (`removeContact`/`removeCustomTool`).

## Riscos / pontos de atenção pra quando formos implementar

- A migração de `client: string` pra `clientId` é a parte que mais mexe em
  código existente — se o volume de mudança pedir, dá pra quebrar em duas
  entregas: (1) tela de Cadastros Gerais isolada, (2) integração com o form
  de Projetos. Registrado aqui pra decidir na hora.
- `RegistryProvider` e `ProjectsProvider` ficam desacoplados (contexts
  irmãos), mas o schema de projeto passa a depender de dados de ambos
  (`clientId` do registry, `tools` que podem referenciar `customTools`) — ao
  implementar, vale conferir se isso não empurra a resolução de dados pra
  dentro do `project-schema.ts` de um jeito que quebre a pureza da função.
