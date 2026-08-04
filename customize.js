// boop. design studio — live tag customizer (all client-side)

(function () {
  "use strict";

  const preview = document.getElementById("preview");
  if (!preview) return; // not on the customize page

  const pvName = document.getElementById("pv-name");
  const pvLogo = document.getElementById("pv-logo");
  const pvCallout = document.getElementById("pv-callout");
  const caption = document.getElementById("preview-caption");

  const CALLOUTS = {
    menu: "Tap for menu",
    wifi: "Tap for Wi-Fi",
    pay: "Tap to pay or tip",
    bizcard: "Tap for my card",
    review: "Review us on Google",
    instagram: "Follow us",
    custom: "Tap here",
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

  const state = {
    format: "card",
    usecase: "menu",
    color: "#ffffff",
    customText: "",
    name: "",
    logo: null,
  };

  function checked(name) {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : null;
  }

  function resolveColor() {
    return state.color === "custom"
      ? document.getElementById("custom-color").value
      : state.color;
  }

  // Pick a readable foreground (ink or white) for the chosen background.
  function fgFor(hex) {
    const n = hex.replace("#", "");
    const r = parseInt(n.slice(0, 2), 16);
    const g = parseInt(n.slice(2, 4), 16);
    const b = parseInt(n.slice(4, 6), 16);
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance > 150 ? "#0A0F1E" : "#ffffff";
  }

  function render() {
    const bg = resolveColor();
    preview.className = `preview-tag format-${state.format}`;
    preview.style.setProperty("--pv-bg", bg);
    preview.style.setProperty("--pv-fg", fgFor(bg));

    pvName.textContent = state.name || "Your Business";

    const callout =
      state.usecase === "custom" && state.customText
        ? state.customText
        : CALLOUTS[state.usecase];
    pvCallout.textContent = callout;

    if (state.logo) {
      pvLogo.src = state.logo;
      pvLogo.hidden = false;
    } else {
      pvLogo.removeAttribute("src");
      pvLogo.hidden = true;
    }

    const colorLabel = LABELS.color[bg] || bg.toUpperCase();
    caption.textContent = `${LABELS.format[state.format]} · ${LABELS.usecase[state.usecase]} · ${colorLabel}`;
  }

  // ---------- Format & use case ----------
  document.querySelectorAll('input[name="format"]').forEach((el) =>
    el.addEventListener("change", () => {
      state.format = checked("format");
      render();
    })
  );

  const customWrap = document.getElementById("custom-callout-wrap");
  const customText = document.getElementById("custom-callout");
  document.querySelectorAll('input[name="usecase"]').forEach((el) =>
    el.addEventListener("change", () => {
      state.usecase = checked("usecase");
      customWrap.hidden = state.usecase !== "custom";
      if (state.usecase === "custom") customText.focus();
      render();
    })
  );
  customText.addEventListener("input", () => {
    state.customText = customText.value.trim();
    render();
  });

  // ---------- Color ----------
  const customColor = document.getElementById("custom-color");
  document.querySelectorAll('input[name="color"]').forEach((el) =>
    el.addEventListener("change", () => {
      state.color = checked("color");
      render();
    })
  );
  customColor.addEventListener("input", () => {
    document.querySelector('input[name="color"][value="custom"]').checked = true;
    state.color = "custom";
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
    // TODO: POST { ...state, email } to your backend / order form service.
    // state.logo holds the uploaded image as a data URL.
    msg.textContent = `Got it! We'll send a proof of your ${LABELS.format[state.format].toLowerCase()} (${LABELS.usecase[state.usecase]}) to ${email}. ✓`;
  });

  render();
})();
