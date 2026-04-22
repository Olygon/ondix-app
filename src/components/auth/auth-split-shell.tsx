import Image from "next/image";

import { AuthMarketingCarousel } from "@/components/auth/auth-marketing-carousel";

type AuthSplitShellProps = {
  children: React.ReactNode;
};

export function AuthSplitShell({ children }: AuthSplitShellProps) {
  return (
    <main className="min-h-screen bg-background lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)]">
      <AuthMarketingCarousel />

      <section className="flex min-h-screen bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex w-full max-w-md flex-col justify-center px-6 py-10 sm:px-8">
          <div className="flex justify-center">
            <Image
              src="/ondix.svg"
              alt="ONDIX"
              width={344}
              height={184}
              priority
              className="h-auto w-[344px]"
            />
          </div>

          <div className="mt-8">{children}</div>
        </div>
      </section>
    </main>
  );
}
