import {
  Layers3,
  Palette,
  PanelLeft,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import {
  Breadcrumb,
  type BreadcrumbItem,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/access-control/permission-service";
import { RESOURCE_CODES } from "@/lib/access-control/resources";

const breadcrumbItems: BreadcrumbItem[] = [
  { label: "ONDIX", href: "/" },
  { label: "Base inicial" },
];

const structureBlocks = [
  "src/app",
  "src/components",
  "src/lib",
  "src/styles",
  "prisma",
];

const componentBlocks = ["Button", "Card", "PageHeader", "Breadcrumb"];

const visualTokens = [
  { label: "Primaria", value: "#F24A00" },
  { label: "Secundaria", value: "#D4AF37" },
  { label: "Fundo claro", value: "#F5F7FA" },
  { label: "Card claro", value: "#FFFFFF" },
  { label: "Fundo escuro", value: "#0B0F14" },
  { label: "Card escuro", value: "#121821" },
  { label: "Sidebar", value: "#12171E" },
];

const guardedScope = [
  "Autenticacao ainda nao implementada",
  "Financeiro ainda nao implementado",
  "CRM ainda nao implementado",
  "Contratos ainda nao implementados",
];

export default async function FoundationPage() {
  await requirePermission(RESOURCE_CODES.dashboard, "view");

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />

      <PageHeader
        eyebrow="Fundacao do sistema"
        title="Base estrutural e visual do ONDIX pronta para evolucao"
        description="O projeto ja esta organizado com App Router, design tokens, shell autenticado e componentes reutilizaveis para as proximas entregas."
        actions={
          <div className="flex flex-wrap gap-3">
            <Button icon={Layers3} variant="primary" disabled>
              Design System pronto
            </Button>
            <Button icon={PanelLeft} variant="outline" disabled>
              Shell autenticado pronto
            </Button>
          </div>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              <Sparkles className="h-4 w-4" />
              Visão geral
            </div>
            <CardTitle>Estrutura inicial preparada para escalar</CardTitle>
            <CardDescription>
              A base foi organizada para crescimento incremental, sem antecipar
              modulos de negocio fora do escopo desta etapa.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-card border border-border bg-background/60 p-4">
              <p className="text-sm font-semibold text-foreground">
                Pastas fundamentais
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {structureBlocks.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-card border border-border bg-background/60 p-4">
              <p className="text-sm font-semibold text-foreground">
                Componentes iniciais
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {componentBlocks.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-card border border-border bg-background/60 p-4">
              <p className="text-sm font-semibold text-foreground">
                Tema e identidade
              </p>
              <ul className="mt-4 space-y-2 text-xs leading-5 text-muted-foreground">
                <li>Tipografia com Poppins para titulos e Inter para conteudo.</li>
                <li>Sidebar fixa em identidade escura, independente do tema.</li>
                <li>Tokens preparados para claro e escuro com Tailwind 4.</li>
              </ul>
            </div>

            <div className="rounded-card border border-border bg-background/60 p-4">
              <p className="text-sm font-semibold text-foreground">
                Escopo preservado
              </p>
              <ul className="mt-4 space-y-2 text-xs leading-5 text-muted-foreground">
                {guardedScope.map((item) => (
                  <li key={item}>{item}.</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-secondary/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-secondary-foreground">
              <Palette className="h-4 w-4 text-secondary" />
              Marca ONDIX
            </div>
            <CardTitle>Tokens visuais da fundacao</CardTitle>
            <CardDescription>
              Cores-chave e superficies preparadas para orientar a construcao
              das proximas telas.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {visualTokens.map((token) => (
              <div
                key={token.label}
                className="rounded-card border border-border bg-background/60 p-3"
              >
                <div
                  className="h-12 rounded-card border border-black/5"
                  style={{ backgroundColor: token.value }}
                />
                <p className="mt-3 text-sm font-semibold text-foreground">
                  {token.label}
                </p>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {token.value}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              <PanelLeft className="h-4 w-4" />
              Layout base
            </div>
            <CardTitle>Shell autenticado pronto para novos modulos</CardTitle>
            <CardDescription>
              A composicao ja contempla Sidebar, Header e area de conteudo com
              espacamento consistente para telas futuras.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="rounded-card border border-border bg-background/60 p-4">
              <p className="text-sm font-semibold text-foreground">Sidebar</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Navegacao fixa, escura e preparada para crescimento por modulos.
              </p>
            </div>
            <div className="rounded-card border border-border bg-background/60 p-4">
              <p className="text-sm font-semibold text-foreground">Header</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Barra superior com contexto da aplicacao e alternancia de tema.
              </p>
            </div>
            <div className="rounded-card border border-border bg-background/60 p-4">
              <p className="text-sm font-semibold text-foreground">Conteudo</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Container central responsivo com area pronta para paginas
                internas.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              <ShieldCheck className="h-4 w-4" />
              Proxima etapa
            </div>
            <CardTitle>Base segura para evoluir</CardTitle>
            <CardDescription>
              A partir daqui o projeto pode receber modulos, autenticacao e
              fluxos reais sem retrabalho de layout.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs leading-5 text-muted-foreground">
            <p>
              O shell atual foi mantido propositalmente enxuto para que a
              proxima fase foque em regras de negocio sem refazer a camada
              visual.
            </p>
            <p>
              Os componentes e tokens ja ajudam a manter consistencia nas novas
              telas desde a primeira implementacao.
            </p>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
