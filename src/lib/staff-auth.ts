// Accesso dello staff IAGAIN: link magico di Supabase Auth, solo indirizzi @iagain.it.
// In sviluppo senza Supabase c'è un accesso locale (cookie "ep_dev_staff").
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { config } from "@/lib/config";

export const DEV_COOKIE = "ep_dev_staff";

export async function supabaseAuth() {
  const store = await cookies();
  return createServerClient(config.supabaseUrl, config.supabaseAnonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // chiamato da un Server Component: il refresh dei cookie avviene nel middleware
        }
      },
    },
  });
}

export const isStaffEmail = (email: string | undefined | null) =>
  !!email && email.toLowerCase().endsWith("@" + config.staffDomain);

/** Email dello staff collegato, o null. */
export async function staffEmail(): Promise<string | null> {
  if (config.useDevStore) {
    const c = (await cookies()).get(DEV_COOKIE)?.value;
    return c && isStaffEmail(c) ? c : null;
  }
  const sb = await supabaseAuth();
  const { data } = await sb.auth.getUser();
  return isStaffEmail(data.user?.email) ? data.user!.email! : null;
}

export async function requireStaff(): Promise<string> {
  const email = await staffEmail();
  if (!email) redirect("/staff/accedi");
  return email;
}
