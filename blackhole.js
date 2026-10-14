/* ==========================================================================
   Kara delik (Gargantua esinli) — WebGL + özel GLSL shader
   --------------------------------------------------------------------------
   Harici kütüphane gerektirmez. Her piksel için bir ışın, kara deliğin
   çevresinde adım adım bükülerek izlenir (kütleçekimsel merceklenme). Işın
   akresyon diskinin düzlemini her kestiğinde diskin o noktadaki ışığı eklenir;
   diskin kara deliğin üstünde ve altında görünen yayları bu bükülmenin doğal
   sonucudur, ayrıca çizilmez.

   Sahne: index.html > #blackhole   ·   Stil: style.css > .blackhole
   ========================================================================== */
(() => {
  'use strict';

  const stage = document.getElementById('blackhole');
  const canvas = document.getElementById('blackholeCanvas');
  if (!stage || !canvas) return;

  const host = stage.parentElement; // etiketler de aynı --px / --py değerleriyle kayar
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Kalite kademeleri: çizilecek en fazla piksel + ışın başına adım sayısı.
  // Kareler uzamaya başlarsa bir alt kademeye inilir (bkz. frame).
  const TIERS = [
    { pixels: 820000, steps: 150 },
    { pixels: 480000, steps: 120 },
    { pixels: 260000, steps: 92 },
    { pixels: 140000, steps: 70 },
  ];
  const SLOW_FRAME = 27;   // ms; ortalama kare süresi bunu aşarsa "yavaş" sayılır
  const SLOW_WINDOW = 900; // ms; bu kadar süre kesintisiz yavaş kalırsa kalite düşer
  const SETTLE = 700;      // ms; başlangıç ve kademe değişimi sonrası ölçüm yapılmayan süre
  const STILL_TIME = 14;   // azaltılmış hareket modunda gösterilen sabit an (sn)

  const VERTEX = 'attribute vec2 aPos; void main() { gl_Position = vec4(aPos, 0.0, 1.0); }';

  const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 uRes;
uniform float uTime;
uniform vec3 uView;    // x: yatay kayma, y: bakış yüksekliği farkı, z: yatış farkı
uniform float uSteps;

// Uzunluk birimi: olay ufkunun yarıçapı = 1
const float PI = 3.14159265359;
const float R_IN = 2.6;      // diskin iç kenarı
const float R_OUT = 9.2;     // diskin dış kenarı
const float R_DUST = 12.5;   // seyrek toz parçacıklarının bittiği yer
const float R_BOUND = 13.5;  // ışınların izlendiği kürenin yarıçapı
const float B_CRIT = 2.598;  // gölgenin görünen yarıçapı (kritik çarpma parametresi)
const float CAM = 18.0;      // kamera uzaklığı
const float SPIN = 2.2;      // dönüş hızı çarpanı
const int MAX_STEPS = 150;

float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

// Değer gürültüsü; y ekseninde "per" hücrede bir tekrarlar (açı ekseni dikişsiz olsun)
float vnoise(vec2 p, float per) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float y0 = mod(i.y, per);
  float y1 = mod(i.y + 1.0, per);
  return mix(mix(hash21(vec2(i.x, y0)), hash21(vec2(i.x + 1.0, y0)), f.x),
             mix(hash21(vec2(i.x, y1)), hash21(vec2(i.x + 1.0, y1)), f.x), f.y);
}

float fbm(vec2 p, float per) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 3; i++) {
    sum += amp * vnoise(p, per);
    p = vec2(p.x * 2.13, p.y * 2.0);
    per *= 2.0;
    amp *= 0.5;
  }
  return sum / 0.875;
}

// Diskin gaz dokusu: iri kümeler + halka boyunca uzanan ince şeritler
float streaks(float r, float a, float seed) {
  float u = a / (2.0 * PI);
  float big = fbm(vec2(r * 1.4 + seed, u * 4.0), 4.0);
  float fine = fbm(vec2(r * 6.5 - seed, u * 10.0), 10.0);
  return big * 0.55 + fine * 0.45;
}

