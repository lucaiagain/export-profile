// Genera i template di Supabase in supabase/templates/. Uso: npm run email:templates
import fs from "node:fs";
import path from "node:path";
import { staffTemplates } from "../src/lib/staff-emails";

const dir = path.join(process.cwd(), "supabase", "templates");
fs.mkdirSync(dir, { recursive: true });
// Caratteri non ASCII come entità HTML: il template resta corretto anche se copiato
// o incollato con una codifica diversa (es. "à" → "&#224;").
const ascii = (s: string) => s.replace(/[^\x00-\x7F]/g, (c) => `&#${c.codePointAt(0)};`);

for (const t of staffTemplates) {
  fs.writeFileSync(path.join(dir, t.file), ascii(t.html));
  console.log(`${t.supabase.padEnd(15)} → ${t.file}   oggetto: ${t.subject}`);
}
