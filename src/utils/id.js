// Unique ids. React-free.
//
// crypto.randomUUID() only exists in secure contexts (HTTPS or localhost). When Voca is opened
// over plain HTTP — e.g. testing on a phone via http://192.168.x.x — fall back to an RFC 4122
// version-4 UUID built from crypto.getRandomValues(), which is available everywhere.

export function createId(cryptoImpl = globalThis.crypto) {
  if (typeof cryptoImpl?.randomUUID === "function") return cryptoImpl.randomUUID();
  const bytes = new Uint8Array(16);
  cryptoImpl.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
