# ONDIX - Arquitetura oficial

Este documento consolida a arquitetura atual, os problemas identificados e a arquitetura-alvo oficial para a remodelagem incremental do ONDIX.

## Regra de ouro

- `src/app` so compoe rotas, layouts e route handlers.
- `src/components` guarda apenas UI global e reutilizavel.
- `src/features` guarda dominio.
- `src/server` guarda infraestrutura server-only.
- `src/lib` deve ser pequeno e client-safe por padrao.

## Estrutura atual resumida

```txt
src/
  app/
    (auth)/
    (authenticated)/
    public/
    session-invalid/
    layout.tsx
    globals.css

  components/
    access-management/
    auth/
    commercial-proposals/
    customer/
    customer-certificates/
    customer-risk/
    layout/
    providers/
    services/
    subscriber/
    subscription/
    ui/

  lib/
    access-control/
    access-management/
    active-period/
    auth/
    commercial-proposals/
    company/
    customer/
    customer-certificates/
    customer-risk/
    services/
    subscription/
    db.ts
    media.ts
    navigation.ts
    prisma-client.ts
    theme.ts
    utils.ts

  styles/
    base.css
    tokens.css
```

O projeto usa Next.js App Router, com rotas agrupadas em `(auth)` e `(authenticated)`. O padrao predominante hoje e:

- `page.tsx` busca dados no servidor.
- Screen client em `src/components/<domain>` renderiza UI e interacao.
- `actions.ts` dentro de `src/app` recebe `FormData`, valida e chama services.
- `src/lib/<domain>/service.ts` concentra consultas, mutations, permissoes, redirects e mapeamentos.

## Rotas atuais principais

O projeto possui paginas para:

- Autenticacao: `/login`, `/recuperar-senha`, `/alterar-senha`.
- Dashboard autenticado: `/`.
- Assinante: `/assinante`, gestao de acessos, usuarios, perfis e assinatura.
- CRM cliente: lista, novo, edicao e analise de risco.
- CRM servicos: servicos prestados, Lei 116, NBS e cTribMun.
- Comercial: proposta comercial, novo, edicao e PDF.
- Certidoes: gestao autenticada por cliente e upload publico.
- Rotas internas: `/session-invalid`.

## Problemas identificados

### src/lib esta misturado

`src/lib` atualmente contem:

- Helpers client-safe.
- Tipos usados pela UI.
- Constantes usadas por Client Components.
- Validators Zod.
- Services server-only.
- Prisma client.
- Sessao, auth e permissao.
- PDF, storage e mapeamentos de dominio.

Isso aumenta o risco de import acidental de codigo server-only em Client Components. Embora varios services ja usem `server-only`, a organizacao por pasta ainda mistura responsabilidades diferentes sob o mesmo namespace.

### Components client importam actions por caminhos de rota

Hoje alguns componentes client importam actions diretamente de caminhos como:

```txt
@/app/(authenticated)/crm/servicos/actions
@/app/(authenticated)/header-actions
```

Isso acopla a UI ao desenho atual das rotas. Se a rota mudar, ou se as actions forem movidas, componentes de dominio e layout quebram sem que o contrato funcional tenha mudado.

O destino correto e importar actions por dominio, por exemplo:

```txt
@/features/services/actions
@/features/auth/actions
@/features/active-period/actions
```

### service.ts grandes concentram responsabilidades

Arquivos como `src/lib/services/service.ts`, `src/lib/commercial-proposals/service.ts`, `src/lib/access-management/service.ts`, `src/lib/customer-certificates/service.ts` e `src/lib/customer-risk/service.ts` concentram muitas responsabilidades:

- Parse de filtros.
- Query.
- Mutation.
- Mapeamento para view model.
- Validacao complementar.
- Permissao.
- Redirect.
- Regras de negocio.
- Integracao com PDF, storage ou contexto.

Esses arquivos funcionam, mas dificultam testes, revisao, migracao e evolucao segura. A remodelagem deve dividir sem alterar comportamento.

### Duplicidades de padrao

Existem repeticoes em:

