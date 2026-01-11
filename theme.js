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
  const toRgba = (rgb, alpha = 1) => `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
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

  // Open external links in new tabs for all pages
  try {
    document.querySelectorAll('a[href]').forEach(a => {
      // Resolve relative URLs and compare origins
      const url = new URL(a.getAttribute('href'), window.location.href);
      if (url.origin !== window.location.origin) {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
      }
    });
  } catch (err) {
    console.debug('external-link-targeting error', err);
  }

  // Display settings: text size, particles toggle, density
  const textSize = document.getElementById('text-size');
  const textSizeValue = document.getElementById('text-size-value');
  const particlesToggle = document.getElementById('particles-toggle');
  const particlesDensity = document.getElementById('particles-density');
  const particlesDensityValue = document.getElementById('particles-density-value');
  const motionToggle = document.getElementById('motion-toggle');
  const animationSpeed = document.getElementById('animation-speed');
  const animationSpeedValue = document.getElementById('animation-speed-value');
  const dyslexiaFont = document.getElementById('dyslexia-font');

  const applyFontScale = (percent) => {
    const scale = Math.max(0.6, Math.min(2, percent / 100));
    document.documentElement.style.setProperty('--font-scale', String(scale));
    textSizeValue && (textSizeValue.textContent = `${Math.round(percent)}%`);
    localStorage.setItem('fontScale', String(percent));
  };

  const applyAnimationSpeed = (percent) => {
    const speed = Math.max(0.25, Math.min(4, percent / 100));
    document.documentElement.style.setProperty('--animation-speed', String(speed));
    animationSpeedValue && (animationSpeedValue.textContent = `${Math.round(percent)}%`);
    localStorage.setItem('animationSpeed', String(percent));
    // Update particles speed
    if (window.particlesSetAnimationSpeed) {
      try { window.particlesSetAnimationSpeed(percent); } catch {}
    }
  };

  const applyDyslexiaFont = (enabled) => {
    localStorage.setItem('dyslexiaFont', enabled ? 'true' : 'false');
    if (enabled) {
      document.body.classList.add('dyslexia-font');
    } else {
      document.body.classList.remove('dyslexia-font');
    }
  };

  const applyParticlesEnabled = (enabled) => {
    localStorage.setItem('particlesEnabled', enabled ? 'true' : 'false');
    const canvas = document.getElementById('particles');
    if (canvas) canvas.style.display = enabled ? 'block' : 'none';
    if (window.particlesSetEnabled) {
      try { window.particlesSetEnabled(enabled); } catch {}
    }
  };

  const applyParticlesCount = (count) => {
    const c = Math.max(40, Math.min(400, Number(count) || 160));
    particlesDensityValue && (particlesDensityValue.textContent = String(c));
    localStorage.setItem('particlesCount', String(c));
    if (window.particlesSetCount) {
      try { window.particlesSetCount(c); } catch {}
    }
  };

  const applyMotionOverride = (enabled) => {
    localStorage.setItem('allowMotion', enabled ? 'true' : 'false');
    console.log('Motion override set to:', enabled);
    // Re-init drift to apply override immediately
    if (window.__backgroundDriftCleanup) {
      try { window.__backgroundDriftCleanup(); } catch {}
    }
    initRandomBackgroundDrift();
    // Re-init glow spots to respect motion toggle
    if (window.__glowCleanup) {
      try { window.__glowCleanup(); } catch {}
    }
    initGlowSpots();
  };

  // restore display settings
  const storedFont = Number(localStorage.getItem('fontScale')) || 100;
  textSize && (textSize.value = String(storedFont));
  applyFontScale(storedFont);

  const storedParticlesEnabled = localStorage.getItem('particlesEnabled');
  const enabled = storedParticlesEnabled === null ? true : storedParticlesEnabled === 'true';
  particlesToggle && (particlesToggle.checked = enabled);
  applyParticlesEnabled(enabled);

  const storedCount = Number(localStorage.getItem('particlesCount')) || 160;
  particlesDensity && (particlesDensity.value = String(storedCount));
  particlesDensityValue && (particlesDensityValue.textContent = String(storedCount));
  applyParticlesCount(storedCount);

  // motion: default to ON, let user turn off if desired
  const storedMotion = localStorage.getItem('allowMotion');
  const motionEnabled = storedMotion === 'false' ? false : true; // on by default
  motionToggle && (motionToggle.checked = motionEnabled);
  // Set localStorage if not already set
  if (storedMotion === null) {
    localStorage.setItem('allowMotion', 'true');
  }

  // restore animation speed
  const storedAnimSpeed = Number(localStorage.getItem('animationSpeed')) || 100;
  animationSpeed && (animationSpeed.value = String(storedAnimSpeed));
  applyAnimationSpeed(storedAnimSpeed);

  // restore dyslexia font
  const storedDyslexia = localStorage.getItem('dyslexiaFont') === 'true';
  dyslexiaFont && (dyslexiaFont.checked = storedDyslexia);
  applyDyslexiaFont(storedDyslexia);


  // listeners
  textSize && textSize.addEventListener('input', (e) => {
    applyFontScale(Number(e.target.value));
  });
  particlesToggle && particlesToggle.addEventListener('change', (e) => {
    applyParticlesEnabled(!!e.target.checked);
  });
  particlesDensity && particlesDensity.addEventListener('input', (e) => {
    applyParticlesCount(Number(e.target.value));
  });
  motionToggle && motionToggle.addEventListener('change', (e) => {
    applyMotionOverride(!!e.target.checked);
  });
  animationSpeed && animationSpeed.addEventListener('input', (e) => {
    applyAnimationSpeed(Number(e.target.value));
  });
  dyslexiaFont && dyslexiaFont.addEventListener('change', (e) => {
    applyDyslexiaFont(!!e.target.checked);
  });

  // Soft, transient glow spots that appear/disappear randomly
  const initGlowSpots = () => {
    if (window.__glowCleanup) {
      try { window.__glowCleanup(); } catch {}
    }

    const container = document.querySelector('.container');
    if (!container) return;

    let layer = container.querySelector('.glow-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'glow-layer';
      container.insertBefore(layer, container.firstChild);
    } else {
      layer.innerHTML = '';
    }

    const maxSpots = 3;
    let active = 0;
    let timer = null;
    const rng = (min, max) => min + Math.random() * (max - min);

    const spawn = () => {
      const allowMotion = localStorage.getItem('allowMotion');
      if (allowMotion === 'false') {
        layer.innerHTML = '';
        active = 0;
        timer = setTimeout(spawn, 1200);
        return;
      }

      if (active >= maxSpots) {
        timer = setTimeout(spawn, rng(700, 1200));
        return;
      }

      const cs = getComputedStyle(document.documentElement);
      const colorVal = (cs.getPropertyValue('--shape-light') || '#ffffff').trim();
      const rgb = parseCSSColor(colorVal) || [255, 255, 255];
      const rgba = toRgba(rgb, 0.22);

      const size = rng(20, 40);
      const left = rng(8, 92);
      const top = rng(8, 92);

      const spot = document.createElement('div');
      spot.className = 'glow-spot';
      spot.style.width = `${size}px`;
      spot.style.height = `${size}px`;
      spot.style.left = `${left}%`;
      spot.style.top = `${top}%`;
      spot.style.background = `radial-gradient(circle at 50% 50%, ${rgba} 0%, rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0) 45%)`;

      const duration = rng(2600, 5200);
      spot.style.animationDuration = `${duration}ms`;

      layer.appendChild(spot);
      active++;

      const handleDone = () => {
        spot.removeEventListener('animationend', handleDone);
        spot.remove();
        active--;
      };
      spot.addEventListener('animationend', handleDone);

      timer = setTimeout(spawn, rng(900, 1800));
    };

    spawn();

    window.__glowCleanup = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      active = 0;
      layer && (layer.innerHTML = '');
    };
  };

  // Random drift for background shapes (replaces CSS keyframes)
  const initRandomBackgroundDrift = () => {
    // cleanup any existing drift
    if (window.__backgroundDriftCleanup) {
      try { window.__backgroundDriftCleanup(); } catch {}
    }

    const isMobile = window.matchMedia('(max-width: 720px)').matches;
    const container = document.querySelector('.container');
    if (!container) return;
    // select the first five divs directly under container (ignores canvas, title, boxes)
    const shapes = Array.from(container.querySelectorAll(':scope > div')).slice(0, 5);
    if (!shapes.length) return;

    const rng = (min, max) => min + Math.random() * (max - min);
    const range = isMobile ? 200 : 320;
    const scaleRange = isMobile ? 0.12 : 0.18;
    const rotRange = isMobile ? 5 : 8;

    // Corner targets relative to center with small jitter
    const corners = [
      { x: -range, y: -range },
      { x: range, y: -range },
      { x: range, y: range },
      { x: -range, y: range }
    ];
    const jitter = () => rng(-range * 0.15, range * 0.15);

    const states = shapes.map(() => ({
      x: 0, y: 0, s: 1, r: 0,
      tx: corners[0].x + jitter(),
      ty: corners[0].y + jitter(),
      ts: 1 + rng(-scaleRange, scaleRange),
      tr: rng(-rotRange, rotRange),
      speed: rng(0.12, 0.22) * (isMobile ? 0.9 : 1.0),
      nextTarget: performance.now() + rng(4200, 7200)
    }));

    let rafId = null;
    let last = performance.now();

    const tick = (nowTs) => {
      const allowMotion = localStorage.getItem('allowMotion');
      if (allowMotion === 'false') {
        shapes.forEach(el => { el.style.transform = ''; });
        rafId = requestAnimationFrame(tick);
        return;
      }

      const dt = Math.max(0.001, Math.min(0.05, (nowTs - last) / 1000));
      last = nowTs;

      shapes.forEach((el, i) => {
        const st = states[i];
        if (nowTs >= st.nextTarget) {
          const target = corners[Math.floor(rng(0, corners.length))];
          st.tx = target.x + jitter();
          st.ty = target.y + jitter();
          st.ts = 1 + rng(-scaleRange, scaleRange);
          st.tr = rng(-rotRange, rotRange);
          st.nextTarget = nowTs + rng(4200, 7200);
        }

        const blend = 1 - Math.exp(-st.speed * 4.2 * dt); // smooth, frame-rate independent, corner-to-corner glide
        st.x += (st.tx - st.x) * blend;
        st.y += (st.ty - st.y) * blend;
        st.s += (st.ts - st.s) * blend;
        st.r += (st.tr - st.r) * blend;

        el.style.transform = `translate3d(${st.x}px, ${st.y}px, 0) scale(${st.s}) rotate(${st.r}deg)`;
      });

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    console.log('Background drift initialized, shapes:', shapes.length);

    // expose cleanup so we can re-init when override changes
    window.__backgroundDriftCleanup = () => {
      if (rafId) cancelAnimationFrame(rafId);
      shapes.forEach(el => { el.style.transform = ''; });
      rafId = null;
    };
  };

  initGlowSpots();
  initRandomBackgroundDrift();
});