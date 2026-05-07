# Matchriff GitHub Pages

This repository is the GitHub Pages version of Matchriff:

https://matchriff.github.io/

It is a static, p2p-first port of the original Matchriff prototype. The goal is to remove the Supabase dependency from the hackathon workbench and make room for decentralized modules:

- GUN for local-first / peer-to-peer graph state
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

## Privacy Note

This prototype writes profile and proof data into a public GUN graph namespace. Do not store private data here. Before production, add GUN SEA identities, write authorization, moderation, and a Matchriff-owned relay strategy.