- `getFormValue`.
- Conversao de checkbox/boolean.
- `getFieldErrors`.
- Action-state inicial.
- Parse de search params.
- Paginacao.
- Sort e direction.
- Formatacao de datas, documentos e valores.

A extracao deve ser gradual e orientada por uso real.

### Rotas inconsistentes

Ha rotas de cliente em `/crm/cliente/...` e rotas de certidoes em `/customers/[customerId]/certificates`. Essa diferenca pode ser historica ou intencional. Ela deve ser tratada apenas no final, porque envolve links, route handlers, permissoes, PDFs, redirects e UX.

## Arquitetura-alvo oficial

```txt
src/
  app/
    (auth)/
    (authenticated)/
    public/
    session-invalid/
    layout.tsx
    globals.css

  components/
    ui/
    layout/
    providers/
    feedback/
    forms/

  features/
    auth/
      components/
      actions.ts
      schemas.ts
      types.ts
      constants.ts
      server/
        queries.ts
        mutations.ts
        mappers.ts

    customers/
      components/
      actions.ts
      schemas.ts
      types.ts
      constants.ts
      server/
        queries.ts
        mutations.ts
        mappers.ts

    services/
      components/
      actions.ts
      schemas.ts
      types.ts
      constants.ts
      server/
        queries.ts
        mutations.ts
        mappers.ts

    commercial-proposals/
      components/
      actions.ts
      schemas.ts
      types.ts
      constants.ts
      server/
        queries.ts
        mutations.ts
        mappers.ts

    customer-risk/
    customer-certificates/
    access-management/
    subscriber-company/
    subscription/

  lib/
    cn.ts
    dates.ts
    env.ts
    navigation.ts
    routes.ts
    formatters/

  server/
    db/
    auth/
    permissions/
    storage/
    pdf/

  types/
    action-state.ts
    pagination.ts
    permissions.ts
    search-params.ts

  styles/
    base.css
    tokens.css
```

## Responsabilidades por pasta

### src/app

Responsavel por:

- Definir rotas do App Router.
- Definir layouts, loading, error boundaries e route handlers.
- Compor Server Components de pagina.
- Chamar queries server-side.
- Passar dados serializaveis para components/screens.

Nao deve:

- Conter regra de negocio pesada.
- Ser fonte final de actions de dominio.
- Conter services reutilizaveis.
- Conter UI de dominio complexa.

### src/components

Responsavel por UI global e reutilizavel:

- `ui`: button, card, input, textarea, breadcrumb, pagination, badges.
- `layout`: shell, sidebar, header e elementos globais de navegacao.
- `providers`: providers client globais.
- `feedback`: mensagens, alerts, empty states globais.
- `forms`: primitives reutilizaveis de formulario.

Nao deve:

- Conter telas especificas de dominio.
- Depender de `src/server`.
- Importar Prisma ou services server-only.
- Importar actions por caminho de rota.

### src/features

Responsavel por dominio de negocio.

Cada feature pode conter:

- `components/`: screens e componentes especificos do dominio.
- `actions.ts`: Server Actions publicas daquele dominio.
- `schemas.ts`: schemas de validacao.
- `types.ts`: tipos serializaveis e contratos do dominio.
- `constants.ts`: labels, opcoes, rotas e constantes client-safe.
- `server/queries.ts`: leitura de dados.
- `server/mutations.ts`: alteracao de dados.
- `server/mappers.ts`: conversao de records para view models.

Features oficiais:

- `auth`
- `customers`
- `services`
- `commercial-proposals`
- `customer-risk`
- `customer-certificates`
- `access-management`
- `subscriber-company`
- `subscription`

### src/lib

Responsavel por utilitarios pequenos e, por padrao, client-safe:

- `cn`.
- Formatters puros.
- Date helpers puros.
- Rotas centralizadas client-safe.
- Navegacao client-safe.
- Env parsing quando nao expor secrets ao client.

Nao deve ser deposito geral de dominio. Se o codigo pertence a um dominio, deve ir para `src/features/<domain>`. Se depende de servidor, deve ir para `src/server` ou `src/features/<domain>/server`.

### src/server

