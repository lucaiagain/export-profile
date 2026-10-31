import type { ProfileRow } from "@/lib/db";
import { buildView } from "@/lib/view";

/** Vista del profilo da una riga del database. */
export function viewForRow(p: ProfileRow) {
  return buildView(p.result!, {
    company_name: p.company_name,
    contact_name: p.contact_name,
    role: p.role,
    region: p.region,
    category: p.category,
    markets: p.markets,
    wem_notes: p.wem_notes,
    wem_name: p.wem_name,
    date: new Date(p.completed_at ?? p.created_at),
  });
}
