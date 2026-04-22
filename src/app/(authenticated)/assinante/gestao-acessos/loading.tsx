import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SubscriberAccessManagementLoading() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Carregando gestao de acessos...</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">
        Consultando usuarios e perfis vinculados a empresa ativa.
      </CardContent>
    </Card>
  );
}
