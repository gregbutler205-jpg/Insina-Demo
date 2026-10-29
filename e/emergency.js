// ── Reads an Insina emergency QR code (v1.122.0, DEC-142) ───────────────────
// The details are in location.hash: "1Z" + base32(deflate(JSON)), or "1U" +
// base32(JSON). They are decoded on this phone and shown with textContent
// only (never as HTML). Nothing is fetched or sent: the page's security
// policy allows no connections. Encoder: src/lib/emergencyQr.js.

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function unbase32(text) {
  const out = []; let bits = 0, value = 0;
  for (const ch of text) {
    const v = B32.indexOf(ch);
    if (v < 0) throw new Error("not base32");
    value = (value << 5) | v; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return new Uint8Array(out);
}

async function inflate(bytes) {
  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw")).getReader();
  const chunks = [];
  for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); }
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let i = 0; for (const c of chunks) { out.set(c, i); i += c.length; }
  return out;
}

export async function readCode(hash) {
  const code = String(hash || "").replace(/^#/, "").toUpperCase();
  const kind = code.slice(0, 2), bytes = unbase32(code.slice(2));
  const raw = kind === "1Z" ? await inflate(bytes) : kind === "1U" ? bytes : null;
  if (!raw) throw new Error("unknown code");
  const data = JSON.parse(new TextDecoder().decode(raw));
  if (!data || data.v !== 1) throw new Error("unknown version");
  return data;
}

const phoneText = (d) => (/^\d{10}$/.test(d) ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : d);
const date = (iso) => {
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  return isNaN(d) ? "" : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};
const age = (iso) => {
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`), n = new Date();
  if (isNaN(d)) return null;
  let a = n.getFullYear() - d.getFullYear();
  if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--;
  return a;
};

function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text != null) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}
function list(title, items, cls) {
  const s = el("section");
  s.appendChild(el("h2", title));
  const ul = el("ul", null, cls);
  items.forEach(t => ul.appendChild(el("li", t)));
  s.appendChild(ul);
  return s;
}

export function render(d, out) {
  out.textContent = "";
  out.appendChild(el("h1", d.n || "Name not given"));
  const facts = [d.b && `Born ${date(d.b)}${age(d.b) != null ? ` (age ${age(d.b)})` : ""}`, d.bt && `Blood type ${d.bt} (patient-reported)`].filter(Boolean);
  if (facts.length) out.appendChild(el("div", facts.join(" · "), "who"));
  const conds = [...(d.c || [])];
  if (conds[0] && /transplant|immunosupp/i.test(conds[0])) out.appendChild(el("div", conds.shift(), "banner"));
  out.appendChild(d.a && d.a.length
    ? list("Allergies", d.a, "allergy")
    : list("Allergies", ["None listed on this code. That does not mean no known allergies."]));
  if (d.m && d.m.length) out.appendChild(list("Medicines", d.m));
  if (conds.length) out.appendChild(list("Conditions", conds));
  if (d.x && d.x.length) out.appendChild(list("Notes", d.x));
  if (d.k && d.k.length) {
    const s = el("section");
    s.appendChild(el("h2", "Emergency contacts"));
    d.k.forEach(([name, rel, phone]) => {
      const p = el("div");
      p.appendChild(el("div", `${name}${rel ? ` (${rel})` : ""}`));
      if (phone) { const a = el("a", `Call ${phoneText(phone)}`, "call"); a.href = `tel:${phone}`; p.appendChild(a); }
      s.appendChild(p);
    });
    out.appendChild(s);
  }
  out.appendChild(el("div",
    `Written from the patient's own Insina Health record${d.u ? ` on ${date(d.u)}` : ""}. Not checked by a clinician; confirm with the patient's care team. These details came from the code you scanned. This page did not send them anywhere.`,
    "foot"));
}

if (typeof document !== "undefined") {
  const out = document.getElementById("out");
  const show = () => readCode(location.hash).then(d => render(d, out)).catch(() => {
    out.textContent = "";
    out.appendChild(el("p", "This code could not be read. Look for a printed Emergency Card or a medical ID tag, and check the phone's lock screen for a Medical ID.", "note"));
  });
  show();
  window.addEventListener("hashchange", show);
}
