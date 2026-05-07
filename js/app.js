import { APP_VERSION, GENRES, MATCHRIFF_ASSETS, ROLES } from "./config.js";
import { MatchriffGunStore } from "./gun-store.js";
import { MatchriffSolana } from "./solana.js";

const app = document.querySelector("#app");
const store = new MatchriffGunStore();
const solana = new MatchriffSolana();

const state = {
  view: "discover",
  profile: null,
  profiles: [],
  swipes: [],
  matches: [],
  proofs: [],
  status: store.getStatus(),
  walletAddress: solana.walletAddress,
  toast: ""
};

const shorten = (value) => {
  if (!value) return "";
  return value.length > 16 ? `${value.slice(0, 4)}...${value.slice(-4)}` : value;
};

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const chipList = (items = []) => items.map((item) => `<span>${escapeHtml(item)}</span>`).join("");

const selected = (items = [], value) => items.includes(value) ? "active" : "";

const toast = (message) => {
  state.toast = message;
  render();
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => {
    state.toast = "";
    render();
  }, 3600);
};

const refresh = async () => {
  const [profile, profiles, swipes, matches, proofs] = await Promise.all([
    store.getMyProfile(),
    store.getProfiles(),
    store.getSwipes(),
    store.getMatches(),
    store.getProofs()
  ]);
  state.profile = profile;
  state.profiles = profiles;
  state.swipes = swipes;
  state.matches = matches;
  state.proofs = proofs;
  render();
};

store.on("status", (status) => {
  state.status = status;
  render();
});

store.subscribeProfiles(() => refresh());

const nav = () => `
  <div class="tabs" role="tablist" aria-label="Matchriff sections">
    ${[
      ["discover", "Discover"],
      ["profile", "Profile"],
      ["matches", "Matches"],
      ["proofs", "Proofs"]
    ].map(([id, label]) => `<button class="tab ${state.view === id ? "active" : ""}" data-view="${id}" type="button">${label}</button>`).join("")}
  </div>
`;

const topbar = () => `
  <header class="topbar">
    <div class="brand">
      <img src="${MATCHRIFF_ASSETS.banner}" alt="Matchriff">
      <span class="status-pill">v${APP_VERSION}</span>
    </div>
    <div class="topbar-actions">
      <span class="network-pill"><span class="dot ${state.status.connection === "live" ? "live" : "local"}"></span>${state.status.connection === "live" ? "GUN peer live" : "local-first GUN"}</span>
      <button class="button ghost" data-action="connect-wallet" type="button">${state.walletAddress ? `Wallet ${shorten(state.walletAddress)}` : "Connect Solana wallet"}</button>
    </div>
  </header>
`;

const hero = () => `
  <section class="hero">
    <div class="hero-main">
      <div class="eyebrow">GitHub Pages p2p prototype</div>
      <h1>Find the collaborator. <span class="gradient-text">Prove the jam.</span></h1>
      <p class="lede">
        Matchriff is being ported into a static, GitHub Pages friendly app with GUN for decentralized state and Solana for Proof of Jam receipts.
      </p>
      <div class="hero-actions">
        <button class="button primary" data-view="profile" type="button">Create musician profile</button>
        <button class="button mint" data-action="seed" type="button">Seed demo scene</button>
        <a class="button ghost" href="https://github.com/matchriff/matchriff.github.io" target="_blank" rel="noreferrer">GitHub repo</a>
      </div>
    </div>
    <div class="hero-side">
      <div class="signal-card"><strong>GUN graph</strong><span>Profiles, swipes, matches, and proofs sync through a p2p graph with local-first fallback.</span></div>
      <div class="signal-card"><strong>Wallet identity</strong><span>Solana wallet linking is optional for discovery and required for signed Proof of Jam records.</span></div>
      <div class="signal-card"><strong>No central app backend</strong><span>This version is the decentralized workbench for future Solana modules.</span></div>
    </div>
  </section>
`;

