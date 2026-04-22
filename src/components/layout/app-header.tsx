"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  Bell,
  Calculator,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  HelpCircle,
  LogOut,
  Mail,
  RotateCcw,
  UserRound,
  X,
} from "lucide-react";

import {
  logoutAction,
  setActivePeriodAction,
} from "@/app/(authenticated)/header-actions";
import { Button } from "@/components/ui/button";
import type { ActivePeriod } from "@/lib/active-period/types";
import {
  createActivePeriod,
  monthNames,
  shortMonthNames,
} from "@/lib/active-period/utils";
import { cn } from "@/lib/utils";

type AppHeaderProps = {
  activePeriod: ActivePeriod;
  userAccountHref: string | null;
  userAvatarUrl: string | null;
  userName: string;
  userShortName: string;
};

type HeaderPanel = "help" | "messages" | "notifications" | null;

const iconButtonClassName =
  "inline-flex h-10 w-10 items-center justify-center rounded-[8px] border border-border bg-card/70 text-muted-foreground shadow-sm transition-colors hover:border-primary/30 hover:bg-primary/8 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-45";
const headerActionIconButtonClassName =
  "inline-flex h-10 w-10 items-center justify-center rounded-[8px] bg-transparent text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-45";
const calculatorButtonClassName =
  "flex h-11 items-center justify-center rounded-[8px] border border-border bg-background/70 text-sm font-semibold text-foreground transition-colors hover:border-primary/30 hover:bg-primary/8";

function HeaderIconButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active?: boolean;
  icon: typeof Bell;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        headerActionIconButtonClassName,
        active && "text-primary",
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function getPanelContent(panel: HeaderPanel) {
  if (panel === "help") {
    return {
      description:
        "A central de ajuda do ONDIX sera conectada aos materiais de suporte e treinamento.",
      title: "Ajuda",
    };
  }

  if (panel === "notifications") {
    return {
      description:
        "As notificacoes do sistema serao exibidas aqui quando o modulo for ativado.",
      title: "Notificacoes",
    };
  }

  if (panel === "messages") {
    return {
      description:
        "As mensagens internas aparecerao neste espaco quando a comunicacao estiver disponivel.",
      title: "Mensagens",
    };
  }

  return null;
}

function evaluateExpression(expression: string) {
  const normalized = expression
    .replaceAll(",", ".")
    .replaceAll("×", "*")
    .replaceAll("÷", "/")
    .replace(/\s/g, "");
  const tokens: Array<number | "+" | "-" | "*" | "/"> = [];
  let index = 0;
  let expectingNumber = true;

  while (index < normalized.length) {
    const char = normalized[index];

    if (
      /\d|\./.test(char) ||
      (char === "-" && expectingNumber && /\d|\./.test(normalized[index + 1] ?? ""))
    ) {
      let numberText = char;
      index += 1;

      while (index < normalized.length && /\d|\./.test(normalized[index])) {
        numberText += normalized[index];
        index += 1;
      }

      const value = Number(numberText);

      if (!Number.isFinite(value)) {
        throw new Error("Expressao invalida.");
      }

      tokens.push(value);
      expectingNumber = false;
      continue;
    }

    if (["+", "-", "*", "/"].includes(char) && !expectingNumber) {
      tokens.push(char as "+" | "-" | "*" | "/");
      expectingNumber = true;
      index += 1;
      continue;
    }

    throw new Error("Expressao invalida.");
  }

  if (tokens.length === 0 || typeof tokens[tokens.length - 1] !== "number") {
    throw new Error("Expressao invalida.");
  }

  const precedenceTokens: Array<number | "+" | "-"> = [];
  let cursor = 0;

  while (cursor < tokens.length) {
    const token = tokens[cursor];

    if (token === "*" || token === "/") {
      const previous = precedenceTokens.pop();
      const next = tokens[cursor + 1];

      if (typeof previous !== "number" || typeof next !== "number") {
        throw new Error("Expressao invalida.");
      }

      if (token === "/" && next === 0) {
        throw new Error("Divisao por zero.");
      }

      precedenceTokens.push(token === "*" ? previous * next : previous / next);
      cursor += 2;
      continue;
    }

    precedenceTokens.push(token as number | "+" | "-");
    cursor += 1;
  }

  let result = precedenceTokens[0];

  if (typeof result !== "number") {
    throw new Error("Expressao invalida.");
  }

  for (let nextIndex = 1; nextIndex < precedenceTokens.length; nextIndex += 2) {
    const operator = precedenceTokens[nextIndex];
    const nextValue = precedenceTokens[nextIndex + 1];

    if (typeof nextValue !== "number") {
      throw new Error("Expressao invalida.");
    }

    result = operator === "+" ? result + nextValue : result - nextValue;
  }

  return result;
}

