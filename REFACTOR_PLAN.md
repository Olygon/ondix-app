# ONDIX - Plano operacional de remodelagem arquitetural

Este plano transforma o diagnostico arquitetural do ONDIX em uma sequencia operacional segura. A remodelagem deve ser incremental, validada por checkpoints e sem big bang refactor.

## Objetivo

Evoluir a arquitetura para a estrutura oficial documentada em `ARCHITECTURE.md`, preservando:

- Fluxos existentes.
- UX validado.
- Sessao multiempresa.
- Empresa ativa.
- Permissoes.
- Route handlers.
- Actions e estados de formulario.
- Storage e PDFs.
- Contratos de dados entre server e client.

## Politica geral

- Um bloco por vez.
- Um dominio por vez.
- Mudancas pequenas e revisaveis.
- Compatibilidade temporaria quando reduzir risco.
- Validacao obrigatoria antes de seguir.
- Rollback simples por checkpoint.
- Nada de refatoracao comportamental escondida em mudanca estrutural.

## Fase 0 - Baseline e seguranca

### Bloco 0.1 - Validar baseline tecnico

Objetivo:

- Confirmar que o projeto atual compila e passa nas validacoes disponiveis antes da migracao.

Risco:

- Medio, porque falhas existentes podem ser confundidas com regressao da remodelagem.

Impacto:

- Nenhum impacto funcional esperado.

Validacoes obrigatorias:

- Rodar `npm run lint`.
- Rodar `npm run build`.
- Registrar falhas existentes, se houver.

O que nao deve ser alterado:

- Nenhum arquivo de codigo.
- Nenhum import.
- Nenhuma rota.
- Nenhum schema Prisma.

Criterios de conclusao:

- Resultado de lint/build registrado.
- Falhas existentes documentadas.
- Estado inicial conhecido antes de qualquer migracao.

### Bloco 0.2 - Registrar rotas atuais

Objetivo:

- Ter inventario das rotas que nao podem quebrar durante a remodelagem.

Risco:

- Baixo.

Impacto:

- Nenhum impacto funcional.

Validacoes obrigatorias:

- Listar paginas e route handlers em `src/app`.
- Identificar rotas publicas e autenticadas.
- Identificar rotas com parametros dinamicos.

O que nao deve ser alterado:

- Estrutura de `src/app`.
- URLs.
- Middleware.

Criterios de conclusao:

- Rotas atuais registradas em documento ou checklist de migracao.
- Route handlers sensiveis identificados.

### Bloco 0.3 - Identificar fluxos criticos

Objetivo:

- Definir a lista de fluxos que devem ser testados manualmente a cada etapa relevante.

Risco:

- Alto se algum fluxo sensivel ficar fora da lista.

Impacto:

- Nenhum impacto funcional.

Validacoes obrigatorias:

- Login.
- Recuperacao de senha.
- Alteracao obrigatoria de senha.
- Navegacao autenticada.
- Troca/uso de periodo ativo.
- Permissoes e acesso negado.
- Cliente: lista, criar, editar, excluir/inativar.
- Servicos: lista, criar, editar, inativar, codigos auxiliares.
- Proposta comercial: lista, criar, editar, aprovar, enviar/mock, gerar PDF.
- Certidoes: gerar link, upload publico, validar, reprocessar, abrir PDF.
- Gestao de acessos: usuario, perfil e matriz de permissoes.
- Assinatura: visualizacao, pagamento/cancelamento quando aplicavel.

O que nao deve ser alterado:

- Fluxos.
- Textos de UI.
- Comportamento.

Criterios de conclusao:

- Fluxos criticos documentados.
- Dono da validacao ou checklist manual definido.

### Bloco 0.4 - Definir checkpoints

Objetivo:

- Garantir rollback simples em cada etapa.

Risco:

- Baixo.

Impacto:

- Nenhum impacto funcional.

Validacoes obrigatorias:

- Confirmar estado limpo ou registrar alteracoes pendentes antes de cada bloco.
- Criar checkpoint por commit, branch ou anotacao clara.

O que nao deve ser alterado:

- Codigo sem necessidade.

Criterios de conclusao:

- Checkpoint criado antes da Fase 1.
- Politica de rollback entendida pela equipe.

## Fase 1 - Contratos arquiteturais

### Bloco 1.1 - Consolidar nomes dos dominios

Objetivo:

- Confirmar os nomes oficiais de features.

