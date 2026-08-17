export function TipsPanel() {
  return (
    <details className="rounded-xl border border-lab-border bg-lab-card/60 p-4 text-[12px] leading-relaxed text-lab-muted">
      <summary className="cursor-pointer select-none font-mono text-[10px] uppercase tracking-[0.2em] text-lab-dim">
        Tips for better transfers
      </summary>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li>Use two devices in the same quiet room, roughly arm&apos;s length apart.</li>
        <li>Start with <strong className="text-lab-accent">Slow</strong> in noisy spaces; try Normal or Fast when it works reliably.</li>
        <li>Keep the mic enabled on the receiver — file mode sends acoustic ACKs back after each chunk.</li>
        <li>For file transfer, enable mic on the <em>sender</em> too so it can hear ACK tones.</li>
        <li>No encryption: anyone in earshot can receive the signal. Do not send secrets.</li>
        <li>Use <strong className="text-lab-accent">Loopback</strong> to test encode/decode without a second device.</li>
      </ul>
    </details>
  );
}
