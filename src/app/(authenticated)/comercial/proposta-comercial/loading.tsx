import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function CommercialProposalLoading() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Carregando propostas comerciais...</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">
        Consultando propostas da empresa ativa e aplicando permissoes do usuario.
      </CardContent>
    </Card>
  );
}
