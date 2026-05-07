import { DEFAULT_GUN_PEERS, GUN_NAMESPACE } from "./config.js";

const PROFILE_KEY = "matchriff.github.io.profileId";
const PEERS_KEY = "matchriff.github.io.gunPeers";

const createId = () => {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const encodeList = (items = []) => items.filter(Boolean).join("|");

const decodeList = (items = []) => {
  if (Array.isArray(items)) return items.filter(Boolean);
  if (typeof items === "string") return items.split("|").map((item) => item.trim()).filter(Boolean);
  return [];
};

const removeGunMeta = (record) => {
  if (!record || typeof record !== "object") return record;
  const next = {};
  Object.entries(record).forEach(([key, value]) => {
    if (key !== "_" && value !== undefined && value !== null) {
      next[key] = value;
    }
  });
  next.roles = decodeList(next.roles);
  next.genres = decodeList(next.genres);
  if (next.payloadJson && !next.payload) {
    try {
      next.payload = JSON.parse(next.payloadJson);
    } catch {
      next.payload = null;
    }
  }
  return next;
};

const listFromGunMap = (map) =>
  Object.entries(map || {})
    .filter(([key, value]) => key !== "_" && value && typeof value === "object")
    .map(([, value]) => removeGunMeta(value))
    .filter((value) => value && !value.deletedAt);

export class MatchriffGunStore {
  constructor() {
    this.connection = "local";
    this.listeners = {
      status: new Set(),
      profiles: new Set(),
      swipes: new Set(),
      proofs: new Set()
    };

    this.profileId = localStorage.getItem(PROFILE_KEY);
    if (!this.profileId) {
      this.profileId = createId();
      localStorage.setItem(PROFILE_KEY, this.profileId);
    }

    const savedPeers = JSON.parse(localStorage.getItem(PEERS_KEY) || "null");
    this.peers = Array.isArray(savedPeers) && savedPeers.length ? savedPeers : DEFAULT_GUN_PEERS;
    this.gun = window.Gun({ peers: this.peers, localStorage: true });
    this.root = this.gun.get(GUN_NAMESPACE);

    this.gun.on("hi", (peer) => {
      this.connection = "live";
      this.emit("status", this.getStatus(peer?.url));
    });

    this.gun.on("bye", () => {
      this.connection = "local";
      this.emit("status", this.getStatus());
    });
  }

  getStatus(peerUrl = "") {
    return {
      connection: this.connection,
      profileId: this.profileId,
      peers: [...this.peers],
      peerUrl
    };
  }

  on(kind, callback) {
    this.listeners[kind]?.add(callback);
    return () => this.listeners[kind]?.delete(callback);
  }

  emit(kind, payload) {
    this.listeners[kind]?.forEach((callback) => callback(payload));
  }

  updatePeers(peerText) {
    const peers = peerText
      .split(/[,\n]/)
      .map((peer) => peer.trim())
      .filter(Boolean);
    this.peers = peers;
    localStorage.setItem(PEERS_KEY, JSON.stringify(peers));
    window.location.reload();
  }

  seedDemoProfiles() {
    const demo = [
      {
        id: "demo-aya",
        displayName: "Aya Narang",
        city: "Jakarta",
        roles: encodeList(["vocals", "songwriter"]),
        genres: encodeList(["indie", "r&b"]),
        intent: "write hooks and play weekend showcases",
        portfolio: "https://open.spotify.com/",
        bio: "Warm toplines, fast lyric edits, looking for a producer/guitarist with a live set mindset.",
        walletAddress: ""
      },
      {
        id: "demo-rio",
        displayName: "Rio Pradana",
        city: "Bandung",
        roles: encodeList(["guitar", "producer"]),
        genres: encodeList(["rock", "electronic"]),
        intent: "build a live duo with heavy synth guitars",
        portfolio: "https://youtube.com/",
        bio: "Guitar textures, Ableton sketches, and a bias toward songs that work on small stages.",
        walletAddress: ""
      },
      {
        id: "demo-mira",
        displayName: "Mira Sol",
        city: "Singapore",
        roles: encodeList(["keys", "producer"]),
        genres: encodeList(["jazz", "electronic"]),
        intent: "remote session work and proof-backed credits",
        portfolio: "https://soundcloud.com/",
        bio: "Neo-soul harmony brain. Wants collaborators who can finish.",
        walletAddress: ""
      }
    ];

    demo.forEach((profile) => {
      this.root.get("profiles").get(profile.id).put({
        ...profile,
        updatedAt: Date.now()
      });
    });
  }

  subscribeProfiles(callback) {
    return this.root.get("profiles").map().on(() => {
      this.getProfiles().then(callback);
    });
  }

  getProfiles() {
    return new Promise((resolve) => {
      this.root.get("profiles").once((profiles) => {
        const list = listFromGunMap(profiles)
          .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        resolve(list);
      });
    });
  }

  getMyProfile() {
    return new Promise((resolve) => {
      this.root.get("profiles").get(this.profileId).once((profile) => {
        resolve(removeGunMeta(profile));
      });
    });
  }

  saveProfile(profile) {
    const record = {
      id: this.profileId,
      displayName: profile.displayName?.trim() || "Unnamed Musician",
      city: profile.city?.trim() || "",
      roles: encodeList(profile.roles || []),
      genres: encodeList(profile.genres || []),
      intent: profile.intent?.trim() || "",
      bio: profile.bio?.trim() || "",
      portfolio: profile.portfolio?.trim() || "",
      walletAddress: profile.walletAddress || "",
      updatedAt: Date.now()
    };
    this.root.get("profiles").get(this.profileId).put(record);
    return record;
  }

  recordSwipe(targetId, direction) {
    const swipeId = `${this.profileId}:${targetId}`;
    const record = {
      id: swipeId,
      from: this.profileId,
      targetId,
      direction,
      createdAt: Date.now()
    };
    this.root.get("swipes").get(swipeId).put(record);
    return record;
  }

  getSwipes() {
    return new Promise((resolve) => {
      this.root.get("swipes").once((swipes) => {
        resolve(listFromGunMap(swipes));
      });
    });
  }

  async getMatches() {
    const [profiles, swipes] = await Promise.all([this.getProfiles(), this.getSwipes()]);
    const mine = swipes.filter((swipe) => swipe.from === this.profileId && swipe.direction === "like");
    const inbound = swipes.filter((swipe) => swipe.targetId === this.profileId && swipe.direction === "like");
    const inboundIds = new Set(inbound.map((swipe) => swipe.from));
    return mine
      .filter((swipe) => inboundIds.has(swipe.targetId))
      .map((swipe) => profiles.find((profile) => profile.id === swipe.targetId))
      .filter(Boolean);
  }

  saveProof(proof) {
    const id = proof.id || createId();
    const record = {
      ...proof,
      payloadJson: proof.payload ? JSON.stringify(proof.payload) : "",
      payload: undefined,
      id,
      createdAt: proof.createdAt || Date.now()
    };
    this.root.get("proofs").get(id).put(record);
    return record;
  }

  getProofs() {
    return new Promise((resolve) => {
      this.root.get("proofs").once((proofs) => {
        const list = listFromGunMap(proofs)
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        resolve(list);
      });
    });
  }
}