// Yörüngede dönen küçük parçacıklar. Her halka kendi hızında döner.
float sparks(float r, float phi) {
  float ring = floor(r / 0.42);
  float rc = (ring + 0.5) * 0.42;
  float w = SPIN * pow(rc, -1.5);
  float cells = floor(rc * 2.6) + 3.0;
  float x = fract((phi - w * uTime) / (2.0 * PI)) * cells;
  vec2 id = vec2(ring, floor(x));
  float h = hash21(id);
  if (h < 0.7) return 0.0;
  vec2 c = 0.22 + 0.56 * vec2(hash21(id + 1.7), hash21(id + 9.2));
  vec2 d = vec2((fract(x) - c.x) * (2.0 * PI * rc / cells), (fract(r / 0.42) - c.y) * 0.42);
  float twinkle = 0.55 + 0.45 * sin(uTime * (1.2 + 3.0 * h) + h * 50.0);
  return twinkle * smoothstep(0.058, 0.0, length(d));
}

// Işının disk düzlemini kestiği noktadaki ışık (rgb) ve örtücülük (a)
vec4 shadeDisk(vec3 hit, vec3 dir) {
  float r = length(hit.xz);
  if (r < R_IN || r > R_DUST) return vec4(0.0);
  float phi = atan(hit.z, hit.x);
  vec3 col = vec3(0.0);
  float alpha = 0.0;

  float body = smoothstep(R_IN, R_IN + 0.45, r) * (1.0 - smoothstep(R_OUT - 3.4, R_OUT, r));
  if (body > 0.001) {
    // İç kısım dışa göre daha hızlı döner. Doku zamanla sonsuza kadar
    // sarılmasın diye iki faz yarım dönem arayla akıtılıp harmanlanır.
    float w = SPIN * pow(r, -1.5);
    float cycle = 18.0;
    float p1 = fract(uTime / cycle);
    float p2 = fract(uTime / cycle + 0.5);
    float rigid = uTime * 0.05;
    float n1 = streaks(r, phi - rigid - w * (p1 - 0.5) * cycle, 0.0);
    float n2 = streaks(r, phi - rigid - w * (p2 - 0.5) * cycle, 5.7);
    float k = abs(p1 * 2.0 - 1.0);
    float n = (mix(n1, n2, k) - 0.5) / sqrt(k * k + (1.0 - k) * (1.0 - k)) + 0.5;

    // İçe doğru sarılan iki kollu yoğunluk dalgası (enerji akışı)
    float arms = 0.5 + 0.5 * sin(2.0 * (phi - uTime * 0.11) + 4.5 * log(r));
    float dens = smoothstep(0.30, 0.78, n) * (0.72 + 0.4 * arms);
    float prof = pow(R_IN / r, 1.9);

    // Bize doğru dönen taraf daha parlak ve sıcak görünür (Doppler)
    vec3 tangent = normalize(vec3(-hit.z, 0.0, hit.x));
    float beta = sqrt(0.5 / r);
    float dop = 1.0 / (1.0 - beta * dot(tangent, -dir));
    float boost = mix(1.0, dop * dop * dop, 0.55);

    float t = (r - R_IN) / (R_OUT - R_IN);
    vec3 tint = mix(vec3(0.231, 0.510, 0.965), vec3(0.545, 0.361, 0.965), smoothstep(0.18, 0.85, t));
    tint = mix(vec3(0.78, 0.92, 1.0), tint, smoothstep(0.0, 0.32, t));
    tint = mix(tint, vec3(0.85, 0.96, 1.0), clamp((dop - 1.0) * 0.55, 0.0, 0.6));

    col = tint * body * prof * (0.16 + 1.5 * dens) * boost * 2.4;
    alpha = body * clamp(0.45 + 0.75 * dens, 0.0, 1.0) * 0.93;
  }

  float dust = sparks(r, phi) * (1.0 - smoothstep(R_OUT + 0.8, R_DUST, r));
  col += vec3(0.75, 0.88, 1.0) * dust * 0.9;
  return vec4(col, alpha);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = (frag * 2.0 - uRes) / uRes.x;
  float aspect = uRes.y / uRes.x;
  // Tuvalin kenarına hiçbir şey ulaşmasın
  float mask = (1.0 - smoothstep(0.78, 1.0, abs(uv.x))) * (1.0 - smoothstep(0.74, 1.0, abs(uv.y) / aspect));

  float roll = -0.24 + uView.z;
  float cr = cos(roll);
  float sr = sin(roll);
  uv = vec2(uv.x * cr - uv.y * sr, uv.x * sr + uv.y * cr);
  uv.x += uView.x;

  // Kamera disk düzleminin biraz üstünden, neredeyse yandan bakar
  float pitch = 0.11 + uView.y;
  vec3 ro = CAM * vec3(0.0, sin(pitch), cos(pitch));
  vec3 fw = normalize(-ro);
  vec3 rt = vec3(1.0, 0.0, 0.0);
  vec3 up = cross(rt, fw);
  vec3 rd = normalize(fw * (CAM / 10.6) + rt * uv.x + up * uv.y);

  vec3 col = vec3(0.0);
  float shadow = 0.0;

  float b = dot(ro, rd);
  float disc = b * b - (dot(ro, ro) - R_BOUND * R_BOUND);
  if (mask > 0.0 && disc > 0.0) {
    vec3 pos = ro + rd * (-b - sqrt(disc));
    vec3 vel = rd;
    vec3 hv = cross(pos, vel);
    float h2 = dot(hv, hv);
    float trans = 1.0;
    float haze = 0.0;
    float crossings = 0.0;

    // Gölge: çarpma parametresi kritik değerin (3√3/2) altındaki ışınlar kaçamaz.
    // Kenar, sayısal adımlara bağlı kalmadan bir piksel genişliğinde yumuşatılır.
    float edge = 21.2 / uRes.x;
    shadow = 1.0 - smoothstep(B_CRIT - edge, B_CRIT + edge, sqrt(h2));

    pos += vel * hash21(frag) * 0.6;  // adım bantlarını gizleyen küçük kaydırma

    for (int i = 0; i < MAX_STEPS; i++) {
      if (float(i) >= uSteps) break;
      float r2 = dot(pos, pos);
      if (r2 < 1.0) break;                                                // olay ufku: ışık kaçamaz
      if (r2 > R_BOUND * R_BOUND * 1.03 && dot(pos, vel) > 0.0) break;   // uzaklaştı
      if (shadow > 0.5 && dot(pos, vel) > 0.0) break;                     // gölgedeki ışın geri dönemez
      float r = sqrt(r2);
      float dt = clamp(r * 0.075, 0.03, 0.9);

      // Işığın kara delik çevresindeki bükülmesi (Schwarzschild)
      vel -= 1.5 * h2 * pos / (r2 * r2 * r) * dt;
      vec3 np = pos + vel * dt;

      if (pos.y * np.y < 0.0) {
        // Yalnızca ilk iki görüntü çizilir. Daha üst sıradakiler pikselden ince
        // olduğundan kırpışır; yerlerini aşağıdaki pürüzsüz foton halkası tutar.
        if (crossings < 1.5) {
          vec3 hit = mix(pos, np, pos.y / (pos.y - np.y));
          vec4 d = shadeDisk(hit, normalize(vel));
          col += trans * d.rgb;
          trans *= 1.0 - d.a;
        }
        crossings += 1.0;
      }

      // Diskin çevresindeki ince gaz: ışıma (bloom) etkisini ışın boyunca toplar
      float rxz = length(np.xz);
      haze += trans * dt * exp(-abs(np.y) * 0.95)
            * smoothstep(R_IN - 0.5, R_IN + 1.0, rxz) * exp(-(rxz - R_IN) * 0.42);

      pos = np;
      if (trans < 0.02) break;
    }

    col += vec3(0.27, 0.40, 1.0) * haze * 0.02;

    // Foton halkası: gölgenin hemen dışında, ışığın kara deliği dolandığı ince parlak çizgi
    float ringOffset = (sqrt(h2) - B_CRIT - 0.03) / (edge * 1.4);
    col += vec3(0.82, 0.92, 1.0) * exp(-ringOffset * ringOffset) * trans * 1.1;
  }

  col = 1.0 - exp(-col * 1.3);
  float lum = max(col.r, max(col.g, col.b));
  gl_FragColor = vec4(col, max(shadow, lum)) * mask;
}`;

  const lowPower = !finePointer
    || (navigator.hardwareConcurrency || 8) <= 4
    || (navigator.deviceMemory || 8) <= 4;

  let tier = lowPower ? 1 : 0;
  let gl = null;
  let uniforms = null;
  let ready = false;
  let inView = true;
  let raf = 0;
  let last = 0;
  let clock = 0;
  let average = 16.7;
  let slowTime = 0;
  let measureFrom = 0;
  let shownX = '';
  let shownY = '';
  const pointer = { x: 0, y: 0 };
  const view = { x: 0, y: 0 };

  function setup() {
    gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
    if (!gl) return false;

    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
      console.error('Kara delik shader derlenemedi:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    };
    const vs = compile(gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT);
    if (!vs || !fs) return false;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Kara delik programı bağlanamadı:', gl.getProgramInfoLog(program));
      return false;
    }
    gl.useProgram(program);

    // Tüm tuvali kaplayan tek üçgen
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    uniforms = {
      res: gl.getUniformLocation(program, 'uRes'),
      time: gl.getUniformLocation(program, 'uTime'),
      view: gl.getUniformLocation(program, 'uView'),
      steps: gl.getUniformLocation(program, 'uSteps'),
    };
    return true;
  }

  // Çizim çözünürlüğü: ekran yoğunluğu ile kademenin piksel sınırından küçük olanı
  function resize() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scale = Math.min(dpr, Math.sqrt(TIERS[tier].pixels / (w * h)));
    const bw = Math.max(2, Math.round(w * scale));
    const bh = Math.max(2, Math.round(h * scale));
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    gl.viewport(0, 0, bw, bh);
  }

  function draw(seconds) {
    gl.uniform2f(uniforms.res, canvas.width, canvas.height);
    gl.uniform1f(uniforms.time, seconds);
    gl.uniform3f(uniforms.view, view.x * 0.03, -view.y * 0.045, view.x * 0.03);
    gl.uniform1f(uniforms.steps, TIERS[tier].steps);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const elapsed = now - last;
    last = now;
    clock += Math.min(elapsed, 100) / 1000;

    // İmleci yumuşakça izleyen bakış + kendi kendine çok hafif salınım
    view.x += (pointer.x + Math.sin(clock * 0.21) * 0.18 - view.x) * 0.045;
    view.y += (pointer.y + Math.cos(clock * 0.17) * 0.14 - view.y) * 0.045;
    const px = view.x.toFixed(2);
    const py = view.y.toFixed(2);
    if (px !== shownX || py !== shownY) {
      host.style.setProperty('--px', px);
      host.style.setProperty('--py', py);
      shownX = px;
      shownY = py;
    }

    draw(clock);

    // Kareler uzuyorsa kaliteyi düşür. Süreye göre ölçülür ki çok yavaş cihaz
    // uzun süre beklemesin; çok yavaşsa iki kademe birden inilir.
    if (now > measureFrom) {
      average += (elapsed - average) * 0.2;
      slowTime = average > SLOW_FRAME ? slowTime + elapsed : 0;
      if (slowTime > SLOW_WINDOW && tier < TIERS.length - 1) {
        tier = Math.min(TIERS.length - 1, tier + (average > SLOW_FRAME * 2.5 ? 2 : 1));
        slowTime = 0;
        average = 16.7;
        measureFrom = now + SETTLE;
        stage.dataset.quality = String(tier);
        resize();
      }
    }
  }

  // Yalnızca gerektiğinde çiz: sahne görünürken, sekme açıkken, hareket serbestken
  function sync() {
    const animate = ready && inView && !document.hidden && !motionQuery.matches;
    if (animate && !raf) {
      last = performance.now();
      // Sayfa yüklenirken ya da sekmeye dönerken oluşan takılmalar ölçüme karışmasın
      measureFrom = last + SETTLE;
      slowTime = 0;
      average = 16.7;
      raf = requestAnimationFrame(frame);
    } else if (!animate && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    if (ready && motionQuery.matches) draw(STILL_TIME);
  }

  function start() {
    ready = setup();
    if (!ready) {
      stage.classList.add('is-fallback');
      return;
    }
    stage.classList.remove('is-fallback');
    stage.dataset.quality = String(tier);
    resize();
    draw(motionQuery.matches ? STILL_TIME : clock);
    stage.classList.add('is-ready');
    sync();
  }

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    ready = false;
    sync();
  });
  canvas.addEventListener('webglcontextrestored', start);

  if ('ResizeObserver' in window) {
    new ResizeObserver(() => { if (ready) { resize(); if (!raf) draw(motionQuery.matches ? STILL_TIME : clock); } }).observe(stage);
  } else {
    window.addEventListener('resize', () => { if (ready) { resize(); if (!raf) draw(motionQuery.matches ? STILL_TIME : clock); } });
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      inView = entries[entries.length - 1].isIntersecting;
      sync();
    }, { rootMargin: '120px' }).observe(stage);
  }

  document.addEventListener('visibilitychange', sync);
  if (motionQuery.addEventListener) motionQuery.addEventListener('change', sync);

  if (finePointer) {
    window.addEventListener('pointermove', (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
  }

  start();
})();
