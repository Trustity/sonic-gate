# Sonic-Gate

**Acoustic data transmission** — a Trustity Labs proof-of-concept that sends text (and small files) between devices using only sound waves. No Wi‑Fi, no Bluetooth, no cables.

> Part of **[Trustity Labs](https://trustitylabs.com)** · Experimental research from [Trustity](https://trustity.co)

**Try it live:** [sonic-gate.trustitylabs.com](https://sonic-gate.trustitylabs.com)

---

## What it does

Two devices in the same room can exchange short messages through the speaker and microphone:

1. **Transmit** — text becomes an FSK audio signal (different tones for `0` and `1`)
2. **Receive** — the mic listens, detects frequencies, and reconstructs the message

Useful as a demo of **air-gapped / network-bypass** communication ideas — not a production channel.

---

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

| Script | What it does |
|--------|----------------|
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm run preview` | Preview the build |

No environment variables required. Mic access needs a secure context (HTTPS in production; `localhost` is fine).

---

## Releases

Version history lives in **[CHANGELOG.md](./CHANGELOG.md)** (git tags, not on the Labs site).

Current: **v0.1.0** — baseline POC (text + beta file transfer).

---

## How to use

1. Open the app on **two devices** (or two browser tabs)
2. On device A: type a message → **SEND** (speaker plays tones)
3. On device B: tap **ENABLE MIC** and hold it near the speaker
4. When decoding succeeds, the message appears under **DECODED**

**Tips**
- Quieter rooms work better
- Keep phones close (roughly arm’s length)
- Max text length today: **128 ASCII characters**
- Toggle **β file transfer** for the experimental small-file mode (≤ ~5KB)

---

## Protocol (high level)

| Segment | Bits | Role |
|---------|------|------|
| Sync | 16 | `1010101010101010` |
| Length | 8 | Payload length (1–128 bytes) |
| Data | N×8 | ASCII text |
| Checksum | 8 | XOR of all characters |
| Tail | 12 | End marker |

**FSK tones**

| Bit | Frequency |
|-----|-----------|
| `0` | 1500 Hz |
| `1` | 3500 Hz |

Baud rate in code: **3 bit/s** (slow on purpose for robustness in noisy rooms).

---

## Stack

- React 19 + TypeScript + Vite
- Web Audio API (`OscillatorNode`, `AnalyserNode`)
- Tailwind CSS
- Optional PWA install via `vite-plugin-pwa`

Everything runs **in the browser** — no backend.

---

## Trustity Labs

Sonic-Gate is a research surface under [Trustity Labs](https://trustitylabs.com/#sonic-gate).

Trustity builds endpoint and edge security products (VisionX, GenGuard, Vault/PAM, HostGuard, and more) — see [trustity.co](https://trustity.co).

**Disclaimer:** experimental engineering only. Not for production environments. Use at your own risk.

---

## License / status

Private research POC under the Trustity organization. Expect breakage; APIs and protocol details may change.
