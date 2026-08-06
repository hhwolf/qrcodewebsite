// Creates a Stripe Checkout session for a boop order.
// Price is computed server-side from whitelisted format keys — the client
// never sets amounts. Stripe's hosted page collects card, email & shipping.

// $29.99 per tag, tax included; every 4 tags bundle to $99.99.
// Flat $10 shipping is added as a Stripe shipping option.
const UNIT_AMOUNT = 2999; // cents
const BUNDLE_SIZE = 4;
const BUNDLE_AMOUNT = 9999; // cents, per 4-pack
const FORMATS = ["card", "sticker", "tent", "five7"];
const FORMAT_LABELS = {
  card: "Card", sticker: "Sticker", tent: "Table tent", five7: "5×7 counter display",
};
const USECASE_LABELS = {
  menu: "Menu", wifi: "Wi-Fi", pay: "Pay / tips", bizcard: "Business card",
  review: "Google review", instagram: "Social links", custom: "Custom link",
};

const meta = (v) => String(v || "").slice(0, 200);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { format, usecase, qty, design } = req.body || {};
  if (!FORMATS.includes(format)) return res.status(400).json({ error: "Unknown format" });

  const quantity = Math.min(500, Math.max(1, parseInt(qty, 10) || 1));
  const bundles = Math.floor(quantity / BUNDLE_SIZE);
  const singles = quantity % BUNDLE_SIZE;
  const name = `boop ${FORMAT_LABELS[format]} — ${USECASE_LABELS[usecase] || "Custom"}`;

  const origin = `https://${req.headers["x-forwarded-host"] || req.headers.host}`;
  const d = design || {};

  const params = new URLSearchParams({
    mode: "payment",
    success_url: `${origin}/checkout.html?status=success`,
    cancel_url: `${origin}/checkout.html?status=cancel`,
    "shipping_address_collection[allowed_countries][0]": "US",
    "shipping_address_collection[allowed_countries][1]": "CA",
    "shipping_options[0][shipping_rate_data][type]": "fixed_amount",
    "shipping_options[0][shipping_rate_data][display_name]": "Standard shipping",
    "shipping_options[0][shipping_rate_data][fixed_amount][amount]": "1000",
    "shipping_options[0][shipping_rate_data][fixed_amount][currency]": "usd",
    // Design spec lands on the payment in the Stripe dashboard for fulfillment.
    "metadata[format]": meta(format),
    "metadata[usecase]": meta(usecase),
    "metadata[business_name]": meta(d.name),
    "metadata[headline]": meta(d.callout),
    "metadata[bg_color]": meta(d.bg),
    "metadata[accent]": meta(d.accent),
    "metadata[style]": meta(d.style),
    "metadata[back]": meta(d.back),
    "metadata[back_text]": meta(d.backCallout),
    "metadata[has_logo]": d.hasLogo ? "yes — request file from customer" : "no",
    "metadata[total_tags]": String(quantity),
    "payment_intent_data[metadata][business_name]": meta(d.name),
  });

  // Every 4 tags ring up as a $99.99 bundle; the remainder are singles.
  let li = 0;
  if (bundles > 0) {
    params.append(`line_items[${li}][quantity]`, String(bundles));
    params.append(`line_items[${li}][price_data][currency]`, "usd");
    params.append(`line_items[${li}][price_data][unit_amount]`, String(BUNDLE_AMOUNT));
    params.append(`line_items[${li}][price_data][product_data][name]`, `${name} — 4-pack`);
    li++;
  }
  if (singles > 0) {
    params.append(`line_items[${li}][quantity]`, String(singles));
    params.append(`line_items[${li}][price_data][currency]`, "usd");
    params.append(`line_items[${li}][price_data][unit_amount]`, String(UNIT_AMOUNT));
    params.append(`line_items[${li}][price_data][product_data][name]`, name);
  }

  try {
    const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    const session = await r.json();
    if (!r.ok) {
      console.error("Stripe error:", session.error);
      return res.status(502).json({ error: session.error?.message || "Stripe rejected the request" });
    }
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Could not reach Stripe" });
  }
}
