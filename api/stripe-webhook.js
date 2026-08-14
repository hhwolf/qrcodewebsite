// Stripe webhook: on completed checkout, forward the order — shipping
// address, contact, design specs, totals — to the Formspree inbox so
// every delivery address is stored and emailed. Stripe keeps the
// canonical copy on the payment; this is the fulfillment feed.

import crypto from "node:crypto";

export const config = { api: { bodyParser: false } };

const FORMSPREE = "https://formspree.io/f/xljreono";

function rawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.setEncoding("utf8");
    req.on("data", (c) => { data += c; });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function verifySignature(payload, header, secret) {
  if (!header) return false;
  const parts = {};
  for (const kv of header.split(",")) {
    const [k, v] = kv.split("=");
    if (k === "v1") (parts.v1 = parts.v1 || []).push(v);
    else parts[k] = v;
  }
  if (!parts.t || !parts.v1) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${parts.t}.${payload}`)
    .digest("hex");
  return parts.v1.some((sig) => {
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
    } catch (err) {
      return false;
    }
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const payload = await rawBody(req);
  const ok = verifySignature(payload, req.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET);
  if (!ok) return res.status(400).json({ error: "Bad signature" });

  let event;
  try {
    event = JSON.parse(payload);
  } catch (err) {
    return res.status(400).json({ error: "Bad payload" });
  }

  if (event.type === "checkout.session.completed") {
    const s = event.data.object || {};
    const contact = s.customer_details || {};
    const shipping = s.shipping_details || s.collected_information?.shipping_details || {};
    const addr = shipping.address || contact.address || {};
    const shippingCost = s.shipping_cost?.amount_total ?? null;

    const order = {
      _subject: `boop order ${s.id.slice(-8)} — $${(s.amount_total / 100).toFixed(2)}`,
      source: "stripe-order",
      session_id: s.id,
      paid_total: `$${(s.amount_total / 100).toFixed(2)}`,
      delivery: shippingCost === 0 ? "LOCAL PICKUP (free)" : "SHIP — standard $10",
      customer_name: shipping.name || contact.name || "",
      customer_email: contact.email || "",
      customer_phone: contact.phone || "",
      address: [addr.line1, addr.line2, addr.city, addr.state, addr.postal_code, addr.country]
        .filter(Boolean)
        .join(", "),
      designs: s.metadata?.designs || "",
      business_name: s.metadata?.business_name || "",
      headline: s.metadata?.headline || "",
      colors: `bg ${s.metadata?.bg_color || "?"} / accent ${s.metadata?.accent || "?"}`,
      back: s.metadata?.back || "",
      logo: s.metadata?.has_logo || "",
      total_tags: s.metadata?.total_tags || "",
    };

    try {
      await fetch(FORMSPREE, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(order),
      });
    } catch (err) {
      console.error("Formspree forward failed:", err);
      // Don't fail the webhook — the order is still recorded in Stripe.
    }
  }

  return res.status(200).json({ received: true });
}