function formatCalculatorResult(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 8,
    useGrouping: false,
  }).format(value);
}

function CalculatorOverlay({ onClose }: { onClose: () => void }) {
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState("");
  const [message, setMessage] = useState("");
  const buttons = [
    "7",
    "8",
    "9",
    "÷",
    "4",
    "5",
    "6",
    "×",
    "1",
    "2",
    "3",
    "-",
    "0",
    ",",
    "=",
    "+",
  ];

  function appendValue(value: string) {
    setMessage("");

    if (value === "=") {
      try {
        const calculated = evaluateExpression(expression);

        setResult(formatCalculatorResult(calculated));
        setExpression(String(calculated).replace(".", ","));
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Expressao invalida.");
      }
      return;
    }

    setExpression((current) => `${current}${value}`);
  }

  async function copyResult() {
    const value = result || expression;

    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setMessage("Resultado copiado para a area de transferencia.");
    } catch {
      setMessage("Nao foi possivel copiar automaticamente.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-background/55 p-4 backdrop-blur-sm sm:p-6">
      <section className="w-full max-w-[360px] rounded-card border border-border bg-card shadow-card">
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="font-heading text-sm font-semibold text-foreground">
              Calculadora
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              ONDIX
            </p>
          </div>
          <button
            type="button"
            aria-label="Fechar calculadora"
            title="Fechar calculadora"
            onClick={onClose}
            className={iconButtonClassName}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-4 p-5">
          <div className="min-h-[86px] rounded-[8px] border border-border bg-background/70 p-4 text-right">
            <p className="min-h-5 break-words text-xs text-muted-foreground">
              {expression || "0"}
            </p>
            <p className="mt-2 break-words font-heading text-2xl font-semibold text-foreground">
              {result || "0"}
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              className={calculatorButtonClassName}
              onClick={() => {
                setExpression("");
                setResult("");
                setMessage("");
              }}
            >
              C
            </button>
            <button
              type="button"
              className={calculatorButtonClassName}
              onClick={() => setExpression((current) => current.slice(0, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={cn(calculatorButtonClassName, "col-span-2")}
              onClick={() => {
                setExpression(result);
                setMessage("");
              }}
            >
              Usar resultado
            </button>

            {buttons.map((button) => (
              <button
                key={button}
                type="button"
                className={cn(
                  calculatorButtonClassName,
                  button === "=" && "bg-primary/10 text-primary",
                )}
                onClick={() => appendValue(button)}
              >
                {button}
              </button>
            ))}
          </div>

          {message ? (
            <p className="text-xs font-medium text-muted-foreground">{message}</p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button icon={Copy} type="button" onClick={copyResult}>
              Copiar resultado
            </Button>
            <Button
              icon={RotateCcw}
              type="button"
              variant="outline"
              onClick={() => {
                setExpression("");
                setResult("");
                setMessage("");
              }}
            >
              Limpar
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

export function AppHeader({
  activePeriod,
  userAccountHref,
  userAvatarUrl,
  userName,
  userShortName,
}: AppHeaderProps) {
  const [selectedPeriod, setSelectedPeriod] = useState(activePeriod);
  const [periodYear, setPeriodYear] = useState(activePeriod.year);
  const [isPeriodOpen, setIsPeriodOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<HeaderPanel>(null);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isPeriodPending, startPeriodTransition] = useTransition();
  const panelContent = getPanelContent(activePanel);
  const avatar = (
    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-border bg-surface-muted text-muted-foreground">
      {userAvatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={userAvatarUrl}
          alt={`Foto de ${userName}`}
          className="h-full w-full object-cover"
        />
      ) : (
        <UserRound className="h-5 w-5" />
      )}
    </span>
  );

  function selectPeriod(month: number) {
    const nextPeriod = createActivePeriod(periodYear, month);

    setSelectedPeriod(nextPeriod);
    setIsPeriodOpen(false);
    startPeriodTransition(async () => {
      const persistedPeriod = await setActivePeriodAction(nextPeriod.value);
      setSelectedPeriod(persistedPeriod);
      setPeriodYear(persistedPeriod.year);
    });
  }

  return (
    <>
      <header className="sticky top-0 z-20 w-full border-b border-border/80 bg-card/92 backdrop-blur-xl">
        <div className="flex w-full flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div className="flex min-w-0 flex-1 flex-col gap-12 xl:flex-row xl:items-center xl:gap-24">
            <div className="flex min-w-0 items-center gap-3">
              {userAccountHref ? (
                <Link href={userAccountHref} aria-label="Abrir conta do usuario">
                  {avatar}
                </Link>
              ) : (
                avatar
              )}

              <div className="min-w-0">
                <p className="truncate text-[16px] font-semibold leading-6 text-foreground">
                  <span>Olá, </span>
                  {userAccountHref ? (
                    <Link
                      href={userAccountHref}
                      className="text-primary transition-colors hover:text-primary/80"
                    >
                      {userShortName}
                    </Link>
                  ) : (
                    <span>{userShortName}</span>
                  )}
                  <span>!</span>
                </p>
                <p className="truncate text-[12px] leading-5 text-muted-foreground">
                  Seja bem-vindo(a) ao gestor empresarial inteligente!
                </p>
              </div>
            </div>

            <div className="relative w-[168px] max-w-full text-[12px]">
              <p className="mb-1 text-[10px] font-semibold uppercase leading-[12px] tracking-[0.14em] text-muted-foreground">
                Período Ativo
              </p>
              <button
                type="button"
                onClick={() => setIsPeriodOpen((current) => !current)}
                className="flex h-8 w-full items-center justify-between gap-2 rounded-[6px] border border-border bg-background/70 px-2.5 text-left text-[12px] font-semibold leading-[12px] text-foreground shadow-sm transition-colors hover:border-primary/30 hover:bg-primary/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="truncate">
                    {selectedPeriod.label}
                    {isPeriodPending ? " salvando" : ""}
                  </span>
                </span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </button>

              {isPeriodOpen ? (
                <div className="absolute left-0 top-[58px] z-40 w-[168px] rounded-card border border-border bg-card p-3 shadow-card">
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      className={iconButtonClassName}
                      aria-label="Ano anterior"
                      title="Ano anterior"
                      onClick={() => setPeriodYear((current) => current - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <p className="font-heading text-[12px] font-semibold leading-[12px] text-foreground">
                      {periodYear}
                    </p>
                    <button
                      type="button"
                      className={iconButtonClassName}
                      aria-label="Proximo ano"
                      title="Proximo ano"
                      onClick={() => setPeriodYear((current) => current + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {shortMonthNames.map((month, index) => {
                      const monthNumber = index + 1;
                      const isSelected =
                        selectedPeriod.month === monthNumber &&
                        selectedPeriod.year === periodYear;

                      return (
                        <button
                          key={month}
                          type="button"
                          onClick={() => selectPeriod(monthNumber)}
                          className={cn(
                            "flex h-8 items-center justify-center rounded-[8px] border border-border bg-background/60 text-[12px] font-semibold leading-[12px] text-foreground transition-colors hover:border-primary/30 hover:bg-primary/8",
                            isSelected && "border-primary/40 bg-primary/10 text-primary",
                          )}
                          title={monthNames[index]}
                        >
                          {isSelected ? <Check className="mr-1 h-3.5 w-3.5" /> : null}
                          {month}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="relative flex flex-row-reverse flex-wrap items-center gap-2">
            <form action={logoutAction}>
              <Button icon={LogOut} type="submit" variant="outline">
                Sair
              </Button>
            </form>

            <HeaderIconButton
              icon={HelpCircle}
              label="Ajuda"
              active={activePanel === "help"}
              onClick={() =>
                setActivePanel((current) => (current === "help" ? null : "help"))
              }
            />
            <HeaderIconButton
              icon={Bell}
              label="Notificacoes"
              active={activePanel === "notifications"}
              onClick={() =>
                setActivePanel((current) =>
                  current === "notifications" ? null : "notifications",
                )
              }
            />
            <HeaderIconButton
              icon={Mail}
              label="Mensagens"
              active={activePanel === "messages"}
              onClick={() =>
                setActivePanel((current) =>
                  current === "messages" ? null : "messages",
                )
              }
            />
            <HeaderIconButton
              icon={Calculator}
              label="Calculadora"
              onClick={() => {
                setActivePanel(null);
                setIsCalculatorOpen(true);
              }}
            />

            {panelContent ? (
              <div className="absolute right-0 top-12 z-40 w-[min(320px,calc(100vw-32px))] rounded-card border border-border bg-card p-4 shadow-card">
                <p className="font-heading text-sm font-semibold text-foreground">
                  {panelContent.title}
                </p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {panelContent.description}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {isCalculatorOpen ? (
        <CalculatorOverlay onClose={() => setIsCalculatorOpen(false)} />
      ) : null}
    </>
  );
}
