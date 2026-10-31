"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getToken } from "@/lib/client-store";

/** Avviso in apertura se sul dispositivo c'è un questionario lasciato a metà. */
export function ResumeNote() {
  const [has, setHas] = useState(false);
  useEffect(() => setHas(!!getToken()), []);
  if (!has) return null;
  return (
    <p style={{ margin: 0, fontSize: 15, color: "var(--muted)" }}>
      Hai già iniziato un questionario su questo dispositivo. <Link href="/questionario">Riprendi da dove eri rimasto</Link>.
    </p>
  );
}