Risco:

- Medio, porque renomear dominio tarde demais aumenta retrabalho.

Impacto:

- Nenhum impacto funcional se for apenas documentacao.

Validacoes obrigatorias:

- Conferir dominios oficiais:
  - `auth`
  - `customers`
  - `services`
  - `commercial-proposals`
  - `customer-risk`
  - `customer-certificates`
  - `access-management`
  - `subscriber-company`
  - `subscription`

O que nao deve ser alterado:

- Pastas existentes.
- Imports existentes.
- URLs existentes.

Criterios de conclusao:

- Nomes oficiais aceitos.
- Divergencias registradas para tratar depois.

### Bloco 1.2 - Consolidar fronteiras

Objetivo:

- Formalizar o que pertence a `app`, `components`, `features`, `lib`, `server`, `types` e `styles`.

Risco:

- Baixo na documentacao, alto se a fronteira for ignorada nas proximas fases.

Impacto:

- Nenhum impacto funcional.

Validacoes obrigatorias:

- Conferir `ARCHITECTURE.md`.
- Conferir `AI_RULES.md`.
- Confirmar que novas tarefas seguirao esses documentos.

O que nao deve ser alterado:

- Codigo de aplicacao.

Criterios de conclusao:

- Arquitetura-alvo documentada.
- Regras obrigatorias documentadas.

### Bloco 1.3 - Definir padroes de import

Objetivo:

- Preparar a migracao sem acoplamento a rotas.

Risco:

- Medio, porque imports client para actions precisam de cuidado.

Impacto:

- Nenhum impacto funcional nesta fase.

Validacoes obrigatorias:

- Definir destino final:
  - Components de dominio importam actions de `@/features/<domain>/actions`.
  - Pages importam queries de `@/features/<domain>/server/queries`.
  - Route handlers delegam para `src/features` ou `src/server`.

O que nao deve ser alterado:

- Imports existentes nesta fase, salvo em etapa especifica futura.

Criterios de conclusao:

- Padrao de import documentado.
- Reexports temporarios permitidos quando necessarios.

## Fase 2 - Migracao de utilitarios puros

Esta fase deve acontecer antes da migracao pesada por dominio, porque reduz duplicidade com baixo risco.

### Bloco 2.1 - Action-state compartilhado

Objetivo:

- Criar tipos genericos para estados de actions quando houver equivalencia real entre dominios.

Risco:

- Baixo a medio.

Impacto:

- Pode afetar typing de forms se feito junto com alteracao de UI.

Validacoes obrigatorias:

- Typecheck/build.
- Fluxos de forms afetados.

O que nao deve ser alterado:

- Mensagens retornadas pelas actions.
- Estados esperados por componentes client.
- Nomes de campos de `fieldErrors`.

Criterios de conclusao:

- Tipos comuns extraidos.
- Dominios afetados continuam com action-state equivalente.

### Bloco 2.2 - Form-data helpers

Objetivo:

- Reduzir duplicidade de `getFormValue`, checkbox e file parsing.

Risco:

- Medio, porque parsing de formulario e sensivel.

Impacto:

- Actions podem passar a compartilhar helpers.

Validacoes obrigatorias:

- Testar forms migrados.
- Verificar checkbox, boolean, file upload e campos opcionais.

O que nao deve ser alterado:

- Nome dos campos de formulario.
- Valores enviados pelos forms.
- Schemas de validacao.

Criterios de conclusao:

- Helpers puros criados.
- Pelo menos um dominio migrado com comportamento igual.
- Nenhuma alteracao de UX.

### Bloco 2.3 - Formatters

Objetivo:

- Separar formatters puros de dominios quando forem compartilhados.

Risco:

- Medio, porque mascara de documento, telefone e data afeta UI e validacao.

Impacto:

- Pode afetar exibicao de clientes, empresas, propostas e certidoes.

Validacoes obrigatorias:

- Conferir CNPJ/CPF.
- Conferir telefone.
- Conferir datas.
- Conferir moeda/decimal se migrado.

O que nao deve ser alterado:

- Formato exibido atualmente.
- Parsing de decimal em formulario sem teste manual.

Criterios de conclusao:

- Formatters compartilhados movidos para local apropriado.
- Imports atualizados no menor escopo possivel.

### Bloco 2.4 - Pagination e search params

Objetivo:

- Padronizar page, sort, direction e search params.

Risco:

