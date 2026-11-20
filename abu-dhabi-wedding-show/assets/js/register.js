/* Abu Dhabi Wedding Show: registration form
   What this adds on top of the plain HTML form (which works on its own, with the browser's validation):
   - checks each field when you leave it, and clears an error the moment it is fixed
   - on submit: one line saying how many fields need attention, and the first of them gets the focus
   - country: type to search (names, common short names such as UAE or UK, dialling codes);
     industry and dietary: pick lists in the same style
   - mobile: accepts local or international numbers and rewrites them as +971 50 123 4567 (libphonenumber)
   - email: catches common typos (gmial.com) and offers the fix
   - the allergy field appears only when a dietary requirement is chosen
   - keeps what was typed if the page is refreshed (this browser tab only), cleared once sent
   - no double sends; a thank-you message in place of the form
   Server side: the page can arrive with messages already inside .field__error (not hidden); they are shown as they are.
   data-demo on the form: nothing is sent, the thank-you state is shown. Remove the attribute to post normally. */
(function () {
  'use strict';

  var form = document.querySelector('[data-register]');
  if (!form) return;

  var done = document.getElementById('registered');
  var summary = form.querySelector('.form__summary');
  var submit = form.querySelector('.form__submit');
  var demo = form.hasAttribute('data-demo');
  var lib = window.libphonenumber || null;
  var DRAFT = 'adws-registration';
  var sending = false;

  form.noValidate = true;   /* our messages instead of the browser's bubbles */

  function all(sel, root) { return Array.prototype.slice.call((root || form).querySelectorAll(sel)); }
  function fold(s) {
    s = String(s || '');
    if (s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return s.replace(/[’']/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  }
  function wrapOf(name) { return form.querySelector('.field[data-field="' + name + '"]'); }
  function control(name) { return form.querySelector('[name="' + name + '"]'); }
  function viewportH() { return window.visualViewport ? window.visualViewport.height : window.innerHeight; }
  function scrollByY(dy) {
    var l = window.__adws && window.__adws.lenis;
    if (l && l.scrollTo) l.scrollTo(l.scroll + dy, { duration: 0.6 });
    else window.scrollBy({ top: dy, behavior: 'smooth' });
  }
  /* bring an element clear of the fixed header and of the bottom edge (or the on-screen keyboard) */
  function reveal(el, top) {
    var r = el.getBoundingClientRect();
    var min = top || 120, max = viewportH() - 24;
    if (r.top < min) scrollByY(r.top - min);
    else if (r.bottom > max) scrollByY(Math.min(r.bottom - max, r.top - min));
  }

  /* ---------------------------------------------------------------- dropdowns built from the <select>s
     Country is a type-to-search list. Industry and dietary are short pick lists (no typing, so no keyboard pops up on
     phones). All three open the same pink panel as the menu's dropdown. The <select> stays in the form and is what is sent. */
  var select = control('country');
  var combos = {};

  function currentCountry() {
    var o = select.options[select.selectedIndex];
    return o && o.value ? { iso: o.getAttribute('data-iso'), dial: o.getAttribute('data-dial'), label: o.textContent } : null;
  }

  /* cfg: key (for ids), name (the field's name), search (true: type to filter), placeholder */
  function makeCombo(sel, cfg) {
    var box = sel.closest('.combo');
    var field = sel.closest('.field');
    var label = field.querySelector('.field__label');
    var items = all('option', sel).filter(function (o) { return o.value; }).map(function (o, i) {
      var alts = (o.getAttribute('data-alt') || '').split('|').map(fold).filter(Boolean);   /* other names people type: UAE, UK, Turkey */
      return { i: i, value: o.value, label: o.textContent, key: fold(o.textContent), words: fold(o.textContent).split(/[ ,()-]+/),
        alts: alts, altWords: alts.join(' ').split(' '), iso: (o.getAttribute('data-iso') || '').toLowerCase(), dial: o.getAttribute('data-dial') || '', pinned: o.hasAttribute('data-pin') };
    });

    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'field__input combo__input' + (cfg.search ? '' : ' combo__input--pick');
    input.id = 'f-' + cfg.key + '-search';
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-haspopup', 'listbox');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', cfg.key + '-list');
    input.setAttribute('aria-describedby', 'e-' + cfg.key);
    if (sel.required) input.setAttribute('aria-required', 'true');
    input.setAttribute('placeholder', cfg.placeholder);
    if (cfg.search) {
      input.setAttribute('aria-autocomplete', 'list');
      input.setAttribute('autocomplete', sel.getAttribute('autocomplete') || 'off');
      input.setAttribute('autocapitalize', 'words');
      input.setAttribute('spellcheck', 'false');
    } else {
      input.readOnly = true;
      input.setAttribute('autocomplete', 'off');
    }

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'combo__toggle';
    toggle.tabIndex = -1;
    toggle.setAttribute('aria-label', 'Show the list');
    toggle.innerHTML = '<svg viewBox="0 0 14 9" aria-hidden="true"><path d="M1 1.5l6 6 6-6" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';

    var list = document.createElement('ul');
    list.className = 'combo__list';
    list.id = cfg.key + '-list';
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', label.textContent.trim());
    list.setAttribute('data-lenis-prevent', '');
    list.hidden = true;

    var status = document.createElement('p');
    status.className = 'sr-only';
    status.setAttribute('role', 'status');

    sel.hidden = true;
    sel.removeAttribute('id');
    sel.removeAttribute('autocomplete');
    label.htmlFor = input.id;
    box.appendChild(input); box.appendChild(toggle); box.appendChild(list); box.appendChild(status);

    var open = false, shown = [], active = -1, typed = false, ahead = '', aheadTimer = 0;

    function selectedLabel() { var o = sel.options[sel.selectedIndex]; return o && o.value ? o.textContent : ''; }

    /* lower is better, -1 is no match: exact name or short name, name starts with it, a word starts with it,
       another name starts with it, dialling code, then anywhere in the name */
    function rank(it, q) {
      var k;
      if (it.key === q || it.alts.indexOf(q) > -1) return 0;
      if (it.key.indexOf(q) === 0) return 1;
      for (k = 1; k < it.words.length; k++) if (it.words[k].indexOf(q) === 0) return 2;
      for (k = 0; k < it.alts.length; k++) if (it.alts[k].indexOf(q) === 0) return 2.5;
      if (it.iso === q) return 2.5;
      for (k = 0; k < it.altWords.length; k++) if (q.length > 1 && it.altWords[k].indexOf(q) === 0) return 3;
      var digits = q.replace(/^\+|^00/, '');
      if (it.dial && /^\d+$/.test(digits) && it.dial.indexOf(digits) === 0) return it.dial === digits ? 2 : 3;
      if (q.length > 2 && it.key.indexOf(q) > 0) return 4;
      return -1;
    }

    function option(it, q) {
      var li = document.createElement('li');
      li.className = 'combo__option';
      li.id = cfg.key + '-opt-' + it.i;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(sel.value === it.value));
      li._item = it;
      var span = document.createElement('span');
      var at = q ? it.key.indexOf(q) : -1;
      /* the folded key and the label have the same length unless an apostrophe was dropped: only then skip the highlight */
      if (at > -1 && it.key.length === it.label.length) {
        span.appendChild(document.createTextNode(it.label.slice(0, at)));
        var m = document.createElement('mark'); m.textContent = it.label.slice(at, at + q.length); span.appendChild(m);
        span.appendChild(document.createTextNode(it.label.slice(at + q.length)));
      } else span.textContent = it.label;
      li.appendChild(span);
      return li;
    }

    function render() {
      var q = typed ? fold(input.value) : '';
      list.textContent = '';
      if (!q) {
        shown = items.slice();
        shown.forEach(function (it, n) {
          list.appendChild(option(it, ''));
          if (it.pinned && shown[n + 1] && !shown[n + 1].pinned) { var sep = document.createElement('li'); sep.className = 'combo__sep'; sep.setAttribute('role', 'presentation'); list.appendChild(sep); }
        });
      } else {
        shown = items.map(function (it) { return { it: it, r: rank(it, q) }; }).filter(function (x) { return x.r >= 0; })
          .sort(function (a, b) { return a.r - b.r || a.it.i - b.it.i; }).map(function (x) { return x.it; });
        shown.forEach(function (it) { list.appendChild(option(it, q)); });
        if (!shown.length) {
          var none = document.createElement('li'); none.className = 'combo__empty'; none.setAttribute('role', 'presentation');
          none.textContent = 'No match for “' + input.value.trim() + '”. Check the spelling.';
          list.appendChild(none);
        }
      }
      status.textContent = q ? (shown.length ? shown.length + (shown.length === 1 ? ' result' : ' results') : 'No match') : '';
    }

    function setActive(n, scroll) {
      var opts = all('.combo__option', list);
      if (opts[active]) opts[active].classList.remove('is-active');
      active = n;
      if (opts[n]) {
        opts[n].classList.add('is-active');
        input.setAttribute('aria-activedescendant', opts[n].id);
        if (scroll) {
          var top = opts[n].offsetTop, bottom = top + opts[n].offsetHeight;
          if (top < list.scrollTop) list.scrollTop = top - 6;
          else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight + 6;
        }
      } else input.removeAttribute('aria-activedescendant');
    }

    function show() {
      render();
      if (!open) {
        open = true;
        list.hidden = false;
        box.classList.add('is-open');
        input.setAttribute('aria-expanded', 'true');
        /* keep the field and its list on screen together */
        setTimeout(function () {
          if (open) reveal({ getBoundingClientRect: function () { return { top: input.getBoundingClientRect().top, bottom: list.getBoundingClientRect().bottom }; } }, 96);
        }, 60);
      }
      var at = -1;
      if (!typed) shown.forEach(function (it, n) { if (it.value === sel.value) at = n; });
      setActive(typed && shown.length ? 0 : at, true);
      if (at < 0 && !typed) list.scrollTop = 0;
    }

    function hide() {
      if (!open) return;
      open = false;
      list.hidden = true;
      box.classList.remove('is-open');
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      active = -1;
    }

    function choose(it) {
      var changed = sel.value !== it.value;
      sel.value = it.value;
      input.value = it.label;
      typed = false;
      hide();
      if (changed) sel.dispatchEvent(new Event('change', { bubbles: true }));
    }

    /* text that names exactly one option (typed in full, autofilled, or the only match left) */
    function resolve() {
      var q = fold(input.value);
      if (!q) { if (sel.value) { sel.value = ''; sel.dispatchEvent(new Event('change', { bubbles: true })); } return; }
      var exact = items.filter(function (it) { return rank(it, q) === 0; });
      var hits = exact.length ? exact : items.filter(function (it) { return rank(it, q) >= 0; });
      if (hits.length === 1) choose(hits[0]);
    }

    if (cfg.search) {
      input.addEventListener('input', function () {
        typed = true;
        if (sel.value) sel.value = '';
        show();
      });
      input.addEventListener('change', function () { if (!open) resolve(); });
      input.addEventListener('mousedown', function () { if (!open) { typed = false; show(); } });
      input.addEventListener('focus', function () { if (input.value) input.select(); });
    } else {
      input.addEventListener('mousedown', function (e) { if (document.activeElement === input) e.preventDefault(); if (open) hide(); else show(); });
    }
    toggle.addEventListener('mousedown', function (e) { e.preventDefault(); });
    toggle.addEventListener('click', function () { if (open) hide(); else { typed = false; input.focus(); show(); } });
    input.addEventListener('keydown', function (e) {
      var n = shown.length;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!open) { typed = false; show(); if (active < 0 && shown.length) setActive(e.key === 'ArrowDown' ? 0 : shown.length - 1, true); return; }
        if (!n) return;
        setActive(e.key === 'ArrowDown' ? (active + 1) % n : (active - 1 + n) % n, true);
      } else if (e.key === 'Enter' || (e.key === ' ' && !cfg.search)) {
        if (open) { e.preventDefault(); if (shown[active]) choose(shown[active]); else if (n === 1) choose(shown[0]); else if (!cfg.search) hide(); }
        else if (!cfg.search) { e.preventDefault(); show(); }
      } else if (e.key === 'Escape') {
        if (open) { e.stopPropagation(); hide(); if (sel.value) { input.value = selectedLabel(); typed = false; } }
      } else if (e.key === 'Tab') {
        if (open && (typed || !cfg.search) && shown[active]) choose(shown[active]);
      } else if (!cfg.search && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        /* pick lists: typing a letter jumps to the first option that starts with it, as a native list does */
        clearTimeout(aheadTimer);
        ahead += e.key.toLowerCase();
        aheadTimer = setTimeout(function () { ahead = ''; }, 700);
        var hit = -1;
        items.forEach(function (it, k) { if (hit < 0 && it.key.indexOf(ahead) === 0) hit = k; });
        if (hit > -1) { if (open) setActive(hit, true); else choose(items[hit]); }
      }
    });
    list.addEventListener('mousedown', function (e) { e.preventDefault(); });   /* keep the focus in the field */
    list.addEventListener('click', function (e) {
      var li = e.target.closest ? e.target.closest('.combo__option') : null;
      if (li) { choose(li._item); input.focus(); }
    });
    list.addEventListener('mousemove', function (e) {
      var li = e.target.closest ? e.target.closest('.combo__option') : null;
      if (li) { var n = all('.combo__option', list).indexOf(li); if (n !== active) setActive(n, false); }
    });
    box.addEventListener('focusout', function () {
      setTimeout(function () {
        if (box.contains(document.activeElement)) return;
        var was = open;
        hide();
        if (sel.value) input.value = selectedLabel();
        else if (cfg.search) resolve();
        if (was || input.value || touched[cfg.name]) { touched[cfg.name] = true; if (NAMES.indexOf(cfg.name) > -1) check(cfg.name, true); }
      }, 0);
    });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', function () { if (open) reveal(input, 96); });

    var api = { input: input, sync: function () { input.value = selectedLabel(); typed = false; } };
    api.sync();
    combos[cfg.name] = api;
    return api;
  }

  makeCombo(select, { key: 'country', name: 'country', search: true, placeholder: 'Type to search' });
  makeCombo(control('industry[]'), { key: 'industry', name: 'industry[]', search: false, placeholder: 'Select' });
  makeCombo(control('dietary'), { key: 'dietary', name: 'dietary', search: false, placeholder: 'Select' });

  /* ---------------------------------------------------------------- mobile number */
  var mobile = control('mobile');
  var dialCodes = {};
  all('option[data-dial]', select).forEach(function (o) { dialCodes[o.getAttribute('data-dial')] = true; });

  function phoneState(value) {
    var raw = String(value || '').trim();
    var digits = raw.replace(/\D/g, '');
    if (!digits || (/^(\+|00)/.test(raw) && dialCodes[digits.replace(/^00/, '')])) return { empty: true };   /* nothing, or only a dialling code */
    var c = currentCountry();
    var intl = /^(\+|00)/.test(raw);
    if (lib) {
      var p = null;
      try { p = lib.parsePhoneNumberFromString(intl ? raw.replace(/^00/, '+') : raw, c && lib.isSupportedCountry(c.iso) ? c.iso : undefined); } catch (err) { p = null; }
      if (p && p.isValid()) return { ok: true, formatted: p.formatInternational() };
      if (!intl && !c) return { error: 'Add your country code, for example +971 50 123 4567' };
      return { error: 'That number does not look complete. Check it, or add the country code, for example +971 50 123 4567' };
    }
    if (/^[\d\s().+-]+$/.test(raw) && digits.length >= 7 && digits.length <= 15 && (intl || c)) return { ok: true, formatted: raw };
    return { error: 'Enter your mobile number with its country code, for example +971 50 123 4567' };
  }

  /* choosing a country starts the number with its code, unless a number is already there */
  var lastDial = '';
  select.addEventListener('change', function () {
    var c = currentCountry();
    var digits = mobile.value.replace(/\D/g, '');
    if (c && (!digits || digits === lastDial)) { mobile.value = '+' + c.dial + ' '; }
    lastDial = c ? c.dial : '';
    if (touched.mobile) check('mobile', true);
    touched.country = true;
    check('country', true);
  });

  /* ---------------------------------------------------------------- email typo helper */
  var DOMAIN_FIX = { 'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gnail.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.cm': 'gmail.com',
    'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmail.co': 'hotmail.com', 'outlok.com': 'outlook.com', 'outloo.com': 'outlook.com', 'outlook.co': 'outlook.com',
    'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'yhoo.com': 'yahoo.com', 'yahoo.co': 'yahoo.com', 'iclod.com': 'icloud.com', 'icloud.co': 'icloud.com', 'icoud.com': 'icloud.com' };
  function emailSuggestion(v) {
    var at = v.lastIndexOf('@');
    if (at < 1) return '';
    var user = v.slice(0, at), domain = v.slice(at + 1).toLowerCase();
    var fixed = DOMAIN_FIX[domain] || domain.replace(/\.(con|cmo|vom|xom|comm|co,)$/, '.com').replace(/\.(ae,|aee)$/, '.ae').replace(/,/g, '.');
    return fixed !== domain ? user + '@' + fixed : '';
  }
  function showSuggestion() {
    var wrap = wrapOf('email'), input = control('email');
    var old = wrap.querySelector('.field__suggest');
    if (old) old.remove();
    var s = emailSuggestion(input.value.trim());
    if (!s) return;
    var p = document.createElement('p'); p.className = 'field__suggest';
    p.appendChild(document.createTextNode('Did you mean '));
    var b = document.createElement('button'); b.type = 'button'; b.textContent = s;
    b.addEventListener('click', function () { input.value = s; p.remove(); check('email', true); saveDraft(); input.focus(); });
    p.appendChild(b); p.appendChild(document.createTextNode('?'));
    wrap.querySelector('.field__control').insertAdjacentElement('afterend', p);
  }

  /* ---------------------------------------------------------------- dietary: the notes field shows only when it is needed */
  var notesWrap = wrapOf('about_food_allergies');
  var notes = control('about_food_allergies');
  var notesLabel = notesWrap.querySelector('[data-allergy-label]');
  var notesOpt = notesWrap.querySelector('.field__opt');
  var notesText = notesLabel.textContent;
  function dietary() { return control('dietary').value; }
  function syncNotes() {
    var d = dietary();
    var none = !d || d === 'N/A';
    var allergies = d === 'Food allergies';
    notesWrap.hidden = none;
    notes.disabled = none;                      /* a hidden note is not sent */
    notes.required = allergies;
    notesOpt.hidden = allergies;
    notesLabel.textContent = allergies ? 'Which foods should we avoid?' : notesText;
    if (none || !allergies) setError('about_food_allergies', '');
  }

  /* ---------------------------------------------------------------- validation */
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var touched = {};
  var NAMES = ['name', 'email', 'country', 'mobile', 'organization', 'designation', 'industry[]', 'about_food_allergies', 'consent'];
  var LABELS = { name: 'Full name', email: 'Work email', country: 'Country of residence', mobile: 'Mobile number', organization: 'Organisation',
    designation: 'Job title', 'industry[]': 'Your organisation type', about_food_allergies: 'Food allergies', consent: 'Agreement' };

  function message(name) {
    var el = control(name), v = el && el.value ? el.value.trim() : '';
    switch (name) {
      case 'name': return v.length < 2 ? 'Enter your full name' : '';
      case 'email': return !v ? 'Enter your work email' : EMAIL.test(v) ? '' : 'That email does not look right. It should look like name@company.com';
      case 'country': return select.value ? '' : (combos.country && combos.country.input.value.trim() ? 'Choose a country from the list' : 'Choose your country of residence');
      case 'mobile': var s = phoneState(mobile.value); return s.empty ? 'Enter your mobile number' : (s.error || '');
      case 'organization': return v.length < 2 ? 'Enter the name of your organisation' : '';
      case 'designation': return v.length < 2 ? 'Enter your job title' : '';
      case 'industry[]': return el.value ? '' : 'Choose your industry';
      case 'about_food_allergies': return notes.required && !notes.disabled && !v ? 'Tell us which foods to avoid' : '';
      case 'consent': return el.checked ? '' : 'Tick the box so we can process your registration';
    }
    return '';
  }

  function focusTarget(name) {
    if (combos[name]) return combos[name].input;
    return control(name);
  }

  function setError(name, msg) {
    var wrap = wrapOf(name);
    if (!wrap) return;
    var box = wrap.querySelector('.field__error');
    var targets = combos[name] ? [combos[name].input] : all('input, select', wrap);
    wrap.classList.toggle('is-invalid', !!msg);
    if (msg) wrap.classList.remove('is-valid');
    box.textContent = msg || '';
    box.hidden = !msg;
    targets.forEach(function (t) { if (msg) t.setAttribute('aria-invalid', 'true'); else t.removeAttribute('aria-invalid'); });
  }

  /* show = put the message on screen; otherwise only clear a message that no longer applies */
  function check(name, show) {
    var msg = message(name);
    var wrap = wrapOf(name);
    if (!wrap) return msg;
    if (!msg) {
      setError(name, '');
      var typedField = /^(name|email|mobile|organization|designation)$/.test(name);
      wrap.classList.toggle('is-valid', typedField && !!control(name).value.trim());
    } else if (show || wrap.classList.contains('is-invalid')) setError(name, msg);
    else wrap.classList.remove('is-valid');
    return msg;
  }

  function refreshSummary(focusFirst) {
    var bad = NAMES.filter(function (n) { return wrapOf(n).classList.contains('is-invalid'); });
    if (!bad.length) { summary.hidden = true; return bad; }
    /* one line for screen readers and for anyone who has scrolled past a field: the detail is under each field */
    summary.querySelector('.form__summary-title').textContent = bad.length === 1 ? 'Please check the highlighted field.' : 'Please check the ' + bad.length + ' highlighted fields.';
    summary.hidden = false;
    if (focusFirst) goTo(bad[0]);
    return bad;
  }

  function goTo(name) {
    var t = focusTarget(name);
    if (!t) return;
    try { t.focus({ preventScroll: true }); } catch (err) { t.focus(); }
    reveal(wrapOf(name), 130);
  }

  /* leaving a field: tidy it, then check it if something was entered (an untouched empty field waits for Submit) */
  form.addEventListener('focusout', function (e) {
    var t = e.target, name = t.name;
    if (!name || NAMES.indexOf(name) < 0 || t.type === 'radio' || t.type === 'checkbox' || name === 'country') return;
    if (name === 'mobile') {
      var s = phoneState(t.value);
      if (s.ok && s.formatted) t.value = s.formatted;
      if (s.empty && !touched.mobile) return;
    } else t.value = t.value.replace(/\s+/g, ' ').trim();
    if (name === 'email') showSuggestion();
    if (t.value.trim() || touched[name]) { touched[name] = true; check(name, true); if (!summary.hidden) refreshSummary(false); }
    saveDraft();
  });
  form.addEventListener('input', function (e) {
    var name = e.target.name;
    if (NAMES.indexOf(name) > -1 && name !== 'country') { check(name, false); if (!summary.hidden) refreshSummary(false); }
    queueDraft();
  });
  form.addEventListener('change', function (e) {
    var name = e.target.name;
    if (name === 'dietary') syncNotes();
    if (name === 'industry[]' || name === 'consent') { touched[name] = true; check(name, true); }
    if (!summary.hidden) refreshSummary(false);
    queueDraft();
  });

  /* ---------------------------------------------------------------- keep a draft for this tab */
  var draftTimer = 0;
  function saveDraft() {
    try {
      var data = {};
      all('input, select').forEach(function (el) {
        if (!el.name || el.name === '_token' || el.name === 'website' || el.name === 'consent' || el.type === 'hidden') return;
        if (el.type === 'radio') { if (el.checked) data[el.name] = el.value; }
        else data[el.name] = el.value;
      });
      window.sessionStorage.setItem(DRAFT, JSON.stringify(data));
    } catch (err) { /* private mode or storage off: the form works without it */ }
  }
  function queueDraft() { clearTimeout(draftTimer); draftTimer = setTimeout(saveDraft, 300); }
  function loadDraft() {
    var data = null;
    try { data = JSON.parse(window.sessionStorage.getItem(DRAFT) || 'null'); } catch (err) { data = null; }
    if (!data) return;
    all('input, select').forEach(function (el) {
      var v = data[el.name];
      if (v == null || el.type === 'hidden' || el.type === 'checkbox') return;
      if (el.type === 'radio') { if (el.value === v) el.checked = true; }
      else if (el.tagName === 'SELECT') { if (all('option', el).some(function (o) { return o.value === v; })) el.value = v; }
      else if (!el.value) el.value = v;       /* never over what the server sent back */
    });
  }
  function clearDraft() { try { window.sessionStorage.removeItem(DRAFT); } catch (err) { /* nothing to clear */ } }

  /* ---------------------------------------------------------------- submit */
  function busy(on) {
    var label = submit.querySelector('.form__submit-label');
    sending = on;
    submit.classList.toggle('is-busy', on);
    submit.setAttribute('aria-disabled', String(on));
    label.textContent = on ? label.getAttribute('data-busy') : label.getAttribute('data-label');
  }

  function thanks() {
    var name = control('name').value.trim().split(' ')[0];
    var email = control('email').value.trim();
    done.querySelector('[data-first-name]').textContent = name ? ', ' + name : '';
    done.querySelector('[data-email]').textContent = email;
    done.querySelector('[data-email-line]').hidden = !email;
    clearDraft();
    form.hidden = true;
    done.hidden = false;
    done.classList.add('is-in');
    try { done.focus({ preventScroll: true }); } catch (err) { done.focus(); }
    /* the page is much shorter now: bring the message under the header */
    var y = Math.max(0, done.getBoundingClientRect().top + (window.scrollY || window.pageYOffset) - Math.min(260, viewportH() * 0.3));
    var l = window.__adws && window.__adws.lenis;
    if (l && l.scrollTo) { if (l.resize) l.resize(); l.scrollTo(y, { duration: 0.8, force: true }); }
    else window.scrollTo({ top: y, behavior: 'smooth' });
    if (window.__adws && window.__adws.ScrollTrigger) setTimeout(function () { window.__adws.ScrollTrigger.refresh(); }, 900);
  }

  form.addEventListener('submit', function (e) {
    if (sending) { e.preventDefault(); return; }
    var s = phoneState(mobile.value);
    if (s.ok && s.formatted) mobile.value = s.formatted;
    NAMES.forEach(function (n) { touched[n] = true; check(n, true); });
    if (refreshSummary(true).length) { e.preventDefault(); return; }
    if (control('website').value) { e.preventDefault(); busy(true); setTimeout(thanks, 700); return; }   /* a robot filled the hidden field */
    busy(true);
    if (demo) { e.preventDefault(); setTimeout(thanks, 900); return; }
    clearDraft();   /* real post: the server takes over from here */
  });
  /* coming back with the browser's Back button after a real post */
  window.addEventListener('pageshow', function (e) { if (e.persisted) busy(false); });

  /* ---------------------------------------------------------------- start */
  loadDraft();
  Object.keys(combos).forEach(function (k) { combos[k].sync(); });
  lastDial = currentCountry() ? currentCountry().dial : '';
  syncNotes();
  /* messages printed by the server are shown as they are */
  var fromServer = false;
  NAMES.forEach(function (n) {
    var box = wrapOf(n).querySelector('.field__error');
    if (box.textContent.trim()) { fromServer = true; setError(n, box.textContent.trim()); touched[n] = true; }
  });
  if (fromServer) refreshSummary(false);
})();
