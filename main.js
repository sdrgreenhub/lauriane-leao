(() => {
  const WHATSAPP = '5561992061622';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  /* ---------- Lead form -> WhatsApp ---------- */
  const form = $('#lead-form');
  const whats = $('#whats');
  const dateInput = $('#data');
  dateInput.min = new Date().toISOString().split('T')[0];

  whats.addEventListener('input', () => {
    const d = whats.value.replace(/\D/g, '').slice(0, 11);
    let out = d;
    if (d.length > 2) out = `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length > 7) out = `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
    whats.value = out;
  });

  const plano = $('#plano');
  const addon = $('.chip--addon');
  const syncAddon = () => {
    const isWedding = /casamento/i.test(plano.value);
    addon.hidden = !isWedding;
    if (!isWedding) addon.querySelector('input').checked = false;
  };
  plano.addEventListener('change', syncAddon);

  $$('[data-plan]').forEach(a => a.addEventListener('click', () => {
    plano.value = a.dataset.plan;
    syncAddon();
    plano.closest('.field').classList.remove('is-invalid');
  }));

  const validators = {
    nome: v => v.trim().length >= 2,
    whats: v => v.replace(/\D/g, '').length >= 10,
    plano: v => v !== '',
    data: v => v !== '' || plano.value === 'Edição de vídeo avulsa'
  };

  const validateField = el => {
    const ok = validators[el.name] ? validators[el.name](el.value) : true;
    el.closest('.field').classList.toggle('is-invalid', !ok);
    return ok;
  };

  Object.keys(validators).forEach(name => {
    const el = form.elements[name];
    el.addEventListener('blur', () => el.value && validateField(el));
    el.addEventListener('input', () => el.closest('.field').classList.contains('is-invalid') && validateField(el));
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const fields = Object.keys(validators).map(n => form.elements[n]);
    const invalid = fields.filter(el => !validateField(el));
    if (invalid.length) { invalid[0].focus(); return; }

    const f = form.elements;
    const [y, m, d] = f.data.value.split('-');
    const lines = [
      'Olá, Lauriane! Vim pelo seu site e quero saber mais ✨',
      '',
      `*Nome:* ${f.nome.value.trim()}`,
      `*WhatsApp:* ${f.whats.value}`,
      `*Plano:* ${f.plano.value}`,
      f.makingof.checked ? '*Adicional:* Making of da noiva' : null,
      f.data.value ? `*Data:* ${d}/${m}/${y}` : null,
      f.local.value.trim() ? `*Local:* ${f.local.value.trim()}` : null
    ].filter(l => l !== null);

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: 'generate_lead', lead_plan: f.plano.value, lead_making_of: f.makingof.checked });

    const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(lines.join('\n'))}`;
    const win = window.open(url, '_blank');
    if (win) win.opener = null;
    else location.href = url;
  });

  $$('[data-wa-direct]').forEach(a => a.addEventListener('click', () => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: 'whatsapp_click' });
  }));

  /* ---------- Lazy videos: play only in view ---------- */
  const videoIO = new IntersectionObserver(entries => {
    entries.forEach(({ target: v, isIntersecting }) => {
      if (isIntersecting) {
        if (v.dataset.src && !v.src) { v.src = v.dataset.src; }
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
  }, { rootMargin: '200px 0px' });
  $$('.reel video, .hero video').forEach(v => videoIO.observe(v));

  /* ---------- Portfolio drag + filters ---------- */
  const reel = $('.reel');
  let down = false, startX = 0, startLeft = 0, moved = false;
  reel.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse') return;
    down = true; moved = false; startX = e.clientX; startLeft = reel.scrollLeft;
    reel.classList.add('is-dragging');
  });
  window.addEventListener('pointermove', e => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 4) moved = true;
    reel.scrollLeft = startLeft - dx;
  });
  window.addEventListener('pointerup', () => { down = false; reel.classList.remove('is-dragging'); });
  reel.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);

  $$('.filter').forEach(btn => btn.addEventListener('click', () => {
    const cat = btn.dataset.filter;
    $$('.filter').forEach(b => { b.classList.toggle('is-active', b === btn); b.setAttribute('aria-selected', b === btn); });
    let first = null;
    $$('.reel__item').forEach(item => {
      const match = cat === 'all' || item.dataset.cat === cat;
      item.classList.toggle('is-dim', !match);
      if (match && !first) first = item;
    });
    if (first) reel.scrollTo({ left: first.offsetLeft - reel.firstElementChild.offsetLeft - 0, behavior: 'smooth' });
  }));

  /* ---------- Timecode ---------- */
  const tc = $('[data-timecode]');
  const t0 = performance.now();
  const pad = n => String(n).padStart(2, '0');
  const tick = () => {
    const s = (performance.now() - t0) / 1000;
    tc.textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(Math.floor(s) % 60)}`;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  /* ---------- Nav + WhatsApp float ---------- */
  const nav = $('.nav');
  const wa = $('.wa-float');
  let lastY = 0;
  let formInView = false;
  new IntersectionObserver(([e]) => { formInView = e.isIntersecting; onScroll(); }).observe(form);
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 40);
    nav.classList.toggle('is-hidden', y > lastY && y > 300);
    wa.classList.toggle('is-visible', y > window.innerHeight * .6 && !formInView);
    lastY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const hidePreloader = () => { $('.preloader').style.display = 'none'; document.body.classList.remove('is-loading'); };

  if (!hasGsap || reduced) {
    hidePreloader();
    $$('.step').forEach(s => s.classList.add('is-in'));
    return;
  }

  /* ================= MOTION ================= */
  gsap.registerPlugin(ScrollTrigger);
  document.body.classList.add('is-loading');

  let lenis = null;
  if (typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    lenis.stop();
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    const target = id.length > 1 ? $(id) : null;
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { offset: id === '#topo' ? 0 : -20, duration: 1.4 });
    else target.scrollIntoView({ behavior: 'smooth' });
  }));

  /* Split headings into words (keeps <em> / <br>) */
  const splitWords = el => {
    const walk = node => {
      [...node.childNodes].forEach(child => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'word';
            const inner = document.createElement('span'); inner.textContent = part;
            w.appendChild(inner); frag.appendChild(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') {
          walk(child);
        }
      });
    };
    walk(el);
  };
  $$('.split').forEach(splitWords);

  /* Preloader -> hero intro */
  const counter = $('[data-count]');
  const heroImg = $('.hero__bg');
  const imgReady = heroImg.complete ? Promise.resolve() : new Promise(r => { heroImg.onload = r; heroImg.onerror = r; });
  const minTime = new Promise(r => setTimeout(r, 1400));
  const prog = { v: 0 };

  gsap.set('.preloader__line > *', { yPercent: 110 });
  gsap.set('.hero__title .line > span', { yPercent: 115 });
  gsap.set(['.hero__eyebrow', '.hero__sub', '.hero__ctas', '.hero__hud', '.hero__scroll'], { autoAlpha: 0, y: 24 });
  gsap.set('.hero__phone', { autoAlpha: 0, y: 120, rotate: 16 });
  gsap.set('.hero__bg', { scale: 1.25 });
  gsap.set('.nav', { autoAlpha: 0, y: -20 });

  gsap.to('.preloader__line > *', { yPercent: 0, duration: 1, ease: 'expo.out', stagger: .12, delay: .1 });
  const countTween = gsap.to(prog, {
    v: 90, duration: 1.3, ease: 'power2.out',
    onUpdate: () => counter.textContent = pad(Math.round(prog.v))
  });

  Promise.all([imgReady, minTime, document.fonts ? document.fonts.ready : null]).then(() => {
    countTween.kill();
    gsap.timeline()
      .to(prog, { v: 100, duration: .35, ease: 'power1.out', onUpdate: () => counter.textContent = pad(Math.round(prog.v)) })
      .to('.preloader__line > *', { yPercent: -110, duration: .7, ease: 'expo.in', stagger: .06 }, '+=.1')
      .to(['.preloader__count', '.preloader__rec'], { autoAlpha: 0, duration: .3 }, '<')
      .to('.preloader', { clipPath: 'inset(0 0 100% 0)', duration: 1, ease: 'expo.inOut' }, '-=.2')
      .add(() => { hidePreloader(); if (lenis) lenis.start(); })
      .to('.hero__bg', { scale: 1, duration: 2.2, ease: 'expo.out' }, '-=.8')
      .to('.hero__title .line > span', { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: .09 }, '-=2')
      .to('.hero__eyebrow', { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out' }, '-=1.2')
      .to('.hero__phone', { autoAlpha: 1, y: 0, rotate: 6, duration: 1.6, ease: 'expo.out' }, '-=1.1')
      .to(['.hero__sub', '.hero__ctas', '.hero__hud', '.hero__scroll'], { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out', stagger: .08 }, '-=1.3')
      .to('.nav', { autoAlpha: 1, y: 0, duration: .9, ease: 'expo.out' }, '-=1');
  });

  /* Hero scroll parallax */
  gsap.to('.hero__bg', {
    yPercent: 12, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  });
  gsap.to('.hero__phone', {
    yPercent: -30, rotate: -4, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  });
  gsap.to('.hero__content', {
    yPercent: -18, autoAlpha: .2, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'center center', end: 'bottom top', scrub: true }
  });

  /* Marquee speeds up with scroll velocity */
  const marquees = $$('.marquee__track').map(t => t.getAnimations()[0]).filter(Boolean);
  let rateTimer;
  ScrollTrigger.create({
    onUpdate: self => {
      const v = Math.min(Math.abs(self.getVelocity()) / 400, 5);
      marquees.forEach(a => a.playbackRate = 1 + v);
      clearTimeout(rateTimer);
      rateTimer = setTimeout(() => marquees.forEach(a => a.playbackRate = 1), 180);
    }
  });

  /* Split headings reveal */
  $$('.split').forEach(el => {
    gsap.from($$('.word > span', el), {
      yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: .05,
      scrollTrigger: { trigger: el, start: 'top 85%' }
    });
  });

  /* Generic reveals */
  gsap.set('.reveal', { autoAlpha: 0, y: 48 });
  ScrollTrigger.batch('.reveal', {
    start: 'top 88%',
    onEnter: batch => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: .08, overwrite: true })
  });

  /* Wedding options slide in */
  gsap.from('.plan-options li', {
    x: -30, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: .1,
    scrollTrigger: { trigger: '.offer__card', start: 'top 75%' }
  });

  /* Plan cards tilt on hover */
  if (finePointer) {
    $$('.plan').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - .5;
        const py = (e.clientY - r.top) / r.height - .5;
        gsap.to(card, { rotateY: px * 6, rotateX: -py * 6, duration: .6, ease: 'power3.out', transformPerspective: 900 });
        card.style.setProperty('--mx', `${(px + .5) * 100}%`);
        card.style.setProperty('--my', `${(py + .5) * 100}%`);
      });
      card.addEventListener('pointerleave', () => gsap.to(card, { rotateY: 0, rotateX: 0, duration: .8, ease: 'expo.out' }));
    });
  }

  /* Reel entrance */
  gsap.from('.reel__item', {
    y: 140, rotate: i => (i % 2 ? 5 : -5), autoAlpha: 0, duration: 1.3, ease: 'expo.out', stagger: .07,
    clearProps: 'transform,opacity,visibility',
    scrollTrigger: { trigger: '.reel', start: 'top 85%' }
  });

  /* About parallax */
  gsap.fromTo('.about__img', { yPercent: 6 }, {
    yPercent: -4, ease: 'none',
    scrollTrigger: { trigger: '.about__img-wrap', start: 'top bottom', end: 'bottom top', scrub: true }
  });
  gsap.from('.about__img-wrap', {
    clipPath: 'inset(100% 0 0 0 round 22px)', duration: 1.6, ease: 'expo.inOut',
    scrollTrigger: { trigger: '.about__img-wrap', start: 'top 80%' }
  });
  gsap.from('.about__tag', {
    scale: 0, rotate: -40, duration: 1.2, ease: 'back.out(1.8)',
    scrollTrigger: { trigger: '.about__img-wrap', start: 'top 50%' }
  });

  /* Steps line draw */
  $$('.step').forEach(step => ScrollTrigger.create({
    trigger: step, start: 'top 85%', once: true, onEnter: () => step.classList.add('is-in')
  }));

  /* Lead section rises over */
  gsap.from('.lead', {
    borderRadius: 0, ease: 'none',
    scrollTrigger: { trigger: '.lead', start: 'top bottom', end: 'top 40%', scrub: true }
  });

  /* Final CTA scale */
  gsap.from('.final__title', {
    scale: .85, ease: 'none',
    scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'center center', scrub: true }
  });

  /* Custom cursor + magnetic buttons (desktop only) */
  if (finePointer) {
    const cursor = $('.cursor');
    const label = $('.cursor__label');
    const xTo = gsap.quickTo(cursor, 'x', { duration: .45, ease: 'power3' });
    const yTo = gsap.quickTo(cursor, 'y', { duration: .45, ease: 'power3' });
    window.addEventListener('pointermove', e => { xTo(e.clientX); yTo(e.clientY); cursor.style.opacity = 1; });
    document.addEventListener('pointerleave', () => cursor.style.opacity = 0);

    $$('a, button, summary, .chip').forEach(el => {
      el.addEventListener('pointerenter', () => cursor.classList.add('is-link'));
      el.addEventListener('pointerleave', () => cursor.classList.remove('is-link'));
    });
    $$('.reel__item').forEach(el => {
      el.addEventListener('pointerenter', () => { label.textContent = 'Arraste'; cursor.classList.add('is-video'); });
      el.addEventListener('pointerleave', () => cursor.classList.remove('is-video'));
    });

    $$('.magnetic').forEach(btn => {
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        btn.style.setProperty('--bx', `${(e.clientX - r.left - r.width / 2) * .25}px`);
        btn.style.setProperty('--by', `${(e.clientY - r.top - r.height / 2) * .35}px`);
      });
      btn.addEventListener('pointerleave', () => { btn.style.setProperty('--bx', '0px'); btn.style.setProperty('--by', '0px'); });
    });
  }

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
