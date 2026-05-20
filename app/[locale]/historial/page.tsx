import { DbHistoryList } from "@/app/[locale]/historial/DbHistoryList";
import { LocalHistoryList } from "@/app/[locale]/historial/LocalHistoryList";
import { getHistoryFromDb } from "@/lib/history";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Mi historial â€” MovieRate Compare",
};

export default async function HistorialPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="px-4 sm:px-6 py-8 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Mi historial</h1>
      {user ? (
        <DbHistoryList items={await getHistoryFromDb(50)} />
      ) : (
        <LocalHistoryList />
      )}
    </main>
  );
}
