"use client";

import { LayoutDashboard, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/helpers/cn";

const slides = [
  {
    eyebrow: "Admin Console Futuro",
    title: "Governanca visual para todo o ecossistema ONDIX",
    description:
      "A area de comunicacao da autenticacao ja nasce preparada para receber campanhas, recados operacionais e atualizacoes do ecossistema.",
    icon: LayoutDashboard,
  },
  {
    eyebrow: "Seguranca e Acesso",
    title: "Autenticacao desenhada para operacao multiempresa",
    description:
      "Sessao segura, empresa ativa no contexto do usuario e fluxo de troca de senha obrigatoria ja preparados para a proxima etapa.",
    icon: ShieldCheck,
  },
  {
    eyebrow: "Escala do Produto",
    title: "Base pronta para evoluir com onboarding e comunicacao",
    description:
      "O espaco de banner funciona como um carrossel para futuras campanhas controladas pela administracao da plataforma.",
    icon: Sparkles,
  },
];

export function AuthMarketingCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 4500);

    return () => window.clearInterval(timer);
  }, []);

  const activeSlide = slides[activeIndex];
  const ActiveIcon = activeSlide.icon;

  return (
    <section className="relative hidden min-h-screen overflow-hidden lg:flex lg:flex-col lg:justify-between">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(242,74,0,0.24),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(212,175,55,0.2),transparent_28%)]" />
      <div className="absolute right-10 top-10 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-10 left-10 h-56 w-56 rounded-full bg-secondary/10 blur-3xl" />

      <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
        <div className="max-w-xl">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            {activeSlide.eyebrow}
          </span>

          <div className="mt-8 flex h-14 w-14 items-center justify-center rounded-[14px] border border-primary/20 bg-primary/10 text-primary">
            <ActiveIcon className="h-6 w-6" />
          </div>

          <h1 className="mt-6 max-w-lg font-heading text-[32px] font-semibold leading-[1.08] tracking-[-0.05em] text-foreground xl:text-[42px]">
            {activeSlide.title}
          </h1>

          <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">
            {activeSlide.description}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {slides.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={cn(
                "h-2.5 rounded-full transition-all duration-200",
                index === activeIndex ? "w-10 bg-primary" : "w-2.5 bg-border",
              )}
              aria-label={`Ir para banner ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
