// Creates a Stripe Checkout session for a boop order.
// Price is computed server-side from whitelisted format keys — the client
// never sets amounts. Stripe's hosted page collects card, email & shipping.

// $30 per tag, tax included. Every 5th tag is free ("5 for the price of 4").
// Shipping is collected/calculated on Stripe's payment page.
const UNIT_AMOUNT = 3000; // cents
const FREE_PER = 5;
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
  const freeUnits = Math.floor(quantity / FREE_PER);
  const paidUnits = quantity - freeUnits;
  const name = `boop ${FORMAT_LABELS[format]} — ${USECASE_LABELS[usecase] || "Custom"}`;

  const origin = `https://${req.headers["x-forwarded-host"] || req.headers.host}`;
  const d = design || {};

  const params = new URLSearchParams({
    mode: "payment",
    success_url: `${origin}/checkout.html?status=success`,
    cancel_url: `${origin}/checkout.html?status=cancel`,
    "line_items[0][quantity]": String(paidUnits),
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(UNIT_AMOUNT),
    "line_items[0][price_data][product_data][name]": name,
    "shipping_address_collection[allowed_countries][0]": "US",
    "shipping_address_collection[allowed_countries][1]": "CA",
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

  // Every 5th tag rides along free, as its own $0 line so the receipt shows it.
  if (freeUnits > 0) {
    params.append("line_items[1][quantity]", String(freeUnits));
    params.append("line_items[1][price_data][currency]", "usd");
    params.append("line_items[1][price_data][unit_amount]", "0");
    params.append("line_items[1][price_data][product_data][name]", `${name} (5-for-4 bonus tag)`);
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
