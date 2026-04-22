import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SubscriberSubscriptionManagementLoading() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Carregando gestao da assinatura...</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">
        Consultando plano, vencimentos e faturas da empresa ativa.
      </CardContent>
    </Card>
  );
}
