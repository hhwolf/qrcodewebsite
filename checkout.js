// boop. checkout — renders the pack of designs, prices the order, Stripe payment

(function () {
  "use strict";

  const empty = document.getElementById("co-empty");
  const content = document.getElementById("co-content");
  if (!content) return; // not on the checkout page

  // ---------- Load the pack ----------
  function loadCart() {
    try {
      const cart = JSON.parse(localStorage.getItem("boopCart"));
      if (Array.isArray(cart) && cart.length) return cart;
    } catch (err) { /* fall through */ }
    try {
      // Older sessions stored a single design under boopOrder.
      const single = JSON.parse(localStorage.getItem("boopOrder"));
      if (single && single.format) return [{ ...single, qty: 1 }];
    } catch (err) { /* fall through */ }
    return [];
  }

  function saveCart() {
    try {
      localStorage.setItem("boopCart", JSON.stringify(cart));
    } catch (err) {
      localStorage.setItem("boopCart", JSON.stringify(cart.map((i) => ({ ...i, logo: null }))));
    }
  }

  const cart = loadCart();
  if (!cart.length) {
    empty.hidden = false;
    return;
  }
  content.hidden = false;

  // Landing 4-Pack CTA: if they came for a 4-pack and only made one design,
  // default its quantity to 4.
  const packHint = parseInt(sessionStorage.getItem("boopPackHint"), 10);
  sessionStorage.removeItem("boopPackHint");
  if (packHint > 1 && cart.length === 1 && (cart[0].qty || 1) === 1) {
    cart[0].qty = packHint;
    saveCart();
  }
  cart.forEach((i) => {
    i.qty = Math.min(500, Math.max(1, parseInt(i.qty, 10) || 1));
    if (i.format === "five7") i.singleSided = true; // displays are front-only
  });

  // $29.99 per tag (tax included); every 4 tags bundle to $99.99.
  // Cents math to avoid float drift. Must match api/create-checkout.js,
  // which prices the real charge. Shipping ($10 or free pickup) is chosen
  // on Stripe's page, so totals here are pre-shipping.
  const UNIT_C = 2999;
  const BUNDLE_SIZE = 4;
  const BUNDLE_C = 9999;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  // ---------- Design previews (same classes as the design studio) ----------
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
    if (usecase === "pay") {
      return `<span class="pv-chips"><span>APPLE PAY</span><span>GOOGLE PAY</span><span>CARD</span></span>`;
    }
    if (usecase === "menu") {
      return `<span class="pv-rule-line pv-dotted">STARTERS</span><span class="pv-rule-line pv-dotted">MAINS</span><span class="pv-rule-line pv-dotted">DRINKS</span>`;
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

  function itemTitle(o, idx) {
    const bits = [o.formatLabel, o.usecaseLabel];
    return `${idx + 1}. ${bits.join(" · ")}`;
  }

  function itemDetail(o) {
    const bits = [o.colorLabel];
    if (o.format === "five7") bits.push("wooden frame included");
    else bits.push(o.singleSided ? "single-sided" : "two-sided");
    if (o.name) bits.push(o.name);
    return bits.join(" · ");
  }

  const faces = document.getElementById("co-faces");
  const packList = document.getElementById("pack-list");

  function renderPack() {
    faces.innerHTML = cart
      .map(
        (o, i) => `
        <div class="co-design">
          <p class="co-design-title">${esc(itemTitle(o, i))}</p>
          <div class="co-face"><span class="co-face-label">Front</span>${frontFace(o)}</div>
          ${o.singleSided ? "" : `<div class="co-face"><span class="co-face-label">Back</span>${backFace(o)}</div>`}
        </div>`
      )
      .join("");

    packList.innerHTML = cart
      .map(
        (o, i) => `
        <div class="pack-row" data-i="${i}">
          <div class="pack-row-info">
            <strong>${esc(itemTitle(o, i))}</strong>
            <span>${esc(itemDetail(o))}</span>
          </div>
          <div class="qty-row qty-row-compact">
            <button type="button" class="qty-btn" data-act="minus" aria-label="Decrease quantity">−</button>
            <input type="number" value="${o.qty}" min="1" max="500" inputmode="numeric" aria-label="Quantity for design ${i + 1}" />
            <button type="button" class="qty-btn" data-act="plus" aria-label="Increase quantity">+</button>
          </div>
          <button type="button" class="pack-remove" data-act="remove" aria-label="Remove design ${i + 1}">✕</button>
        </div>`
      )
      .join("");
  }

  packList.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const row = btn.closest(".pack-row");
    const i = parseInt(row.dataset.i, 10);
    if (btn.dataset.act === "remove") {
      cart.splice(i, 1);
      if (!cart.length) {
        saveCart();
        content.hidden = true;
        empty.hidden = false;
        return;
      }
      renderPack();
    } else {
      const delta = btn.dataset.act === "plus" ? 1 : -1;
      cart[i].qty = Math.min(500, Math.max(1, cart[i].qty + delta));
      row.querySelector("input").value = cart[i].qty;
    }
    saveCart();
    updateTotals();
  });

  packList.addEventListener("change", (e) => {
    const input = e.target.closest("input[type=number]");
    if (!input) return;
    const i = parseInt(input.closest(".pack-row").dataset.i, 10);
    const n = parseInt(input.value, 10);
    cart[i].qty = Math.min(500, Math.max(1, isNaN(n) ? 1 : n));
    input.value = cart[i].qty;
    saveCart();
    updateTotals();
  });

  // ---------- Totals ----------
  const subtotalEl = document.getElementById("subtotal");
  const discountLine = document.getElementById("discount-line");
  const discountEl = document.getElementById("discount");
  const totalEl = document.getElementById("total");
  const payBtn = document.getElementById("pay-btn");

  const fmt = (c) => `$${(c / 100).toFixed(2)}`;
  const totalTags = () => cart.reduce((sum, i) => sum + i.qty, 0);

  function updateTotals() {
    const n = totalTags();
    const bundles = Math.floor(n / BUNDLE_SIZE);
    const singles = n % BUNDLE_SIZE;
    const subtotal = UNIT_C * n;
    const itemsTotal = bundles * BUNDLE_C + singles * UNIT_C;
    const discount = subtotal - itemsTotal;
    subtotalEl.textContent = `${fmt(subtotal)} (${n} tag${n === 1 ? "" : "s"})`;
    discountLine.hidden = discount === 0;
    discountEl.textContent = `−${fmt(discount)}`;
    totalEl.textContent = fmt(itemsTotal);
    payBtn.textContent = `Pay with Stripe · ${fmt(itemsTotal)}`;
  }

  renderPack();
  updateTotals();

  // ---------- Stripe Checkout ----------
  const form = document.getElementById("pay-form");
  const msg = document.getElementById("pay-msg");

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
          items: cart.map((o) => ({
            format: o.format,
            usecase: o.usecase,
            qty: o.qty,
            design: {
              name: o.name,
              callout: o.callout,
              bg: o.bg,
              accent: o.accent,
              style: o.style,
              back: o.singleSided ? "single-sided" : o.back,
              backCallout: o.backCallout,
              hasLogo: Boolean(o.logo),
            },
          })),
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
    const hasLogo = cart.some((o) => o.logo);
    form.innerHTML = `
      <div class="co-success">
        <div class="co-success-check">✓</div>
        <h3>Order received!</h3>
        <p>Thanks! Your payment went through — Stripe is emailing your receipt now.
        We'll be in touch${hasLogo ? " (and we'll ask for your logo file)" : ""} with a
        proof of every design before it prints.</p>
        <a class="btn btn-outline" href="/customize">Design another</a>
      </div>`;
    localStorage.removeItem("boopCart");
    localStorage.removeItem("boopOrder");
  } else if (status === "cancel") {
    msg.textContent = "Payment canceled — no charge was made. Your designs are saved, so you can pay whenever you're ready.";
  }
})();
