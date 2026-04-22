import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function CustomerListLoading() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Carregando clientes...</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">
        Consultando cadastros da empresa ativa e aplicando filtros de acesso.
      </CardContent>
    </Card>
  );
}
