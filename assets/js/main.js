/* ==========================================================================
   Mister — сайттың скрипттері (сыртқы кітапханасыз)
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var THEME_KEY = 'mister-theme';
  var TZ_OFFSET_HOURS = 5; // Қазақстан уақыты: UTC+5
  var DAY_NAMES = ['жексенбі', 'дүйсенбі', 'сейсенбі', 'сәрсенбі', 'бейсенбі', 'жұма', 'сенбі'];

  function readStore(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }

  function writeStore(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { /* сақтау мүмкін емес — елемейміз */ }
  }

  /* ---------- Күндізгі / түнгі режим ---------- */
  var themeBtn = document.querySelector('[data-theme-toggle]');
  var darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function currentTheme() {
    var explicit = root.getAttribute('data-theme');
    if (explicit === 'dark' || explicit === 'light') return explicit;
    return darkQuery && darkQuery.matches ? 'dark' : 'light';
  }

  function syncThemeButton() {
    if (!themeBtn) return;
    var isDark = currentTheme() === 'dark';
    var label = isDark ? 'Күндізгі режимге ауысу' : 'Түнгі режимге ауысу';
    themeBtn.setAttribute('data-mode', isDark ? 'dark' : 'light');
    themeBtn.setAttribute('aria-label', label);
    themeBtn.setAttribute('title', label);
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      writeStore(THEME_KEY, next);
      syncThemeButton();
    });
  }
  if (darkQuery && darkQuery.addEventListener) darkQuery.addEventListener('change', syncThemeButton);
  if (window.MutationObserver) {
    new MutationObserver(syncThemeButton).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  }
  if (!root.hasAttribute('data-theme')) {
    var saved = readStore(THEME_KEY);
    if (saved === 'dark' || saved === 'light') root.setAttribute('data-theme', saved);
  }
  syncThemeButton();

  /* ---------- Мобильді мәзір ---------- */
  var header = document.querySelector('.site-header');
  var menuBtn = document.querySelector('[data-menu-toggle]');
  var nav = document.getElementById('site-nav');

  function setMenu(open) {
    if (!header || !menuBtn) return;
    header.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Мәзірді жабу' : 'Мәзірді ашу');
  }

  if (menuBtn) {
    menuBtn.addEventListener('click', function () {
      setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
    });
  }
  if (nav) {
    nav.addEventListener('click', function (event) {
      if (event.target.closest('a')) setMenu(false);
    });
  }
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && header && header.classList.contains('menu-open')) {
      setMenu(false);
      menuBtn.focus();
    }
  });
  document.addEventListener('click', function (event) {
    if (header && !header.contains(event.target)) setMenu(false);
  });
  var desktopQuery = window.matchMedia ? window.matchMedia('(min-width: 1024px)') : null;
  if (desktopQuery && desktopQuery.addEventListener) {
    desktopQuery.addEventListener('change', function (event) {
      if (event.matches) setMenu(false);
    });
  }

  /* ---------- Айналдырғанда мәзірдің жиегі ---------- */
  function onScroll() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 4);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Мәзірде ағымдағы бөлімді белгілеу ---------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('#site-nav a[href^="#"]:not(.btn)'));
  var spyTargets = navLinks
    .map(function (link) { return document.getElementById(link.getAttribute('href').slice(1)); })
    .filter(Boolean);

  function setCurrent(id) {
    navLinks.forEach(function (link) {
      if (link.getAttribute('href') === '#' + id) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  }

  if ('IntersectionObserver' in window && spyTargets.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setCurrent(entry.target.id);
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    spyTargets.forEach(function (target) { spy.observe(target); });
  }

  /* ---------- WhatsApp сілтемелеріне дайын мәтін қосу ---------- */
  document.querySelectorAll('a[data-wa-text]').forEach(function (link) {
    var base = link.getAttribute('href').split('?')[0];
    link.setAttribute('href', base + '?text=' + encodeURIComponent(link.getAttribute('data-wa-text')));
  });

  /* ---------- Тапсырыс формасы ----------
     Тапсырыс FormSubmit арқылы электрондық поштаға автоматты түрде жіберіледі (форманың data-endpoint атрибуты).
     Жіберу мүмкін болмаса, клиентке тапсырысты WhatsApp арқылы жіберу ұсынылады. */
  var form = document.getElementById('order-form');
  var donePanel = document.getElementById('form-done');
  var failedPanel = document.getElementById('form-failed');
  var fName = document.getElementById('f-name');
  var fCafe = document.getElementById('f-cafe');
  var fPhone = document.getElementById('f-phone');
  var fService = document.getElementById('f-service');
  var fAddress = document.getElementById('f-address');
  var fMessage = document.getElementById('f-message');
  var fHoney = document.getElementById('f-website');
  var submitBtn = document.getElementById('submit-btn');
  var orderIdEl = document.getElementById('order-id');
  var donePreview = document.getElementById('message-preview');
  var failedPreview = document.getElementById('failed-preview');
  var waFollowup = document.getElementById('wa-followup');
  var waLink = document.getElementById('wa-link');
  var copyBtn = document.getElementById('copy-btn');
  var copyStatus = document.getElementById('copy-status');
  var newOrderBtn = document.getElementById('new-order-btn');
  var retryBtn = document.getElementById('retry-btn');

  // Форманы, «қабылданды» немесе «жіберілмеді» панелін көрсету
  function showPanel(panel) {
    if (!form || !panel) return;
    [form, donePanel, failedPanel].forEach(function (el) {
      if (el) el.hidden = el !== panel;
    });
    if (panel !== form) {
      panel.focus({ preventScroll: true });
      (panel.closest('.form-card') || panel).scrollIntoView({ block: 'start' });
    }
  }

  // Баға батырмасы басылса — формадағы қызметті алдын ала таңдаймыз
  document.addEventListener('click', function (event) {
    var trigger = event.target.closest('[data-service]');
    if (!trigger || !fService) return;
    var value = trigger.getAttribute('data-service');
    var hasOption = Array.prototype.some.call(fService.options, function (option) { return option.value === value; });
    if (hasOption) fService.value = value;
    showPanel(form);
  });

  // Телефон нөмірі: +7 (7XX) XXX-XX-XX
  function nationalDigits(value) {
    var digits = value.replace(/\D/g, '');
    if (value.trim().indexOf('+7') === 0) digits = digits.slice(1);
    else if (digits.length === 11 && (digits[0] === '7' || digits[0] === '8')) digits = digits.slice(1);
    if (digits[0] === '8') digits = digits.slice(1);
    return digits.slice(0, 10);
  }

  function formatPhone(national) {
    var out = '+7 (' + national.slice(0, 3);
    if (national.length > 3) out += ') ' + national.slice(3, 6);
    if (national.length > 6) out += '-' + national.slice(6, 8);
    if (national.length > 8) out += '-' + national.slice(8, 10);
    return out;
  }

  function setError(input, message) {
    var error = document.getElementById(input.id + '-error');
    if (message) {
      input.setAttribute('aria-invalid', 'true');
      if (error) { error.textContent = message; error.hidden = false; }
    } else {
      input.removeAttribute('aria-invalid');
      if (error) { error.textContent = ''; error.hidden = true; }
    }
  }

  function clearError(input) {
    if (input.getAttribute('aria-invalid') === 'true') setError(input, '');
  }

  if (fPhone) {
    fPhone.addEventListener('focus', function () {
      if (!fPhone.value) fPhone.value = '+7 (';
    });
    fPhone.addEventListener('input', function () {
      fPhone.value = formatPhone(nationalDigits(fPhone.value));
      clearError(fPhone);
    });
    fPhone.addEventListener('blur', function () {
      if (!nationalDigits(fPhone.value)) fPhone.value = '';
    });
  }
  if (fName) fName.addEventListener('input', function () { clearError(fName); });

  function pad(n) {
    return (n < 10 ? '0' : '') + n;
  }

  // Тапсырыс нөмірі: M-ЖЖААКК-XXXX (Қазақстан уақытымен)
  function makeOrderId(now) {
    var date = String(now.getUTCFullYear()).slice(2) + pad(now.getUTCMonth() + 1) + pad(now.getUTCDate());
    return 'M-' + date + '-' + Math.floor(1000 + Math.random() * 9000);
  }

  // Тапсырыс уақыты: «now» Қазақстан уақытына жылжытылған, сондықтан UTC бойынша пішімдейміз
  function formatOrderTime(now) {
    try {
      return new Intl.DateTimeFormat('kk-KZ', {
        timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
      }).format(now);
    } catch (e) {
      return pad(now.getUTCHours()) + ':' + pad(now.getUTCMinutes()) + ', ' +
        pad(now.getUTCDate()) + '.' + pad(now.getUTCMonth() + 1) + '.' + now.getUTCFullYear();
    }
  }

  function whatsappUrl(text) {
    var number = (form.getAttribute('data-whatsapp') || '').replace(/\D/g, '');
    return 'https://wa.me/' + number + '?text=' + encodeURIComponent(text);
  }

  function setSending(sending) {
    if (!submitBtn) return;
    submitBtn.disabled = sending;
    submitBtn.setAttribute('aria-busy', String(sending));
    var label = submitBtn.querySelector('.btn-label');
    if (label) label.textContent = sending ? 'Жіберілуде…' : 'Тапсырыс беру';
  }

  // Тапсырысты поштаға жіберу (15 секундтан кейін тоқтатылады)
  function sendOrder(fields) {
    var endpoint = form.getAttribute('data-endpoint');
    if (!endpoint || !window.fetch) return Promise.reject(new Error('Жіберу мекенжайы жоқ'));
    var controller = window.AbortController ? new AbortController() : null;
    var timer = controller ? window.setTimeout(function () { controller.abort(); }, 15000) : null;
    return fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(fields),
      signal: controller ? controller.signal : undefined
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (data) {
        if (timer) window.clearTimeout(timer);
        if (!response.ok || !(data.success === true || data.success === 'true')) {
          throw new Error(data.message || 'HTTP ' + response.status);
        }
        return data;
      });
    }, function (error) {
      if (timer) window.clearTimeout(timer);
      throw error;
    });
  }

  function showSuccess(orderId, summary) {
    orderIdEl.textContent = orderId;
    donePreview.textContent = summary;
    waFollowup.setAttribute('href', whatsappUrl('Сәлеметсіз бе! Менің тапсырысымның нөмірі: ' + orderId));
    showPanel(donePanel);
  }

  function showFailure(text) {
    failedPreview.textContent = text;
    waLink.setAttribute('href', whatsappUrl(text));
    copyStatus.textContent = '';
    showPanel(failedPanel);
  }

  if (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (submitBtn && submitBtn.disabled) return;

      var name = fName.value.trim();
      var national = nationalDigits(fPhone.value);
      var firstInvalid = null;

      if (name.length < 2) {
        setError(fName, 'Атыңызды жазыңыз.');
        firstInvalid = firstInvalid || fName;
      } else {
        setError(fName, '');
      }
      if (national.length !== 10) {
        setError(fPhone, 'Телефон нөмірін толық жазыңыз: +7 (7XX) XXX-XX-XX.');
        firstInvalid = firstInvalid || fPhone;
      } else {
        setError(fPhone, '');
      }
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      var now = new Date(Date.now() + TZ_OFFSET_HOURS * 3600000);
      var orderId = makeOrderId(now);
      var time = formatOrderTime(now);
      var phone = formatPhone(national);
      var cafe = fCafe.value.trim();
      var service = fService.value;
      var address = fAddress.value.trim();
      var message = fMessage.value.trim();

      var lines = ['Тапсырыс ' + orderId, 'Аты: ' + name];
      if (cafe) lines.push('Кафе: ' + cafe);
      lines.push('Телефон: ' + phone);
      if (service) lines.push('Қызмет: ' + service);
      if (address) lines.push('Мекенжай: ' + address);
      if (message) lines.push('Тапсырыс: ' + message);
      var summary = lines.join('\n');

      // Жасырын өріс толтырылса — бұл бот, ештеңе жібермейміз
      if (fHoney && fHoney.value) {
        showSuccess(orderId, summary);
        return;
      }

      setSending(true);
      sendOrder({
        _subject: 'Жаңа тапсырыс ' + orderId + ' — Mister сайты',
        _template: 'table',
        _captcha: 'false',
        'Тапсырыс нөмірі': orderId,
        'Уақыты': time,
        'Аты': name,
        'Кафе': cafe || '—',
        'Телефон': phone,
        'Қызмет': service || '—',
        'Мекенжай': address || '—',
        'Тапсырыс': message || '—'
      }).then(function () {
        setSending(false);
        form.reset();
        showSuccess(orderId, summary);
      }, function () {
        setSending(false);
        showFailure('Сәлеметсіз бе! Сайттан тапсырыс.\n' + summary);
      });
    });
  }

  // Толтырылған, бірақ жіберілмеген тапсырыс болса — беттен шығар алдында ескертеміз
  function hasUnsentOrder() {
    if (!form) return false;
    return Boolean(fName.value.trim() || nationalDigits(fPhone.value) || fCafe.value.trim() ||
      fService.value || fAddress.value.trim() || fMessage.value.trim());
  }
  window.addEventListener('beforeunload', function (event) {
    if (!hasUnsentOrder()) return;
    event.preventDefault();
    event.returnValue = '';
  });

  if (newOrderBtn) {
    newOrderBtn.addEventListener('click', function () {
      showPanel(form);
      fName.focus();
    });
  }

  if (retryBtn) {
    retryBtn.addEventListener('click', function () {
      showPanel(form);
      if (submitBtn) submitBtn.focus();
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var text = failedPreview.textContent;
      function selectText() {
        var range = document.createRange();
        range.selectNodeContents(failedPreview);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        copyStatus.textContent = 'Мәтін белгіленді — оны көшіріп алыңыз.';
      }
      try {
        navigator.clipboard.writeText(text).then(function () {
          copyStatus.textContent = 'Мәтін көшірілді.';
        }, selectText);
      } catch (e) {
        selectText();
      }
    });
  }

  /* ---------- «Қазір ашықпыз / жабықпыз» белгісі ---------- */
  function toMinutes(hhmm) {
    var parts = hhmm.split(':');
    return Number(parts[0]) * 60 + Number(parts[1]);
  }

  var hoursRoot = document.querySelector('[data-hours]');
  var hourRows = hoursRoot ? Array.prototype.slice.call(hoursRoot.querySelectorAll('[data-days]')) : [];
  var schedule = {};

  hourRows.forEach(function (row) {
    var open = row.getAttribute('data-open');
    var close = row.getAttribute('data-close');
    row.getAttribute('data-days').split(',').forEach(function (day) {
      schedule[Number(day.trim())] = open && close
        ? { open: open, close: close, from: toMinutes(open), to: toMinutes(close), row: row }
        : { row: row };
    });
  });

  function updateStatus() {
    if (!hourRows.length) return;
    var now = new Date(Date.now() + TZ_OFFSET_HOURS * 3600000);
    var day = now.getUTCDay();
    var minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    var today = schedule[day];
    var isOpen = Boolean(today && today.open && minutes >= today.from && minutes < today.to);
    var text;

    if (isOpen) {
      text = 'Қазір ашықпыз · ' + today.open + '–' + today.close;
    } else {
      var next = null;
      if (today && today.open && minutes < today.from) {
        next = 'бүгін, ' + today.open;
      } else {
        for (var i = 1; i <= 7; i += 1) {
          var d = (day + i) % 7;
          if (schedule[d] && schedule[d].open) {
            next = (i === 1 ? 'ертең' : DAY_NAMES[d]) + ', ' + schedule[d].open;
            break;
          }
        }
      }
      text = next ? 'Қазір жабықпыз · ашылуы: ' + next : 'Қазір жабықпыз';
    }

    document.querySelectorAll('[data-open-status]').forEach(function (pill) {
      pill.setAttribute('data-state', isOpen ? 'open' : 'closed');
      var label = pill.querySelector('[data-open-text]');
      if (label) label.textContent = text;
    });
    hourRows.forEach(function (row) { row.classList.remove('is-today'); });
    if (today && today.row) today.row.classList.add('is-today');
  }

  updateStatus();
  window.setInterval(updateStatus, 60000);

  /* ---------- Қалқымалы WhatsApp батырмасы ----------
     Басты беттің батырмалары, өтінім формасы немесе төменгі бөлім көрініп тұрғанда жасырылады */
  var waFloat = document.querySelector('.wa-float');
  var hideZones = [
    document.querySelector('.hero-actions'),
    document.querySelector('.form-card'),
    document.querySelector('.site-footer')
  ].filter(Boolean);
  if (waFloat && hideZones.length && 'IntersectionObserver' in window) {
    var visibleZones = [];
    var floatObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var index = visibleZones.indexOf(entry.target);
        if (entry.isIntersecting && index === -1) visibleZones.push(entry.target);
        if (!entry.isIntersecting && index !== -1) visibleZones.splice(index, 1);
      });
      waFloat.classList.toggle('is-hidden', visibleZones.length > 0);
    });
    hideZones.forEach(function (zone) { floatObserver.observe(zone); });
  }

  /* ---------- Жыл ---------- */
  var year = String(new Date().getFullYear());
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = year; });
})();
