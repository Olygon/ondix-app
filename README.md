# ONDIX

Base estrutural do SaaS ONDIX com `Next.js + TypeScript + App Router`, Prisma, PostgreSQL (Neon) e autenticacao inicial multiempresa.

## Stack atual

- Next.js com App Router
- Tailwind CSS
- Prisma ORM
- PostgreSQL (Neon)
- Sessao baseada em cookie assinado

## Variaveis de ambiente

Copie o arquivo `.env.example` para `.env` e preencha os valores:

```bash
copy .env.example .env
```

Campos principais:

- `DATABASE_URL`: string de conexao do Neon
- `AUTH_SECRET`: segredo usado para assinar a sessao
- `APP_URL`: URL da aplicacao local ou publicada
- `LANDING_PAGE_URL`: link usado no "Saiba mais" da tela de login
- `SUPPORT_EMAIL`: e-mail de suporte exibido nas orientacoes operacionais

Exemplo de `DATABASE_URL`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@ep-example.us-east-2.aws.neon.tech/ondix?sslmode=require&channel_binding=require"
```

## Prisma e banco

1. Gere o client do Prisma:

```bash
npm run prisma:generate
```

2. Envie o schema inicial para o banco:

```bash
npm run prisma:push
```

3. Opcionalmente, alimente a base com perfis e usuario inicial:

```bash
npm run db:seed
```

Para o seed funcionar com usuario inicial, preencha tambem no `.env`:

```env
SEED_COMPANY_NAME="ONDIX Demo"
SEED_COMPANY_SLUG="ondix-demo"
SEED_ADMIN_NAME="Administrador ONDIX"
SEED_ADMIN_EMAIL="admin@ondix.com.br"
SEED_ADMIN_PASSWORD="Temp@123"
```

## Fluxos de autenticacao incluidos

- Login com verificacao de conta bloqueada
- Recuperacao de senha com senha provisoria de 8 digitos
- Alteracao obrigatoria de senha no primeiro acesso ou apos recuperacao
- Aceite de termos no fluxo de redefinicao
- Estrutura inicial de protecao de rotas
- Sessao com empresa ativa e perfil de acesso

Observacao de desenvolvimento:

- Enquanto nao houver servico real de e-mail, o fluxo de recuperacao mostra um preview local na interface e registra no terminal o link de login e a senha provisoria.

## Comandos principais

```bash
npm run dev
npm run lint
npm run build
npm run prisma:generate
npm run prisma:push
npm run db:seed
```
