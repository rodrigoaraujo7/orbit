# projects-manager

## O que é

Plataforma SaaS de gestão de projetos para desenvolvedores freelancers. Cada
usuário (freelancer) gerencia seus próprios clientes, projetos e finanças de
forma isolada.

## Dor que resolve

Freelancer com vários projetos/clientes ao mesmo tempo perde o controle de:

- Quanto cada cliente já pagou e quanto ainda deve.
- Quais ferramentas pagas (AWS, Railway, Resend, Sentry, Datadog etc.) foram
  usadas em qual projeto, e quem está pagando por elas.
- Em qual conta/login o acesso a cada ferramenta foi feito.
- O que está em desenvolvimento e o que está na fila, entre vários projetos
  simultâneos.

## Módulos principais

### Financeiro
- Cobrança por cliente e controle de pagamentos pendentes.
- Registro de valor fechado por projeto (grátis, parcelado, à vista).
- Custos de ferramentas pagas por projeto (quem paga, quanto, qual conta).
- Dashboard com visualização de números, metas e indicadores financeiros.

### Projetos
- Cadastro completo: contato principal, valor fechado, ferramentas usadas
  (pagas e free) e a conta/login usado em cada uma.
- Link com o repositório GitHub do projeto e acompanhamento do GitHub Actions.

### Kanban
- Visualização do que está em desenvolvimento e do que está na fila, entre
  todos os projetos.

## Público-alvo

Multi-usuário / SaaS — cada freelancer com seus próprios clientes, projetos e
dados financeiros isolados dos demais.
