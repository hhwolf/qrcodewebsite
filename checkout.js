// boop. checkout — renders the saved design, prices the order, stub payment

(function () {
  "use strict";

  const empty = document.getElementById("co-empty");
  const content = document.getElementById("co-content");
  if (!content) return; // not on the checkout page

  let order = null;
  try {
    order = JSON.parse(localStorage.getItem("boopOrder"));
  } catch (err) {
    order = null;
  }
  if (!order || !order.format) {
    empty.hidden = false;
    return;
  }
  content.hidden = false;

  // $29.99 per tag (tax included); every 4 tags bundle to $99.99.
  // Cents math to avoid float drift. Must match api/create-checkout.js,
  // which prices the real charge.
  const UNIT_C = 2999;
  const BUNDLE_SIZE = 4;
  const BUNDLE_C = 9999;
  const SHIPPING_C = 1000; // flat, matches the Stripe shipping option

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  // ---------- Design preview (same classes as the design studio) ----------
  const QR_SVG_INNER = `<g fill="currentColor">
      <rect x="0" y="0" width="12" height="12" rx="2"/><rect x="3" y="3" width="6" height="6" class="qr-hole" rx="1"/>
      <rect x="28" y="0" width="12" height="12" rx="2"/><rect x="31" y="3" width="6" height="6" class="qr-hole" rx="1"/>
      <rect x="0" y="28" width="12" height="12" rx="2"/><rect x="3" y="31" width="6" height="6" class="qr-hole" rx="1"/>
      <rect x="17" y="0" width="5" height="5"/><rect x="17" y="9" width="5" height="5"/>
      <rect x="17" y="18" width="5" height="5"/><rect x="26" y="18" width="5" height="5"/>
      <rect x="35" y="18" width="5" height="5"/><rect x="17" y="27" width="5" height="5"/>
      <rect x="26" y="27" width="5" height="5"/><rect x="35" y="30" width="5" height="5"/>
      <rect x="17" y="35" width="5" height="5"/><rect x="28" y="35" width="5" height="5" opacity=".6"/>
      <rect x="8" y="17" width="5" height="5"/><rect x="0" y="17" width="5" height="5" opacity=".6"/>
    </g>`;
  const QR_SVG = `<svg class="pv-qr" viewBox="0 0 40 40" aria-hidden="true">${QR_SVG_INNER}</svg>`;
  const QR_SVG_BIG = `<svg class="pv-qr pv-qr-big" viewBox="0 0 40 40" aria-hidden="true">${QR_SVG_INNER}</svg>`;
  const NFC_SVG = `
    <svg class="pv-nfc" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 9c1.5 1.8 1.5 4.2 0 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M10 6.5c2.6 3.2 2.6 7.8 0 11" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".65"/>
      <path d="M14 4c3.8 4.6 3.8 11.4 0 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".35"/>
    </svg>`;

  function posterExtra(usecase) {
    if (usecase === "review") {
      return `<span class="pv-stars">★★★★★</span><span class="pv-extra-line">Leave a review on <strong>Google</strong></span>`;
    }
    if (usecase === "wifi") {
      return `<span class="pv-rule-line">NETWORK</span><span class="pv-rule-line">PASSWORD</span>`;
    }
    if (usecase === "instagram") {
      return `<span class="pv-chips"><span>INSTAGRAM</span><span>FACEBOOK</span><span>TIKTOK</span></span>`;
    }
    return "";
  }

  function frontFace(o) {
    const logo = o.logo ? `<img class="co-logo" src="${o.logo}" alt="" />` : "";
    const vars = `--pv-bg:${o.bg};--pv-fg:${o.fg};--pv-accent:${o.accent};--pv-accent-fg:${o.accentFg}`;
    if (o.format === "five7") {
      const bandRight = o.logo
        ? `<img class="pv-poster-logo" src="${o.logo}" alt="" />`
        : `<span class="pv-poster-dot"></span>`;
      return `
        <div class="preview-tag format-five7 style-${o.style}" style="${vars}">
          <span class="pv-poster-band"><span class="pv-poster-label">${esc(o.posterLabel || "TAP OR SCAN")}</span>${bandRight}</span>
          <span class="pv-callout">${esc(o.callout)}</span>
          <span class="pv-poster-sub">${esc(o.posterSub || "")}</span>
          <span class="pv-poster-extra">${posterExtra(o.usecase)}</span>
          <span class="pv-poster-row">
            <span class="pv-qrbox"><span class="pv-qrbox-head">${esc(o.scanLabel || "SCAN ME")}</span><img class="pv-qrbox-img" src="assets/sample-qr.svg" alt="" /></span>
            <span class="pv-tappanel">${NFC_SVG.replace("pv-nfc", "pv-tappanel-nfc")}<span class="pv-tappanel-tap">TAP</span><span class="pv-tappanel-hint">HOLD PHONE HERE</span></span>
          </span>
          <span class="pv-poster-foot"><span class="pv-poster-boop">boop</span><span class="pv-poster-name">${esc(o.name)}</span></span>
        </div>`;
    }
    return `
      <div class="preview-tag format-${o.format} style-${o.style}" style="${vars}">
        <span class="pv-brand">${logo}<span class="pv-name">${esc(o.name)}</span></span>
        <span class="pv-callout">${esc(o.callout)}</span>
        <span class="pv-bottom">${QR_SVG}${NFC_SVG}</span>
      </div>`;
  }

  function backFace(o) {
    return `
      <div class="preview-tag pv-back format-${o.format} back-${o.back}"
           style="--pv-bg:${o.bg};--pv-fg:${o.fg}">
        <span class="pv-back-name">${esc(o.name)}</span>
        ${QR_SVG_BIG}
        <span class="pv-back-callout">${esc(o.backCallout)}</span>
      </div>`;
  }

  const faces = document.getElementById("co-faces");
  faces.innerHTML = `
    <div class="co-face"><span class="co-face-label">Front</span>${frontFace(order)}</div>
    ${order.singleSided ? "" : `<div class="co-face"><span class="co-face-label">Back</span>${backFace(order)}</div>`}`;

  // ---------- Spec list ----------
  const backLabels = { "qr-text": "Big QR + text", qr: "QR only", blank: "Blank" };
  const specs = [
    ["Format", order.formatLabel],
    ["Use case", order.usecaseLabel],
    ["Front text", order.callout],
    ["Color", order.colorLabel],
    ["Back", order.singleSided ? "Single-sided" : backLabels[order.back] || order.back],
    ["Name", order.name],
    ["Logo", order.logo ? "Uploaded" : "None"],
  ];
  if (order.templateLabel) specs.unshift(["Template", order.templateLabel]);
  document.getElementById("spec-list").innerHTML = specs
    .map(([k, v]) => `<div class="spec-row"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`)
    .join("");

  // ---------- Quantity & pricing ----------
  const qtyInput = document.getElementById("qty");
  const unitEl = document.getElementById("unit-price");
  const subtotalEl = document.getElementById("subtotal");
  const discountLine = document.getElementById("discount-line");
  const discountEl = document.getElementById("discount");
  const totalEl = document.getElementById("total");

  const fmt = (c) => `$${(c / 100).toFixed(2)}`;

  function qty() {
    const n = parseInt(qtyInput.value, 10);
    return Math.min(500, Math.max(1, isNaN(n) ? 1 : n));
  }

  function updateTotals() {
    const n = qty();
    const bundles = Math.floor(n / BUNDLE_SIZE);
    const singles = n % BUNDLE_SIZE;
    const subtotal = UNIT_C * n;
    const itemsTotal = bundles * BUNDLE_C + singles * UNIT_C;
    const discount = subtotal - itemsTotal;
    unitEl.textContent = `× ${fmt(UNIT_C)} each`;
    subtotalEl.textContent = fmt(subtotal);
    discountLine.hidden = discount === 0;
    discountEl.textContent = `−${fmt(discount)}`;
    const total = itemsTotal + SHIPPING_C;
    totalEl.textContent = fmt(total);
    document.getElementById("pay-btn").textContent = `Pay with Stripe · ${fmt(total)}`;
  }

  qtyInput.addEventListener("input", updateTotals);
  qtyInput.addEventListener("change", () => { qtyInput.value = qty(); updateTotals(); });
  document.getElementById("qty-minus").addEventListener("click", () => {
    qtyInput.value = Math.max(1, qty() - 1);
    updateTotals();
  });
  document.getElementById("qty-plus").addEventListener("click", () => {
    qtyInput.value = Math.min(500, qty() + 1);
    updateTotals();
  });
  updateTotals();

  // ---------- Stripe Checkout ----------
  const form = document.getElementById("pay-form");
  const msg = document.getElementById("pay-msg");
  const payBtn = document.getElementById("pay-btn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "";
    payBtn.disabled = true;
    payBtn.textContent = "Opening secure checkout…";
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: order.format,
          usecase: order.usecase,
          qty: qty(),
          design: {
            name: order.name,
            callout: order.callout,
            bg: order.bg,
            accent: order.accent,
            style: order.style,
            back: order.singleSided ? "single-sided" : order.back,
            backCallout: order.backCallout,
            hasLogo: Boolean(order.logo),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Checkout failed");
      window.location.href = data.url; // off to Stripe's hosted payment page
    } catch (err) {
      msg.textContent = "Couldn't start checkout — please try again in a minute.";
      payBtn.disabled = false;
      updateTotals();
    }
  });

  // ---------- Returning from Stripe ----------
  const status = new URLSearchParams(window.location.search).get("status");
  if (status === "success") {
    form.innerHTML = `
      <div class="co-success">
        <div class="co-success-check">✓</div>
        <h3>Order received!</h3>
        <p>Thanks! Your payment went through — Stripe is emailing your receipt now.
        We'll be in touch${order.logo ? " (and we'll ask for your logo file)" : ""} with a
        proof of your ${esc(order.formatLabel.toLowerCase())} before it prints.</p>
        <a class="btn btn-outline" href="/customize">Design another</a>
      </div>`;
  } else if (status === "cancel") {
    msg.textContent = "Payment canceled — no charge was made. Your design is saved, so you can pay whenever you're ready.";
  }
})();