Responsavel por infraestrutura server-only compartilhada:

- Prisma e database client.
- Sessao e tokens.
- Contexto de app.
- Permissoes server-side.
- Storage.
- PDF compartilhado.
- Helpers que usam `cookies`, `headers`, filesystem, secrets ou APIs server-only.

Todo arquivo desta pasta deve ser tratado como server-only.

### src/types

Responsavel por tipos compartilhados e independentes de dominio:

- Action-state generico.
- Paginacao.
- Search params.
- Permissoes compartilhadas.
- Tipos utilitarios serializaveis.

Nao deve conter tipos especificos de negocio quando eles pertencem claramente a uma feature.

### src/styles

Responsavel por:

- Design tokens.
- Base CSS.
- Variaveis globais.
- Integracao visual com Tailwind.

Nao deve conter estilos de uma tela especifica, exceto se forem tokens ou base global.

## Padroes oficiais por dominio

### actions.ts

Responsavel por:

- Receber `FormData` ou parametros serializaveis.
- Normalizar input basico.
- Validar com schema do dominio.
- Chamar mutations/queries server-side.
- Executar `revalidatePath`, `redirect` ou retorno de action-state quando necessario.

Nao deve:

- Conter query complexa.
- Conter mapeamentos extensos.
- Conter regra de negocio pesada.
- Ser importada a partir de `src/app` por componentes client.

### server/queries.ts

Responsavel por:

- Buscar dados.
- Aplicar escopo de empresa ativa quando necessario.
- Verificar permissao de leitura quando necessario.
- Montar dados para pages e screens usando mappers.

Nao deve alterar dados.

### server/mutations.ts

Responsavel por:

- Criar, atualizar, inativar e excluir dados.
- Executar transacoes Prisma.
- Verificar permissao de escrita.
- Garantir isolamento por empresa ativa.
- Retornar resultado operacional previsivel para actions.

Nao deve conter UI state ou strings de apresentacao que pertencem a components/constants, exceto mensagens operacionais ja existentes que precisem ser preservadas durante migracao.

### server/mappers.ts

Responsavel por:

- Converter records do Prisma para view models serializaveis.
- Formatar datas, valores e labels para consumo de UI quando isso ja for parte do contrato atual.
- Isolar transformacoes repetidas.

Nao deve acessar banco.

### schemas.ts

Responsavel por:

- Validacao Zod do dominio.
- Regras de input de formulario.
- Tipos inferidos quando util.

Nao deve acessar banco, contexto, cookies ou permissoes.

### types.ts

Responsavel por:

- Tipos de page data.
- Tipos de form values.
- Tipos de filtros.
- Tipos de rows/listas.
- Contratos serializaveis entre Server Components e Client Components.

Nao deve importar server-only.

### constants.ts

Responsavel por:

- Labels.
- Options.
- Status tones.
- Page size.
- Sort fields.
- Rotas client-safe de dominio, quando estaveis.

Nao deve depender de Prisma runtime, banco, cookies, headers ou filesystem.

### components/

Responsavel por:

- Screens e subcomponentes do dominio.
- Interacao client do dominio.
- Uso de actions publicas da propria feature.
- Uso de UI global de `src/components`.

Nao deve:

- Importar services server-only.
- Importar actions de `src/app`.
- Misturar regra de negocio server-side.

## Compatibilidade durante migracao

Durante a migracao, podem existir reexports temporarios para manter imports antigos funcionando:

```ts
export * from "@/features/services/actions";
```

Reexports temporarios devem:

- Ser usados apenas para reduzir risco.
- Ter escopo claro.
- Ser removidos na fase de limpeza.
- Nao virar arquitetura permanente.

## Ordem conceitual de evolucao

1. Preservar baseline.
2. Criar contratos e documentos oficiais.
3. Extrair utilitarios puros.
4. Migrar types/constants/schemas por dominio.
5. Migrar components por dominio.
6. Migrar actions por dominio com compatibilidade temporaria.
7. Dividir services em queries/mutations/mappers.
8. Remover duplicidades e reexports temporarios.
9. Tratar rotas inconsistentes apenas no final.
