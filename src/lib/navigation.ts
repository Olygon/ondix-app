import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  BadgeDollarSign,
  BarChart3,
  BookOpenText,
  BriefcaseBusiness,
  Building2,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  FileSpreadsheet,
  FileText,
  FileUp,
  Handshake,
  Landmark,
  LayoutDashboard,
  Package,
  ReceiptText,
  Scale,
  ScrollText,
  Settings2,
  Target,
  UsersRound,
} from "lucide-react";

import {
  RESOURCE_CODES,
  type PermissionGrant,
  type ResourceCode,
} from "@/lib/access-control/resources";
import {
  hasPermissionInMatrix,
  type PermissionCheckAction,
} from "@/lib/access-control/permissions";

export type NavigationItem = {
  disabled?: boolean;
  href: string;
  icon: LucideIcon;
  requiredPermission?: {
    action?: PermissionCheckAction;
    resourceCode: ResourceCode;
  };
  title: string;
};

export type NavigationGroup = {
  id: string;
  items: NavigationItem[];
  label?: string;
};

export const navigationGroups: NavigationGroup[] = [
  {
    id: "dashboard",
    items: [
      {
        title: "Dashboard Executivo",
        href: "/",
        icon: LayoutDashboard,
        requiredPermission: {
          resourceCode: RESOURCE_CODES.dashboard,
        },
      },
    ],
  },
  {
    id: "crm-comercial",
    label: "CRM / Comercial",
    items: [
      {
        title: "Painel CRM",
        href: "/crm/painel",
        icon: BarChart3,
        disabled: true,
        requiredPermission: {
          resourceCode: RESOURCE_CODES.crmDashboard,
        },
      },
      {
        title: "Cliente",
        href: "/crm/cliente",
        icon: UsersRound,
        requiredPermission: {
          resourceCode: RESOURCE_CODES.crmCustomer,
        },
      },
      {
        title: "Relacionamento",
        href: "/crm/relacionamento",
        icon: Handshake,
        disabled: true,
        requiredPermission: {
          resourceCode: RESOURCE_CODES.crmRelationship,
        },
      },
      {
        title: "Serviços Prestados",
        href: "/crm/servicos",
        icon: BriefcaseBusiness,
        requiredPermission: {
          resourceCode: RESOURCE_CODES.crmProvidedServices,
        },
      },
      {
        title: "Proposta Comercial",
        href: "/comercial/proposta-comercial",
        icon: FileText,
        requiredPermission: {
          resourceCode: RESOURCE_CODES.crmCommercialProposal,
        },
      },
      {
        title: "Contratos Clientes",
        href: "/comercial/contratos-clientes",
        icon: ScrollText,
        disabled: true,
        requiredPermission: {
          resourceCode: RESOURCE_CODES.crmCustomerContracts,
        },
      },
      {
        title: "Representante Comercial",
        href: "/comercial/representante-comercial",
        icon: BriefcaseBusiness,
        disabled: true,
        requiredPermission: {
          resourceCode: RESOURCE_CODES.crmSalesRepresentative,
        },
      },
    ],
  },
  {
    id: "administrativo",
    label: "Administrativo",
    items: [
      {
        title: "Painel Administrativo",
        href: "/administrativo/painel",
        icon: BarChart3,
        disabled: true,
        requiredPermission: {
          resourceCode: RESOURCE_CODES.administrativeDashboard,
        },
      },
      {
        title: "Fornecedor",
        href: "/administrativo/fornecedor",
        icon: Building2,
        disabled: true,
        requiredPermission: {
          resourceCode: RESOURCE_CODES.administrativeSupplier,
        },
      },
      {
        title: "Contratos Fornecedores",
        href: "/administrativo/contrato-de-fornecedor",
        icon: ScrollText,
        disabled: true,
        requiredPermission: {
          resourceCode: RESOURCE_CODES.administrativeSupplierContracts,
        },
      },
      {
        title: "Compras",
        href: "/administrativo/compras",
        icon: BadgeDollarSign,
        disabled: true,
        requiredPermission: {
          resourceCode: RESOURCE_CODES.administrativePurchases,
        },
      },
      {
        title: "Suprimentos",
        href: "/administrativo/suprimentos",
        icon: Package,
        disabled: true,
        requiredPermission: {
          resourceCode: RESOURCE_CODES.administrativeSupplies,
        },
      },
      {
        title: "Controle Patrimonial",
        href: "/administrativo/controle-patrimonial",
        icon: Package,
        disabled: true,
        requiredPermission: {
          resourceCode: RESOURCE_CODES.assetControl,
        },
      },
      {
        title: "Projetos e Tarefas",
        href: "/administrativo/projetos-e-tarefas",
        icon: ClipboardList,
        disabled: true,
        requiredPermission: {
          resourceCode: RESOURCE_CODES.administrativeProjectsTasks,
        },
      },
      {
        title: "Orçamento Financeiro",
        href: "/administrativo/orcamento-financeiro",
        icon: CircleDollarSign,
        disabled: true,
        requiredPermission: {
          resourceCode: RESOURCE_CODES.administrativeFinancialBudget,
        },
      },
      {
        title: "Metas Financeiras",
        href: "/administrativo/metas-financeiras",
        icon: Target,
        disabled: true,
        requiredPermission: {
          resourceCode: RESOURCE_CODES.administrativeFinancialGoals,
        },
      },
    ],
  },
  {
    id: "financeiro",
    label: "Financeiro",
    items: [
      {
        title: "Painel Financeiro",
        href: "/financeiro/painel",
        icon: BarChart3,
        disabled: true,
        requiredPermission: {
          resourceCode: RESOURCE_CODES.financialDashboard,
        },
      },
      {
        title: "Contas Bancárias",
        href: "/financeiro/contas-bancarias",
        icon: Landmark,
        disabled: true,
        requiredPermission: {
          resourceCode: RESOURCE_CODES.financialBankAccounts,
        },
      },
      {
        title: "Cartão de Crédito",
        href: "/financeiro/cartao-de-credito",
        icon: CreditCard,
        disabled: true,
        requiredPermission: {
          resourceCode: RESOURCE_CODES.financialCreditCard,
        },
      },
      {
        title: "Plano de Contas",
        href: "/financeiro/plano-de-contas",
        icon: BookOpenText,
        disabled: true,
        requiredPermission: {
          resourceCode: RESOURCE_CODES.financialChartOfAccounts,
        },
      },
      {
        title: "Faturamento",
        href: "/financeiro/faturamento",
        icon: ReceiptText,
        disabled: true,
        requiredPermission: {
          resourceCode: RESOURCE_CODES.financialBilling,
        },
      },
      {
        title: "Contas a Pagar",
        href: "/financeiro/contas-a-pagar",
        icon: BadgeDollarSign,
        disabled: true,
        requiredPermission: {
          resourceCode: RESOURCE_CODES.financialAccountsPayable,
        },
      },
      {
        title: "Contas a Receber",
        href: "/financeiro/contas-a-receber",
        icon: CircleDollarSign,
        disabled: true,
        requiredPermission: {
          resourceCode: RESOURCE_CODES.financialAccountsReceivable,
        },
      },
      {
        title: "Transações",
        href: "/financeiro/transacoes",
        icon: ArrowLeftRight,
        disabled: true,
        requiredPermission: {
          resourceCode: RESOURCE_CODES.financialTransactions,
        },
      },
      {
        title: "Importar Documentos",
        href: "/financeiro/importar-documentos",
        icon: FileUp,
        disabled: true,
        requiredPermission: {
          resourceCode: RESOURCE_CODES.financialDocumentImport,
        },
      },
      {
        title: "Conciliação",
        href: "/financeiro/conciliacao",
        icon: Scale,
        disabled: true,
        requiredPermission: {
          resourceCode: RESOURCE_CODES.financialReconciliation,
        },
      },
      {
        title: "Demonstrativos",
        href: "/financeiro/demonstrativos",
        icon: FileSpreadsheet,
        disabled: true,
        requiredPermission: {
          resourceCode: RESOURCE_CODES.financialStatements,
        },
      },
    ],
  },
  {
    id: "rh",
    label: "Recursos Humanos",
    items: [
      {
        title: "Colaboradores",
        href: "/recursos-humanos/colaboradores",
        icon: UsersRound,
        disabled: true,
        requiredPermission: {
          resourceCode: RESOURCE_CODES.humanResourcesEmployees,
        },
      },
      {
        title: "Gestão de RH",
        href: "/recursos-humanos/gestao-de-rh",
        icon: UsersRound,
        disabled: true,
        requiredPermission: {
          resourceCode: RESOURCE_CODES.humanResourcesManagement,
        },
      },
    ],
  },
  {
    id: "relatorios",
    items: [
      {
        title: "Demonstrativos e Relatórios",
        href: "/demonstrativos-e-relatorios",
        icon: FileSpreadsheet,
        disabled: true,
        requiredPermission: {
          resourceCode: RESOURCE_CODES.reports,
        },
      },
    ],
  },
  {
    id: "configuraes",
    items: [
      {
        title: "Configurações",
        href: "/configuracoes",
        icon: Settings2,
        disabled: true,
        requiredPermission: {
          resourceCode: RESOURCE_CODES.settings,
        },
      },
    ],
  },
];

export function filterNavigationGroupsByPermissions(permissions: PermissionGrant[]) {
  return navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!item.requiredPermission) {
          return true;
        }

        return hasPermissionInMatrix(
          permissions,
          item.requiredPermission.resourceCode,
          item.requiredPermission.action,
        );
      }),
    }))
    .filter((group) => group.items.length > 0);
}
