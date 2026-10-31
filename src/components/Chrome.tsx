/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="site-header">
      <div className="inner">
        <Link href="/" aria-label="Export Profile, pagina iniziale">
          <img className="logo" src="/loghi/iagain-logo-negativo.svg" alt="IAGAIN" width={62} height={52} />
        </Link>
        {children ?? <span className="tagline">Export Profile · metodo WIFO®</span>}
      </div>
    </header>
  );
}

export function SiteFooter({ text }: { text?: string }) {
  return (
    <footer className="site-footer">
      <div className="inner">
        <span>{text ?? "Export manager certificati EQF6 · Albo TEM del MAECI · Partner SACE"}</span>
        <img src="/loghi/wifo-marchio-viola.svg" alt="WIFO" width={75} height={24} />
      </div>
    </footer>
  );
}
