(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Bildirim (toast) ---------- */

  const toastEl = document.getElementById('toast');
  let toastTimer;

  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 3600);
  }

  /* ---------- Navigasyon ---------- */

  function initNav() {
    const nav = document.getElementById('nav');
    const toggle = document.getElementById('navToggle');
    const progress = document.getElementById('scrollProgress');
    if (!nav) return;

    const setOpen = (open) => {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
    };

    toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
    nav.querySelectorAll('.nav__menu a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
    document.addEventListener('click', (e) => { if (!nav.contains(e.target)) setOpen(false); });

    // Kaydırma: üst ilerleme çubuğu + menünün koyulaşması
    let ticking = false;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      if (progress) progress.style.transform = `scaleX(${ratio})`;
      nav.classList.toggle('is-scrolled', window.scrollY > 24);
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
    }, { passive: true });
    onScroll();

    // Görünen bölüme göre aktif menü bağlantısı
    const links = [...nav.querySelectorAll('.nav__link')];
    const sections = links.map((l) => document.querySelector(l.getAttribute('href'))).filter(Boolean);
    if (!('IntersectionObserver' in window)) return;

    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === `#${entry.target.id}`));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => spy.observe(s));
  }

  /* ---------- Scroll ile beliren öğeler ---------- */

  function initReveal() {
    const items = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach((el) => io.observe(el));
  }

  /* ---------- Hero: yazı efekti ---------- */

  function initTyped() {
    const el = document.getElementById('typed');
    if (!el) return;
    const phrases = [
      'B2B platformlar geliştiriyorum',
      'Mobil ve web uygulamalar kodluyorum',
      'Ölçeklenebilir mimariler tasarlıyorum',
    ];
    if (reducedMotion) { el.textContent = phrases[0]; return; }

    let phrase = 0;
    let index = 0;
    let deleting = false;

    (function tick() {
      const text = phrases[phrase];
      index += deleting ? -1 : 1;
      el.textContent = text.slice(0, index);

      let delay = deleting ? 30 : 60;
      if (!deleting && index === text.length) { deleting = true; delay = 1900; }
      else if (deleting && index === 0) { deleting = false; phrase = (phrase + 1) % phrases.length; delay = 380; }
      setTimeout(tick, delay);
    })();
  }

  /* ---------- İmleç efektleri: 3D eğim + takip eden ışık ---------- */

  function initPointerEffects() {
    if (!finePointer || reducedMotion) return;

    document.querySelectorAll('.tilt').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        card.classList.add('is-tilting');
        card.style.setProperty('--rx', `${((0.5 - py) * 9).toFixed(2)}deg`);
        card.style.setProperty('--ry', `${((px - 0.5) * 11).toFixed(2)}deg`);
        card.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`);
        card.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
      });
      card.addEventListener('pointerleave', () => {
        card.classList.remove('is-tilting');
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });

    document.querySelectorAll('.spotlight').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const rect = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
        el.style.setProperty('--my', `${e.clientY - rect.top}px`);
      });
    });
  }

  /* ---------- Henüz adresi girilmemiş bağlantılar (href="#") ---------- */

  function initPlaceholderLinks() {
    document.querySelectorAll('a[href="#"]').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        toast(link.dataset.soon || 'Bu bağlantı yakında eklenecek.');
      });
    });
  }

  /* ---------- İletişim formu ----------
     Sunucu gerektirmez: doğrulamadan sonra mesajı ziyaretçinin e-posta
     uygulamasında hazır taslak olarak açar. Alıcı adresi, iletişim kartındaki
     e-posta bağlantısından (#contactEmail) okunur. */

  function initForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    const rules = {
      ad: (v) => v.length >= 2 || 'Lütfen adınızı girin.',
      soyad: (v) => v.length >= 2 || 'Lütfen soyadınızı girin.',
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || 'Geçerli bir e-posta adresi girin.',
      mesaj: (v) => v.length >= 10 || 'Mesajınız en az 10 karakter olmalı.',
    };

    const validate = (input) => {
      const result = rules[input.name](input.value.trim());
      const field = input.closest('.field');
      const valid = result === true;
      field.classList.toggle('is-invalid', !valid);
      field.querySelector('.field__error').textContent = valid ? '' : result;
      input.setAttribute('aria-invalid', String(!valid));
      return valid;
    };

    const inputs = Object.keys(rules).map((name) => form.elements[name]);

    inputs.forEach((input) => {
      input.addEventListener('blur', () => { if (input.value.trim()) validate(input); });
      input.addEventListener('input', () => {
        if (input.closest('.field').classList.contains('is-invalid')) validate(input);
      });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const invalid = inputs.filter((input) => !validate(input));
      if (invalid.length) {
        invalid[0].focus();
        return;
      }

      const data = Object.fromEntries(inputs.map((input) => [input.name, input.value.trim()]));
      const emailLink = document.getElementById('contactEmail');
      const recipient = emailLink ? emailLink.getAttribute('href').replace(/^mailto:/, '') : '';
      const subject = `Portföy iletişim: ${data.ad} ${data.soyad}`;
      const body = `${data.mesaj}\n\n— ${data.ad} ${data.soyad}\n${data.email}`;

      window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      toast('E-posta uygulamanız açılıyor; mesajınız gönderime hazır.');
    });
  }

  /* ---------- Başlat ---------- */

  initNav();
  initReveal();
  initTyped();
  initPointerEffects();
  initPlaceholderLinks();
  initForm();

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
