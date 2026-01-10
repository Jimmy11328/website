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
const PARTICLE_COUNT = 160;
const BASE_SPEED = 0.35;
const MAX_SPEED = 1.25;
const MOUSE_INFLUENCE = 140;
const DPR = Math.min(window.devicePixelRatio || 1, 2);

let palette = {
  core: 'rgba(38, 64, 128, 1)',
  mid: 'rgba(38, 64, 128, 0.6)',
  outer: 'rgba(255, 255, 255, 0.08)',
  trail: 'rgba(255, 255, 255, 0.16)',
};

let currentTheme = '';
let radiusBoost = 0;

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
  const themeCores = {
    light: [0, 0, 0],
    pink: [232, 70, 140],
    sunset: [224, 96, 32],
    mint: [24, 118, 88],
    retro: [228, 190, 60],
    solar: [236, 170, 24],
  };
  const fixed = themeCores[theme] || [38, 64, 128];
  const light = parseColor(cs.getPropertyValue('--shape-light') || cs.getPropertyValue('--box-bg-end'), fixed);
  const text = parseColor(cs.getPropertyValue('--text-color'), [255, 255, 255]);
  const bg = parseColor(cs.getPropertyValue('--bg-grad-mid') || cs.getPropertyValue('--bg-grad-start'), light);
  const isLightBg = luminance(bg) > 0.35;
  const outerAlpha = isLightBg ? 0.24 : 0.1;
  const trailAlpha = isLightBg ? 0.34 : 0.2;

  if (theme === 'pink') {
    palette = {
      core: 'rgb(245, 154, 196)',
      mid: 'rgba(245, 154, 196, 0.75)',
      outer: toRgba(light, Math.max(outerAlpha, 0.32)),
      trail: toRgba(text, Math.max(trailAlpha, 0.45)),
    };
    radiusBoost = 0.8;
    canvas.style.mixBlendMode = 'normal';
  } else if (theme === 'sunset') {
    palette = {
      core: 'rgb(252, 171, 114)',
      mid: 'rgba(252, 171, 114, 0.7)',
      outer: toRgba(light, Math.max(outerAlpha, 0.28)),
      trail: toRgba(text, Math.max(trailAlpha, 0.4)),
    };
    radiusBoost = 0.5;
    canvas.style.mixBlendMode = 'normal';
  } else if (theme === 'mint') {
    palette = {
      core: 'rgba(176, 255, 220, 1)',
      mid: 'rgba(176, 255, 220, 0.9)',
      outer: toRgba(light, Math.max(outerAlpha, 0.36)),
      trail: 'rgba(0, 0, 0, 0.75)',
    };
    radiusBoost = 1.2;
    canvas.style.mixBlendMode = 'normal';
  } else if (theme === 'solar') {
    palette = {
      core: 'rgb(250, 198, 85)',
      mid: 'rgba(250, 198, 85, 0.9)',
      outer: toRgba(light, Math.max(outerAlpha, 0.36)),
      trail: 'rgba(0, 0, 0, 0.75)',
    };
    radiusBoost = 1.2;
    canvas.style.mixBlendMode = 'normal';
  } else if (theme === 'light') {
    palette = {
      core: 'rgba(0, 0, 0, 1)',
      mid: 'rgba(0, 0, 0, 0.7)',
      outer: 'rgba(0, 0, 0, 0.10)',
      trail: toRgba(text, trailAlpha),
    };
    radiusBoost = 0.6;
    canvas.style.mixBlendMode = 'normal';
  } else {
    palette = {
      core: toRgba(fixed, 1),
      mid: toRgba(fixed, 0.6),
      outer: toRgba(light, outerAlpha),
      trail: toRgba(text, trailAlpha),
    };
    radiusBoost = 0;
    canvas.style.mixBlendMode = '';
  }
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
    this.x += this.vx;
    this.y += this.vy;

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
        this.vx += (dx / dist) * force * 0.6;
        this.vy += (dy / dist) * force * 0.6;
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
  particles.forEach(p => {
    p.update();
    p.draw();
  });
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
