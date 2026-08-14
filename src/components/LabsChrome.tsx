export function LabsChrome() {
  return (
    <div className="mb-8 w-full max-w-lg">
      <div className="mb-5 flex items-center justify-between gap-3 text-[11px] tracking-wide text-lab-dim">
        <a
          href="https://trustitylabs.com"
          className="inline-flex items-center gap-2.5 transition-colors hover:opacity-90"
        >
          <span className="inline-flex h-4 w-4 items-end justify-center gap-[2px]" aria-hidden>
            <span className="h-[62%] w-[3px] origin-bottom -skew-x-12 bg-white/50" />
            <span className="h-full w-[3.5px] origin-bottom -skew-x-12 bg-lab-accent shadow-accent" />
            <span className="h-[62%] w-[3px] origin-bottom -skew-x-12 bg-white/50" />
          </span>
          <span className="font-sans text-[12px] font-bold tracking-wide">
            <span className="text-[#c967e5]">T</span>
            <span className="text-white">RUSTITY</span>
            <span className="mx-1.5 inline-block h-1.5 w-1.5 rounded-full bg-lab-accent align-middle shadow-accent" />
            <span className="font-mono font-medium tracking-[0.18em] text-lab-accent">
              LABS
            </span>
          </span>
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
          href="https://trustitylabs.com/#sonic-gate"
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
