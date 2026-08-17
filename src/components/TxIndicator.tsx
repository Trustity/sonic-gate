type Props = { active: boolean };

export function TxIndicator({ active }: Props) {
  if (!active) return null;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center pt-3"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 rounded-full border border-lab-accent/40 bg-lab-accent/15 px-4 py-2 font-mono text-[11px] text-lab-accent shadow-accent backdrop-blur-sm">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-lab-accent" />
        TRANSMITTING
      </div>
    </div>
  );
}
