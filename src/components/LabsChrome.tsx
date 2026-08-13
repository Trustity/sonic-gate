export function LabsChrome() {
  return (
    <div className="mb-8 w-full max-w-lg">
      <div className="mb-5 flex items-center justify-between gap-3 text-[11px] tracking-wide text-lab-dim">
        <a
          href="https://labs.trustity.co"
          className="inline-flex items-center gap-2 text-lab-muted transition-colors hover:text-lab-accent"
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full bg-lab-accent shadow-accent"
            aria-hidden
          />
          Trustity Labs
        </a>
        <a
          href="https://trustity.co"
          target="_blank"
          rel="noopener noreferrer"
          className="text-lab-dim transition-colors hover:text-lab-muted"
        >
          trustity.co ↗
        </a>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-sans text-4xl font-bold tracking-tight sm:text-5xl">
            <span className="text-lab-accent">Sonic</span>
            <span className="text-white">-Gate</span>
          </h1>
          <p className="mt-2 max-w-sm text-[12px] leading-relaxed text-lab-muted">
            Acoustic data transmission POC — send text through sound waves only.
          </p>
        </div>
      </div>
    </div>
  );
}

export function LabsFooter() {
  return (
    <footer className="mt-10 w-full max-w-lg border-t border-lab-border pt-5 text-[11px] text-lab-dim">
      <p className="leading-relaxed">
        Experimental engineering · not for production.{" "}
        <a
          href="https://labs.trustity.co/#sonic-gate"
          className="text-lab-muted transition-colors hover:text-lab-accent"
        >
          Back to Labs
        </a>
        {" · "}
        <a
          href="https://github.com/Trustity/sonic-gate"
          target="_blank"
          rel="noopener noreferrer"
          className="text-lab-muted transition-colors hover:text-lab-accent"
        >
          GitHub
        </a>
      </p>
    </footer>
  );
}
