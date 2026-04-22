"use client";

import { RotateCcw } from "lucide-react";

import { AuthMessage } from "@/components/auth/auth-message";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function CustomerRiskAnalysisError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Nao foi possivel carregar a analise de risco</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <AuthMessage tone="error">
          Ocorreu uma falha ao consultar a analise de risco do cliente.
        </AuthMessage>
        <Button icon={RotateCcw} type="button" onClick={reset}>
          Tentar novamente
        </Button>
      </CardContent>
    </Card>
  );
}
