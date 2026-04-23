# ONDIX - Regras obrigatorias para IA e Codex

Este arquivo define regras obrigatorias para qualquer trabalho assistido por IA no projeto ONDIX. Ele deve ser lido antes de qualquer remodelagem arquitetural, implementacao, correcao ou refatoracao.

## Principio central

O ONDIX ja possui fluxos, UX, permissoes, sessao multiempresa e funcionalidades em uso. A prioridade maxima e preservar o comportamento existente enquanto a arquitetura evolui de forma gradual, profissional e verificavel.

Nao existe big bang refactor neste projeto.

## Regras de seguranca

- Nao quebrar fluxos ja implementados.
- Nao alterar UX validado sem necessidade clara.
- Nao alterar comportamento como efeito colateral de organizacao de arquivos.
- Nao mover arquivos sem atualizar todos os imports afetados.
- Nao alterar rotas, URLs, permissoes, redirects ou nomes de campos sem uma etapa propria e validacao explicita.
- Nao remover compatibilidade temporaria se ainda houver imports antigos usando o caminho anterior.
- Nao fazer refatoracao ampla junto com feature nova.
- Nao misturar mudancas de arquitetura com mudancas de produto na mesma etapa.
- Nao criar gambiarras para "fazer passar"; preferir um bloco menor e tecnicamente limpo.
- Nao reverter alteracoes do usuario sem autorizacao explicita.

## Regras de migracao

- Migrar por blocos pequenos e reversiveis.
- Migrar um dominio por vez.
- Validar cada bloco antes de iniciar o proximo.
- Preferir reexports temporarios quando eles reduzirem risco de quebra durante a transicao.
- Remover reexports temporarios apenas em fase de limpeza, depois que todos os imports ja tiverem sido migrados.
- Preservar nomes publicos de actions, tipos e contratos ate que a chamada consumidora seja atualizada na mesma etapa.
- Manter o App Router estavel durante a migracao.
- Tratar rotas inconsistentes somente no final da remodelagem, depois de estabilizar features, actions e server code.

## Fronteira server/client

- Nao misturar codigo server-only com codigo client-safe.
- Todo codigo que usa Prisma, cookies, headers, filesystem, secrets, auth server-side, permissoes server-side ou redirects deve ficar em area server-only.
- Componentes client nao devem importar Prisma, services server-only, cookies, headers, filesystem ou modulos que dependam de secrets.
- Componentes client nao devem importar actions por caminhos de rota como `@/app/(authenticated)/.../actions`.
- Actions devem ficar por dominio, preferencialmente em `src/features/<domain>/actions.ts`.
- Se uma action ainda estiver em `src/app`, usar ponte temporaria apenas como etapa controlada de migracao.
- Props passadas de Server Components para Client Components devem ser serializaveis.

## Regras para src/app

- `src/app` deve compor rotas, layouts, loading/error boundaries e route handlers.
- Pages devem buscar dados no servidor e renderizar screens/components.
- Route handlers devem delegar regra de negocio para server/features.
- Actions nao devem permanecer acopladas a caminhos de rota como destino final da arquitetura.
- Nao colocar regra de negocio pesada em `page.tsx`, `layout.tsx` ou `route.ts`.

## Regras para components

- `src/components` deve guardar apenas UI global e reutilizavel.
- Componentes de dominio devem migrar para `src/features/<domain>/components`.
- Componentes globais nao devem depender de dominio especifico.
- Componentes client devem depender apenas de:
  - UI global
  - tipos serializaveis
  - constantes client-safe
  - actions publicas do dominio
  - helpers client-safe

## Regras para features

- Cada dominio deve concentrar seus componentes, actions, schemas, types, constants e camada server.
- Um dominio nao deve acessar detalhes internos de outro dominio sem contrato claro.
- Se houver compartilhamento real entre dominios, extrair para `src/lib`, `src/types` ou `src/server` conforme a natureza do codigo.
- Evitar dependencias circulares entre features.

## Regras para server code

- Nao concentrar query, mutation, redirect, permissao e regra de negocio no mesmo arquivo quando o dominio crescer.
- Dividir services grandes em:
  - `server/queries.ts`
  - `server/mutations.ts`
  - `server/mappers.ts`
  - helpers internos quando necessario
- Permissoes devem ser verificadas dentro de server functions/actions, nunca apenas na UI.
- Toda Server Action e todo Route Handler devem validar autenticacao/autorizacao quando aplicavel.
- Codigo que manipula arquivo, PDF, storage ou tokens publicos deve ter fronteira server clara.

## Regras para schemas, types e constants

- Schemas de validacao devem ser previsiveis e ficar no dominio.
- Tipos usados por UI devem ser serializaveis e client-safe.
- Constants importadas por Client Components nao podem depender de server-only.
- Estados de formulario e action-state devem ser padronizados antes de serem duplicados.
- Formatters e parsers reutilizaveis devem ser extraidos apenas quando houver uso real ou reducao clara de duplicidade.

## Areas sensiveis

Sempre considerar risco elevado nas seguintes areas:

- Autenticacao e sessao multiempresa.
- Empresa ativa e contexto de usuario.
- Permissoes e access-control.
- `crm/servicos`, incluindo servicos prestados, Lei 116, NBS e cTribMun.
- Propostas comerciais, status, aprovacao, envio e PDF.
- Certidoes de clientes, upload publico, PDF, storage local e links temporarios.
- Gestao de acessos, usuarios e perfis.
- Assinatura e cobrancas.
- Middleware, redirects e rotas publicas/protegidas.

## Regras de validacao

- Para mudancas documentais, validar existencia e conteudo dos arquivos.
- Para mudancas de codigo, rodar pelo menos `npm run lint` quando aplicavel.
- Para mudancas de comportamento, rodar `npm run build` quando aplicavel.
- Para migracoes de dominio, validar manualmente os fluxos principais do dominio.
- Se uma validacao nao puder ser executada, explicar claramente o motivo.

## Resposta obrigatoria ao final de cada etapa

Ao finalizar uma tarefa, o Codex deve informar:

- Arquivos criados.
- Arquivos alterados.
- O que mudou.
- O que nao foi alterado.
- Validacoes executadas.
- Validacoes ainda recomendadas.
- Riscos residuais, se houver.

## Regra para arquivos gerados

- Gerar arquivos completos.
- Nao deixar secoes vazias, placeholders ou TODOs sem justificativa.
- Usar nomes consistentes com a arquitetura oficial.
- Manter documentacao operacional, objetiva e acionavel.
