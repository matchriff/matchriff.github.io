# Matchriff Pages Architecture

## Why This Port Exists

The original Matchriff prototype was a static React app backed by a hosted database. That was useful for getting matching behavior working quickly, but the Solana hackathon direction needs a more decentralized foundation.

The GitHub Pages port is designed as a workbench for:

- decentralized musician profiles
- p2p discovery and matching
- Solana wallet-linked identity
- Proof of Jam receipts
- future direct payments, credentials, and token primitives

## Current Data Model

GUN namespace:

```txt
matchriff/v1
```

Nodes:

- `profiles/{profileId}`: musician profile records
- `swipes/{from}:{targetId}`: like/pass records
- `proofs/{proofId}`: Proof of Jam receipts

The current prototype uses a browser-generated local `profileId`. This is intentionally simple for hackathon iteration. The next step is to bind profiles to GUN SEA identities and Solana wallet addresses.

## GUN Strategy

GUN is used because it supports:

- local-first operation
- realtime sync
- graph-shaped data
- optional peer relays
- browser-friendly decentralized prototypes
- SEA cryptographic identities for future private/authorized data

The app can load without a relay. Cross-device sync needs reachable peers. Production should use Matchriff-owned relays plus optional community relays.

## Solana Strategy

The Solana module currently supports:

- wallet connection through `window.solana`
- message-signing Proof of Jam payloads
- optional devnet Memo Program transactions
- explorer links for transaction-backed proofs

The first Solana primitive is Proof of Jam, not a token. Token design becomes relevant only if there is enough verified collaboration activity to justify incentives.

## GitHub Pages Constraints

GitHub Pages is static hosting. That means:

- no server-side auth
- no server-side database
- no private environment variables
- no backend relay bundled into the repo

That is why GUN relays and Solana RPC endpoints must be external or user-configurable.

## Production TODO

- Replace demo public writes with GUN SEA user identities.
- Add profile ownership verification.
- Add moderation and abuse controls.
- Operate Matchriff-owned GUN relays.
- Add schema migration/versioning for GUN graph data.
- Make Proof of Jam dual-confirmation explicit.
- Decide whether devnet memos, a small Solana program, or compressed credentials are the right onchain proof layer.
- Add Solana Pay session deposits only after proof UX is solid.
