export type LiveStatusTone = 'idle' | 'active' | 'success' | 'warn' | 'error';

export type LiveStatus = {
  label: string;
  detail?: string;
  tone: LiveStatusTone;
};

type Props = LiveStatus;

const toneClass: Record<LiveStatusTone, string> = {
  idle: 'border-lab-border text-lab-muted',
  active: 'border-lab-accent/40 bg-lab-accent/10 text-lab-accent',
  success: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-400',
  warn: 'border-amber-500/35 bg-amber-500/10 text-amber-400',
  error: 'border-red-500/35 bg-red-500/10 text-red-400',
};

export function LiveStatusBar({ label, detail, tone }: Props) {
  return (
    <div
      className={`mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 ${toneClass[tone]}`}
      aria-live="polite"
    >
      <span
        className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${
          tone === 'active' ? 'animate-pulse bg-lab-accent' : 'bg-current opacity-70'
        }`}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="font-mono text-[12px] font-medium tracking-wide">{label}</p>
        {detail ? (
          <p className="mt-0.5 text-[11px] leading-relaxed opacity-80">{detail}</p>
        ) : null}
      </div>
    </div>
  );
}
