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
      /* parallax drift while in view */
      gsap.fromTo(img, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    /* grids and carousels: staggered reveal */
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
    document.querySelectorAll('.carousel__track').forEach(function (t) { grid(gsap.utils.toArray('.carousel__slide', t), 'inset(0% 100% 0% 0%)', 0.14); });
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

  /* ---------------------------------------------------------------- carousel */
  function carousel() {
    document.querySelectorAll('[data-carousel]').forEach(function (root) {
      var track = root.querySelector('.carousel__track');
      var slides = gsap && gsap.utils ? gsap.utils.toArray('.carousel__slide', track) : Array.prototype.slice.call(track.querySelectorAll('.carousel__slide'));
      var next = root.querySelector('.carousel__btn--next');
      var prev = root.querySelector('.carousel__btn--prev');
      var step = function () { return slides[0].getBoundingClientRect().width + (parseFloat(getComputedStyle(track).columnGap) || 0); };
      var index = function () { return Math.round(track.scrollLeft / step()); };
      var update = function () {
        var max = track.scrollWidth - track.clientWidth - 2;
        root.classList.toggle('is-scrolled', track.scrollLeft > 2);
        root.classList.toggle('is-end', track.scrollLeft >= max);
      };
      var goTo = function (i) {
        i = Math.max(0, Math.min(slides.length - 1, i));
        var x = Math.min(i * step(), track.scrollWidth - track.clientWidth);
        if (motion) {
          track.classList.add('is-dragging');
          gsap.to(track, { scrollLeft: x, duration: 0.9, ease: 'power3.out', overwrite: true, onComplete: function () { track.classList.remove('is-dragging'); } });
        } else track.scrollTo({ left: x, behavior: 'smooth' });
      };
      next.addEventListener('click', function () { goTo(index() + 1); });
      prev.addEventListener('click', function () { goTo(index() - 1); });
      track.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update);
      update();

      /* mouse drag */
      if (fine && motion) {
        var down = false, startX = 0, startLeft = 0, moved = 0;
        track.addEventListener('pointerdown', function (e) {
          if (e.pointerType !== 'mouse' || e.button !== 0) return;
          down = true; moved = 0; startX = e.clientX; startLeft = track.scrollLeft;
          gsap.killTweensOf(track);
          track.classList.add('is-dragging');
          track.setPointerCapture(e.pointerId);
          cursorPress(true);
        });
        track.addEventListener('pointermove', function (e) {
          if (!down) return;
          moved = e.clientX - startX;
          track.scrollLeft = startLeft - moved;
        });
        var up = function () {
          if (!down) return;
          down = false; cursorPress(false);
          var i = Math.round(startLeft / step());
          goTo(Math.abs(moved) > 30 ? i - Math.sign(moved) : index());
        };
        track.addEventListener('pointerup', up);
        track.addEventListener('pointercancel', up);
      }
    });
  }

  /* ---------------------------------------------------------------- cursor + magnetic (fine pointers only) */
  function cursor() {
    var el = document.querySelector('.cursor');
    if (!el || !fine || !motion) return;
    var label = el.querySelector('span');
    var xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
    var yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
    var shown = false;
    var show = function (on, text) {
      if (on === shown) return;
      shown = on;
      if (on && text) label.textContent = text;
      gsap.to(el, { autoAlpha: on ? 1 : 0, scale: on ? 1 : 0.4, duration: 0.45, ease: 'power3.out', overwrite: true });
    };
    window.addEventListener('pointermove', function (e) {
      xTo(e.clientX); yTo(e.clientY);
      var t = e.target && e.target.closest ? e.target.closest('[data-cursor]') : null;
      show(!!t, t ? t.getAttribute('data-cursor') : '');
    }, { passive: true });
    document.addEventListener('pointerleave', function () { show(false); });
    cursorPress = function (down) { if (shown) gsap.to(el, { scale: down ? 0.8 : 1, duration: 0.35, ease: 'power3.out', overwrite: 'auto' }); };
  }

  function magnetic() {
    if (!fine || !motion) return;
    document.querySelectorAll('.play, .btn, .carousel__btn').forEach(function (el) {
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
