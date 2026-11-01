// Genera i template di Supabase in supabase/templates/. Uso: npm run email:templates
import fs from "node:fs";
import path from "node:path";
import { staffTemplates } from "../src/lib/staff-emails";

const dir = path.join(process.cwd(), "supabase", "templates");
fs.mkdirSync(dir, { recursive: true });
for (const t of staffTemplates) {
  fs.writeFileSync(path.join(dir, t.file), t.html);
  console.log(`${t.supabase.padEnd(15)} → ${t.file}   oggetto: ${t.subject}`);
}
