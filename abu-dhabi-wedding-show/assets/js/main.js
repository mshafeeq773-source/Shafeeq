/* Abu Dhabi Wedding Show — motion and interaction
   Stack: GSAP 3 (ScrollTrigger + SplitText) and Lenis smooth scroll, all vendored in assets/js/vendor.
   Everything degrades: without JS, or with "reduce motion" on, the site is a static, fully readable page. */
(function () {
  'use strict';

  var html = document.documentElement;
  var body = document.body;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var motion = !reduce && !!(window.gsap && window.ScrollTrigger && window.SplitText);
  if (!motion) html.classList.add('reduced');
  if (fine) html.classList.add('fine');

  var header = document.querySelector('.site-header');
  var lenis = null;
  var cursorPress = function () {};

  /* ---------------------------------------------------------------- scroll engine */
  function getY() { return lenis ? lenis.scroll : (window.scrollY || window.pageYOffset); }

  function scrollToY(y, done) {
    if (lenis) {
      lenis.scrollTo(y, { duration: 1, lock: true, easing: function (t) { return 1 - Math.pow(1 - t, 4); }, onComplete: done });
    } else if (motion) {
      var o = { y: getY() };
      gsap.to(o, { y: y, duration: 1, ease: 'power4.out', onUpdate: function () { window.scrollTo(0, o.y); }, onComplete: done });
    } else { window.scrollTo(0, y); if (done) done(); }
  }

  if (motion) {
    gsap.registerPlugin(ScrollTrigger, SplitText);
    ScrollTrigger.config({ ignoreMobileResize: true });
    if (window.Lenis) {
      lenis = new Lenis({ lerp: 0.1, smoothWheel: true, anchors: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    }
  }

  /* ---------------------------------------------------------------- header */
  var lastY = getY();
  function onScroll(y) {
    if (!header) return;
    header.classList.toggle('is-scrolled', y > 40);
    var menuOpen = body.classList.contains('menu-open');
    var immersive = header.classList.contains('is-immersive');
    if (menuOpen) header.classList.remove('is-hidden');
    else if (immersive || (y > lastY + 4 && y > 240)) header.classList.add('is-hidden');
    else if (y < lastY - 4 || y <= 240) header.classList.remove('is-hidden');
    lastY = y;
  }
  if (lenis) lenis.on('scroll', function (e) { onScroll(e.scroll); });
  else window.addEventListener('scroll', function () { onScroll(getY()); }, { passive: true });
  onScroll(getY());

  /* ---------------------------------------------------------------- menu */
  var toggle = document.querySelector('.menu-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var open = body.classList.toggle('menu-open');
      toggle.setAttribute('aria-expanded', open);
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (lenis) { open ? lenis.stop() : lenis.start(); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && body.classList.contains('menu-open')) toggle.click();
    });
  }
  document.querySelectorAll('.has-sub > button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var open = btn.parentElement.classList.toggle('open');
      btn.setAttribute('aria-expanded', open);
    });
  });
  document.addEventListener('click', function (e) {
    document.querySelectorAll('.has-sub.open').forEach(function (li) {
      if (!li.contains(e.target) && !body.classList.contains('menu-open')) {
        li.classList.remove('open');
        li.querySelector('button').setAttribute('aria-expanded', 'false');
      }
    });
  });

  /* ---------------------------------------------------------------- page curtain */
  var curtain = document.querySelector('.curtain');
  var veils = curtain ? [curtain.querySelector('.curtain__panel--pink'), curtain.querySelector('.curtain__panel--purple')] : null;

  function curtainOpen() {
    var tl = gsap.timeline();
    if (!veils) return tl;
    gsap.set(curtain, { visibility: 'visible' });
    tl.to(veils[1], { yPercent: -100, duration: 1, ease: 'expo.inOut' }, 0)
      .to(veils[0], { yPercent: -100, duration: 1, ease: 'expo.inOut' }, 0.1)
      .set(curtain, { visibility: 'hidden' });
    return tl;
  }
  function curtainClose() {
    var tl = gsap.timeline();
    if (!veils) return tl;
    gsap.set(curtain, { visibility: 'visible' });
    gsap.set(veils, { yPercent: 100 });
    tl.to(veils[0], { yPercent: 0, duration: 0.75, ease: 'expo.inOut' }, 0)
      .to(veils[1], { yPercent: 0, duration: 0.75, ease: 'expo.inOut' }, 0.1);
    return tl;
  }

  /* internal links: cover the page, then navigate */
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href');
    if (href === '#') { e.preventDefault(); return; }
    if (!motion || !veils) return;
    if (href.charAt(0) === '#' || /^(mailto|tel):/.test(href) || a.target === '_blank' || a.hasAttribute('download') ||
        e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    var url; try { url = new URL(href, location.href); } catch (err) { return; }
    if (url.protocol !== location.protocol || url.host !== location.host) return;
    if (url.pathname === location.pathname && url.hash) return;
    e.preventDefault();
    if (lenis) lenis.stop();
    curtainClose().then(function () { location.href = url.href; });
  });
  window.addEventListener('pageshow', function (e) {
    if (e.persisted && motion && veils) { gsap.set(veils, { yPercent: 0 }); curtainOpen(); if (lenis) lenis.start(); }
  });

  /* ---------------------------------------------------------------- hero */
  function heroIntro() {
    var tl = gsap.timeline();
    var hero = document.querySelector('.hero');
    if (!hero) return tl;
    var wide = window.innerWidth >= 1024;
    var navItems = wide ? '.site-header .nav li' : '.site-header .menu-toggle';
    tl.fromTo(hero.querySelector('img'), { scale: 1.16 }, { scale: 1, duration: 2.4, ease: 'expo.out' }, 0)
      .from('.site-header .logo', { y: -14, autoAlpha: 0, duration: 1, ease: 'power3.out', clearProps: 'all' }, 0.15)
      .from(navItems, { y: -10, autoAlpha: 0, duration: 0.9, stagger: 0.05, ease: 'power3.out', clearProps: 'all' }, 0.25)
      .from('.play', { scale: 0.5, autoAlpha: 0, duration: 1.3, ease: 'expo.out' }, 0.3)
      .from('.scroll-hint', { autoAlpha: 0, duration: 1 }, 1.1);
    return tl;
  }
  function heroParallax() {
    var hero = document.querySelector('.hero');
    if (!hero) return;
    gsap.to(hero.querySelector('img'), { yPercent: 8, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.scroll-hint', { autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: '25% top', scrub: true } });
  }

  /* ---------------------------------------------------------------- scroll reveals */
  function inStory(el) { return !!el.closest('.story'); }

  function reveals() {
    var once = function (el, start) { return { trigger: el, start: start || 'top 88%', once: true }; };

    /* headlines: masked line reveals (the signature move) */
    document.querySelectorAll('.display, .kicker, .edition-title, .gallery__title').forEach(function (el) {
      if (inStory(el)) return;
      SplitText.create(el, {
        type: 'lines', mask: 'lines', linesClass: 'line', autoSplit: true,
        onSplit: function (self) {
          return gsap.from(self.lines, { yPercent: 140, duration: 1.2, ease: 'power4.out', stagger: 0.09, scrollTrigger: once(el) });
        }
      });
    });

    /* supporting copy: soft rise */
    document.querySelectorAll('.eyebrow, .body > p, .btn, .meta, .edition-label, .tier__label, .footer__brand > a, .footer__info, .footer__links').forEach(function (el) {
      if (inStory(el)) return;
      gsap.from(el, { y: 28, autoAlpha: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: once(el, 'top 92%') });
    });

    /* thin pink rules draw in from the left */
    document.querySelectorAll('.rule, .site-footer').forEach(function (el) {
      gsap.fromTo(el, { '--line': 0 }, { '--line': 1, duration: 1.4, ease: 'expo.inOut', scrollTrigger: once(el, 'top 94%') });
    });

    /* images: veil reveal (clip from the bottom) with a slow settle of the scale */
    document.querySelectorAll('.about__media, .past__media, .edition__media, .duo__media').forEach(function (el) {
      var img = el.querySelector('img');
      gsap.set(el, { clipPath: 'inset(0% 0% 100% 0%)' });
      gsap.set(img, { scale: 1.2 });
      gsap.timeline({ scrollTrigger: once(el, 'top 85%') })
        .to(el, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut' }, 0)
        .to(img, { scale: 1, duration: 1.9, ease: 'expo.out' }, 0.15);
      /* parallax drift while in view: only the Past Editions photo, whose file carries spare above and below.
         The other photos are cut exactly to their artboard crops, so they stay put. */
      if (!el.classList.contains('past__media')) return;
      gsap.fromTo(img, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    /* photo grids: staggered reveal */
    var grid = function (items, from, stagger) {
      if (!items.length) return;
      var imgs = items.map(function (li) { return li.querySelector('img'); });
      gsap.set(items, { clipPath: from });
      gsap.set(imgs, { scale: 1.2 });
      gsap.timeline({ scrollTrigger: once(items[0].parentElement, 'top 85%') })
        .to(items, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut', stagger: stagger }, 0)
        .to(imgs, { scale: 1, duration: 1.8, ease: 'expo.out', stagger: stagger, onComplete: function () { gsap.set(imgs, { clearProps: 'transform' }); } }, 0.15);
    };
    document.querySelectorAll('.gallery__grid').forEach(function (g) { grid(gsap.utils.toArray('li', g), 'inset(0% 0% 100% 0%)', 0.12); });

    /* past editions card: the pink panel wipes in, the edition list follows line by line */
    document.querySelectorAll('.past__text').forEach(function (el) {
      gsap.fromTo(el, { '--wipe': 0 }, { '--wipe': 1, duration: 1.5, ease: 'expo.inOut', scrollTrigger: once(el, 'top 85%') });
    });
    document.querySelectorAll('.editions').forEach(function (ul) {
      var items = gsap.utils.toArray('li', ul);
      gsap.from(items, { y: 24, autoAlpha: 0, duration: 1.1, ease: 'power3.out', stagger: 0.11, scrollTrigger: once(ul, 'top 92%') });
      gsap.fromTo(items, { '--line': 0 }, { '--line': 1, duration: 1.3, ease: 'expo.inOut', stagger: 0.11, scrollTrigger: once(ul, 'top 92%') });
    });
  }

  /* ---------------------------------------------------------------- story: Connect / Discover / Experience */
  function story() {
    var section = document.querySelector('[data-story]');
    if (!section) return;
    var panels = gsap.utils.toArray('.story__panel', section);
    var n = panels.length;
    if (n < 2) return;
    var medias = panels.map(function (p) { return p.querySelector('.story__media'); });
    var imgs = panels.map(function (p) { return p.querySelector('.story__media img'); });
    var kickers = panels.map(function (p) { return p.querySelector('.kicker'); });
    var titles = panels.map(function (p) { return p.querySelector('.display'); });
    var bodies = panels.map(function (p) { return p.querySelector('.story__body'); });
    var num = section.querySelector('.story__num-inner');
    var fill = section.querySelector('.story__track i');
    var veil = section.querySelector('.story__veil');
    var active = 0;
    var swapTl = null;
    var pad = function (i) { return (i < 9 ? '0' : '') + (i + 1); };
    var linesOf = function (el) { return el._lines || []; };

    kickers.concat(titles).forEach(function (el) {
      var i = panels.indexOf(el.closest('.story__panel'));
      SplitText.create(el, {
        type: 'lines', mask: 'lines', linesClass: 'line', autoSplit: true,
        onSplit: function (self) { el._lines = self.lines; gsap.set(self.lines, { yPercent: i === active ? 0 : 140 }); }
      });
    });
    bodies.forEach(function (b, i) { gsap.set(b, { autoAlpha: i === 0 ? 1 : 0, y: i === 0 ? 0 : 24 }); });
    medias.forEach(function (m, i) { gsap.set(m, { autoAlpha: i === 0 ? 1 : 0 }); gsap.set(imgs[i], { scale: i === 0 ? 1 : 1.1 }); });

    /* 1. images: a slow cinematic dissolve driven by the scroll position */
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: section, start: 'top top', end: 'bottom bottom', scrub: 0.7,
        onUpdate: function (self) { update(self.progress); },
        onToggle: function (self) { if (header) header.classList.toggle('is-immersive', self.isActive); }
      }
    });
    for (var i = 1; i < n; i++) {
      var t = i - 0.75;                            /* transition i lives between i-0.75 and i-0.25 */
      tl.to(medias[i], { autoAlpha: 1, duration: 0.5, ease: 'power1.inOut' }, t)
        .to(imgs[i], { scale: 1, duration: 0.5, ease: 'none' }, t)
        .to(imgs[i - 1], { scale: 1.07, duration: 0.5, ease: 'none' }, t)
        .to(veil, { opacity: 0.55, duration: 0.25, ease: 'sine.in' }, t)      /* dip through the brand purple */
        .to(veil, { opacity: 0, duration: 0.25, ease: 'sine.out' }, t + 0.25);
    }
    tl.to({}, { duration: 0.25 }, n - 1.25);       /* pad so panel k sits exactly at progress k/(n-1) */

    function update(p) {
      gsap.set(fill, { scaleX: p });
      var idx = gsap.utils.clamp(0, n - 1, Math.round(p * (n - 1)));
      if (idx !== active) swap(active, idx);
    }

    /* 2. text: a choreographed swap, independent of the scrub.
          Kicker rolls, headline lines lift out and rise in, body drifts in last. */
    function swap(from, to) {
      var dir = to > from ? 1 : -1;
      active = to;
      if (swapTl) swapTl.kill();
      panels.forEach(function (p, i) {
        if (i !== from && i !== to) {
          gsap.set(linesOf(kickers[i]).concat(linesOf(titles[i])), { yPercent: 140 });
          gsap.set(bodies[i], { autoAlpha: 0 });
        }
      });
      var stg = function (each) { return { each: each, from: dir > 0 ? 'start' : 'end' }; };
      swapTl = gsap.timeline({ defaults: { overwrite: 'auto' } });
      swapTl
        .to(linesOf(kickers[from]), { yPercent: -140 * dir, duration: 0.55, ease: 'power3.in' }, 0)
        .to(linesOf(titles[from]), { yPercent: -140 * dir, duration: 0.6, ease: 'power3.in', stagger: stg(0.06) }, 0.04)
        .to(bodies[from], { autoAlpha: 0, y: -16 * dir, duration: 0.45, ease: 'power2.in' }, 0)
        .fromTo(linesOf(kickers[to]), { yPercent: 140 * dir }, { yPercent: 0, duration: 1, ease: 'power4.out' }, 0.5)
        .fromTo(linesOf(titles[to]), { yPercent: 140 * dir }, { yPercent: 0, duration: 1.1, ease: 'power4.out', stagger: stg(0.08) }, 0.56)
        .fromTo(bodies[to], { autoAlpha: 0, y: 26 * dir }, { autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out' }, 0.8)
        .to(num, { yPercent: -100 * dir, duration: 0.4, ease: 'power2.in' }, 0)
        .call(function () { num.textContent = pad(to); }, null, 0.4)
        .fromTo(num, { yPercent: 100 * dir }, { yPercent: 0, duration: 0.7, ease: 'power3.out', immediateRender: false }, 0.4);
    }

    /* 3. snapping: when scrolling settles inside the story, glide to the nearest panel.
          A short flick past a panel jumps to the next one. */
    var st = tl.scrollTrigger;
    var labels = [];
    for (var k = 0; k < n; k++) labels.push(k / (n - 1));
    var settleTimer = null, snapUntil = 0, settledIdx = 0;
    function settle() {
      if (window.__adws && window.__adws.noSnap) return;
      var p = st.progress;
      if (!st.isActive || p < 0.002 || p > 0.998) { settledIdx = Math.round(p * (n - 1)); return; }
      var target = Math.round(p * (n - 1));
      if (target === settledIdx && Math.abs(p - labels[settledIdx]) > 0.06) {
        target = gsap.utils.clamp(0, n - 1, settledIdx + (p > labels[settledIdx] ? 1 : -1));
      }
      var y = st.start + labels[target] * (st.end - st.start);
      if (Math.abs(y - getY()) < 2) { settledIdx = target; return; }
      snapUntil = Date.now() + 1400;              /* guard in case the glide is interrupted */
      scrollToY(y, function () { snapUntil = 0; settledIdx = target; });
    }
    function onScrollEvent() {
      if (Date.now() < snapUntil) return;
      clearTimeout(settleTimer);
      settleTimer = setTimeout(settle, 150);
    }
    if (lenis) lenis.on('scroll', onScrollEvent);
    else window.addEventListener('scroll', onScrollEvent, { passive: true });
  }

  /* ---------------------------------------------------------------- gallery (home, before the footer) */
  var galleryIntros = [];

  function carousel() {
    /* Five photos across the content column, the middle one always the largest
       (artboard: 368.5 / 276.5 / 253.5 px wide, 20.5 px gaps).

       One number drives everything: pos, the (fractional) index of the photo in the middle.
       The size, place and opacity of every slide are pure functions of its distance from pos,
       so the layout can never drift out of step with the motion. The row loops: photos fade
       out in one page margin and back in from the other. */
    document.querySelectorAll('[data-carousel]').forEach(function (root) {
      var track = root.querySelector('.carousel__track');
      var originals = Array.prototype.slice.call(track.querySelectorAll('.carousel__slide'));
      var count = originals.length;
      if (!window.gsap || count < 3) return;

      /* the loop needs spare slides beyond the five on show: repeat the set until there are at least nine */
      var slides = originals.slice();
      while (slides.length < 9) {
        originals.forEach(function (el) {
          var c = el.cloneNode(true);
          c.setAttribute('aria-hidden', 'true');
          track.appendChild(c); slides.push(c);
        });
      }
      var n = slides.length;
      var inners = slides.map(function (el) { return el.querySelector('.carousel__img'); });
      var imgs = slides.map(function (el) { return el.querySelector('img'); });
      root.classList.add('is-flow');

      var SC = [1, 0.7503, 0.6879, 0.632, 0.59];   /* scale by distance from the middle (276.5/368.5, 253.5/368.5, then tapering) */
      var MAXLAG = 3.2;                            /* % the photo may trail inside its frame (it has 3.5% spare each side) */
      var clamp = function (lo, hi, v) { return Math.max(lo, Math.min(hi, v)); };
      var st = { pos: Math.floor(count / 2) };     /* which photo is in the middle */
      var fx = { press: 1, spread: 1, show: 1 };   /* press: grab feedback. spread + show: the entrance */
      var cw = 0, gap = 0, vw = 0, unit = 1, left = 0;
      var vel = 0, lag = 0, lastPos = st.pos, dirty = true, activeIdx = -1;
      var tween = null, drag = null, lastTouch = -1e9, introDone = !motion;

      function measure() {
        var col = root.clientWidth;                /* the content column */
        var w = window.innerWidth;
        vw = track.clientWidth;                    /* the full-bleed stage */
        left = track.getBoundingClientRect().left;
        if (w >= 1024) { gap = col * 0.01358; cw = (col - 4 * gap) / (SC[0] + 2 * SC[1] + 2 * SC[2]); }   /* five fill the column */
        else if (w >= 768) { gap = 14; cw = (col - 2 * gap) / (SC[0] + 2 * SC[1]); }                      /* three fill it, the next pair peek in */
        else { gap = 10; cw = vw * 0.62; }                                                                /* one, with its neighbours peeking in */
        unit = cw * (SC[0] + SC[1]) / 2 + gap;     /* px from the middle photo to its neighbour */
        track.style.setProperty('--cw', cw.toFixed(2) + 'px');
        dirty = true;
      }
      function scaleAt(d) {
        d = Math.abs(d);
        var i = Math.floor(d);
        return i >= SC.length - 1 ? SC[SC.length - 1] : SC[i] + (SC[i + 1] - SC[i]) * (d - i);
      }
      /* Lay the row out for a given pos. Slides are placed from their real widths, so the gaps stay exactly
         constant while the sizes change. Slot k holds the slide k places right of the one that last passed the
         middle; that slide (k = 0) drifts left by one full step as pos runs from a whole number to the next.
         Returns centres (px from the middle of the stage) and widths for k = -K..K, at index k + K. */
      var K = 5;
      function layout(pos) {
        var base = Math.floor(pos), f = pos - base, w = [], x = [], k;
        for (k = -K; k <= K; k++) w[k + K] = cw * scaleAt(k - f);
        x[K] = -f * ((w[K] + w[K + 1]) / 2 + gap);
        for (k = 1; k <= K; k++) x[K + k] = x[K + k - 1] + (w[K + k - 1] + w[K + k]) / 2 + gap;
        for (k = -1; k >= -K; k--) x[K + k] = x[K + k + 1] - (w[K + k + 1] + w[K + k]) / 2 - gap;
        return { base: base, f: f, w: w, x: x };
      }
      /* where a point on slide `abs` (an unwrapped index), a fraction r across its width, sits for a given pos */
      function pointAt(pos, abs, r) {
        var L = layout(pos), k = abs - L.base, e = k > K ? K : k < -K ? -K : k;
        return L.x[e + K] + (k - e) * (L.w[e + K] + gap) + r * L.w[e + K];
      }
      /* the pos that puts that point x px from the middle: lets the grabbed point stay under the pointer */
      function posFor(abs, r, x, near) {
        var lo = near - 8, hi = near + 8;
        for (var i = 0; i < 28; i++) { var m = (lo + hi) / 2; if (pointAt(m, abs, r) > x) lo = m; else hi = m; }
        return (lo + hi) / 2;
      }
      function fadeAt(d) { d = Math.abs(d); if (d <= 2) return 1; if (d >= 3) return 0; var t = d - 2; return 1 - t * t * (3 - 2 * t); }
      function wrap(i) { var d = (i - st.pos) % n; if (d < -n / 2) d += n; else if (d >= n / 2) d -= n; return d; }

      function render() {
        var cx = vw / 2, L = layout(st.pos), best = 9, bestI = 0;
        for (var i = 0; i < n; i++) {
          var el = slides[i];
          var k = (((i - L.base) % n) + n) % n; if (k > n / 2) k -= n;       /* nearest copy of this slide */
          var d = k - L.f, a = Math.abs(d), mid = a < 0.5;
          if (a < best) { best = a; bestI = i; }
          var o = k > K || k < -K ? 0 : fadeAt(d) * (mid ? 1 : fx.show);
          if (o < 0.004) { if (!el._off) { el._off = true; el.style.visibility = 'hidden'; } continue; }
          if (el._off) { el._off = false; el.style.visibility = ''; }
          var x = cx + L.x[k + K] * fx.spread - cw / 2;
          var sc = L.w[k + K] / cw * fx.press * (mid ? 1 : 0.82 + 0.18 * fx.spread);
          el.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0) scale(' + sc.toFixed(4) + ')';
          el.style.opacity = o > 0.996 ? '' : o.toFixed(3);
          el.style.zIndex = String(20 - Math.round(a * 4));
          inners[i].style.transform = 'translate3d(' + lag.toFixed(3) + '%,0,0)';
        }
        if (bestI !== activeIdx) {
          if (activeIdx >= 0) slides[activeIdx].classList.remove('is-active');
          slides[bestI].classList.add('is-active'); activeIdx = bestI;
        }
      }

      /* every frame: read the speed, let the photos trail a little inside their frames, redraw if anything changed */
      gsap.ticker.add(function (time, delta) {
        var dt = clamp(4, 64, delta || 16.7) / 1000;
        var v = (st.pos - lastPos) / dt; lastPos = st.pos;
        vel += (v - vel) * Math.min(1, dt * 9);                       /* slots per second, smoothed */
        var want = motion ? clamp(-MAXLAG, MAXLAG, vel * 0.78) : 0;
        if (Math.abs(want - lag) > 0.004) { lag += (want - lag) * Math.min(1, dt * 9); dirty = true; }
        else if (lag !== want) { lag = want; dirty = true; }
        if (dirty) { dirty = false; render(); }
      });
      var redraw = function () { dirty = true; };
      var touched = function () { lastTouch = performance.now(); };

      function glide(to, duration, ease) {
        if (tween) tween.kill();
        if (!motion) { st.pos = to; lastPos = to; tween = null; redraw(); return; }
        tween = gsap.to(st, { pos: to, duration: duration, ease: ease, onUpdate: redraw, onComplete: function () {
          tween = null;
          if (Math.abs(st.pos) > n * 50) { st.pos -= n * Math.round(st.pos / n); lastPos = st.pos; }   /* keep the number small */
        } });
      }
      function step(dir, auto) {
        var from = tween ? tween.vars.pos : Math.round(st.pos);
        glide(from + dir, auto ? 1.6 : 1.05, auto ? 'power3.inOut' : 'power4.out');
      }

      measure(); render();
      if (window.ResizeObserver) new ResizeObserver(function () { measure(); }).observe(root);
      window.addEventListener('resize', measure);

      /* ---- drag (mouse) and swipe (touch, pen) ---- */
      function grab(e) {
        drag.live = true;
        try { track.setPointerCapture(e.pointerId); } catch (err) {}
        root.classList.add('is-grabbing');
        cursorPress(true);
        if (motion) gsap.to(fx, { press: 0.965, duration: 0.45, ease: 'power3.out', onUpdate: redraw, overwrite: 'auto' });
      }
      /* which slide is under x (px from the middle), and how far across it */
      function hit(x) {
        var L = layout(st.pos), bestK = 0, bestD = 1e9;
        for (var k = -K; k <= K; k++) { var dd = Math.abs(x - L.x[k + K]) - L.w[k + K] / 2; if (dd < bestD) { bestD = dd; bestK = k; } }
        return { abs: L.base + bestK, r: (x - L.x[bestK + K]) / L.w[bestK + K], inside: bestD <= 0 };
      }
      track.addEventListener('pointerdown', function (e) {
        if (drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
        if (tween) { tween.kill(); tween = null; }
        touched();
        left = track.getBoundingClientRect().left;
        var h = hit(e.clientX - left - vw / 2);
        drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, abs: h.abs, r: h.r, inside: h.inside, from: st.pos, moved: 0, live: false,
                 samples: [[performance.now(), st.pos]] };
        if (e.pointerType === 'mouse') { e.preventDefault(); grab(e); }
      });
      track.addEventListener('pointermove', function (e) {
        if (!drag || e.pointerId !== drag.id) return;
        var dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
        var x = e.clientX - left - vw / 2;
        if (!drag.live) {                          /* touch: wait to see whether this is a swipe or a page scroll */
          if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
          if (Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
          var h = hit(x); drag.abs = h.abs; drag.r = h.r;        /* take hold from here, so nothing jumps */
          grab(e);
        }
        drag.moved = Math.max(drag.moved, Math.abs(dx));
        st.pos = posFor(drag.abs, drag.r, x, st.pos);            /* the point that was grabbed stays under the pointer */
        drag.samples.push([performance.now(), st.pos]);
        if (drag.samples.length > 10) drag.samples.shift();
        redraw();
      });
      function release(e) {
        if (!drag || (e && e.pointerId !== undefined && e.pointerId !== drag.id)) return;
        var d = drag; drag = null;
        root.classList.remove('is-grabbing');
        cursorPress(false);
        touched();
        if (motion) gsap.to(fx, { press: 1, duration: 0.8, ease: 'power3.out', onUpdate: redraw, overwrite: 'auto' });
        else { fx.press = 1; redraw(); }
        if (d.moved <= 6) {                        /* a click or tap, not a drag: bring that photo to the middle */
          var tapped = e && e.type === 'pointerup' && d.inside;
          glide(tapped ? d.abs : Math.round(st.pos), tapped && d.abs !== Math.round(st.pos) ? 1.1 : 0.5, 'power4.out');
          return;
        }
        if (!d.live) return;
        /* release speed over the last ~100 ms, in slots per second */
        var s = d.samples, last = s[s.length - 1], now = performance.now(), v = 0;
        if (now - last[0] < 80) {
          for (var i = 0; i < s.length - 1; i++) {
            if (last[0] - s[i][0] <= 110) { var span = (last[0] - s[i][0]) / 1000; if (span > 0.012) v = (last[1] - s[i][1]) / span; break; }
          }
        }
        v = clamp(-9, 9, v);
        var moved = st.pos - d.from;
        var to = Math.round(st.pos + v * 0.17);                                   /* a flick carries on */
        if (to === Math.round(d.from) && Math.abs(moved) > 0.12) to = Math.round(d.from) + (moved > 0 ? 1 : -1);   /* a short, deliberate drag still turns one */
        var dist = Math.abs(to - st.pos);
        /* power3.out starts at 3x its average speed: choose the duration that continues the release speed */
        var duration = Math.abs(v) > 0.5 ? clamp(0.6, 1.5, 3 * dist / Math.abs(v)) : clamp(0.6, 1.2, 0.5 + dist * 0.8);
        glide(to, duration, 'power3.out');
      }
      track.addEventListener('pointerup', release);
      track.addEventListener('pointercancel', release);
      /* touch pointers start captured by the photo they landed on; handing the capture to the track fires
         lostpointercapture on that photo, which bubbles up here. Only the track losing it ends the drag. */
      track.addEventListener('lostpointercapture', function (e) { if (e.target === track) release(e); });
      track.addEventListener('dragstart', function (e) { e.preventDefault(); });

      /* ---- sideways trackpad / wheel: move the row, leave vertical scrolling to the page ---- */
      var wheelTimer = 0;
      track.addEventListener('wheel', function (e) {
        if (Math.abs(e.deltaX) < 1 || Math.abs(e.deltaX) <= Math.abs(e.deltaY) * 1.2) return;
        e.preventDefault(); e.stopPropagation();
        if (drag) return;
        if (tween) { tween.kill(); tween = null; }
        touched();
        st.pos += (e.deltaMode === 1 ? e.deltaX * 32 : e.deltaX) / unit;
        redraw();
        clearTimeout(wheelTimer);
        wheelTimer = setTimeout(function () { if (!drag) glide(Math.round(st.pos), 0.8, 'power3.out'); }, 110);
      }, { passive: false });

      /* ---- keyboard ---- */
      track.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); touched(); step(1); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); touched(); step(-1); }
      });

      /* ---- quiet autoplay: one photo at a time, only while on screen and left alone ---- */
      var every = parseFloat(root.getAttribute('data-autoplay')) || 0;
      if (every && motion) {
        var inView = false, hover = false;
        if (window.IntersectionObserver) new IntersectionObserver(function (en) { inView = en[0].isIntersecting; }, { threshold: 0.4 }).observe(track);
        else inView = true;
        track.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hover = true; });
        track.addEventListener('pointerleave', function () { hover = false; touched(); });
        var lastAuto = 0;
        setInterval(function () {                  /* a light check twice a second; the move itself is a GSAP tween */
          var now = performance.now();
          if (now - Math.max(lastTouch, lastAuto) < every * 1000) return;
          if (!introDone || !inView || hover || drag || tween || document.hidden || document.activeElement === track) return;
          lastAuto = now;
          step(1, true);
        }, 500);
      }

      /* ---- entrance: the middle photo is unveiled, then the others slide out from behind it ---- */
      if (motion) galleryIntros.push(function () {
        var m = ((Math.round(st.pos) % n) + n) % n;
        var others = imgs.filter(function (im, i) { return i !== m; });
        fx.spread = 0; fx.show = 0;
        gsap.set(slides[m], { clipPath: 'inset(100% 0% 0% 0%)' });
        gsap.set(imgs, { scale: 1.3 });
        redraw();
        gsap.timeline({
          scrollTrigger: { trigger: track, start: 'top 82%', once: true },
          onComplete: function () { introDone = true; touched(); gsap.set(imgs, { clearProps: 'transform' }); gsap.set(slides[m], { clearProps: 'clipPath' }); }
        })
          .to(slides[m], { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'expo.out' }, 0)
          .to(imgs[m], { scale: 1, duration: 2, ease: 'expo.out' }, 0)
          .to(fx, { spread: 1, duration: 1.8, ease: 'expo.out', onUpdate: redraw }, 0.28)
          .to(fx, { show: 1, duration: 0.3, ease: 'none', onUpdate: redraw }, 0.28)       /* opaque almost at once: they emerge from behind, no see-through overlaps */
          .to(others, { scale: 1, duration: 2, ease: 'expo.out' }, 0.28);
      });
    });
  }

  /* ---------------------------------------------------------------- cursor + magnetic (fine pointers only) */
  function cursor() {
    var el = document.querySelector('.cursor');
    if (!el || !fine || !motion) return;
    var label = el.querySelector('span');
    var xTo = gsap.quickTo(el, 'x', { duration: 0.2, ease: 'power3' });
    var yTo = gsap.quickTo(el, 'y', { duration: 0.2, ease: 'power3' });
    var shown = false, down = false, seen = false, px = 0, py = 0;

    function show(on, text) {
      if (on && text && label.textContent !== text) label.textContent = text;
      if (on === shown) return;
      shown = on;
      html.classList.toggle('cursor-on', on);        /* the native cursor hides only while this one is visible */
      if (on) { xTo(px, px); yTo(py, py); }          /* appear under the pointer, never fly in from the last spot */
      gsap.to(el, { autoAlpha: on ? 1 : 0, scale: on ? (down ? 0.7 : 1) : 0.4, duration: on ? 0.4 : 0.22, ease: 'power3.out', overwrite: 'auto' });
    }
    function check(target) {
      if (down) return;                              /* while dragging, the label stays put */
      var t = target && target.closest ? target.closest('[data-cursor]') : null;
      show(!!t, t ? t.getAttribute('data-cursor') : '');
    }
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') { if (!down) show(false); return; }
      px = e.clientX; py = e.clientY; seen = true;
      xTo(px); yTo(py);
      check(e.target);
    }, { passive: true });
    /* the page can move under a still pointer (wheel, keys, the smooth-scroll glide): look again at what is under it */
    var recheck = function () { if (seen && !down) check(document.elementFromPoint(px, py)); };
    if (lenis) lenis.on('scroll', recheck); else window.addEventListener('scroll', recheck, { passive: true });
    html.addEventListener('mouseleave', function () { if (!down) show(false); });
    window.addEventListener('blur', function () { down = false; show(false); });

    cursorPress = function (on) {
      down = on;
      if (shown) gsap.to(el, { scale: on ? 0.7 : 1, duration: 0.35, ease: 'power3.out', overwrite: 'auto' });
      if (!on) recheck();
    };
  }

  function magnetic() {
    if (!fine || !motion) return;
    document.querySelectorAll('.play, .btn').forEach(function (el) {
      var isPlay = el.classList.contains('play');
      var k = isPlay ? 0.35 : 0.3;
      el.addEventListener('pointerenter', function () { gsap.to(el, { scale: isPlay ? 1.08 : 1.03, duration: 0.6, ease: 'power3.out' }); });
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * k, y: (e.clientY - r.top - r.height / 2) * k, duration: 0.6, ease: 'power3.out' });
      });
      el.addEventListener('pointerleave', function () { gsap.to(el, { x: 0, y: 0, scale: 1, duration: 1, ease: 'elastic.out(1, 0.45)' }); });
    });
  }

  /* ---------------------------------------------------------------- hero film dialog */
  var dialog = document.getElementById('video-dialog');
  document.querySelectorAll('.play').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var src = btn.getAttribute('data-video');
      if (!src || !dialog || !dialog.showModal) return;
      var v = dialog.querySelector('video');
      v.src = src;
      dialog.showModal();
      if (lenis) lenis.stop();
      v.play();
    });
  });
  if (dialog) {
    var close = function () { var v = dialog.querySelector('video'); v.pause(); dialog.close(); if (lenis) lenis.start(); };
    dialog.querySelector('.close').addEventListener('click', close);
    dialog.addEventListener('click', function (e) { if (e.target === dialog) close(); });
    dialog.addEventListener('close', function () { if (lenis) lenis.start(); });
  }

  /* ---------------------------------------------------------------- boot */
  carousel();

  if (!motion) return;

  cursor();
  magnetic();

  function whenReady(cb) {
    var done = false;
    var go = function () { if (!done) { done = true; cb(); } };
    var waits = [document.fonts ? document.fonts.ready : Promise.resolve()];
    var heroImg = document.querySelector('.hero > img');
    if (heroImg && !heroImg.complete) waits.push(new Promise(function (r) { heroImg.addEventListener('load', r, { once: true }); heroImg.addEventListener('error', r, { once: true }); }));
    Promise.all(waits).then(go);
    setTimeout(go, 1500);
  }

  whenReady(function () {
    reveals();
    galleryIntros.forEach(function (run) { run(); });
    story();
    heroParallax();
    ScrollTrigger.refresh();
    gsap.timeline()
      .add(curtainOpen(), 0)
      .add(heroIntro(), 0.3);
  });

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });

  /* exposed for QA scripts */
  window.__adws = { lenis: lenis, ScrollTrigger: ScrollTrigger };
})();
