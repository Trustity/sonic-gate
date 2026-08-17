type Props = { level: number };

export function MicLevelMeter({ level }: Props) {
  const pct = Math.round(level * 100);
  return (
    <div className="mt-3">
      <div className="mb-1 flex justify-between font-mono text-[10px] text-lab-dim">
        <span>MIC LEVEL</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-lab-elevated">
        <div
          className="h-full bg-sky-400/80 transition-all duration-75"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
