/* ==========================================================================
   Arka plan: canlı yıldız ağı (2D canvas)
   --------------------------------------------------------------------------
   • Yıldızlar çok yavaş süzülür, parlaklıkları hafifçe dalgalanır.
   • Birbirine yaklaşan yıldızlar ince mavi-mor çizgilerle bağlanır; uzaklaştıkça
     çizgi kademeli olarak solar.
   • İmlecin çevresindeki yıldızlar hafifçe açılır ve parlar.
   • Bazı yıldızlar ara ara ışıldar; seyrek olarak bir yıldız kayar.
   • Sabit uzay tozu ayrı bir tuvale bir kez çizilir (#dust); kare başına maliyeti yoktur.

   Tuvaller: index.html > .bg   ·   Stil: style.css > .bg__canvas, .bg__dust
   ========================================================================== */
(() => {
  'use strict';

  const canvas = document.getElementById('particles');
  const ctx = canvas && canvas.getContext('2d');
  if (!ctx) return;
  const dustCanvas = document.getElementById('dust');

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const TAU = Math.PI * 2;
  const LINK = 140;            // bu mesafeden yakın yıldızlar bağlanır (px)
  const LEVELS = 8;            // çizgi saydamlık kademesi (kademe başına tek çizim)
  const POINTER_LEVELS = 3;
  const POINTER_RADIUS = 170;  // imlecin etki alanı (px)
  const MARGIN = LINK + 10;    // yıldızlar ekranın bu kadar dışından dolanır; bağlantı aniden kopmaz
  const DUST_PAD = 40;         // toz tuvali her yandan bu kadar taşar (bkz. style.css > .bg__dust)
  const AREA_PER_STAR = 14000; // px² başına bir yıldız
  const COST_LIMIT = 7;        // kare başına çizim süresi (ms) bunu aşarsa yıldız sayısı azaltılır
  const PALETTE = ['#eef2ff', '#a9c4ff', '#c4b5fd', '#9be9f8']; // beyaz, mavi, mor, camgöbeği

  const LINK_ALPHA = Array.from({ length: LEVELS }, (_, i) => Math.pow((i + 0.5) / LEVELS, 1.5) * 0.36);
  const POINTER_ALPHA = Array.from({ length: POINTER_LEVELS }, (_, i) => ((i + 0.5) / POINTER_LEVELS) * 0.3);

  // Çizgiler saydamlık kademesine göre biriktirilir; diziler her karede yeniden kullanılır
  const linkBuckets = Array.from({ length: LEVELS }, () => []);
  const pointerBuckets = Array.from({ length: POINTER_LEVELS }, () => []);
  const pointer = { x: 0, y: 0, active: false };
  const meteor = { active: false, x: 0, y: 0, vx: 0, vy: 0, age: 0, span: 1, length: 0, nextAt: 4 };

  let width = 0;
  let height = 0;
  let stars = [];
  let gradient = null;
  let density = 1;
  let raf = 0;
  let last = 0;
  let time = 0;
  let cost = 0;
  let frames = 0;
  let resizeQueued = false;

  function createStar() {
    const depth = 0.3 + Math.random() * 0.7; // derinlik: yakın yıldız daha iri, parlak ve hızlı
    const angle = Math.random() * TAU;
    const speed = (1.5 + Math.random() * 4.5) * depth; // px/sn
    return {
      x: -MARGIN + Math.random() * (width + MARGIN * 2),
      y: -MARGIN + Math.random() * (height + MARGIN * 2),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 0.5 + depth * 1.2,
      base: 0.3 + depth * 0.5,
      color: Math.random() < 0.55 ? 0 : 1 + ((Math.random() * (PALETTE.length - 1)) | 0),
      twinkle: 0.5 + Math.random() * 1.4,
      phase: Math.random() * TAU,
      sparkle: Math.random() < 0.18,
      sparkleRate: 0.22 + Math.random() * 0.3,
      px: 0, py: 0, ox: 0, oy: 0, lift: 0, alpha: 0, flare: 0,
    };
  }

  function populate() {
    const area = (width + MARGIN * 2) * (height + MARGIN * 2);
    const count = Math.round(Math.min(150, Math.max(40, area / AREA_PER_STAR)) * density);
    // Renge göre sıralı tutulur: çizimde dolgu rengi en az sayıda değişir
    stars = Array.from({ length: count }, createStar).sort((a, b) => a.color - b.color);
  }

  // Uzay tozu ve çok soluk bulutsu lekeleri: yalnızca boyut değişince çizilir
  function paintDust() {
    if (!dustCanvas) return;
    const d = dustCanvas.getContext('2d');
    const w = width + DUST_PAD * 2;
    const h = height + DUST_PAD * 2;
    const scale = Math.min(window.devicePixelRatio || 1, 1.5);
    dustCanvas.width = Math.round(w * scale);
    dustCanvas.height = Math.round(h * scale);
    d.setTransform(scale, 0, 0, scale, 0, 0);
    d.clearRect(0, 0, w, h);

    for (let i = 0; i < 4; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = 150 + Math.random() * 230;
      const tint = i % 2 ? '139, 92, 246' : '59, 130, 246';
      const cloud = d.createRadialGradient(x, y, 0, x, y, r);
      cloud.addColorStop(0, `rgba(${tint}, 0.05)`);
      cloud.addColorStop(1, `rgba(${tint}, 0)`);
      d.fillStyle = cloud;
      d.fillRect(x - r, y - r, r * 2, r * 2);
    }

    const count = Math.round((w * h) / 2600);
    for (let i = 0; i < count; i++) {
      const bright = Math.random() < 0.06;
      d.globalAlpha = bright ? 0.5 + Math.random() * 0.35 : 0.08 + Math.random() * 0.3;
      d.fillStyle = PALETTE[(Math.random() * PALETTE.length) | 0];
      d.beginPath();
      d.arc(Math.random() * w, Math.random() * h, bright ? 0.7 + Math.random() * 0.5 : 0.3 + Math.random() * 0.5, 0, TAU);
      d.fill();
    }
    d.globalAlpha = 1;
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    // Mobilde adres çubuğunun açılıp kapanması yıldızları yeniden dağıtmasın
    const reshuffle = !width || w !== width || Math.abs(h - height) > 140;
    width = w;
    height = h;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, '#3b82f6');
    gradient.addColorStop(0.55, '#8b5cf6');
    gradient.addColorStop(1, '#60a5fa');

    if (reshuffle) {
      populate();
      paintDust();
    }
    if (reducedMotion) {
      update(0);
      draw();
    }
  }

  function launchMeteor() {
    const rightward = Math.random() < 0.5;
    const angle = (rightward ? 0.42 : Math.PI - 0.42) + (Math.random() - 0.5) * 0.3;
    const speed = 520 + Math.random() * 260;
    meteor.x = width * (rightward ? Math.random() * 0.55 : 0.45 + Math.random() * 0.55);
    meteor.y = height * Math.random() * 0.38;
    meteor.vx = Math.cos(angle) * speed;
    meteor.vy = Math.sin(angle) * speed;
    meteor.age = 0;
    meteor.span = 0.85 + Math.random() * 0.5;
    meteor.length = 120 + Math.random() * 90;
    meteor.active = true;
  }

  function update(dt) {
    const ease = Math.min(1, dt * 5);
    const spanX = width + MARGIN * 2;
    const spanY = height + MARGIN * 2;
    const reach2 = POINTER_RADIUS * POINTER_RADIUS;
    const count = stars.length;

    for (let i = 0; i < count; i++) {
      const s = stars[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.x < -MARGIN) s.x += spanX; else if (s.x > width + MARGIN) s.x -= spanX;
      if (s.y < -MARGIN) s.y += spanY; else if (s.y > height + MARGIN) s.y -= spanY;

      // İmlece yakın yıldız hafifçe uzaklaşır ve parlar
      let pushX = 0;
      let pushY = 0;
      let lift = 0;
      if (pointer.active) {
        const dx = s.x - pointer.x;
        const dy = s.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < reach2 && d2 > 1) {
          const d = Math.sqrt(d2);
          lift = 1 - d / POINTER_RADIUS;
          const push = lift * lift * 14;
          pushX = (dx / d) * push;
          pushY = (dy / d) * push;
        }
      }
      s.ox += (pushX - s.ox) * ease;
      s.oy += (pushY - s.oy) * ease;
      s.lift += (lift - s.lift) * ease;
      s.px = s.x + s.ox;
      s.py = s.y + s.oy;

      // Işıldayan yıldız: uzun aralıklarla kısa bir parlama
      let flare = 0;
      if (s.sparkle) {
        const wave = Math.sin(time * s.sparkleRate + s.phase * 3.1);
        if (wave > 0.9) {
          flare = (wave - 0.9) * 10;
          flare *= flare;
        }
      }
      s.flare = flare;
      s.alpha = Math.min(1, s.base * (0.78 + 0.22 * Math.sin(time * s.twinkle + s.phase)) + s.lift * 0.35 + flare * 0.5);
    }

    // Yakın çiftleri bağla: yakınlık arttıkça daha belirgin kademe
    const link2 = LINK * LINK;
    for (let i = 0; i < count; i++) {
      const a = stars[i];
      for (let j = i + 1; j < count; j++) {
        const b = stars[j];
        const dx = a.px - b.px;
        if (dx > LINK || dx < -LINK) continue;
        const dy = a.py - b.py;
        const d2 = dx * dx + dy * dy;
        if (d2 > link2) continue;
        const level = Math.min(LEVELS - 1, ((1 - Math.sqrt(d2) / LINK) * LEVELS) | 0);
        linkBuckets[level].push(a.px, a.py, b.px, b.py);
      }
      if (a.lift > 0.02) {
        const level = Math.min(POINTER_LEVELS - 1, (a.lift * POINTER_LEVELS) | 0);
        pointerBuckets[level].push(pointer.x, pointer.y, a.px, a.py);
      }
    }

    if (!meteor.active) {
      if (dt > 0 && time >= meteor.nextAt) launchMeteor();
    } else {
      meteor.age += dt;
      meteor.x += meteor.vx * dt;
      meteor.y += meteor.vy * dt;
      if (meteor.age >= meteor.span) {
        meteor.active = false;
        meteor.nextAt = time + 8 + Math.random() * 11;
      }
    }
  }

  function strokeBuckets(buckets, alphas) {
    for (let level = 0; level < buckets.length; level++) {
      const lines = buckets[level];
      if (!lines.length) continue;
      ctx.globalAlpha = alphas[level];
      ctx.beginPath();
      for (let k = 0; k < lines.length; k += 4) {
        ctx.moveTo(lines[k], lines[k + 1]);
        ctx.lineTo(lines[k + 2], lines[k + 3]);
      }
      ctx.stroke();
      lines.length = 0;
    }
  }

  function drawMeteor() {
    const life = meteor.age / meteor.span;
    const speed = Math.hypot(meteor.vx, meteor.vy);
    const tail = meteor.length * Math.min(1, life * 3);
    const tx = meteor.x - (meteor.vx / speed) * tail;
    const ty = meteor.y - (meteor.vy / speed) * tail;
    const trail = ctx.createLinearGradient(meteor.x, meteor.y, tx, ty);
    trail.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    trail.addColorStop(0.3, 'rgba(155, 233, 248, 0.45)');
    trail.addColorStop(1, 'rgba(139, 92, 246, 0)');
    ctx.globalAlpha = Math.sin(Math.PI * life); // yumuşak belirip sönme
    ctx.strokeStyle = trail;
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(meteor.x, meteor.y);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(meteor.x, meteor.y, 1.3, 0, TAU);
    ctx.fill();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    ctx.lineWidth = 1;
    ctx.lineCap = 'butt';
    ctx.strokeStyle = gradient;
    strokeBuckets(linkBuckets, LINK_ALPHA);
    ctx.strokeStyle = '#22d3ee';
    strokeBuckets(pointerBuckets, POINTER_ALPHA);

    let color = -1;
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      if (s.px < -8 || s.px > width + 8 || s.py < -8 || s.py > height + 8) continue;
      if (s.color !== color) {
        color = s.color;
        ctx.fillStyle = PALETTE[color];
      }
      ctx.globalAlpha = s.alpha;
      ctx.beginPath();
      ctx.arc(s.px, s.py, s.radius, 0, TAU);
      ctx.fill();

      if (s.radius > 1.25 || s.flare > 0) {
        ctx.globalAlpha = s.alpha * (0.1 + s.flare * 0.2);
        ctx.beginPath();
        ctx.arc(s.px, s.py, s.radius * (3.2 + s.flare * 3), 0, TAU);
        ctx.fill();
      }
      if (s.flare > 0.02) {
        // Dört kollu ince parıltı
        const reach = s.radius * (4 + s.flare * 6);
        ctx.globalAlpha = s.flare * 0.5;
        ctx.fillRect(s.px - reach, s.py - 0.4, reach * 2, 0.8);
        ctx.fillRect(s.px - 0.4, s.py - reach, 0.8, reach * 2);
      }
    }

    if (meteor.active) drawMeteor();
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    time += dt;

    const started = performance.now();
    update(dt);
    draw();

    // Bu katmanın kendi maliyeti yüksekse (zayıf cihaz) yıldız sayısını bir kez azalt
    cost += (performance.now() - started - cost) * 0.05;
    if (density === 1 && ++frames > 240 && cost > COST_LIMIT) {
      density = 0.6;
      canvas.dataset.quality = 'low';
      populate();
    }
  }

  function sync() {
    const animate = !reducedMotion && !document.hidden;
    if (animate && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    } else if (!animate && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  window.addEventListener('resize', () => {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => {
      resizeQueued = false;
      resize();
    });
  });
  document.addEventListener('visibilitychange', sync);

  if (finePointer && !reducedMotion) {
    window.addEventListener('pointermove', (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => { pointer.active = false; });
    window.addEventListener('blur', () => { pointer.active = false; });
  }

  resize();
  sync();
})();
