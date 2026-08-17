export type LiveStatusTone = 'idle' | 'active' | 'success' | 'warn' | 'error';

export type LiveStatus = {
  label: string;
  detail?: string;
  tone: LiveStatusTone;
};

type Props = LiveStatus;

const toneClass: Record<LiveStatusTone, string> = {
  idle: 'border-lab-border-strong bg-lab-elevated text-white',
  active: 'border-lab-accent/50 bg-lab-accent/15 text-lab-accent shadow-accent',
  success: 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300',
  warn: 'border-amber-400/50 bg-amber-500/15 text-amber-300',
  error: 'border-red-400/50 bg-red-500/15 text-red-300',
};

export function LiveStatusBar({ label, detail, tone }: Props) {
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border-2 px-4 py-3.5 ${toneClass[tone]}`}
      aria-live="polite"
      role="status"
    >
      <span
        className={`mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
          tone === 'active' ? 'animate-pulse bg-lab-accent' : 'bg-current opacity-80'
        }`}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] opacity-70">
          Now
        </p>
        <p className="mt-0.5 font-mono text-[14px] font-semibold tracking-wide">{label}</p>
        {detail ? (
          <p className="mt-1 text-[12px] leading-relaxed opacity-85">{detail}</p>
        ) : null}
      </div>
    </div>
  );
}
