"use client";

import { Bookmark, History, LogOut, Sparkles, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

export type UserInfo = {
  email: string | null;
  name: string | null;
  avatar_url: string | null;
};

function initials(input: string | null | undefined): string {
  if (!input) return "?";
  const parts = input.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserMenu({ user }: { user: UserInfo }) {
  const router = useRouter();
  const t = useTranslations("auth");
  const tWatchlist = useTranslations("watchlist");
  const tReviews = useTranslations("myReviews");
  const tRec = useTranslations("recommender");

  async function handleLogout() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(t("signOutError", { error: error.message }));
      return;
    }
    toast.success(t("sessionClosed"));
    // Forzar refresh del Server Component del header para que vea null user
    router.refresh();
  }

  const displayName = user.name ?? user.email ?? "User";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label={t("userMenu")}
        >
          <Avatar className="size-8">
            {user.avatar_url && (
              <AvatarImage src={user.avatar_url} alt={displayName} />
            )}
            <AvatarFallback>{initials(displayName)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col">
            <span className="text-sm font-medium truncate">{displayName}</span>
            {user.email && user.email !== displayName && (
              <span className="text-xs text-muted-foreground truncate">
                {user.email}
              </span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/watchlist">
            <Bookmark />
            {tWatchlist("heading")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/historial">
            <History />
            {t("myHistory")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/mis-reviews">
            <Star />
            {tReviews("heading")}
          </Link>
        </DropdownMenuItem>
        {/* Recomendador IA — temporalmente oculto del menú mientras
            no tengamos billing en Google Gemini (cupo free agotado en
            20 reqs/día). El código y la página siguen existiendo para
            poder reactivar fácil cuando habilitemos pago. */}
        {/* <DropdownMenuItem asChild>
          <Link href="/recomendador">
            <Sparkles />
            {tRec("heading")}
          </Link>
        </DropdownMenuItem> */}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleLogout}>
          <LogOut />
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
