import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function CustomerRiskAnalysisLoading() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Carregando analise de risco...</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">
        Consultando score, limite, criterios, historicos e consultas externas do
        cliente selecionado.
      </CardContent>
    </Card>
  );
}