- Medio a alto em listas com filtros.

Impacto:

- Listagens, paginacao e ordenacao.

Validacoes obrigatorias:

- Testar filtros.
- Testar limpar filtros.
- Testar sort asc/desc.
- Testar troca de pagina.
- Testar URL gerada.

O que nao deve ser alterado:

- Query string publica existente.
- Valores default atuais.
- Tamanho de pagina sem decisao explicita.

Criterios de conclusao:

- Helper aplicado em um dominio piloto.
- Lista afetada preserva comportamento.

## Fase 3 - Migracao por dominio

Cada dominio deve passar pelos blocos abaixo de forma isolada. Nao migrar dois dominios sensiveis ao mesmo tempo.

### Ordem recomendada de dominios

1. `auth`, apenas se a equipe aceitar o risco de sessao; caso contrario deixar para depois.
2. `subscription`, se escopo estiver menor.
3. `subscriber-company`.
4. `customers`.
5. `services`.
6. `commercial-proposals`.
7. `customer-risk`.
8. `customer-certificates`.
9. `access-management`.

Para reduzir risco, tambem e aceitavel iniciar por um dominio menor, desde que nao envolva storage, permissao complexa ou PDF.

### Bloco 3.1 - Migrar types

Objetivo:

- Mover tipos do dominio para `src/features/<domain>/types.ts`.

Risco:

- Baixo.

Impacto:

- Type imports.

Validacoes obrigatorias:

- Typecheck/build.
- Verificar que tipos client-safe continuam sem server-only.

O que nao deve ser alterado:

- Shape dos dados.
- Nomes de propriedades.
- Contratos de props.

Criterios de conclusao:

- Tipos no destino oficial.
- Reexport temporario no caminho antigo, se necessario.
- Nenhum componente quebrado.

### Bloco 3.2 - Migrar constants

Objetivo:

- Mover labels, options, page size e rotas client-safe para `src/features/<domain>/constants.ts`.

Risco:

- Medio.

Impacto:

- UI, filtros, labels e status badges.

Validacoes obrigatorias:

- Conferir labels.
- Conferir options em selects.
- Conferir status/tone.
- Conferir rotas usadas em navegacao interna do dominio.

O que nao deve ser alterado:

- Labels validados.
- Ordem de options.
- Defaults.

Criterios de conclusao:

- Constants no destino oficial.
- Imports antigos protegidos por reexport temporario se necessario.

### Bloco 3.3 - Migrar validators/schemas

Objetivo:

- Mover validators para `src/features/<domain>/schemas.ts`.

Risco:

- Alto em forms complexos.

Impacto:

- Validacao de forms e mensagens de erro.

Validacoes obrigatorias:

- Testar salvar com dados validos.
- Testar campos obrigatorios.
- Testar erros de validacao.
- Conferir `fieldErrors`.

O que nao deve ser alterado:

- Regras de validacao.
- Mensagens.
- Campos validados.

Criterios de conclusao:

- Schema migrado sem alterar regra.
- Actions continuam retornando o mesmo shape de erro.

### Bloco 3.4 - Migrar components

Objetivo:

- Mover screens e componentes de dominio para `src/features/<domain>/components`.

Risco:

- Medio.

Impacto:

- Imports das pages e possiveis imports internos.

Validacoes obrigatorias:

- Build.
- Abrir paginas do dominio.
- Testar interacoes client.

O que nao deve ser alterado:

- JSX funcional.
- Classes de estilo.
- Textos.
- Handlers.
- UX.

Criterios de conclusao:

- Pages importam components do novo caminho ou de reexport temporario controlado.
- UI igual ao baseline.

### Bloco 3.5 - Migrar actions

Objetivo:

- Mover Server Actions para `src/features/<domain>/actions.ts`.

Risco:

- Alto, porque Client Components chamam actions e dependem de `useActionState`.

Impacto:

- Submissao de formularios.
- Revalidacao.
- Redirect.
- Feedback de sucesso/erro.

Validacoes obrigatorias:

- Forms do dominio.
- Acoes de lista.
- Revalidacao apos mutation.
- Redirects.
- Estados pending/success/error.

O que nao deve ser alterado:

- Nome e assinatura das actions consumidas.
- Retorno das actions.
- `revalidatePath`.
- Redirects.

Criterios de conclusao:

- Components importam de `@/features/<domain>/actions`.
- Caminho antigo em `src/app/.../actions.ts` pode reexportar temporariamente.
- Nenhuma submissao quebrada.

