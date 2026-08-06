// boop. design studio — two-sided templates + live tag customizer (all client-side)

(function () {
  "use strict";

  const preview = document.getElementById("preview");
  if (!preview) return; // not on the customize page

  const previewBack = document.getElementById("preview-back");
  const pvName = document.getElementById("pv-name");
  const pvLogo = document.getElementById("pv-logo");
  const pvCallout = document.getElementById("pv-callout");
  const pvBackName = document.getElementById("pv-back-name");
  const pvBackCallout = document.getElementById("pv-back-callout");
  const caption = document.getElementById("preview-caption");
  const flipInner = document.getElementById("flip-inner");
  const tabFront = document.getElementById("tab-front");
  const tabBack = document.getElementById("tab-back");

  const CALLOUTS = {
    menu: "Tap for menu",
    wifi: "Tap for Wi-Fi",
    pay: "Tap to pay or tip",
    bizcard: "Tap for my card",
    review: "Review us on Google",
    instagram: "Follow us",
    custom: "Tap here",
  };

  const BACK_CALLOUTS = {
    menu: "Scan to see the menu",
    wifi: "Scan to join the Wi-Fi",
    pay: "Scan to pay or tip",
    bizcard: "Scan to save my contact",
    review: "Scan to leave a review",
    instagram: "Scan to follow",
    custom: "Tap or scan",
  };

  const LABELS = {
    format: { card: "Card", sticker: "Sticker", tent: "Table tent" },
    usecase: {
      menu: "Menu", wifi: "Wi-Fi", pay: "Pay / tips", bizcard: "Business card",
      review: "Google review", instagram: "Instagram", custom: "Custom link",
    },
    color: {
      "#ffffff": "White", "#0A0F1E": "Ink", "#2563EB": "Electric blue",
      "#22D3EE": "Cyan", "#F8FAFC": "Paper",
    },
  };

  // ---------- Templates: curated two-sided starting points ----------
  // bg/accent flow through the "custom" color slot so every template
  // stays fully editable. `back` designs the reverse side of cards and
  // tents; stickers are single-sided, so their templates have no back.
  const TEMPLATES = [
    {
      key: "bistro", label: "The Bistro", desc: "A menu on every table, updated from your phone.",
      thumbName: "Café Norte",
      format: "tent", usecase: "menu", bg: "#FAF3E7", accent: "#C4532D", style: "band",
      back: { mode: "qr-text", text: "Scan for today's menu" },
    },
    {
      key: "tipjar", label: "The Tip Jar", desc: "Cash-free tips for counters, cases, and stages.",
      thumbName: "Tips for Alex", callout: "Tap to tip",
      format: "sticker", usecase: "pay", bg: "#0A0F1E", accent: "#22D3EE", style: "band",
    },
    {
      key: "closer", label: "The Closer", desc: "A business card nobody can lose.",
      thumbName: "Jordan Lee",
      format: "card", usecase: "bizcard", bg: "#ffffff", accent: "#2563EB", style: "frame",
      back: { mode: "qr-text", text: "Scan to save my contact" },
    },
    {
      key: "fivestar", label: "The Five-Star", desc: "Turn happy customers into Google reviews.",
      thumbName: "Blue Door Salon", callout: "★★★★★ Tap to review",
      format: "sticker", usecase: "review", bg: "#ffffff", accent: "#F59E0B", style: "band",
    },
    {
      key: "guestpass", label: "The Guest Pass", desc: "Wi-Fi without spelling out the password.",
      thumbName: "Studio K", callout: "Tap for guest Wi-Fi",
      format: "card", usecase: "wifi", bg: "#2563EB", accent: "#0A0F1E", style: "split",
      back: { mode: "qr-text", text: "Scan to join the Wi-Fi" },
    },
    {
      key: "maincharacter", label: "The Main Character", desc: "Grow your following in real life.",
      thumbName: "@cornercafe", callout: "Follow us on Instagram",
      format: "sticker", usecase: "instagram", bg: "#7C3AED", accent: "#22D3EE", style: "band",
    },
  ];

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

  const state = {
    format: "card",
    usecase: "menu",
    color: "#ffffff",
    style: "classic",
    accent: "#2563EB",
    back: "qr-text",
    backText: "",
    customText: "",
    calloutOverride: null,
    backTextOverride: null,
    templateLabel: null,
    name: "",
    logo: null,
  };

  function checked(name) {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : null;
  }

  function setRadio(name, value) {
    const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (el) el.checked = true;
  }

  function resolveColor() {
    return state.color === "custom"
      ? document.getElementById("custom-color").value
      : state.color;
  }

  // Pick a readable foreground (ink or white) for a given background.
  function fgFor(hex) {
    const n = hex.replace("#", "");
    const r = parseInt(n.slice(0, 2), 16);
    const g = parseInt(n.slice(2, 4), 16);
    const b = parseInt(n.slice(4, 6), 16);
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance > 150 ? "#0A0F1E" : "#ffffff";
  }

  function calloutText() {
    if (state.usecase === "custom") return state.customText || CALLOUTS.custom;
    return state.calloutOverride || CALLOUTS[state.usecase];
  }

  function backCalloutText() {
    return state.backText || state.backTextOverride || BACK_CALLOUTS[state.usecase];
  }

  function isSingleSided() {
    return state.format === "sticker";
  }

  function render() {
    const bg = resolveColor();
    const fg = fgFor(bg);

    preview.className = `preview-tag format-${state.format} style-${state.style}`;
    preview.style.setProperty("--pv-bg", bg);
    preview.style.setProperty("--pv-fg", fg);
    preview.style.setProperty("--pv-accent", state.accent);
    preview.style.setProperty("--pv-accent-fg", fgFor(state.accent));

    previewBack.className = `preview-tag pv-back format-${state.format} back-${state.back}`;
    previewBack.style.setProperty("--pv-bg", bg);
    previewBack.style.setProperty("--pv-fg", fg);

    pvName.textContent = state.name || "Your Business";
    pvBackName.textContent = state.name || "Your Business";
    pvCallout.textContent = calloutText();
    pvBackCallout.textContent = backCalloutText();

    if (state.logo) {
      pvLogo.src = state.logo;
      pvLogo.hidden = false;
    } else {
      pvLogo.removeAttribute("src");
      pvLogo.hidden = true;
    }

    const colorLabel = LABELS.color[bg] || bg.toUpperCase();
    const parts = [LABELS.format[state.format], LABELS.usecase[state.usecase], colorLabel];
    if (state.templateLabel) parts.unshift(state.templateLabel);
    if (isSingleSided()) parts.push("single-sided");
    caption.textContent = parts.join(" · ");
  }

  // ---------- Front/back view ----------
  const backGroup = document.getElementById("back-group");

  function setView(side) {
    const showBack = side === "back" && !isSingleSided();
    flipInner.classList.toggle("flipped", showBack);
    tabFront.classList.toggle("pv-tab-active", !showBack);
    tabBack.classList.toggle("pv-tab-active", showBack);
  }

  function updateBackAvailability() {
    const single = isSingleSided();
    tabBack.disabled = single;
    tabBack.title = single ? "Stickers are single-sided" : "";
    backGroup.hidden = single;
    if (single) setView("front");
  }

  tabFront.addEventListener("click", () => setView("front"));
  tabBack.addEventListener("click", () => setView("back"));

  // ---------- Template gallery ----------
  const tplGrid = document.getElementById("tpl-grid");

  function frontFaceMarkup(t) {
    return `
      <span class="preview-tag format-${t.format} style-${t.style}"
            style="--pv-bg:${t.bg};--pv-fg:${fgFor(t.bg)};--pv-accent:${t.accent};--pv-accent-fg:${fgFor(t.accent)}">
        <span class="pv-brand"><span class="pv-name">${t.thumbName}</span></span>
        <span class="pv-callout">${t.callout || CALLOUTS[t.usecase]}</span>
        <span class="pv-bottom">${QR_SVG}${NFC_SVG}</span>
      </span>`;
  }

  function backFaceMarkup(t) {
    return `
      <span class="preview-tag pv-back format-${t.format} back-${t.back.mode}"
            style="--pv-bg:${t.bg};--pv-fg:${fgFor(t.bg)}">
        <span class="pv-back-name">${t.thumbName}</span>
        ${QR_SVG_BIG}
        <span class="pv-back-callout">${t.back.text || BACK_CALLOUTS[t.usecase]}</span>
      </span>`;
  }

  function thumbMarkup(t) {
    const twoSided = Boolean(t.back);
    const thumb = twoSided
      ? `<span class="tpl-thumb">
           <span class="tpl-flip">
             <span class="flip-face flip-front">${frontFaceMarkup(t)}</span>
             <span class="flip-face flip-back">${backFaceMarkup(t)}</span>
           </span>
           <span class="tpl-badge">2-sided · hover to flip</span>
         </span>`
      : `<span class="tpl-thumb">${frontFaceMarkup(t)}</span>`;
    return `${thumb}
      <span class="tpl-label">${t.label}</span>
      <span class="tpl-desc">${t.desc}</span>`;
  }

  const accentWrap = document.getElementById("accent-wrap");
  const customWrap = document.getElementById("custom-callout-wrap");
  const customText = document.getElementById("custom-callout");
  const customColor = document.getElementById("custom-color");
  const backText = document.getElementById("back-text");

  function deselectTemplates() {
    state.templateLabel = null;
    tplGrid.querySelectorAll(".tpl-card").forEach((b) => b.setAttribute("aria-pressed", "false"));
  }

  function applyTemplate(t, button) {
    state.format = t.format;
    state.usecase = t.usecase;
    state.style = t.style;
    state.accent = t.accent;
    state.color = "custom";
    customColor.value = t.bg;
    state.calloutOverride = t.callout || null;
    state.customText = "";
    state.back = t.back ? t.back.mode : "qr-text";
    state.backTextOverride = t.back ? t.back.text || null : null;
    state.backText = "";
    backText.value = "";
    state.templateLabel = t.label;

    setRadio("format", t.format);
    setRadio("usecase", t.usecase);
    setRadio("style", t.style);
    setRadio("accent", t.accent);
    setRadio("back", state.back);
    setRadio("color", "custom");
    customWrap.hidden = true;
    accentWrap.hidden = t.style === "classic";
    backTextWrap.hidden = state.back !== "qr-text";
    updateBackAvailability();
    setView("front");

    tplGrid.querySelectorAll(".tpl-card").forEach((b) => b.setAttribute("aria-pressed", "false"));
    button.setAttribute("aria-pressed", "true");
    render();
  }

  TEMPLATES.forEach((t) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tpl-card";
    button.setAttribute("aria-pressed", "false");
    button.innerHTML = thumbMarkup(t);
    button.addEventListener("click", () => applyTemplate(t, button));
    tplGrid.appendChild(button);
  });

  // ---------- Format, use case, style, back ----------
  document.querySelectorAll('input[name="format"]').forEach((el) =>
    el.addEventListener("change", () => {
      state.format = checked("format");
      updateBackAvailability();
      deselectTemplates();
      render();
    })
  );

  document.querySelectorAll('input[name="usecase"]').forEach((el) =>
    el.addEventListener("change", () => {
      state.usecase = checked("usecase");
      state.calloutOverride = null;
      state.backTextOverride = null;
      customWrap.hidden = state.usecase !== "custom";
      if (state.usecase === "custom") customText.focus();
      deselectTemplates();
      render();
    })
  );
  customText.addEventListener("input", () => {
    state.customText = customText.value.trim();
    render();
  });

  document.querySelectorAll('input[name="style"]').forEach((el) =>
    el.addEventListener("change", () => {
      state.style = checked("style");
      accentWrap.hidden = state.style === "classic";
      deselectTemplates();
      render();
    })
  );

  document.querySelectorAll('input[name="accent"]').forEach((el) =>
    el.addEventListener("change", () => {
      state.accent = checked("accent");
      deselectTemplates();
      render();
    })
  );

  const backTextWrap = document.getElementById("back-text-wrap");
  document.querySelectorAll('input[name="back"]').forEach((el) =>
    el.addEventListener("change", () => {
      state.back = checked("back");
      backTextWrap.hidden = state.back !== "qr-text";
      deselectTemplates();
      setView("back");
      render();
    })
  );
  backText.addEventListener("input", () => {
    state.backText = backText.value.trim();
    setView("back");
    render();
  });

  // ---------- Color ----------
  document.querySelectorAll('input[name="color"]').forEach((el) =>
    el.addEventListener("change", () => {
      state.color = checked("color");
      deselectTemplates();
      render();
    })
  );
  customColor.addEventListener("input", () => {
    setRadio("color", "custom");
    state.color = "custom";
    deselectTemplates();
    render();
  });

  // ---------- Branding ----------
  const bizName = document.getElementById("biz-name");
  bizName.addEventListener("input", () => {
    state.name = bizName.value.trim();
    render();
  });

  const logoUpload = document.getElementById("logo-upload");
  const logoClear = document.getElementById("logo-clear");
  const uploadHint = document.getElementById("upload-hint");

  logoUpload.addEventListener("change", () => {
    const file = logoUpload.files && logoUpload.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      uploadHint.textContent = "That file is over 2 MB — try a smaller one.";
      logoUpload.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      state.logo = reader.result;
      logoClear.hidden = false;
      uploadHint.textContent = file.name;
      render();
    };
    reader.readAsDataURL(file);
  });

  logoClear.addEventListener("click", () => {
    state.logo = null;
    logoUpload.value = "";
    logoClear.hidden = true;
    uploadHint.textContent = "PNG, JPG, or SVG · under 2 MB";
    render();
  });

  // ---------- Request form (stub — wire to a real endpoint later) ----------
  const form = document.getElementById("order-form");
  const msg = document.getElementById("order-msg");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("order-email").value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      msg.textContent = "Hmm, that doesn't look like an email — try again?";
      return;
    }
    // TODO: POST { ...state, bg: resolveColor(), backCallout: backCalloutText(), email }
    // to your backend. state.logo holds the uploaded image as a data URL.
    msg.textContent = `Got it! We'll send a proof of your ${LABELS.format[state.format].toLowerCase()} (${LABELS.usecase[state.usecase]}) to ${email}. ✓`;
  });

  updateBackAvailability();
  render();
})();
