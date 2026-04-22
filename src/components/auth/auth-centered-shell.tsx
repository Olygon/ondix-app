import Image from "next/image";

import { Card } from "@/components/ui/card";

type AuthCenteredShellProps = {
  children: React.ReactNode;
  description: string;
  title: string;
};

export function AuthCenteredShell({
  children,
  description,
  title,
}: AuthCenteredShellProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-5xl overflow-hidden">
        <div className="grid min-h-[500px] md:grid-cols-[380px_minmax(0,1fr)]">
          <section className="flex items-center justify-center bg-sidebar px-8 py-10">
            <Image
              src="/ondix-vertical.svg"
              alt="ONDIX"
              width={232}
              height={320}
              priority
              className="h-auto w-[272px]"
            />
          </section>

          <section className="flex items-center px-6 py-8 sm:px-10">
            <div className="w-full">
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                Autenticacao ONDIX
              </span>
              <h1 className="mt-3 font-heading text-[22px] font-semibold tracking-[-0.04em] text-foreground">
                {title}
              </h1>
              <p className="mt-3 max-w-xl text-xs leading-5 text-muted-foreground">
                {description}
              </p>

              <div className="mt-8">{children}</div>
            </div>
          </section>
        </div>
      </Card>
    </main>
  );
}