### Bloco 3.6 - Dividir queries, mutations e mappers

Objetivo:

- Quebrar `service.ts` grande em arquivos server claros.

Risco:

- Alto em dominios complexos.

Impacto:

- Dados de pagina.
- Mutations.
- Permissoes.
- Transacoes.
- Redirects.

Validacoes obrigatorias:

- Build.
- Fluxos manuais do dominio.
- Verificar isolamento por empresa ativa.
- Verificar permissoes.
- Verificar registros criados/atualizados/inativados.

O que nao deve ser alterado:

- Queries Prisma.
- Includes/selects sem motivo.
- Transacoes.
- Regras de permissao.
- Redirects.
- Mapeamento de page data.

Criterios de conclusao:

- `queries.ts` contem leituras.
- `mutations.ts` contem escritas.
- `mappers.ts` contem conversoes.
- Actions chamam mutations/queries oficiais.
- Arquivo antigo removido ou reduzido a reexport temporario apenas se seguro.

## Fase 4 - Limpeza e consolidacao

### Bloco 4.1 - Remover reexports temporarios

Objetivo:

- Eliminar pontes antigas depois que todos os imports foram atualizados.

Risco:

- Medio.

Impacto:

- Imports esquecidos quebram build.

Validacoes obrigatorias:

- `rg` por caminhos antigos.
- Build.
- Lint.

O que nao deve ser alterado:

- Comportamento.
- Estrutura de rotas.

Criterios de conclusao:

- Nenhum import antigo restante.
- Reexports temporarios removidos.

### Bloco 4.2 - Remover duplicidades

Objetivo:

- Consolidar helpers duplicados que restaram.

Risco:

- Medio.

Impacto:

- Forms, filtros, formatacao e actions.

Validacoes obrigatorias:

- Testar cada dominio afetado.
- Conferir que helpers compartilhados preservam defaults.

O que nao deve ser alterado:

- Mensagens.
- Dados serializados.
- UX.

Criterios de conclusao:

- Duplicidades relevantes removidas.
- Sem helper generico excessivo ou artificial.

### Bloco 4.3 - Padronizar imports

Objetivo:

- Garantir que imports reflitam a arquitetura oficial.

Risco:

- Baixo a medio.

Impacto:

- Organizacao e build.

Validacoes obrigatorias:

- `rg '@/app/.*/actions' src/components src/features`.
- `rg '@/lib/.*/service' src/components src/features`.
- Lint/build.

O que nao deve ser alterado:

- Codigo funcional sem necessidade.

Criterios de conclusao:

- Components nao importam actions por rota.
- Components nao importam services server-only.
- App Router usa features/server como fronteira.

### Bloco 4.4 - Avaliar rotas inconsistentes

Objetivo:

- Decidir se rotas como `/customers/[customerId]/certificates` devem permanecer ou ser alinhadas ao padrao `/crm/cliente/...`.

Risco:

- Alto.

Impacto:

- Links internos.
- Route handlers.
- PDFs.
- Permissoes.
- Upload publico.
- Bookmarks e URLs externas.

Validacoes obrigatorias:

- Mapear todos os links.
- Mapear route handlers.
- Mapear revalidatePath.
- Mapear permissao.
- Testar fluxo completo de certidoes.

O que nao deve ser alterado:

- Rotas antes da decisao formal.

Criterios de conclusao:

- Decisao documentada.
- Se houver alteracao de rota, plano especifico aprovado.

## Areas mais sensiveis

### Autenticacao e sessao multiempresa

Riscos:

- Invalidar sessao.
- Perder empresa ativa.
- Quebrar troca de contexto.
- Expor cookie/token.

Validacoes minimas:

- Login.
- Logout.
- Recuperacao de senha.
- Alteracao obrigatoria de senha.
- Sessao sem empresa.
- Usuario bloqueado/cancelado.

### Permissoes e access-control

Riscos:

- Liberar acesso indevido.
- Bloquear usuario com permissao valida.
- Quebrar menu filtrado.
- Ignorar hierarquia de permissao.

Validacoes minimas:

- Menu por perfil.
- Acesso negado.
- View/edit/create/delete/manage.
- Perfis OWNER/ADMIN/sistema.

### crm/servicos

Riscos:

