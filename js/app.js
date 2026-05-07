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
  toast: "",
  lastSavedAt: 0,
  discoverIndex: 0
};

const connectionLabel = (connection) => {
  if (connection === "live") return "public GUN relay live";
  if (connection === "connecting") return "connecting to public relay";
  return "public relay not confirmed";
};

const connectionDot = (connection) => {
  if (connection === "live") return "live";
  if (connection === "connecting") return "pending";
  return "local";
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

const publicProfiles = () =>
  state.profiles
    .filter((profile) => profile && profile.id && profile.id !== store.profileId)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

const currentSwipeFor = (profileId) =>
  state.swipes.find((swipe) => swipe.from === store.profileId && swipe.targetId === profileId);

const normalizeDiscoverIndex = () => {
  const profiles = publicProfiles();
  if (!profiles.length) {
    state.discoverIndex = 0;
    return;
  }
  if (state.discoverIndex < 0) state.discoverIndex = profiles.length - 1;
  if (state.discoverIndex >= profiles.length) state.discoverIndex = 0;
};

const formatTime = (time) => {
  if (!time) return "";
  return new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

const toast = (message) => {
  state.toast = message;
  render();
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => {
    state.toast = "";
    render();
  }, 3600);
};

const scrollToProfileForm = () => {
  window.requestAnimationFrame(() => {
    document.querySelector("#musician-node")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
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
  normalizeDiscoverIndex();
  render();
};

store.on("status", (status) => {
  state.status = status;
  render();
});

store.onProfiles((profiles) => {
  state.profiles = profiles;
  refresh();
});
store.onSwipes((swipes) => {
  state.swipes = swipes;
  refresh();
});
store.onProofs((proofs) => {
  state.proofs = proofs;
  refresh();
});

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
      <span class="network-pill"><span class="dot ${connectionDot(state.status.connection)}"></span>${connectionLabel(state.status.connection)}</span>
      <button class="button ghost" data-action="connect-wallet" type="button">${state.walletAddress ? `Wallet ${shorten(state.walletAddress)}` : "Connect Solana wallet"}</button>
    </div>
  </header>
`;

const hero = () => `
  <section class="hero">
    <div class="hero-main">
      <div class="eyebrow">Production public-relay environment</div>
      <h1>Find the collaborator. <span class="gradient-text">Prove the jam.</span></h1>
      <p class="lede">
        Matchriff runs as a static GitHub Pages app using public GUN relays for decentralized musician profiles, matching signals, and Solana Proof of Jam receipts.
      </p>
      <div class="hero-actions">
        <button class="button primary" data-view="profile" type="button">Publish musician profile</button>
        <a class="button ghost" href="https://github.com/matchriff/matchriff.github.io" target="_blank" rel="noreferrer">GitHub repo</a>
      </div>
    </div>
    <div class="hero-side">
      <div class="signal-card"><strong>Public GUN relays</strong><span>Profiles, swipes, matches, and proofs sync through reachable public relay peers.</span></div>
      <div class="signal-card"><strong>Wallet identity</strong><span>Solana wallet linking is optional for discovery and required for signed Proof of Jam records.</span></div>
      <div class="signal-card"><strong>Static production app</strong><span>The site is served from GitHub Pages and keeps app state in the GUN graph.</span></div>
    </div>
  </section>
`;

const profileForm = () => {
  const p = state.profile || {};
  const walletHelp = state.walletAddress
    ? `Connected Solana address ${shorten(state.walletAddress)} will be saved into this public GUN profile when you save.`
    : "Connect a Solana wallet before saving if you want your public wallet address attached to this GUN profile.";
  return `
    <section class="panel profile-panel" id="musician-node" tabindex="-1">
      <h2>Your musician node</h2>
      <div class="help-bubble start">
        Start here: fill the fields that help another musician decide whether to collaborate. Your saved profile is published into the public Matchriff GUN graph.
      </div>
      <div class="form-grid">
        <div class="field"><label>Name</label><input id="displayName" value="${escapeHtml(p.displayName || "")}" placeholder="Artist / bandmate name"></div>
        <div class="field"><label>City</label><input id="city" value="${escapeHtml(p.city || "")}" placeholder="Jakarta, Berlin, online..."></div>
        <div class="field"><label>Intent</label><input id="intent" value="${escapeHtml(p.intent || "")}" placeholder="jam, form a band, session work..."></div>
        <div class="help-bubble">
          Tip: intent is the fastest way to find the right match. Say what you want to make, rehearse, record, or perform.
        </div>
        <div class="field"><label>Bio</label><textarea id="bio" placeholder="What should collaborators know?">${escapeHtml(p.bio || "")}</textarea></div>
        <div class="field"><label>Portfolio link</label><input id="portfolio" value="${escapeHtml(p.portfolio || "")}" placeholder="Spotify, YouTube, SoundCloud, website"></div>
        <div class="help-bubble">
          Add a portfolio link if you have one. This is public, so use a link you already want collaborators to see.
        </div>
        <div class="field"><label>Roles</label><div class="chips" data-chip-group="roles">${ROLES.map((role) => `<button class="chip ${selected(p.roles, role)}" data-chip="${role}" type="button">${role}</button>`).join("")}</div></div>
        <div class="field"><label>Genres</label><div class="chips" data-chip-group="genres">${GENRES.map((genre) => `<button class="chip ${selected(p.genres, genre)}" data-chip="${genre}" type="button">${genre}</button>`).join("")}</div></div>
        <div class="help-bubble wallet">
          ${escapeHtml(walletHelp)}
        </div>
        <button class="button primary" data-action="save-profile" type="button">Save to GUN graph</button>
        ${p.updatedAt ? `
          <div class="save-confirmation">
            <strong>Saved to GUN graph ${escapeHtml(formatTime(p.updatedAt))}</strong>
            <span>Published profile: ${escapeHtml(p.displayName || "Unnamed Musician")}${p.city ? ` · ${escapeHtml(p.city)}` : ""}</span>
            <span>${p.walletAddress ? `Solana address saved: ${escapeHtml(shorten(p.walletAddress))}` : "No Solana address saved yet. Connect a wallet, then save again to publish it into your GUN profile."}</span>
          </div>
        ` : ""}
        <div class="help-bubble save">
          Click Save after editing. Matchriff writes your musician node, selected roles/genres, portfolio link, and connected Solana address into the GUN graph.
        </div>
      </div>
      <p class="footer-note">Current node: ${store.profileId}. Profile data is public on the Matchriff GUN graph; keep private contact details out of public profile fields.</p>
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
    <p class="footer-note">The production default uses public GUN relays. Add additional public relay URLs here if one becomes unavailable.</p>
  </section>
`;

const discover = () => {
  const profiles = publicProfiles();
  normalizeDiscoverIndex();
  const profile = profiles[state.discoverIndex];

  return `
    <section class="panel">
      <div class="section-heading">
        <div>
          <h2>Discover musicians</h2>
          <p>Swipe through public musician profiles saved into the Matchriff GUN graph.</p>
        </div>
        ${profiles.length ? `<span class="deck-count">${state.discoverIndex + 1} / ${profiles.length}</span>` : ""}
      </div>
      ${profile ? swipeCard(profile) : `<div class="empty">No public musician profiles are available yet. Publish your profile and invite another musician to join the same relay graph.</div>`}
    </section>
  `;
};

const swipeCard = (profile) => {
  const swipe = currentSwipeFor(profile.id);
  const swipeText = swipe
    ? `You ${swipe.direction === "like" ? "liked" : "passed"} this musician. Press left or right again to update your swipe.`
    : "Swipe left to pass, right to like, or use the buttons below.";

  return `
    <article class="swipe-card" data-profile-id="${profile.id}">
      <div class="swipe-card-top">
        <span class="swipe-label">musician profile</span>
        ${profile.walletAddress ? `<span class="wallet-badge">Solana ${shorten(profile.walletAddress)}</span>` : `<span class="wallet-badge muted">no wallet saved</span>`}
      </div>
      <h3>${escapeHtml(profile.displayName || "Unnamed Musician")}</h3>
      <p class="swipe-subtitle">${escapeHtml(profile.city || "location open")} · ${escapeHtml(profile.intent || "open to collaboration")}</p>
      <div class="meta">${chipList([...(profile.roles || []), ...(profile.genres || [])])}</div>
      <p>${escapeHtml(profile.bio || "No bio yet.")}</p>
      ${profile.portfolio ? `<a class="portfolio-link" href="${escapeHtml(profile.portfolio)}" target="_blank" rel="noreferrer">Open portfolio</a>` : ""}
      <div class="swipe-status ${swipe ? swipe.direction : ""}">${escapeHtml(swipeText)}</div>
      <div class="swipe-actions">
        <button class="swipe-button pass" data-action="swipe-pass" data-id="${profile.id}" type="button" aria-label="Swipe left to pass">&larr; Pass</button>
        <button class="swipe-button secondary" data-action="deck-prev" type="button">Previous</button>
        <button class="swipe-button secondary" data-action="deck-next" type="button">Next</button>
        <button class="swipe-button like" data-action="swipe-like" data-id="${profile.id}" type="button" aria-label="Swipe right to like">Like &rarr;</button>
      </div>
    </article>
  `;
};

const compactProfileCard = (profile) => `
  <article class="card">
    <h3>${escapeHtml(profile.displayName || "Unnamed Musician")}</h3>
    <p>${escapeHtml(profile.city || "location open")} · ${escapeHtml(profile.intent || "ready to collaborate")}</p>
    <div class="meta">${chipList([...(profile.roles || []), ...(profile.genres || [])])}</div>
    ${profile.walletAddress ? `<p class="proof-hash">wallet ${shorten(profile.walletAddress)}</p>` : ""}
    <div class="card-actions">
      ${profile.portfolio ? `<a class="button ghost" href="${escapeHtml(profile.portfolio)}" target="_blank" rel="noreferrer">Portfolio</a>` : ""}
    </div>
  </article>
`;

const matches = () => `
  <section class="panel">
    <h2>Matches</h2>
    ${state.matches.length ? `<div class="cards">${state.matches.map(matchCard).join("")}</div>` : `<div class="empty">No mutual likes yet. A match appears when two published profiles like each other.</div>`}
    ${publicProfiles().length ? `<h3 class="subsection-title">Public musician graph</h3><div class="cards">${publicProfiles().map(compactProfileCard).join("")}</div>` : ""}
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
  state.profiles = [
    profile,
    ...state.profiles.filter((item) => item.id !== profile.id)
  ];
  state.lastSavedAt = profile.updatedAt;
  normalizeDiscoverIndex();
  render();
  toast(state.walletAddress
    ? "Profile and Solana address saved to the GUN graph."
    : "Profile saved to the GUN graph. Connect a Solana wallet to attach your address.");
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
    if (view === "profile") {
      scrollToProfileForm();
    }
    return;
  }

  const action = target.dataset.action;
  const id = target.dataset.id;

  try {
    if (target.dataset.chip) {
      target.classList.toggle("active");
    } else if (action === "connect-wallet") {
      await connectWallet();
    } else if (action === "save-profile") {
      await saveProfile();
    } else if (action === "save-peers") {
      store.updatePeers(document.querySelector("#peerUrls").value);
    } else if (action === "deck-prev" || action === "deck-next") {
      const count = publicProfiles().length;
      if (count) {
        state.discoverIndex += action === "deck-next" ? 1 : -1;
        normalizeDiscoverIndex();
        render();
      }
    } else if (action === "swipe-like" || action === "swipe-pass") {
      store.recordSwipe(id, action === "swipe-like" ? "like" : "pass");
      state.swipes = [
        { id: `${store.profileId}:${id}`, from: store.profileId, targetId: id, direction: action === "swipe-like" ? "like" : "pass", createdAt: Date.now() },
        ...state.swipes.filter((swipe) => swipe.id !== `${store.profileId}:${id}`)
      ];
      state.discoverIndex += 1;
      normalizeDiscoverIndex();
      render();
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

document.addEventListener("keydown", (event) => {
  if (state.view !== "discover") return;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(event.target?.tagName)) return;
  const profile = publicProfiles()[state.discoverIndex];
  if (!profile) return;

  if (event.key === "ArrowLeft") {
    store.recordSwipe(profile.id, "pass");
    state.swipes = [
      { id: `${store.profileId}:${profile.id}`, from: store.profileId, targetId: profile.id, direction: "pass", createdAt: Date.now() },
      ...state.swipes.filter((swipe) => swipe.id !== `${store.profileId}:${profile.id}`)
    ];
    state.discoverIndex += 1;
    normalizeDiscoverIndex();
    render();
    toast("Pass recorded.");
  }

  if (event.key === "ArrowRight") {
    store.recordSwipe(profile.id, "like");
    state.swipes = [
      { id: `${store.profileId}:${profile.id}`, from: store.profileId, targetId: profile.id, direction: "like", createdAt: Date.now() },
      ...state.swipes.filter((swipe) => swipe.id !== `${store.profileId}:${profile.id}`)
    ];
    state.discoverIndex += 1;
    normalizeDiscoverIndex();
    render();
    toast("Like recorded.");
  }
});

refresh();
