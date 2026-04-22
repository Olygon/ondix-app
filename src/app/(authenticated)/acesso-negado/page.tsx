"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, LayoutDashboard, ShieldAlert } from "lucide-react";

import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

const breadcrumbItems: BreadcrumbItem[] = [
  { label: "ONDIX", href: "/" },
  { label: "Acesso negado" },
];

export default function AccessDeniedPage() {
  const router = useRouter();

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />

      <PageHeader
        eyebrow="Controle de acesso"
        title="Acesso negado"
        description="Seu perfil ativo nao possui a permissao necessaria para abrir esta area ou concluir a acao solicitada."
        actions={
          <div className="flex flex-wrap gap-3">
            <Button
              icon={ArrowLeft}
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Voltar
            </Button>

            <Button
              icon={LayoutDashboard}
              type="button"
              onClick={() => router.push("/")}
            >
              Ir ao dashboard
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Permissao insuficiente para este recurso</CardTitle>
          <CardDescription>
            Se voce acredita que deveria ter acesso, revise o perfil vinculado a sua
            empresa ativa com um administrador do ONDIX.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-start gap-3 text-xs leading-5 text-muted-foreground">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            O bloqueio tambem e aplicado no servidor. Mesmo acessando a URL
            diretamente ou tentando enviar formularios manualmente, as operacoes sem
            permissao continuam impedidas.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