- Calculo e valores fiscais.
- Relacao Lei 116, NBS e cTribMun.
- Regras municipais.
- Inativacao de codigos auxiliares.

Validacoes minimas:

- Lista de servicos.
- Cadastro/edicao.
- Regra municipal.
- Lei 116.
- NBS.
- cTribMun.
- Paginacao/filtros/sort.

### Propostas comerciais

Riscos:

- Totais.
- Status.
- Aprovacao.
- Envio/mock.
- Contrato.
- PDF.

Validacoes minimas:

- Criar proposta.
- Editar itens.
- Calcular totais.
- Aprovar.
- Enviar.
- Gerar/abrir PDF.

### Certidoes/PDF/storage

Riscos:

- Upload publico.
- Token de link.
- Limite de upload.
- Armazenamento local.
- Leitura de PDF.
- Validacao e reprocessamento.
- Acesso protegido ao arquivo.

Validacoes minimas:

- Gerar link.
- Upload publico sem login.
- Upload invalido.
- Link expirado/revogado.
- Abrir PDF autenticado.
- Validar e reprocessar.

### Gestao de acessos

Riscos:

- Editar usuario errado.
- Remover responsavel admin.
- Alterar proprio usuario indevidamente.
- Quebrar matriz de permissoes.

Validacoes minimas:

- Criar usuario.
- Editar usuario.
- Cancelar usuario.
- Criar perfil.
- Editar matriz.
- Excluir perfil permitido.
- Bloquear exclusao de perfil protegido.

### Assinatura

Riscos:

- Status financeiro.
- Faturas vencidas.
- Cancelamento.
- Links de pagamento.
- Sincronia com empresa.

Validacoes minimas:

- Ver gestao de assinatura.
- Preparar pagamento.
- Cancelar assinatura quando permitido.
- Conferir status na tela do assinante.

## Politica de reexports temporarios

Reexports temporarios sao permitidos quando:

- Um arquivo foi movido.
- Ainda existem imports antigos.
- Atualizar todos os consumers no mesmo bloco aumenta risco.

Regras:

- O reexport deve apontar para o novo local oficial.
- O reexport nao deve conter logica nova.
- O reexport deve ser removido na Fase 4.
- Cada reexport deve ter um motivo claro no resumo da etapa.

Exemplo:

```ts
export * from "@/features/services/actions";
```

## Politica de rollback e checkpoint

Antes de cada bloco:

- Conferir arquivos alterados.
- Criar commit/checkpoint ou registrar ponto de retorno.
- Confirmar que nao ha mudancas nao relacionadas no mesmo bloco.

Durante o bloco:

- Manter alteracoes pequenas.
- Evitar mudanca comportamental.
- Registrar qualquer decisao inesperada.

Depois do bloco:

- Rodar validacoes.
- Registrar resultado.
- Se falhar, corrigir no mesmo bloco ou voltar ao checkpoint.

Rollback deve ser simples porque cada bloco deve ter escopo pequeno.

## Politica de testes manuais por etapa

Para cada dominio migrado:

- Abrir a lista principal.
- Testar filtros, sort e paginacao se existirem.
- Abrir tela de novo cadastro.
- Salvar cadastro valido.
- Testar validacao com campos invalidos.
- Editar registro existente.
- Executar acao destrutiva/inativacao quando aplicavel.
- Confirmar mensagem de sucesso/erro.
- Confirmar permissao de view/edit/create/delete.
- Confirmar que a URL e os redirects continuam iguais.

Para rotas publicas:

- Testar sem sessao autenticada.
- Testar com token valido.
- Testar erro esperado.
- Testar redirect esperado.

Para route handlers:

- Conferir status HTTP.
- Conferir headers importantes.
- Conferir content type.
- Conferir autorizacao.

## Criterio final da remodelagem

A remodelagem arquitetural sera considerada concluida quando:

- `src/app` estiver focado em rotas, layouts e route handlers.
- `src/components` contiver apenas UI global/reutilizavel.
- Dominios estiverem em `src/features`.
- Infraestrutura server-only estiver em `src/server`.
- `src/lib` estiver pequeno e client-safe por padrao.
- Components client nao importarem actions por caminhos de rota.
- Components client nao importarem services server-only.
- Services grandes tiverem sido divididos em queries, mutations e mappers.
- Reexports temporarios tiverem sido removidos.
- Fluxos criticos passarem nas validacoes manuais.
- Lint/build passarem ou excecoes estiverem documentadas.
