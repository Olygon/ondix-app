import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ServicesLoading() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Carregando servicos...</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">
        Consultando servicos da empresa ativa e aplicando filtros de acesso.
      </CardContent>
    </Card>
  );
}
