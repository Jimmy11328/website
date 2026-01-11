const existingCanvas = document.getElementById('particles');
const canvas = existingCanvas || (() => {
  const c = document.createElement('canvas');
  c.id = 'particles';
  const host = document.querySelector('.container') || document.body;
  host.prepend(c);
  return c;
})();
const ctx = canvas.getContext('2d');

const particles = [];
let PARTICLE_COUNT = (() => {
  const stored = Number(localStorage.getItem('particlesCount'));
  return stored && stored > 0 ? stored : 160;
})();
const BASE_SPEED = 0.35;
const MAX_SPEED = 1.25;
const MOUSE_INFLUENCE = 140;
const DPR = Math.min(window.devicePixelRatio || 1, 2);

// Animation speed multiplier
let animationSpeedMultiplier = (() => {
  const stored = Number(localStorage.getItem('animationSpeed')) || 100;
  return stored / 100;
})();

let palette = {
  core: 'rgba(38, 64, 128, 1)',
  mid: 'rgba(38, 64, 128, 0.6)',
  outer: 'rgba(255, 255, 255, 0.08)',
  trail: 'rgba(255, 255, 255, 0.16)',
};

let currentTheme = '';
let radiusBoost = 0;
let particlesEnabled = (() => {
  const v = localStorage.getItem('particlesEnabled');
  return v === null ? true : v === 'true';
})();

let mouseX = null;
let mouseY = null;
let viewWidth = window.innerWidth;
let viewHeight = window.innerHeight;

function parseColor(value, fallback) {
  if (!value) return fallback;
  const v = value.trim();
  if (v.startsWith('#')) {
    const hex = v.length === 4
      ? `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`
      : v;
    return [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ];
  }
  const match = v.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  return match
    ? [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)]
    : fallback;
}

function toRgba(rgb, alpha) {
  const [r, g, b] = rgb;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function darken(rgb, amount) {
  const factor = Math.max(0, 1 - amount);
  return rgb.map(v => Math.max(0, Math.round(v * factor)));
}

function lighten(rgb, amount) {
  const a = Math.max(0, Math.min(1, amount));
  return rgb.map(v => Math.min(255, Math.round(v + (255 - v) * a)));
}

function luminance([r, g, b]) {
  const srgb = [r, g, b].map(v => {
    const n = v / 255;
    return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function refreshPalette() {
  const cs = getComputedStyle(document.documentElement);
  const theme = (document.documentElement.getAttribute('data-theme') || '').toLowerCase();
  currentTheme = theme;
  const accent = parseColor(cs.getPropertyValue('--accent'), [122, 162, 255]);
  const light = parseColor(cs.getPropertyValue('--shape-light') || cs.getPropertyValue('--box-bg-end'), accent);
  const text = parseColor(cs.getPropertyValue('--text-color'), [255, 255, 255]);
  const bg = parseColor(cs.getPropertyValue('--bg-grad-mid') || cs.getPropertyValue('--bg-grad-start'), light);
  const isLightBg = luminance(bg) > 0.35;
  const outerAlpha = isLightBg ? 0.24 : 0.1;
  const trailAlpha = isLightBg ? 0.34 : 0.2;

  // Accent-driven palette across all themes
  const coreRGB = isLightBg ? darken(accent, 0.32) : lighten(accent, 0.08);
  const midRGB  = isLightBg ? darken(accent, 0.16) : lighten(accent, 0.22);
  palette = {
    core: toRgba(coreRGB, 1),
    mid: toRgba(midRGB, isLightBg ? 0.72 : 0.6),
    outer: toRgba(light, outerAlpha),
    trail: toRgba(text, trailAlpha),
  };
  radiusBoost = isLightBg ? 0.6 : 0.0;
  canvas.style.mixBlendMode = isLightBg ? 'normal' : '';
}

function setCanvasSize() {
  viewWidth = window.innerWidth;
  viewHeight = window.innerHeight;
  canvas.width = viewWidth * DPR;
  canvas.height = viewHeight * DPR;
  canvas.style.width = `${viewWidth}px`;
  canvas.style.height = `${viewHeight}px`;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

class Particle {
  constructor() {
    this.reset(Math.random() * viewWidth, Math.random() * viewHeight);
  }

  reset(x, y) {
    this.radius = Math.random() * 3 + 2.5 + radiusBoost;
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = BASE_SPEED + Math.random() * BASE_SPEED;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  update() {
    const speedMult = animationSpeedMultiplier;
    this.x += this.vx * speedMult;
    this.y += this.vy * speedMult;

    if (this.x < this.radius || this.x > viewWidth - this.radius) {
      this.vx *= -1;
      this.x = Math.min(Math.max(this.x, this.radius), viewWidth - this.radius);
    }
    if (this.y < this.radius || this.y > viewHeight - this.radius) {
      this.vy *= -1;
      this.y = Math.min(Math.max(this.y, this.radius), viewHeight - this.radius);
    }

    if (mouseX !== null && mouseY !== null) {
      const dx = this.x - mouseX;
      const dy = this.y - mouseY;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < MOUSE_INFLUENCE) {
        const force = (MOUSE_INFLUENCE - dist) / MOUSE_INFLUENCE;
        this.vx += (dx / dist) * force * 0.6 * speedMult;
        this.vy += (dy / dist) * force * 0.6 * speedMult;
      }
    }

    const speed = Math.hypot(this.vx, this.vy);
    if (speed > MAX_SPEED) {
      const scale = MAX_SPEED / speed;
      this.vx *= scale;
      this.vy *= scale;
    }
  }

  draw() {
    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 3);
    gradient.addColorStop(0, palette.core);
    gradient.addColorStop(0.45, palette.mid);
    gradient.addColorStop(1, palette.outer);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function initParticles() {
  particles.length = 0;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Particle());
  }
}

function animate() {
  ctx.clearRect(0, 0, canvas.width / DPR, canvas.height / DPR);
  if (particlesEnabled) {
    particles.forEach(p => {
      p.update();
      p.draw();
    });
  }
  requestAnimationFrame(animate);
}

window.addEventListener('mousemove', e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

window.addEventListener('resize', () => {
  setCanvasSize();
  initParticles();
});

new MutationObserver(mutations => {
  if (mutations.some(m => m.attributeName === 'data-theme')) {
    refreshPalette();
  }
}).observe(document.documentElement, { attributes: true });

setCanvasSize();
refreshPalette();
initParticles();
animate();

// expose minimal controls
window.particlesSetCount = function(count) {
  const c = Math.max(40, Math.min(400, Number(count) || PARTICLE_COUNT));
  PARTICLE_COUNT = c;
  initParticles();
};
window.particlesSetEnabled = function(enabled) {
  particlesEnabled = !!enabled;
  canvas.style.display = particlesEnabled ? 'block' : 'none';
};
window.particlesSetAnimationSpeed = function(percent) {
  animationSpeedMultiplier = Math.max(0.25, Math.min(4, percent / 100));
};
