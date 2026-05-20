import { Film } from "lucide-react";
import Link from "next/link";

import { LoginButton } from "@/components/LoginButton";
import { ThemeToggle } from "@/components/ThemeToggle";
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
      <div className="mx-auto max-w-5xl flex items-center justify-between px-4 sm:px-6 h-14 gap-2">
        <div className="flex items-center gap-1 sm:gap-4 min-w-0">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-semibold text-sm sm:text-base shrink-0"
          >
            <Film className="size-4 text-primary" />
            <span>MovieRate</span>
            <span className="text-muted-foreground hidden sm:inline">
              Compare
            </span>
          </Link>
          <nav className="hidden sm:flex items-center text-sm">
            <Link
              href="/generos"
              className="px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              Géneros
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-1">
          {/* En mobile el link a Géneros aparece colapsado como icono */}
          <Link
            href="/generos"
            aria-label="Géneros"
            className="sm:hidden inline-flex items-center justify-center size-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-xs font-medium"
          >
            Géneros
          </Link>
          <ThemeToggle />
          {userInfo ? <UserMenu user={userInfo} /> : <LoginButton />}
        </div>
      </div>
    </header>
  );
}
