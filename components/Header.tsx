import { Film } from "lucide-react";
import Link from "next/link";

import { LoginButton } from "@/components/LoginButton";
import { UserMenu, type UserInfo } from "@/components/UserMenu";
import { createClient } from "@/lib/supabase/server";

// Server Component — chequea sesión y renderiza el control apropiado.
// Se incluye en app/layout.tsx así aparece en todas las páginas.
export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userInfo: UserInfo | null = user
    ? {
        email: user.email ?? null,
        name:
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined) ??
          null,
        avatar_url:
          (user.user_metadata?.avatar_url as string | undefined) ??
          (user.user_metadata?.picture as string | undefined) ??
          null,
      }
    : null;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-5xl flex items-center justify-between px-4 sm:px-6 h-14">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-semibold text-sm sm:text-base"
        >
          <Film className="size-4 text-primary" />
          <span>MovieRate</span>
          <span className="text-muted-foreground hidden sm:inline">
            Compare
          </span>
        </Link>

        <div>{userInfo ? <UserMenu user={userInfo} /> : <LoginButton />}</div>
      </div>
    </header>
  );
}
