# Matchriff GitHub Pages

This repository is the GitHub Pages version of Matchriff:

https://matchriff.github.io/

It is a static, p2p-first production environment for Matchriff. The goal is to run the public web app from GitHub Pages while using public GUN relay peers and Solana modules:

- GUN for peer-to-peer graph state through public relays
- Solana wallet linking
- Proof of Jam receipts as signed messages or devnet memo transactions
- future Solana Pay, credentials, and token experiments after real collaboration signal exists

## Run Locally

```bash
cd /home/decentricity/matchriff.github.io
python3 -m http.server 5174
```

Then open `http://localhost:5174`.

## Architecture

- `index.html`: static GitHub Pages entrypoint
- `styles.css`: app styling
- `js/config.js`: app constants and default GUN/Solana config
- `js/gun-store.js`: GUN graph adapter for profiles, swipes, matches, and proofs
- `js/solana.js`: wallet, signed Proof of Jam payloads, and optional devnet memo writes
- `js/app.js`: UI controller

## Public Relay Configuration

The default public relay list lives in `js/config.js`.

Profile and proof data are public on the Matchriff GUN graph. Do not store private contact details in public profile fields. SEA identities, write authorization, and moderation remain the next production-hardening layer.
