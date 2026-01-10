// Toggle settings panel and apply selected theme (persisted)
document.addEventListener("DOMContentLoaded", () => {
  const hamburger = document.querySelector(".settings .hamburger");
  const panel = document.getElementById("settings-panel");
  const swatches = document.querySelectorAll(".theme-swatch");

  const applyTheme = (theme) => {
    // debug/log so we can confirm clicks are handled
    console.debug('applyTheme', theme);
    document.documentElement.setAttribute("data-theme", theme);
    // also set on body in case some pages/styles expect it there
    document.body && document.body.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    swatches.forEach(s => s.setAttribute("aria-pressed", s.dataset.theme === theme ? "true" : "false"));
    // update settings text color for readability
    updateSettingsTextColor();
  };

  // Helpers to pick a readable color (white or dark) based on theme background
  const parseCSSColor = (c) => {
    c = c.trim();
    if (!c) return null;
    if (c[0] === "#") {
      if (c.length === 4) {
        return [parseInt(c[1]+c[1],16), parseInt(c[2]+c[2],16), parseInt(c[3]+c[3],16)];
      }
      return [parseInt(c.substr(1,2),16), parseInt(c.substr(3,2),16), parseInt(c.substr(5,2),16)];
    }
    const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    return m ? [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])] : null;
  };
  const luminance = ([r,g,b]) => {
    const srgb = [r,g,b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126*srgb[0] + 0.7152*srgb[1] + 0.0722*srgb[2];
  };
  // Set settings text color by reading CSS variable so each theme controls it
  const updateSettingsTextColor = () => {
    const cs = getComputedStyle(document.documentElement);
    const color = (cs.getPropertyValue('--settings-text-color') || '#ffffff').trim();
    if (panel) panel.style.color = color;
    if (hamburger) hamburger.style.color = color;
    swatches.forEach(s => s.style.color = color);
  };
  // initial call
  updateSettingsTextColor();

  // make the button text explicit
  if (hamburger) {
    hamburger.textContent = 'Settings';
  }

  // restore
  const stored = localStorage.getItem("theme") || "dark";
  applyTheme(stored);

  // hamburger open/close
  hamburger && hamburger.addEventListener("click", (e) => {
    const open = hamburger.classList.toggle("open");
    hamburger.textContent = open ? 'Close' : 'Settings';
    hamburger.setAttribute("aria-label", open ? 'Close settings' : 'Open settings');
    if (open) {
      panel && panel.classList.add("open");
      panel && panel.setAttribute("aria-hidden", "false");
      hamburger.setAttribute("aria-expanded", "true");
    } else {
      // close actions when toggling closed
      panel && panel.classList.remove("open");
      panel && panel.setAttribute("aria-hidden", "true");
      hamburger.setAttribute("aria-expanded", "false");
      hamburger.setAttribute("aria-label", 'Open settings');
      hamburger.textContent = 'Settings';
    }
  });

  // swatches
  swatches.forEach(btn => {
    btn.addEventListener("click", () => {
      applyTheme(btn.dataset.theme);
    });
  });

  // close when clicking outside or pressing Escape
  document.addEventListener("click", (e) => {
    const settings = document.querySelector(".settings");
    if (settings && !settings.contains(e.target)) {
      hamburger && hamburger.classList.remove("open");
      panel && panel.classList.remove("open");
      panel && panel.setAttribute("aria-hidden", "true");
      hamburger && hamburger.setAttribute("aria-expanded", "false");
      hamburger && (hamburger.textContent = 'Settings');
      hamburger && hamburger.setAttribute("aria-label", 'Open settings');
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hamburger && hamburger.classList.remove("open");
      panel && panel.classList.remove("open");
      panel && panel.setAttribute("aria-hidden", "true");
      hamburger && hamburger.setAttribute("aria-expanded", "false");
      hamburger && (hamburger.textContent = 'Settings');
      hamburger && hamburger.setAttribute("aria-label", 'Open settings');
    }
  });
});