const profileForm = () => {
  const p = state.profile || {};
  return `
    <section class="panel">
      <h2>Your musician node</h2>
      <div class="form-grid">
        <div class="field"><label>Name</label><input id="displayName" value="${escapeHtml(p.displayName || "")}" placeholder="Artist / bandmate name"></div>
        <div class="field"><label>City</label><input id="city" value="${escapeHtml(p.city || "")}" placeholder="Jakarta, Berlin, online..."></div>
        <div class="field"><label>Intent</label><input id="intent" value="${escapeHtml(p.intent || "")}" placeholder="jam, form a band, session work..."></div>
        <div class="field"><label>Bio</label><textarea id="bio" placeholder="What should collaborators know?">${escapeHtml(p.bio || "")}</textarea></div>
        <div class="field"><label>Portfolio link</label><input id="portfolio" value="${escapeHtml(p.portfolio || "")}" placeholder="Spotify, YouTube, SoundCloud, website"></div>
        <div class="field"><label>Roles</label><div class="chips" data-chip-group="roles">${ROLES.map((role) => `<button class="chip ${selected(p.roles, role)}" data-chip="${role}" type="button">${role}</button>`).join("")}</div></div>
        <div class="field"><label>Genres</label><div class="chips" data-chip-group="genres">${GENRES.map((genre) => `<button class="chip ${selected(p.genres, genre)}" data-chip="${genre}" type="button">${genre}</button>`).join("")}</div></div>
        <button class="button primary" data-action="save-profile" type="button">Save to GUN graph</button>
      </div>
      <p class="footer-note">Current node: ${store.profileId}. Profile data is public in this prototype. Use SEA access controls before storing private data.</p>
    </section>
  `;
};

const peerSettings = () => `
  <section class="panel">
    <h3>GUN relay peers</h3>
    <div class="field">
      <label>Peer URLs</label>
      <textarea id="peerUrls">${escapeHtml(state.status.peers.join("\n"))}</textarea>
    </div>
    <button class="button ghost" data-action="save-peers" type="button">Save peers and reload</button>
    <p class="footer-note">GUN can work local-first, but cross-device sync needs reachable relay peers. For production, run Matchriff-owned relays.</p>
  </section>
`;

const discover = () => {
  const swipedIds = new Set(state.swipes.filter((swipe) => swipe.from === store.profileId).map((swipe) => swipe.targetId));
  const cards = state.profiles
    .filter((profile) => profile.id !== store.profileId)
    .filter((profile) => !swipedIds.has(profile.id));

  return `
    <section class="panel">
      <h2>Discover musicians</h2>
      ${cards.length ? `<div class="cards">${cards.map(profileCard).join("")}</div>` : `<div class="empty">No unswiped musicians yet. Seed the demo scene or share this page with another musician.</div>`}
    </section>
  `;
};

const profileCard = (profile) => `
  <article class="card">
    <h3>${escapeHtml(profile.displayName || "Unnamed Musician")}</h3>
    <p>${escapeHtml(profile.city || "location open")} · ${escapeHtml(profile.intent || "open to collaboration")}</p>
    <div class="meta">${chipList([...(profile.roles || []), ...(profile.genres || [])])}</div>
    <p>${escapeHtml(profile.bio || "No bio yet.")}</p>
    ${profile.walletAddress ? `<p class="proof-hash">wallet ${shorten(profile.walletAddress)}</p>` : ""}
    <div class="card-actions">
      <button class="button mint" data-action="swipe-like" data-id="${profile.id}" type="button">Like</button>
      <button class="button ghost" data-action="swipe-pass" data-id="${profile.id}" type="button">Pass</button>
      ${profile.portfolio ? `<a class="button ghost" href="${escapeHtml(profile.portfolio)}" target="_blank" rel="noreferrer">Portfolio</a>` : ""}
    </div>
  </article>
`;

const matches = () => `
  <section class="panel">
    <h2>Matches</h2>
    ${state.matches.length ? `<div class="cards">${state.matches.map(matchCard).join("")}</div>` : `<div class="empty">No mutual likes yet. For demo mode, open this page in two browsers and like each other.</div>`}
  </section>
`;

const matchCard = (profile) => `
  <article class="card">
    <h3>${escapeHtml(profile.displayName || "Unnamed Musician")}</h3>
    <p>${escapeHtml(profile.intent || "ready to collaborate")}</p>
    <div class="meta">${chipList([...(profile.roles || []), ...(profile.genres || [])])}</div>
    <div class="card-actions">
      <button class="button primary" data-action="proof-sign" data-id="${profile.id}" type="button">Sign Proof of Jam</button>
      <button class="button ghost" data-action="proof-memo" data-id="${profile.id}" type="button">Write devnet memo</button>
    </div>
  </article>
`;

const proofs = () => `
  <section class="panel">
    <h2>Proof of Jam receipts</h2>
    <div class="proof-list">
      ${state.proofs.length ? state.proofs.map(proofCard).join("") : `<div class="empty">No proofs yet. Match with a musician, then sign a Proof of Jam.</div>`}
    </div>
  </section>
`;

