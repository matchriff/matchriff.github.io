import { DEFAULT_GUN_PEERS, GUN_NAMESPACE, RELAY_CONNECT_TIMEOUT_MS } from "./config.js";

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

export class MatchriffGunStore {
  constructor() {
    this.connection = "connecting";
    this.activePeers = new Map();
    this.listeners = {
      status: new Set(),
      profiles: new Set(),
      swipes: new Set(),
      proofs: new Set()
    };
    this.caches = {
      profiles: new Map(),
      swipes: new Map(),
      proofs: new Map()
    };
    this.profileSubscriptions = new Set();

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
      if (peer?.url) this.activePeers.set(peer.url, Date.now());
      this.emit("status", this.getStatus(peer?.url));
    });

    this.gun.on("bye", (peer) => {
      if (peer?.url) this.activePeers.delete(peer.url);
      this.connection = this.activePeers.size ? "live" : "relay-unconfirmed";
      this.emit("status", this.getStatus(peer?.url));
    });

    window.setTimeout(() => {
      if (this.connection === "connecting") {
        this.connection = this.activePeers.size ? "live" : "relay-unconfirmed";
        this.emit("status", this.getStatus());
      }
    }, RELAY_CONNECT_TIMEOUT_MS);

    this.bindCollection("profiles");
    this.bindProfileIndex();
    this.bindCollection("swipes");
    this.bindCollection("proofs");
  }

  getStatus(peerUrl = "") {
    return {
      connection: this.connection,
      profileId: this.profileId,
      peers: [...this.peers],
      activePeers: [...this.activePeers.keys()],
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

  bindCollection(kind) {
    this.root.get(kind).map().on((record, key) => {
      if (!key || key === "_" || !record || typeof record !== "object") return;
      const clean = removeGunMeta({ id: key, ...record });
      if (clean.deletedAt) {
        this.caches[kind].delete(key);
      } else {
        this.caches[kind].set(key, clean);
      }
      this.emit(kind, this.getCachedCollection(kind));
    });
  }

  bindProfileIndex() {
    this.root.get("profileIndex").map().on((entry, key) => {
      const id = entry?.id || key;
      if (!id || id === "_" || entry?.deletedAt || this.profileSubscriptions.has(id)) return;

      this.profileSubscriptions.add(id);
      this.root.get("profiles").get(id).on((record) => {
        if (!record || typeof record !== "object") return;
        const clean = removeGunMeta({ id, ...record });
        if (clean.deletedAt) {
          this.caches.profiles.delete(id);
        } else {
          this.caches.profiles.set(id, clean);
        }
        this.emit("profiles", this.getCachedCollection("profiles"));
      });
    });
  }

  getCachedCollection(kind) {
    return [...this.caches[kind].values()]
      .filter((value) => value && !value.deletedAt)
      .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
  }

  onProfiles(callback) {
    this.on("profiles", callback);
    callback(this.getCachedCollection("profiles"));
  }

  onSwipes(callback) {
    this.on("swipes", callback);
    callback(this.getCachedCollection("swipes"));
  }

  onProofs(callback) {
    this.on("proofs", callback);
    callback(this.getCachedCollection("proofs"));
  }

  getProfiles() {
    return Promise.resolve(this.getCachedCollection("profiles"));
  }

  getMyProfile() {
    const cached = this.caches.profiles.get(this.profileId);
    if (cached) return Promise.resolve(cached);

    return new Promise((resolve) => {
      const timeout = window.setTimeout(() => resolve(null), 1200);
      this.root.get("profiles").get(this.profileId).once((profile) => {
        window.clearTimeout(timeout);
        resolve(removeGunMeta(profile));
      });
    });
  }

  putRecord(kind, id, record) {
    const clean = removeGunMeta({ id, ...record });
    const collection = this.root.get(kind);
    const node = collection.get(id);

    this.caches[kind].set(id, clean);
    this.emit(kind, this.getCachedCollection(kind));
    node.put(record, (ack = {}) => {
      if (ack.err) {
        console.warn(`GUN ${kind} write failed`, ack.err);
      }
    });
    collection.put({ [id]: node });

    if (kind === "profiles") {
      const index = this.root.get("profileIndex");
      const indexNode = index.get(id);
      indexNode.put({
        id,
        displayName: record.displayName || "",
        city: record.city || "",
        updatedAt: record.updatedAt || Date.now()
      });
      index.put({ [id]: indexNode });
    }
    return clean;
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
    return this.putRecord("profiles", this.profileId, record);
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
    return this.putRecord("swipes", swipeId, record);
  }

  getSwipes() {
    return Promise.resolve(this.getCachedCollection("swipes"));
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
    return this.putRecord("proofs", id, record);
  }

  getProofs() {
    return Promise.resolve(this.getCachedCollection("proofs"));
  }
}
