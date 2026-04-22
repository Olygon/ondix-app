import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumb({
  items,
}: Readonly<{
  items: BreadcrumbItem[];
}>) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {items.map((item, index) => {
          const isLastItem = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {item.href && !isLastItem ? (
                <Link
                  href={item.href}
                  className="transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={isLastItem ? "text-foreground" : undefined}>
                  {item.label}
                </span>
              )}

              {!isLastItem ? (
                <ChevronRight className="h-4 w-4 text-muted-foreground/70" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