const proofCard = (proof) => `
  <article class="proof-card">
    <h3>${escapeHtml(proof.title || "Proof of Jam")}</h3>
    <p>${new Date(proof.createdAt).toLocaleString()} · ${escapeHtml(proof.cluster || "offchain signature")}</p>
    <p class="proof-hash">${escapeHtml(proof.payloadHash || proof.signature || proof.txSignature || "")}</p>
    ${proof.txUrl ? `<a class="button ghost" href="${escapeHtml(proof.txUrl)}" target="_blank" rel="noreferrer">Open in explorer</a>` : ""}
  </article>
`;

const activeView = () => {
  if (state.view === "profile") {
    return `<div class="layout">${profileForm()}${peerSettings()}</div>`;
  }
  if (state.view === "matches") return matches();
  if (state.view === "proofs") return proofs();
  return discover();
};

const render = () => {
  app.innerHTML = `
    <main class="shell">
      <div class="app-frame">
        ${topbar()}
        ${hero()}
        ${nav()}
        ${activeView()}
      </div>
    </main>
    <div class="toast ${state.toast ? "" : "hidden"}">${escapeHtml(state.toast)}</div>
  `;
};

const collectChipValues = (groupName) =>
  [...document.querySelectorAll(`[data-chip-group="${groupName}"] .chip.active`)].map((button) => button.dataset.chip);

const saveProfile = async () => {
  const profile = store.saveProfile({
    displayName: document.querySelector("#displayName").value,
    city: document.querySelector("#city").value,
    intent: document.querySelector("#intent").value,
    bio: document.querySelector("#bio").value,
    portfolio: document.querySelector("#portfolio").value,
    roles: collectChipValues("roles"),
    genres: collectChipValues("genres"),
    walletAddress: state.walletAddress
  });
  state.profile = profile;
  await refresh();
  toast("Profile saved to the GUN graph.");
};

const proofPayload = (targetId) => {
  const collaborator = state.profiles.find((profile) => profile.id === targetId);
  return {
    app: "Matchriff",
    type: "ProofOfJam",
    version: APP_VERSION,
    signerProfileId: store.profileId,
    signerWallet: state.walletAddress,
    collaboratorProfileId: collaborator?.id || targetId,
    collaboratorName: collaborator?.displayName || "Unknown collaborator",
    roles: collaborator?.roles || [],
    genres: collaborator?.genres || [],
    createdAt: new Date().toISOString()
  };
};

const signProof = async (targetId) => {
  if (!state.walletAddress) {
    await connectWallet();
  }
  const payload = proofPayload(targetId);
  const signed = await solana.signProofPayload(payload);
  store.saveProof({
    title: `Proof of Jam with ${payload.collaboratorName}`,
    ...signed,
    payload
  });
  await refresh();
  state.view = "proofs";
  render();
  toast("Proof of Jam signed with your Solana wallet.");
};

const memoProof = async (targetId) => {
  if (!state.walletAddress) {
    await connectWallet();
  }
  const payload = proofPayload(targetId);
  const signature = await solana.createMemoTransaction(payload);
  store.saveProof({
    title: `Onchain Proof of Jam with ${payload.collaboratorName}`,
    cluster: "devnet",
    txSignature: signature,
    txUrl: solana.explorerTxUrl(signature),
    payload
  });
  await refresh();
  state.view = "proofs";
  render();
  toast("Proof of Jam memo confirmed on Solana devnet.");
};

const connectWallet = async () => {
  const address = await solana.connectWallet();
  state.walletAddress = address;
  if (state.profile) {
    store.saveProfile({ ...state.profile, walletAddress: address });
    await refresh();
  }
  toast("Solana wallet connected.");
};

app.addEventListener("click", async (event) => {
  const target = event.target.closest("button, a");
  if (!target) return;

  const view = target.dataset.view;
  if (view) {
    event.preventDefault();
    state.view = view;
    render();
    return;
  }

  const action = target.dataset.action;
  const id = target.dataset.id;

  try {
    if (target.dataset.chip) {
      target.classList.toggle("active");
    } else if (action === "seed") {
      store.seedDemoProfiles();
      await refresh();
      toast("Demo scene seeded into GUN.");
    } else if (action === "connect-wallet") {
      await connectWallet();
    } else if (action === "save-profile") {
      await saveProfile();
    } else if (action === "save-peers") {
      store.updatePeers(document.querySelector("#peerUrls").value);
    } else if (action === "swipe-like" || action === "swipe-pass") {
      store.recordSwipe(id, action === "swipe-like" ? "like" : "pass");
      await refresh();
      toast(action === "swipe-like" ? "Like recorded." : "Pass recorded.");
    } else if (action === "proof-sign") {
      await signProof(id);
    } else if (action === "proof-memo") {
      await memoProof(id);
    }
  } catch (error) {
    console.error(error);
    toast(error.message || "Something went wrong.");
  }
});

refresh();
