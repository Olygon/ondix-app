import type { ReactNode } from "react";

import { cn } from "@/lib/helpers/cn";

type PageHeaderProps = {
  actions?: ReactNode;
  className?: string;
  description?: string;
  eyebrow?: string;
  title: string;
};

export function PageHeader({
  actions,
  className,
  description,
  eyebrow,
  title,
}: PageHeaderProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-card border border-border bg-card px-6 py-6 shadow-card",
        className,
      )}
    >
      <div className="absolute -right-20 top-0 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-0 right-10 h-40 w-40 rounded-full bg-secondary/10 blur-3xl" />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          {eyebrow ? (
            <p className="text-base font-medium text-primary">
              {eyebrow}
            </p>
          ) : null}

          <h1 className="mt-2 font-heading text-[20px] font-semibold tracking-[-0.03em] text-foreground">
            {title}
          </h1>

          {description ? (
            <p className="mt-3 max-w-2xl text-xs leading-5 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>

        {actions ? <div className="relative flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </section>
  );
}
