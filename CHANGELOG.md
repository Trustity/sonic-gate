# Changelog

All notable changes to Sonic-Gate are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).  
Versioning follows [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`).

- **MAJOR** — breaking protocol or wire-format changes (old receivers cannot decode).
- **MINOR** — new features, backward-compatible protocol extensions.
- **PATCH** — bug fixes, UX polish, reliability tweaks without protocol breaks.

Release by updating this file, bumping `package.json`, committing, and tagging:

```bash
git tag -a v0.3.0 -m "Sonic-Gate v0.3.0"
git push origin main --tags
```

## [Unreleased]

## [0.3.3] - 2026-08-17

### Fixed
- **iPhone / acoustic bit slip** — record raw bits on a 16 ms timer (not rAF), then **align to sync and decode once** when transmission ends (fixes "Unknown version 224" + premature signal lost).
- Transmitter sends a **16-bit wake tone** before sync so the receiver clock locks earlier.

## [0.3.2] - 2026-08-17

### Fixed
- **Acoustic decode** — Goertzel FSK detection, wall-clock bit windows, and **finalize on silence** (end of TX triggers decode instead of "signal lost").
- **Shorter v2 frames** — single sync on the wire (116 bits for HELLO vs 132).
- **File picker / send** — safe base64 encoding for 5 KB files; `getReceiver()` fixes null receiver for ACK; chunk length guard.
- **Status bar** — sticky, high-contrast "Now" line always visible at top.

### Changed
- Receiver reports **Finishing decode** while processing bits after transmission ends.

## [0.3.1] - 2026-08-17

### Fixed
- **Decoder v2 double-sync** — receiver and loopback now consume the second sync preamble before the v2 marker (text transfer and loopback were broken since v0.3.0).
- **Signal lost during long frames** — silence timeout scales with baud and decode state; partial frames get a decode timeout instead of a premature drop.
- **Loopback** — shows pass/fail on the status bar when decode does not complete.

### Added
- **Live status bar** — single friendly line for current activity (listening, decoding, transmitting, errors) while logs stay unchanged.

### Changed
- Default speed preset back to **Slow** for first-time reliability.

## [0.3.0] - 2026-08-17

Major reliability and UX release — protocol v2, file transfer ACK/retry, speed presets.

### Added
- **Protocol v2**: double sync preamble, 16-bit marker, version byte, CRC-16/CCITT payload check.
- **Backward-compatible decode** for v1 frames (XOR checksum) on the receiver.
- **Speed presets**: Slow (3 bit/s), Normal (6 bit/s), Fast (10 bit/s).
- **Acoustic ACK** frames after file data chunks; sender waits and retries up to 3 times.
- **File protocol v2**: random 4-hex file ID, meta frame with original filename, chunked base64.
- **Loopback tab** — software encode→decode test without a second device.
- **Mic level meter**, **TX indicator**, and in-app **tips** panel.
- Inter-chunk pause tuning and send/receive progress for files.

### Changed
- Default wire format is v2 (transmit); v1 still decodes on listen.
- File transfer requires mic on sender (to hear ACKs) and receiver (to send ACKs).

### Fixed
- File sessions no longer collide when two transfers share the same chunk count.
- Transmitter returns a promise that resolves when audio finishes.

## [0.1.0] - 2026-08-17

First versioned Labs release. Documents the POC as shipped on
[sonic-gate.trustitylabs.com](https://sonic-gate.trustitylabs.com).

### Added
- FSK acoustic text channel (1500 Hz / 3500 Hz, ~3 bit/s).
- 16-bit sync, 8-bit length, XOR checksum, 12-bit tail framing.
- Web Audio transmitter and microphone receiver with frequency visualizer.
- Majority-vote bit sampling and tolerant sync detection (≤2 bit errors).
- PWA install shell (`vite-plugin-pwa`).
- Local message history with export/clear (browser `localStorage` only).
- Beta file transfer mode (≤5 KB, chunked base64 over the text protocol).
- Trustity Labs chrome and links to [trustitylabs.com](https://trustitylabs.com).

### Notes
- Experimental POC only — not a production or security channel.
- No encryption; anyone in earshot can receive the signal.
