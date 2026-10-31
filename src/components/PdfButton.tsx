"use client";
import { useState } from "react";

export function PdfButton({ token, email }: { token: string; email: string }) {
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function send() {
    setState("busy");
    try {
      const res = await fetch("/api/profilo/pdf", { method: "POST", headers: { authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Invio non riuscito");
      setState("sent");
      setMsg(`PDF inviato a ${email}`);
    } catch (e) {
      setState("error");
      setMsg((e as Error).message);
    }
  }

  return (
    <>
      <button type="button" className="btn btn-gold" onClick={send} disabled={state === "busy"}>
        {state === "busy" ? "Invio in corso…" : state === "sent" ? "Inviato ✓" : "Ricevi il PDF via email"}
      </button>
      <span role="status" aria-live="polite" style={{ flexBasis: "100%", textAlign: "right", fontSize: 14, color: state === "error" ? "#F2B8B8" : "#C8CBD3" }}>
        {msg}
      </span>
    </>
  );
}
