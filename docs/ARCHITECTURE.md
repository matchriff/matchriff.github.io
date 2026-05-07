# Matchriff Pages Architecture

## Why This Port Exists

Matchriff needs a public web environment that can run from static hosting while using decentralized data and Solana modules.

The GitHub Pages app is designed for:

- public decentralized musician profiles
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

The current app uses a browser-generated local `profileId`. The next step is to bind profiles to GUN SEA identities and Solana wallet addresses.

## GUN Strategy

GUN is used because it supports:

- relay-assisted peer-to-peer operation
- realtime sync
- graph-shaped data
- optional peer relays
- browser-friendly decentralized production apps
- SEA cryptographic identities for future private/authorized data

The app can load without a relay, but cross-device sync needs reachable peers. The production default uses public GUN relays and lets users add additional public relay URLs.

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

- Add GUN SEA user identities.
- Add profile ownership verification.
- Add moderation and abuse controls.
- Operate Matchriff-owned GUN relays.
- Add schema migration/versioning for GUN graph data.
- Make Proof of Jam dual-confirmation explicit.
- Decide whether devnet memos, a small Solana program, or compressed credentials are the right onchain proof layer.
- Add Solana Pay session deposits only after proof UX is solid.
