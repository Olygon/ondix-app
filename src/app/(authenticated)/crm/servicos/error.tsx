"use client";

import { RotateCcw } from "lucide-react";

import { AuthMessage } from "@/components/feedback/auth-message";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ServicesError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Nao foi possivel carregar servicos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <AuthMessage tone="error">
          Ocorreu uma falha ao consultar os servicos da empresa ativa.
        </AuthMessage>
        <Button icon={RotateCcw} type="button" onClick={reset}>
          Tentar novamente
        </Button>
      </CardContent>
    </Card>
  );
}
