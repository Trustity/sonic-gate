# Changelog

All notable changes to Sonic-Gate are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).  
Versioning follows [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`).

- **MAJOR** — breaking protocol or wire-format changes (old receivers cannot decode).
- **MINOR** — new features, backward-compatible protocol extensions.
- **PATCH** — bug fixes, UX polish, reliability tweaks without protocol breaks.

Release by updating this file, bumping `package.json`, committing, and tagging:

```bash
git tag -a v0.1.0 -m "Sonic-Gate v0.1.0"
git push origin main --tags
```

## [Unreleased]

### Planned
- Triage reliability improvements (sync, chunk timing, file-transfer IDs).
- Optional speed presets and clearer in-app guidance for noisy rooms.

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

### Changed
- Live demo URL moved to `sonic-gate.trustitylabs.com`.
- Labs-aligned branding and README.

### Notes
- Experimental POC only — not a production or security channel.
- No encryption; anyone in earshot can receive the signal.
