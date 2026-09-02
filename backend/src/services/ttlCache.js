class TtlCache {
  constructor(ttlMs, now = () => Date.now()) {
    this.ttlMs = ttlMs;
    this.now = now;
    this.items = new Map();
  }

  get(key) {
    const item = this.items.get(key);
    if (!item) return undefined;
    if (item.expiresAt <= this.now()) {
      this.items.delete(key);
      return undefined;
    }
    return item.value;
  }

  set(key, value) {
    this.items.set(key, {
      value,
      expiresAt: this.now() + this.ttlMs
    });
  }

  clear() {
    this.items.clear();
  }
}

module.exports = {
  TtlCache
};
