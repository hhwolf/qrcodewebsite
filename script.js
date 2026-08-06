// boop. landing page — hero scene cycling, scroll reveals, email capture stub

(function () {
  "use strict";

  // ---------- Hero: cycle scenes (menu → pay → card), synced to the tag's tap loop ----------
  const tag = document.querySelector(".tag");
  const scenes = Array.from(document.querySelectorAll(".scene"));
  let sceneIndex = 0;

  function nextScene() {
    scenes[sceneIndex].classList.remove("active");
    sceneIndex = (sceneIndex + 1) % scenes.length;
    scenes[sceneIndex].classList.add("active");
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (tag && scenes.length && !reducedMotion) {
    // The tag's CSS animation defines the loop length; swap the phone's
    // content each time it restarts so the pop-in stays in sync with the tap.
    tag.addEventListener("animationiteration", nextScene);
  }

  // ---------- Scroll reveals ----------
  const revealables = document.querySelectorAll(".reveal, .uc-visual");
  if ("IntersectionObserver" in window && !reducedMotion) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.25 }
    );
    revealables.forEach((el) => observer.observe(el));
  } else {
    revealables.forEach((el) => el.classList.add("visible"));
  }

  // ---------- Email capture ----------
  // Formspree endpoint, e.g. "https://formspree.io/f/xanyzabc".
  // Leave empty to fall back to demo mode (shows success without sending).
  const SIGNUP_ENDPOINT = "";

  const form = document.getElementById("signup-form");
  const msg = document.getElementById("form-msg");
  if (form && msg) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = form.email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        msg.textContent = "Hmm, that doesn't look like an email — try again?";
        return;
      }

      const success = () => {
        form.style.display = "none";
        msg.textContent = "You're on the list! We'll boop you exactly once, at launch. ✓";
      };

      if (!SIGNUP_ENDPOINT) {
        success(); // demo mode
        return;
      }

      const button = form.querySelector("button");
      button.disabled = true;
      button.textContent = "Joining…";
      try {
        const res = await fetch(SIGNUP_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ email, source: "landing-early-access" }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        success();
      } catch (err) {
        msg.textContent = "Something went wrong — please try again in a minute.";
        button.disabled = false;
        button.textContent = "Get early access";
      }
    });
  }

  // ---------- Footer year ----------
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
