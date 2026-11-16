/* ==========================================================================
   Слайдшы — тақырыптан дайын презентация жасайтын бір бетті қолданба.

   • Claude ішінде ашылғанда: мәтінді claude.use("sample") арқылы Claude жазады,
     файлдар claude.use("downloads") арқылы беріледі.
   • Басқа хостингте (мысалы, GitHub Pages): құрылымы дайын үлгі жасалады,
     файлдар браузердің кәдімгі жүктеуімен сақталады.
   • Жобалар осы браузердің localStorage-інде сақталады.
   ========================================================================== */
(() => {
  'use strict';

  const SLIDE_W = 1280;
  const PPTX_SRC = 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js';
  const KEY_INDEX = 'slaidshy:index';
  const KEY_DECK = 'slaidshy:deck:';
  const KEY_PREFS = 'slaidshy:prefs';
  const IN_CLAUDE = typeof window.claude === 'object' && window.claude !== null && typeof window.claude.use === 'function';

  /* ---------------------------------------------------------------------
     Дизайн тақырыптары. Түстер мен қаріптер бір жерде: слайдқа да, PPTX-ке де.
     --------------------------------------------------------------------- */
  const THEMES = [
    { id: 'aspan', name: 'Аспан', bg: '#f4f9fd', ink: '#0b2545', muted: '#4a6585', accent: '#0e7cc2', accent2: '#f2b600', soft: '#dcebf7', head: 'Unbounded', body: 'Onest', wh: 700, wq: 600, hs: 0.8, upper: false, track: '-0.01em' },
    { id: 'tun', name: 'Түн', bg: '#0f1729', ink: '#eef2f8', muted: '#a4b3c9', accent: '#ffb547', accent2: '#5ed3c3', soft: '#1a2540', head: 'Montserrat', body: 'Onest', wh: 800, wq: 600, hs: 0.92, upper: false, track: '-0.01em' },
    { id: 'oyu', name: 'Ою', bg: '#0d4744', ink: '#f6efe0', muted: '#bcd2ca', accent: '#e3aa45', accent2: '#f08a5d', soft: '#135753', head: 'Lora', body: 'Onest', wh: 700, wq: 600, hs: 1, upper: false, track: '0em' },
    { id: 'taza', name: 'Таза', bg: '#fbfbf9', ink: '#141414', muted: '#5f6268', accent: '#2f5bea', accent2: '#141414', soft: '#eceef3', head: 'Golos Text', body: 'Golos Text', wh: 700, wq: 600, hs: 1, upper: false, track: '-0.02em' },
    { id: 'zhailau', name: 'Жайлау', bg: '#f2f7ed', ink: '#1d3824', muted: '#4d6a53', accent: '#3b8a48', accent2: '#efb21f', soft: '#dfecd6', head: 'Comfortaa', body: 'Nunito', wh: 700, wq: 700, hs: 0.9, upper: false, track: '-0.01em' },
    { id: 'anar', name: 'Анар', bg: '#3a0b1c', ink: '#fff1f3', muted: '#e5b8c3', accent: '#ff6b81', accent2: '#ffd166', soft: '#4d1328', head: 'Oswald', body: 'Onest', wh: 600, wq: 500, hs: 1.12, upper: true, track: '0.01em' },
  ];
  for (const t of THEMES) {
    const headStack = t.head === 'Lora' ? `'Lora', Georgia, serif` : `'${t.head}', Arial, sans-serif`;
    t.css = [
      `--s-bg:${t.bg}`, `--s-ink:${t.ink}`, `--s-muted:${t.muted}`, `--s-accent:${t.accent}`, `--s-accent2:${t.accent2}`,
      `--s-soft:${t.soft}`, `--s-fh:${headStack}`, `--s-fb:'${t.body}', Arial, sans-serif`, `--s-wh:${t.wh}`, `--s-wq:${t.wq}`,
      `--s-hs:${t.hs}`, `--s-case:${t.upper ? 'uppercase' : 'none'}`, `--s-track:${t.track}`,
    ].join(';');
  }
  const themeById = (id) => THEMES.find((t) => t.id === id) || THEMES[0];

  const LAYOUTS = [
    ['cover', 'Мұқаба'], ['section', 'Бөлім'], ['bullets', 'Тізім'], ['two', 'Екі баған'],
    ['stat', 'Үлкен сан'], ['quote', 'Дәйексөз'], ['image', 'Сурет пен мәтін'], ['end', 'Соңғы слайд'],
  ];
  const LAYOUT_IDS = new Set(LAYOUTS.map((l) => l[0]));
  const NO_NUMBER = new Set(['cover', 'section', 'end']);

  const LANGS = [['kk', 'Қазақша'], ['ru', 'Русский'], ['en', 'English']];

  /* Үлгі мәтіндері (AI жоқ кезде) — жақша ішіндегіні пайдаланушы өзі толтырады */
  const TPL = {
    kk: {
      coverSub: '[Аты-жөніңіз] · [Күні]', agenda: 'Жоспар',
      bulletTitles: ['Тақырыптың өзектілігі', 'Негізгі ұғымдар', 'Қазіргі жағдай', 'Нақты мысалдар', 'Болашағы', 'Ұсыныстар', 'Тәжірибе', 'Нәтижелер'],
      bullets: ['[Негізгі ой]', '[Дәлел немесе мысал]', '[Қысқа түйін]'],
      twoTitle: 'Мәселелер мен шешімдер', leftH: 'Мәселелер', rightH: 'Шешімдер',
      left: ['[Бірінші мәселе]', '[Екінші мәселе]'], right: ['[Бірінші шешім]', '[Екінші шешім]'],
      statTitle: 'Маңызды көрсеткіш', value: '[00%]', label: '[Бұл сан нені білдіреді және дереккөзі]',
      quote: '[Тақырыпқа сай дәйексөз]', author: '[Авторы]', imageTitle: 'Көрнекі мысал',
      conclusion: 'Қорытынды', concl: ['[Басты қорытынды]', '[Не білдік]', '[Келесі қадам]'],
      end: 'Назарларыңызға рахмет!', endSub: 'Сұрақтарыңызды күтемін',
    },
    ru: {
      coverSub: '[Ваше имя] · [Дата]', agenda: 'План',
      bulletTitles: ['Актуальность темы', 'Основные понятия', 'Текущая ситуация', 'Примеры из практики', 'Перспективы', 'Рекомендации', 'Опыт', 'Итоги'],
      bullets: ['[Главная мысль]', '[Аргумент или пример]', '[Короткий вывод]'],
      twoTitle: 'Проблемы и решения', leftH: 'Проблемы', rightH: 'Решения',
      left: ['[Первая проблема]', '[Вторая проблема]'], right: ['[Первое решение]', '[Второе решение]'],
      statTitle: 'Ключевой показатель', value: '[00%]', label: '[Что означает это число и источник]',
      quote: '[Цитата по теме]', author: '[Автор]', imageTitle: 'Наглядный пример',
      conclusion: 'Заключение', concl: ['[Главный вывод]', '[Что мы узнали]', '[Следующий шаг]'],
      end: 'Спасибо за внимание!', endSub: 'Ваши вопросы',
    },
    en: {
      coverSub: '[Your name] · [Date]', agenda: 'Agenda',
      bulletTitles: ['Why it matters', 'Key concepts', 'Where things stand', 'Real examples', 'What comes next', 'Recommendations', 'Experience', 'Results'],
      bullets: ['[Main point]', '[Evidence or example]', '[Short takeaway]'],
      twoTitle: 'Challenges and solutions', leftH: 'Challenges', rightH: 'Solutions',
      left: ['[First challenge]', '[Second challenge]'], right: ['[First solution]', '[Second solution]'],
      statTitle: 'Key figure', value: '[00%]', label: '[What this number means, and its source]',
      quote: '[A quote on the topic]', author: '[Author]', imageTitle: 'A visual example',
      conclusion: 'Conclusion', concl: ['[Main takeaway]', '[What we learned]', '[Next step]'],
      end: 'Thank you!', endSub: 'Questions?',
    },
  };

  /* Басты беттегі мысал жоба */
  const EXAMPLE = {
    title: 'Жақсы презентацияның 6 ережесі', theme: 'aspan', lang: 'kk',
    slides: [
      { layout: 'cover', kicker: 'Слайдшы · мысал', title: 'Жақсы презентацияның 6 ережесі', subtitle: 'Слайдты қалай қарапайым әрі түсінікті етуге болады' },
      { layout: 'bullets', title: 'Бір слайд — бір ой', bullets: ['Әр слайдта бір ғана басты ой болсын', 'Тақырып осы ойды толық жеткізсін', 'Қалғанын ауызша түсіндіріңіз'], notes: 'Слайдқа тек басты ойды жазып, түсіндірмесін өзіңіз айтыңыз.' },
      { layout: 'two', title: 'Мәтін аз, көрнекілік көп', left: { heading: 'Мәтін', bullets: ['Бес тармақтан аспасын', 'Әр тармақ — бір жол'] }, right: { heading: 'Көрнекілік', bullets: ['Сурет, сызба, сан', 'Ұзын сөйлемнің орнына кілт сөз'] } },
      { layout: 'stat', title: 'Түстерді шектеңіз', value: '3', label: 'негізгі түстен артық қолданбаңыз' },
      { layout: 'quote', quote: 'Кемелдікке қосарға ештеңе қалмағанда емес, алып тастарға ештеңе қалмағанда жетесің.', author: 'Антуан де Сент-Экзюпери' },
      { layout: 'bullets', title: 'Оқуға ыңғайлы болсын', bullets: ['Мәтін өлшемі кемінде 24 пт', 'Фон мен мәтін анық ажыратылсын', 'Ең маңызды сөзді түспен ерекшелеңіз'] },
      { layout: 'bullets', title: 'Қорытындымен аяқтаңыз', bullets: ['Басты ойды тағы бір рет айтыңыз', 'Келесі қадамды атаңыз', 'Сұрақтарға уақыт қалдырыңыз'] },
      { layout: 'end', title: 'Рахмет!', subtitle: 'Енді өз тақырыбыңызды жазып көріңіз' },
    ],
  };

  const TOPIC_IDEAS = ['Қазақстанның ұлттық парктері', 'Жасанды интеллект мектепте', 'Кофехана ашудың бизнес-жоспары', 'Суды үнемдеудің 7 жолы', 'Абай Құнанбаевтың шығармашылығы'];

  /* ---------------------------------------------------------------------
     Белгішелер (тұрақты SVG мәтіні, пайдаланушы деректері жоқ)
     --------------------------------------------------------------------- */
  const ICONS = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
    up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    down: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
    play: '<path d="M7 4.5v15l12-7.5z"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.8 2-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="14.5" cy="7" r="1"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
    sparkle: '<path d="M12 3l1.8 4.6 4.7 1.9-4.7 1.9L12 16l-1.8-4.6-4.7-1.9 4.7-1.9z"/><path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    left: '<path d="M15 18l-6-6 6-6"/>',
    right: '<path d="M9 18l6-6-6-6"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    open: '<path d="M12 21V9M7 14l5-5 5 5M4 4h16"/>',
    expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
    slides: '<rect x="2" y="4" width="20" height="14" rx="2"/><path d="M8 22h8M12 18v4"/>',
  };
  const iconSVG = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg>`;
  const BRAND_MARK = '<svg class="brand-mark" viewBox="0 0 34 34" aria-hidden="true" focusable="false"><rect class="bm-a" x="1" y="5" width="32" height="24" rx="6"/><circle class="bm-g" cx="22.5" cy="13.5" r="4.2"/><path class="bm-l" d="M7 23.5c3.2-3.6 6.4-3.6 9.6 0s6.4 3.6 10.4-1"/></svg>';

  /* ---------------------------------------------------------------------
     Көмекші функциялар
     --------------------------------------------------------------------- */
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'html') el.innerHTML = v; // тек тұрақты белгішелер үшін
        else if (k === 'style') el.style.cssText = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : String(v));
      }
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : String(kid));
    }
    return el;
  }
  const icon = (name) => {
    const t = document.createElement('template');
    t.innerHTML = iconSVG(name);
    return t.content.firstChild;
  };
  function btn(iconName, label, onclick, { cls = '', showLabel = true, id } = {}) {
    return h('button', { type: 'button', class: `btn ${cls}${showLabel ? ' has-lbl' : ' btn-icon'}`, 'aria-label': label, title: label, onclick, id },
      icon(iconName), showLabel ? h('span', { class: 'lbl', text: label }) : null);
  }
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  function debounce(fn, ms) {
    let t = 0;
    const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
    d.flush = (...a) => { clearTimeout(t); fn(...a); };
    return d;
  }
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* бос */ } },
  };
  function getPath(o, path) {
    return path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  }
  function setPath(o, path, val) {
    const keys = path.split('.');
    let cur = o;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!cur[keys[i]] || typeof cur[keys[i]] !== 'object') cur[keys[i]] = {};
      cur = cur[keys[i]];
    }
    cur[keys[keys.length - 1]] = val;
  }
  const cleanText = (v, max = 400) => (typeof v === 'string' || typeof v === 'number')
    ? String(v).replace(/\r/g, '').replace(/\*\*|__|`/g, '').replace(/[ \t]+\n/g, '\n').trim().slice(0, max)
    : '';
  const cleanList = (v, max = 8) => Array.isArray(v)
    ? v.map((x) => cleanText(x, 240).replace(/^[-–•*]\s+/, '')).filter(Boolean).slice(0, max)
    : [];
  function fileBase(title) {
    const t = String(title || 'Презентация').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
    return t || 'Презентация';
  }
  const PLAIN_OK = (() => {
    const d = document.createElement('div');
    try { d.contentEditable = 'plaintext-only'; } catch (e) { return false; }
    return d.contentEditable === 'plaintext-only';
  })();

  /* ---------------------------------------------------------------------
     Деректер моделі
     --------------------------------------------------------------------- */
  function normSlide(o) {
    o = o && typeof o === 'object' ? o : {};
    const s = { id: typeof o.id === 'string' && o.id ? o.id.slice(0, 40) : uid(), layout: LAYOUT_IDS.has(o.layout) ? o.layout : 'bullets' };
    for (const k of ['title', 'subtitle', 'kicker', 'value', 'label', 'quote', 'author']) {
      const v = cleanText(o[k], 400);
      if (v) s[k] = v;
    }
    const notes = cleanText(o.notes, 2000);
    if (notes) s.notes = notes;
    const b = cleanList(o.bullets);
    if (b.length) s.bullets = b;
    for (const side of ['left', 'right']) {
      const c = o[side];
      if (c && typeof c === 'object') s[side] = { heading: cleanText(c.heading, 120), bullets: cleanList(c.bullets) };
    }
    if (typeof o.image === 'string' && /^data:image\/(png|jpe?g|gif|webp);base64,[a-z0-9+/=]+$/i.test(o.image)) s.image = o.image;
    return s;
  }
  function sanitizeDeck(o, keepId) {
    o = o && typeof o === 'object' ? o : {};
    return {
      id: keepId && typeof o.id === 'string' ? o.id : uid(),
      title: cleanText(o.title, 160) || 'Жаңа презентация',
      theme: themeById(o.theme).id,
      lang: TPL[o.lang] ? o.lang : 'kk',
      created: Number(o.created) || Date.now(),
      updated: Number(o.updated) || Date.now(),
      slides: Array.isArray(o.slides) ? o.slides.slice(0, 60).map(normSlide) : [],
    };
  }
  function newDeck({ title, theme, lang }) {
    return { id: uid(), title: title || 'Жаңа презентация', theme: themeById(theme).id, lang: TPL[lang] ? lang : 'kk', created: Date.now(), updated: Date.now(), slides: [] };
  }
  function exampleDeck() {
    const d = sanitizeDeck(JSON.parse(JSON.stringify(EXAMPLE)));
    d.id = uid();
    return d;
  }

  function templateSlides(topic, count, lang) {
    const t = TPL[lang] || TPL.kk;
    const n = clamp(Number(count) || 8, 5, 15);
    const pattern = ['bullets', 'two', 'bullets', 'stat', 'bullets', 'quote', 'image', 'bullets'];
    const content = [];
    let bi = 0;
    for (let i = 0; i < n - 4; i++) {
      const layout = pattern[i % pattern.length];
      if (layout === 'bullets') content.push({ layout, title: t.bulletTitles[bi++ % t.bulletTitles.length], bullets: [...t.bullets] });
      else if (layout === 'two') content.push({ layout, title: t.twoTitle, left: { heading: t.leftH, bullets: [...t.left] }, right: { heading: t.rightH, bullets: [...t.right] } });
      else if (layout === 'stat') content.push({ layout, title: t.statTitle, value: t.value, label: t.label });
      else if (layout === 'quote') content.push({ layout, quote: t.quote, author: t.author });
      else content.push({ layout, title: t.imageTitle, bullets: t.bullets.slice(0, 2) });
    }
    const agenda = content.filter((s) => s.title && s.layout !== 'stat').map((s) => s.title).slice(0, 6);
    return [
      { layout: 'cover', title: topic, subtitle: t.coverSub },
      { layout: 'bullets', title: t.agenda, bullets: agenda.length ? agenda : [...t.bullets] },
      ...content,
      { layout: 'bullets', title: t.conclusion, bullets: [...t.concl] },
      { layout: 'end', title: t.end, subtitle: t.endSub },
    ].map(normSlide);
  }

  /* Жобаларды сақтау */
  function listProjects() {
    try {
      const a = JSON.parse(store.get(KEY_INDEX) || '[]');
      return Array.isArray(a) ? a.filter((p) => p && typeof p.id === 'string') : [];
    } catch (e) { return []; }
  }
  function loadDeck(id) {
    try {
      const raw = JSON.parse(store.get(KEY_DECK + id));
      return raw && Array.isArray(raw.slides) ? sanitizeDeck(raw, true) : null;
    } catch (e) { return null; }
  }
  let saveWarned = false;
  function saveDeck(d) {
    if (!d) return;
    d.updated = Date.now();
    const ok = store.set(KEY_DECK + d.id, JSON.stringify(d));
    const idx = listProjects().filter((p) => p.id !== d.id);
    idx.unshift({ id: d.id, title: d.title, updated: d.updated });
    store.set(KEY_INDEX, JSON.stringify(idx.slice(0, 40)));
    if (!ok && !saveWarned) {
      saveWarned = true;
      toast('Жоба браузерде сақталмады: орын жетпейді (суреттер көп болуы мүмкін). Жобаны .json файлы етіп жүктеп алыңыз.', { ms: 9000 });
    }
  }
  const scheduleSave = debounce(() => saveDeck(state.deck), 500);
  function deleteProject(id) {
    store.del(KEY_DECK + id);
    store.set(KEY_INDEX, JSON.stringify(listProjects().filter((p) => p.id !== id)));
  }

  /* ---------------------------------------------------------------------
     Күй
     --------------------------------------------------------------------- */
  const state = { view: 'start', deck: null, current: 0, topic: '', extra: '', count: 8, lang: 'kk', theme: 'aspan' };
  let sample = null;      // Claude-тан мәтін сұрау функциясы (болса)
  let downloads = null;   // Claude көрерменінде файл беру
  let aiBlocked = false;  // көрермен рұқсат бермесе
  let gen = null;         // жүріп жатқан генерация
  const undoStack = [];
  let pendingSnap = null;
  let els = {};
  const app = document.getElementById('app');
  const aiOn = () => typeof sample === 'function' && !aiBlocked;

  function loadPrefs() {
    try {
      const p = JSON.parse(store.get(KEY_PREFS) || '{}');
      if (p && typeof p === 'object') {
        if (Number(p.count) >= 5 && Number(p.count) <= 15) state.count = Number(p.count);
        if (TPL[p.lang]) state.lang = p.lang;
        if (THEMES.some((t) => t.id === p.theme)) state.theme = p.theme;
      }
    } catch (e) { /* әдепкі мәндер қалады */ }
  }
  const savePrefs = () => store.set(KEY_PREFS, JSON.stringify({ count: state.count, lang: state.lang, theme: state.theme }));

  /* ---------------------------------------------------------------------
     Масштаб пен мәтінді сыйғызу
     --------------------------------------------------------------------- */
  const observed = new Set();
  const ro = 'ResizeObserver' in window ? new ResizeObserver((entries) => {
    for (const en of entries) {
      const w = en.contentRect.width;
      if (w > 0) {
        en.target.dataset.seen = '1';
        en.target.style.setProperty('--k', (w / SLIDE_W).toFixed(5));
        const sl = en.target.querySelector(':scope > .slide');
        if (sl && !sl.dataset.fitted) fit(sl);
      }
    }
  }) : null;
  function observeScale(el) {
    if (ro) { ro.observe(el); observed.add(el); }
    else requestAnimationFrame(() => el.style.setProperty('--k', (el.clientWidth / SLIDE_W).toFixed(5)));
  }
  // Тек бетте болып, кейін алынып тасталған қораптарды бақылаудан шығарамыз
  // (әлі бетке қойылмаған жаңа қораптар бақылауда қалады).
  function pruneObserved() {
    if (!ro) return;
    for (const el of observed) {
      if (!el.isConnected && el.dataset.seen) { ro.unobserve(el); observed.delete(el); }
    }
  }

  function fit(el) {
    if (!el || !el.isConnected) return 1;
    const body = el.querySelector('.s-body');
    if (!body) return 1;
    let f = 1;
    el.style.setProperty('--fit', '1');
    let guard = 0;
    while (body.scrollHeight > body.clientHeight + 1 && f > 0.56 && guard++ < 10) {
      f = Math.max(0.55, f - 0.05);
      el.style.setProperty('--fit', f.toFixed(2));
    }
    el.dataset.fitted = '1';
    return f;
  }
  const fitAll = () => document.querySelectorAll('.slide').forEach(fit);
  const fitAllSoon = debounce(fitAll, 120);
  if (document.fonts) {
    document.fonts.ready.then(fitAll).catch(() => {});
    if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', fitAllSoon);
  }

  /* ---------------------------------------------------------------------
     Слайдты салу
     --------------------------------------------------------------------- */
  function sunRays(cx, cy, r1, r2, n, w) {
    let d = '';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.PI / n;
      d += `M${(cx + r1 * Math.cos(a)).toFixed(1)} ${(cy + r1 * Math.sin(a)).toFixed(1)}L${(cx + r2 * Math.cos(a)).toFixed(1)} ${(cy + r2 * Math.sin(a)).toFixed(1)}`;
    }
    return `<path class="d-ray" stroke-width="${w}" d="${d}"/>`;
  }
  /* Қошқар мүйіз — қазақ оюының жеңілдетілген нұсқасы */
  const ORN = 'M120 190V132C120 92 146 64 182 64C214 64 232 88 228 116C224 140 202 152 184 144C168 137 168 116 182 110M120 132C120 92 94 64 58 64C26 64 8 88 12 116C16 140 38 152 56 144C72 137 72 116 58 110';
  const ornament = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><path class="d-orn" d="${ORN}"/><path class="d-orn-f" d="M120 8L140 32L120 56L100 32Z"/></g>`;

  function decoSVG(id, layout) {
    const big = NO_NUMBER.has(layout);
    let g = '';
    if (id === 'aspan') {
      g = big
        ? `<circle class="d-soft" cx="1060" cy="300" r="250"/><circle class="d-b" cx="1060" cy="300" r="104"/>${sunRays(1060, 300, 128, 170, 32, 9)}<path class="d-line" d="M96 650H1184"/>`
        : `<circle class="d-b" cx="1222" cy="58" r="14"/>${sunRays(1222, 58, 21, 31, 16, 4)}`;
    } else if (id === 'oyu') {
      g = big ? ornament(884, 200, 1.2) + ornament(44, 632, 0.24) + ornament(1178, 632, 0.24) : ornament(609, 640, 0.26);
    } else if (id === 'taza') {
      g = big ? '<rect class="d-a" x="0" y="0" width="20" height="720"/>' : '<rect class="d-a" x="96" y="46" width="56" height="8" rx="2"/>';
    } else if (id === 'zhailau') {
      g = big
        ? '<circle class="d-b" cx="1080" cy="190" r="64"/><path class="d-a35" d="M0 560C200 500 420 520 640 570C860 620 1060 540 1280 500V720H0Z"/><path class="d-a" d="M0 640C260 590 520 630 760 660C980 690 1140 630 1280 610V720H0Z"/>'
        : '<circle class="d-b" cx="1224" cy="58" r="16"/><path class="d-a35" d="M0 694C110 664 230 668 380 702V720H0Z"/><path class="d-a60" d="M0 708C150 690 290 694 460 716V720H0Z"/>';
    } else if (id === 'anar') {
      g = big
        ? '<circle class="d-a" cx="1060" cy="250" r="150"/><circle class="d-b80" cx="1196" cy="430" r="86"/><circle class="d-a60" cx="930" cy="470" r="58"/><circle class="d-b80" cx="1162" cy="112" r="34"/><circle class="d-a35" cx="1010" cy="604" r="28"/>'
        : '<circle class="d-a" cx="1232" cy="58" r="20"/><circle class="d-b80" cx="1258" cy="100" r="9"/><circle class="d-a60" cx="1204" cy="96" r="7"/>';
    }
    return g ? `<svg viewBox="0 0 1280 720" aria-hidden="true" focusable="false">${g}</svg>` : '';
  }

  const PH = {
    kicker: 'Белгі (міндетті емес)', title: 'Тақырып', coverTitle: 'Презентация тақырыбы', subtitle: 'Тақырыпша немесе аты-жөніңіз',
    sectionNo: '01', sectionTitle: 'Бөлімнің атауы', bullet: 'Тармақ', heading: 'Бағанның атауы', statTitle: 'Бұл сан не туралы',
    value: '42%', label: 'Бұл сан нені білдіреді', quote: 'Дәйексөз мәтіні', author: 'Авторы', endTitle: 'Рахмет!', endSub: 'Сұрақтар немесе байланыс деректері',
  };

  function renderSlide(s, index, deck, editable) {
    const th = themeById(deck.theme);
    const el = h('div', { class: `slide t-${th.id} l-${s.layout}${editable ? ' editing' : ''}`, style: th.css });
    el.insertAdjacentHTML('afterbegin', `<div class="s-deco">${decoSVG(th.id, s.layout)}</div>`);
    const body = h('div', { class: 's-body' });
    const F = (tag, cls, path, ph, multi) => textField(tag, cls, s, path, ph, multi, editable);
    const L = (path) => listField(s, path, editable);
    switch (s.layout) {
      case 'cover':
        // Мұқабадағы белгі міндетті емес: бос болса, редакторда да көрсетпейміз
        if (s.kicker || !editable) body.append(F('p', 's-kicker', 'kicker', PH.kicker));
        body.append(F('h1', 's-title', 'title', PH.coverTitle), F('p', 's-sub', 'subtitle', PH.subtitle, true));
        break;
      case 'section':
        body.append(F('p', 's-kicker', 'kicker', PH.sectionNo), F('h2', 's-title', 'title', PH.sectionTitle));
        break;
      case 'two': {
        const col = (side) => h('div', { class: 's-col' }, F('h3', 's-h', `${side}.heading`, PH.heading), L(`${side}.bullets`));
        body.append(F('h2', 's-title', 'title', PH.title), h('div', { class: 's-cols' }, col('left'), col('right')));
        break;
      }
      case 'stat':
        body.append(F('h2', 's-title', 'title', PH.statTitle), F('p', 's-value', 'value', PH.value), F('p', 's-label', 'label', PH.label, true));
        break;
      case 'quote':
        body.append(h('div', { class: 's-qwrap' }, F('p', 's-quote', 'quote', PH.quote, true)), F('p', 's-author', 'author', PH.author));
        break;
      case 'image':
        body.append(h('div', { class: 's-left' }, F('h2', 's-title', 'title', PH.title), L('bullets')), imageBox(s, editable));
        break;
      case 'end':
        body.append(F('h2', 's-title', 'title', PH.endTitle), F('p', 's-sub', 'subtitle', PH.endSub, true));
        break;
      default:
        body.append(F('h2', 's-title', 'title', PH.title), L('bullets'));
    }
    el.append(body);
    if (!NO_NUMBER.has(s.layout)) el.append(h('div', { class: 's-num', text: String(index + 1) }));
    return el;
  }

  function makeEditable(el, multi) {
    el.setAttribute('contenteditable', PLAIN_OK ? 'plaintext-only' : 'true');
    el.spellcheck = false;
    el.addEventListener('focus', () => { pendingSnap = snapshot(); });
    el.addEventListener('paste', (e) => {
      e.preventDefault();
      let t = (e.clipboardData && e.clipboardData.getData('text/plain')) || '';
      if (!multi) t = t.replace(/\s+/g, ' ');
      document.execCommand('insertText', false, t);
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || (e.key === 'Enter' && !multi && !e.shiftKey)) { e.preventDefault(); el.blur(); }
    });
  }

  function textField(tag, cls, s, path, ph, multi, editable) {
    const val = getPath(s, path) || '';
    const el = h(tag, { class: cls });
    el.textContent = val;
    if (!editable) {
      if (!val) el.hidden = true;
      return el;
    }
    el.dataset.ph = ph;
    makeEditable(el, multi);
    el.addEventListener('input', () => {
      const v = multi ? el.innerText.replace(/\n{3,}/g, '\n\n').trim() : el.textContent.replace(/\s+/g, ' ').trim();
      setPath(s, path, v);
      onEdited();
    });
    el.addEventListener('blur', () => { if (!el.textContent.trim()) el.textContent = ''; });
    return el;
  }

  function listField(s, path, editable) {
    const items = getPath(s, path) || [];
    const ul = h('ul', { class: 's-list' });
    const shown = editable ? (items.length ? items : ['']) : items.filter(Boolean);
    for (const t of shown) {
      const li = h('li');
      li.textContent = t;
      if (editable) li.dataset.ph = PH.bullet;
      ul.append(li);
    }
    if (!editable) {
      if (!shown.length) ul.hidden = true;
      return ul;
    }
    ul.setAttribute('contenteditable', 'true');
    ul.spellcheck = false;
    ul.setAttribute('aria-label', 'Тармақтар: әрқайсысы жаңа жолдан');
    ul.addEventListener('focus', () => { pendingSnap = snapshot(); });
    ul.addEventListener('input', () => {
      if (!ul.querySelector('li')) {
        // Бәрі өшірілсе, мәтінді қайтадан тармаққа орап қоямыз
        const li = h('li');
        li.dataset.ph = PH.bullet;
        li.textContent = ul.textContent;
        ul.replaceChildren(li);
        const r = document.createRange();
        r.selectNodeContents(li);
        r.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
      }
      setPath(s, path, ul.innerText.split('\n').map((x) => x.trim()));
      onEdited();
    });
    ul.addEventListener('paste', (e) => {
      e.preventDefault();
      const t = (e.clipboardData && e.clipboardData.getData('text/plain')) || '';
      document.execCommand('insertText', false, t);
    });
    ul.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); ul.blur(); } });
    ul.addEventListener('blur', () => {
      const clean = (getPath(s, path) || []).map((x) => String(x).trim()).filter(Boolean);
      setPath(s, path, clean);
      const fresh = listField(s, path, true);
      ul.replaceWith(fresh);
      const slideEl = fresh.closest('.slide');
      if (slideEl) fit(slideEl);
    });
    return ul;
  }

  function imageBox(s, editable) {
    const box = h('div', { class: 's-img' });
    if (s.image) box.append(h('img', { src: s.image, alt: s.title || '' }));
    else if (editable) box.append(h('button', { type: 'button', class: 'ph', onclick: pickImage }, icon('image'), h('span', { text: 'Сурет қою' })));
    return box;
  }

  const slideLabel = (s) => s.title || s.quote || s.value || (LAYOUTS.find((l) => l[0] === s.layout) || [0, ''])[1];

  /* ---------------------------------------------------------------------
     Хабарлар мен қалқымалы терезелер
     --------------------------------------------------------------------- */
  function toast(msg, { action, onAction, ms = 5000 } = {}) {
    let host = document.querySelector('.toasts');
    if (!host) {
      host = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
      document.body.append(host);
    }
    const t = h('div', { class: 'toast' }, h('span', { text: msg }));
    if (action) t.append(h('button', { type: 'button', class: 'toast-act', text: action, onclick: () => { t.remove(); onAction(); } }));
    host.append(t);
    while (host.children.length > 3) host.firstChild.remove();
    setTimeout(() => t.remove(), ms);
  }

  let openPop = null;
  function closePop() {
    if (!openPop) return;
    document.removeEventListener('pointerdown', openPop.onDoc, true);
    document.removeEventListener('keydown', openPop.onKey);
    openPop.anchor.setAttribute('aria-expanded', 'false');
    openPop.pop.remove();
    openPop = null;
  }
  function popover(anchor, title, content, wide) {
    const same = openPop && openPop.anchor === anchor;
    closePop();
    if (same) return null;
    const pop = h('div', { class: `pop${wide ? ' wide' : ''}`, role: 'dialog', 'aria-label': title }, h('h2', { text: title }), content);
    document.body.append(pop);
    const r = anchor.getBoundingClientRect();
    const pw = pop.offsetWidth;
    pop.style.left = `${clamp(r.right - pw, 8, window.innerWidth - pw - 8)}px`;
    pop.style.top = `${Math.max(8, Math.min(r.bottom + 8, window.innerHeight - pop.offsetHeight - 8))}px`;
    const onDoc = (e) => { if (!pop.contains(e.target) && !anchor.contains(e.target)) closePop(); };
    const onKey = (e) => { if (e.key === 'Escape') { closePop(); anchor.focus(); } };
    document.addEventListener('pointerdown', onDoc, true);
    document.addEventListener('keydown', onKey);
    anchor.setAttribute('aria-expanded', 'true');
    openPop = { pop, anchor, onDoc, onKey };
    const first = pop.querySelector('button, select, input');
    if (first) first.focus({ preventScroll: true });
    return pop;
  }

  /* ---------------------------------------------------------------------
     Басты бет
     --------------------------------------------------------------------- */
  function themeCard(th, title, pressed, onPick) {
    const scaler = h('div', { class: 'scaler' }, renderSlide(normSlide({ layout: 'cover', title }), 0, { theme: th.id }, false));
    observeScale(scaler);
    return h('button', { type: 'button', class: 'theme-card', 'aria-pressed': pressed ? 'true' : 'false', 'data-theme-id': th.id, onclick: () => onPick(th.id) },
      scaler, h('span', { class: 'tname', text: th.name }));
  }

  function renderStart() {
    state.view = 'start';
    closePop();
    pruneObserved();
    els = {};

    const pill = h('span', { class: 'ai-pill', id: 'ai-pill' }, h('span', { class: 'dot', 'aria-hidden': 'true' }), h('span', { class: 'ai-text' }));
    const header = h('header', { class: 'wrap app-head' },
      h('div', { class: 'brand', html: `${BRAND_MARK}<span class="brand-name">Слайдшы</span>` }),
      pill);

    const topic = h('textarea', { id: 'topic', rows: '3', maxlength: '400', placeholder: 'Мысалы: Қазақстанның ұлттық парктері', 'aria-label': 'Презентация тақырыбы', 'aria-describedby': 'topic-error' });
    topic.value = state.topic;
    const topicError = h('p', { class: 'topic-error', id: 'topic-error', hidden: true, text: 'Алдымен тақырыпты жазыңыз.' });
    const extra = h('input', { class: 'extra', id: 'extra', type: 'text', maxlength: '300', placeholder: 'Қосымша: кімге арналған, неге назар аудару керек (міндетті емес)', 'aria-label': 'Қосымша тілектер' });
    extra.value = state.extra;
    extra.addEventListener('input', () => { state.extra = extra.value; });

    const countSel = h('select', { id: 'count', 'aria-label': 'Слайд саны' }, Array.from({ length: 11 }, (_, i) => h('option', { value: String(i + 5), text: String(i + 5) })));
    countSel.value = String(state.count);
    countSel.addEventListener('change', () => { state.count = Number(countSel.value); savePrefs(); });
    const langSel = h('select', { id: 'lang', 'aria-label': 'Слайдтардың тілі' }, LANGS.map(([v, t]) => h('option', { value: v, text: t })));
    langSel.value = state.lang;
    langSel.addEventListener('change', () => { state.lang = langSel.value; savePrefs(); });

    const themesBox = h('div', { class: 'themes', role: 'group', 'aria-label': 'Дизайн' });
    const pickTheme = (id) => {
      state.theme = id;
      savePrefs();
      themesBox.querySelectorAll('.theme-card').forEach((c) => c.setAttribute('aria-pressed', c.dataset.themeId === id ? 'true' : 'false'));
    };
    const drawThemes = () => {
      const title = state.topic.trim() || 'Сіздің тақырыбыңыз';
      themesBox.replaceChildren(...THEMES.map((th) => themeCard(th, title, th.id === state.theme, pickTheme)));
      pruneObserved();
    };
    drawThemes();
    const redrawThemes = debounce(drawThemes, 350);
    topic.addEventListener('input', () => { state.topic = topic.value; topicError.hidden = true; redrawThemes(); });
    topic.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); form.requestSubmit(); } });

    const genBtn = h('button', { type: 'submit', class: 'btn btn-primary btn-lg', id: 'gen-btn' }, icon('sparkle'), h('span', { class: 'gen-lbl' }));
    const note = h('p', { class: 'gen-note', id: 'gen-note' });
    const form = h('form', { class: 'prompt-card', novalidate: true, onsubmit: (e) => { e.preventDefault(); onGenerate(topic, topicError); } },
      topic, topicError, extra,
      h('div', { class: 'opts' },
        h('label', { class: 'opt' }, h('span', { text: 'Слайд саны' }), countSel),
        h('label', { class: 'opt' }, h('span', { text: 'Тілі' }), langSel)),
      h('div', { class: 'label-row' }, h('span', { class: 'label', text: 'Дизайн' })),
      themesBox,
      h('div', { class: 'gen-row' }, note, genBtn));

    const chips = h('div', { class: 'chips' }, h('span', { class: 'label', text: 'Тақырып идеялары' }),
      TOPIC_IDEAS.map((t) => h('button', { type: 'button', class: 'chip', text: t, onclick: () => { topic.value = t; state.topic = t; topicError.hidden = true; redrawThemes(); topic.focus(); } })));

    // Мысал слайдтардың желпуіші
    const ex = sanitizeDeck(EXAMPLE);
    const fanCard = (cls, slideIdx, themeId) => {
      const sc = h('div', { class: 'scaler' }, renderSlide(ex.slides[slideIdx], slideIdx, { theme: themeId }, false));
      observeScale(sc);
      return h('div', { class: `card ${cls}` }, sc);
    };
    const showcase = h('section', { class: 'showcase', 'aria-label': 'Мысал презентация' },
      h('div', { class: 'fan', 'aria-hidden': 'true' }, fanCard('c1', 2, 'tun'), fanCard('c2', 4, 'anar'), fanCard('c3', 0, 'aspan')),
      h('div', { class: 'showcase-foot' },
        h('p', null, 'Мысал: ', h('b', { text: '«Жақсы презентацияның 6 ережесі»' }), ', 8 слайд'),
        btn('slides', 'Мысалды ашу', () => openDeck(exampleDeck()), { cls: 'btn-ghost' })));

    const hero = h('section', { class: 'wrap hero' },
      h('div', { class: 'hero-copy' },
        h('h1', { class: 'hero-title', html: 'Тақырыпты жазыңыз, қалғанын <em>Слайдшы</em> жасайды' }),
        h('p', { class: 'lead', text: 'Тақырып пен слайд санын көрсетіп, дизайн таңдаңыз. Дайын слайдтарды өңдеп, бірден көрсетуге немесе PowerPoint-қа жүктеуге болады.' }),
        form, chips),
      showcase);

    const projects = renderProjects();
    const foot = h('footer', { class: 'wrap site-foot' },
      h('p', { text: 'Слайдшы — тақырыптан дайын презентацияға дейін.' }),
      h('p', { text: 'Жобалар осы браузерде сақталады. Басқа құрылғыға көшіру үшін жобаны .json файлы етіп жүктеп алыңыз.' }));

    app.replaceChildren(h('div', { class: 'start' }, header, hero, projects, foot));
    pruneObserved();
    els = { pill, genBtn, note };
    updateAIUI();
  }

  function renderProjects() {
    const list = listProjects();
    const grid = h('div', { class: 'proj-grid' });
    for (const p of list.slice(0, 12)) {
      const d = loadDeck(p.id);
      if (!d) continue;
      const first = d.slides[0] || normSlide({ layout: 'cover', title: d.title });
      const sc = h('div', { class: 'scaler' }, renderSlide(first, 0, d, false));
      observeScale(sc);
      const when = new Date(d.updated);
      let date = '';
      try { date = new Intl.DateTimeFormat('kk-KZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(when); } catch (e) { date = when.toLocaleString(); }
      const del = btn('trash', 'Жобаны өшіру', null, { cls: 'btn-ghost btn-danger', showLabel: false });
      let armed = 0;
      del.addEventListener('click', () => {
        if (Date.now() - armed < 3000) {
          deleteProject(d.id);
          card.remove();
          toast('Жоба өшірілді.');
          return;
        }
        armed = Date.now();
        del.title = 'Растау үшін тағы басыңыз';
        toast(`«${d.title}» жобасын өшіру үшін қоқыс белгішесін тағы бір рет басыңыз.`, { ms: 3000 });
      });
      const card = h('article', { class: 'proj' },
        h('button', { type: 'button', class: 'proj-open', 'aria-label': `«${d.title}» жобасын ашу`, onclick: () => openDeck(d) }, sc),
        h('div', { class: 'proj-meta' },
          h('div', { class: 'proj-text' }, h('div', { class: 'proj-title', text: d.title }), h('div', { class: 'proj-date', text: `${d.slides.length} слайд · ${date}` })),
          del));
      grid.append(card);
    }
    const empty = !grid.children.length;
    return h('section', { class: 'wrap projects', 'aria-labelledby': 'proj-h' },
      h('div', { class: 'section-head' },
        h('h2', { id: 'proj-h', text: 'Жобаларым' }),
        btn('open', 'Файлдан ашу (.json)', importJSON, { cls: 'btn-ghost' })),
      empty ? h('p', { class: 'empty-note', text: 'Әзірге жоба жоқ. Жоғарыда тақырып жазып, алғашқысын жасаңыз немесе мысалды ашыңыз.' }) : grid);
  }

  function updateAIUI() {
    if (state.view !== 'start' || !els.genBtn) return;
    const on = aiOn();
    els.pill.classList.toggle('on', on);
    els.pill.querySelector('.ai-text').textContent = on ? 'Claude қосулы' : 'Үлгі режимі';
    els.pill.title = on ? 'Слайд мәтінін Claude жазады' : 'Жасанды интеллект бұл жерде қосылмаған';
    els.genBtn.querySelector('.gen-lbl').textContent = on ? 'Слайдтарды жасау' : 'Үлгі жасау';
    els.note.textContent = on
      ? 'Мәтінді Claude жазады, кейін бәрін өзгерте аласыз. Әдетте бір минуттай уақыт алады.'
      : 'Жасанды интеллект бұл жерде қосылмаған: құрылымы дайын үлгі жасалады, мәтінін өзіңіз толтырасыз.';
  }

  function onGenerate(topicEl, topicError) {
    const topic = state.topic.trim();
    if (!topic) {
      topicError.hidden = false;
      topicEl.focus();
      return;
    }
    savePrefs();
    const d = newDeck({ title: topic, theme: state.theme, lang: state.lang });
    const params = { topic, extra: state.extra.trim(), count: state.count, lang: state.lang };
    if (aiOn()) {
      openDeck(d);
      runAI(d, params);
    } else {
      d.slides = templateSlides(topic, params.count, params.lang);
      openDeck(d);
      toast('Құрылымы дайын үлгі жасалды. Жақша ішіндегі мәтінді өзіңізше толтырыңыз.', { ms: 7000 });
    }
  }

  /* ---------------------------------------------------------------------
     Claude арқылы генерация
     --------------------------------------------------------------------- */
  function buildPrompt({ topic, extra, count, lang }) {
    const language = {
      kk: 'Kazakh in Cyrillic script. Use the Kazakh letters ә, ғ, қ, ң, ө, ұ, ү, һ, і correctly and write natural Kazakh, not a word-for-word translation from Russian',
      ru: 'Russian',
      en: 'English',
    }[lang] || 'Kazakh in Cyrillic script';
    return [
      'Write the content of a slide presentation.',
      '',
      `Topic: ${topic}`,
      extra ? `Wishes from the author: ${extra}` : null,
      `Language of every piece of slide text: ${language}.`,
      `Number of slides: ${count}. The first slide is the title slide and the last one is the closing slide.`,
      '',
      'Reply in JSON Lines: one JSON object per line and nothing else (no Markdown, no code fences, no comments).',
      'Line 1: {"type":"deck","title":"presentation title"}',
      `Then exactly ${count} lines, one per slide, in order. Each slide has one of these shapes:`,
      '{"type":"slide","layout":"cover","title":"...","subtitle":"..."}',
      '{"type":"slide","layout":"section","kicker":"01","title":"..."}',
      '{"type":"slide","layout":"bullets","title":"...","bullets":["...","...","..."]}',
      '{"type":"slide","layout":"two","title":"...","left":{"heading":"...","bullets":["...","..."]},"right":{"heading":"...","bullets":["...","..."]}}',
      '{"type":"slide","layout":"stat","title":"...","value":"...","label":"..."}',
      '{"type":"slide","layout":"quote","quote":"...","author":"..."}',
      '{"type":"slide","layout":"end","title":"...","subtitle":"..."}',
      'Any slide may also have "notes": what the speaker says on that slide, in 1-3 sentences.',
      '',
      'Guidelines:',
      '- Slide 1 is "cover" and the last slide is "end". Most slides are "bullets"; use "section", "two", "stat" and "quote" where they suit the material, so the deck has some variety.',
      '- One idea per slide. Titles under 60 characters. 2-5 bullets per slide, each under 90 characters.',
      '- Be accurate. Use "stat" only for a figure you are sure of and that is widely documented, and say in "label" what it measures; otherwise use bullets. Use "quote" only for a real quotation whose author you are sure of. Never invent numbers, sources or quotations.',
      '- Plain text inside the strings: no Markdown, no HTML, no emoji.',
    ].filter((x) => x !== null).join('\n');
  }

  function parseLine(line) {
    let t = String(line || '').trim();
    if (!t || t.startsWith('```')) return null;
    t = t.replace(/^[-*•]\s+/, '').replace(/,\s*$/, '');
    if (!t.startsWith('{') || !t.endsWith('}')) return null;
    try {
      const o = JSON.parse(t);
      return o && typeof o === 'object' && !Array.isArray(o) ? o : null;
    } catch (e) { return null; }
  }
  function parseWhole(text) {
    let t = String(text || '').replace(/```[a-z]*\n?/gi, '').trim();
    const a = t.indexOf('['), o = t.indexOf('{');
    const start = a >= 0 && (o < 0 || a < o) ? a : o;
    if (start < 0) return [];
    const end = Math.max(t.lastIndexOf(']'), t.lastIndexOf('}'));
    t = t.slice(start, end + 1);
    try {
      const v = JSON.parse(t);
      if (Array.isArray(v)) return v;
      if (v && Array.isArray(v.slides)) return [{ type: 'deck', title: v.title }, ...v.slides];
    } catch (e) { /* JSON емес */ }
    return [];
  }

  const AI_ERR = {
    rate_limited: 'Сұраныс тым көп болды. Біраз күтіп, қайта көріңіз.',
    session_expired: 'Claude-қа қайта кіріңіз де, тағы көріңіз.',
    refused: 'Claude бұл сұранысқа жауап бермеді. Тақырыпты басқаша жазып көріңіз.',
    empty_completion: 'Жауап толық келмеді. Қайта көріңіз.',
    invalid_json: 'Жауап толық келмеді. Қайта көріңіз.',
    prompt_too_large: 'Мәтін тым ұзын. Тақырыпты қысқартып жазыңыз.',
    upstream_error: 'Байланыс үзілді. Қайта көріңіз.',
  };
  const NO_AI_CODES = new Set(['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed']);

  async function runAI(d, p) {
    const ctl = new AbortController();
    gen = { ctl, t0: Date.now(), total: p.count, got: 0, deck: d, tick: 0 };
    renderGenStatus();
    gen.tick = setInterval(renderGenStatus, 1000);
    let pending = '';
    const take = (obj) => {
      if (!obj) return;
      if (obj.type === 'deck') {
        const t = cleanText(obj.title, 160);
        if (t) {
          d.title = t;
          if (state.deck === d && els.title) els.title.value = t;
        }
        return;
      }
      if (obj.type !== 'slide' && !obj.layout) return;
      if (d.slides.length >= 20) return;
      d.slides.push(normSlide(obj));
      if (gen && gen.deck === d) gen.got = d.slides.length;
      if (state.deck === d && state.view === 'editor') {
        appendThumb(d.slides.length - 1);
        if (d.slides.length === 1) { state.current = 0; renderStage(); }
        else updateToolbar();
        renderGenStatus();
      }
      scheduleSave();
    };
    try {
      const res = await sample(buildPrompt(p), {
        signal: ctl.signal,
        modelTier: 'default',
        cache: false,
        onText: ({ delta }) => {
          const parts = (pending + delta).split('\n');
          pending = parts.pop();
          for (const line of parts) take(parseLine(line));
        },
      });
      if (pending.trim()) take(parseLine(pending));
      pending = '';
      if (!d.slides.length) parseWhole(res && res.text).forEach(take);
      if (!d.slides.length) throw { code: 'empty_completion' };
      toast(`Дайын: ${d.slides.length} слайд. Мәтінді өзгертуге, дизайнды ауыстыруға болады.`, { ms: 6000 });
    } catch (e) {
      if (pending.trim()) take(parseLine(pending));
      onAIError(e, d, p);
    } finally {
      clearInterval(gen && gen.tick);
      gen = null;
      saveDeck(d);
      if (state.deck === d && state.view === 'editor') {
        renderGenStatus();
        renderRail();
        if (!els.stage.querySelector('.slide')) renderStage();
      }
    }
  }

  function onAIError(e, d, p) {
    const code = e && typeof e === 'object' ? e.code : undefined;
    const fillTemplate = () => {
      if (d.slides.length) return;
      d.slides = templateSlides(p.topic, p.count, p.lang);
      if (state.deck === d) state.current = 0;
    };
    if (NO_AI_CODES.has(code)) {
      aiBlocked = true;
      fillTemplate();
      toast(code === 'not_granted'
        ? 'Claude-ты қолдануға рұқсат берілмеді, сондықтан құрылымы дайын үлгі жасалды.'
        : 'Claude бұл жерде қолжетімсіз, сондықтан құрылымы дайын үлгі жасалды.', { ms: 8000 });
      if (state.deck === d) renderStage();
      return;
    }
    if (code === 'cancelled') {
      fillTemplate();
      toast('Тоқтатылды. Жазылып үлгерген слайдтар сақталды.');
      if (state.deck === d) renderStage();
      return;
    }
    fillTemplate();
    if (state.deck === d) renderStage();
    toast(AI_ERR[code] || AI_ERR.upstream_error, { action: 'Қайта жасау', onAction: () => regenerate(d, p), ms: 12000 });
  }

  function regenerate(d, p) {
    if (state.deck !== d || gen || !aiOn()) return;
    pushUndo();
    d.slides = [];
    state.current = 0;
    renderRail();
    renderStage();
    runAI(d, p);
  }

  function renderGenStatus() {
    if (!els.gen) return;
    const active = gen && gen.deck === state.deck;
    els.gen.hidden = !active;
    if (!active) return;
    const secs = Math.round((Date.now() - gen.t0) / 1000);
    els.genText.textContent = gen.got === 0
      ? `Claude ойланып жатыр… ${secs} с`
      : `Слайдтар жазылып жатыр: ${gen.got} / ${gen.total}`;
  }

  /* ---------------------------------------------------------------------
     Редактор
     --------------------------------------------------------------------- */
  function openDeck(d, index = 0) {
    if (gen && gen.deck !== d) gen.ctl.abort();
    state.deck = d;
    state.current = clamp(index, 0, Math.max(0, d.slides.length - 1));
    undoStack.length = 0;
    pendingSnap = null;
    saveDeck(d);
    renderEditor();
  }

  function goHome() {
    if (gen) gen.ctl.abort();
    if (state.deck) saveDeck(state.deck);
    state.deck = null;
    renderStart();
  }

  function renderEditor() {
    state.view = 'editor';
    closePop();
    const d = state.deck;
    els = {};
    els.title = h('input', { class: 'title-input', id: 'deck-title', type: 'text', maxlength: '160', 'aria-label': 'Презентация атауы', placeholder: 'Презентация атауы' });
    els.title.value = d.title;
    els.title.addEventListener('input', () => { d.title = els.title.value; scheduleSave(); });
    els.title.addEventListener('keydown', (e) => { if (e.key === 'Enter') els.title.blur(); });

    els.undo = btn('undo', 'Болдырмау', undo, { cls: 'btn-ghost', showLabel: false });
    const design = btn('palette', 'Дизайн', (e) => openDesign(e.currentTarget), { cls: 'btn-ghost' });
    design.setAttribute('aria-haspopup', 'dialog');
    const show = btn('play', 'Көрсету', () => present(state.current), { cls: 'btn-primary' });
    const dl = btn('download', 'Жүктеу', (e) => openDownloads(e.currentTarget));
    dl.setAttribute('aria-haspopup', 'dialog');
    const top = h('header', { class: 'topbar' }, btn('back', 'Басты бет', goHome, { cls: 'btn-ghost', showLabel: false }), els.title, els.undo, design, dl, show);

    els.rail = h('nav', { class: 'rail', 'aria-label': 'Слайдтар' });
    els.genText = h('span', { class: 'gen-text' });
    els.gen = h('div', { class: 'gen-status', role: 'status', hidden: true },
      h('span', { class: 'spinner', 'aria-hidden': 'true' }), els.genText,
      btn('stop', 'Тоқтату', () => gen && gen.ctl.abort(), { cls: 'btn-ghost' }));

    els.layout = h('select', { id: 'layout-select', 'aria-label': 'Слайд түрі' }, LAYOUTS.map(([v, t]) => h('option', { value: v, text: t })));
    els.layout.addEventListener('change', () => setLayout(els.layout.value));
    els.imgBtn = btn('image', 'Сурет қою', pickImage);
    els.upBtn = btn('up', 'Жоғары жылжыту', () => moveSlide(-1), { showLabel: false });
    els.downBtn = btn('down', 'Төмен жылжыту', () => moveSlide(1), { showLabel: false });
    els.dupBtn = btn('copy', 'Көшірме', duplicateSlide);
    els.delBtn = btn('trash', 'Өшіру', deleteSlide, { cls: 'btn-danger' });
    els.pos = h('span', { class: 'pos' });
    els.toolbar = h('div', { class: 'toolbar', role: 'toolbar', 'aria-label': 'Слайд әрекеттері' },
      h('label', { class: 'layout-pick' }, h('span', { class: 'lbl', text: 'Түрі' }), els.layout),
      els.imgBtn, h('span', { class: 'sep', 'aria-hidden': 'true' }),
      els.upBtn, els.downBtn, els.dupBtn, els.delBtn, h('span', { class: 'grow' }), els.pos);

    els.stage = h('div', { class: 'stage scaler' });
    observeScale(els.stage);
    els.notes = h('textarea', { id: 'slide-notes', rows: '3', placeholder: 'Осы слайдта не айтасыз? Бұл жазба тек өзіңізге: көрсетілімде көрінбейді.' });
    els.notes.addEventListener('focus', () => { pendingSnap = snapshot(); });
    els.notes.addEventListener('input', () => {
      const s = d.slides[state.current];
      if (!s) return;
      s.notes = els.notes.value;
      if (pendingSnap) { pushUndo(pendingSnap); pendingSnap = null; }
      scheduleSave();
    });

    const main = h('main', { class: 'main' }, els.gen, els.toolbar, els.stage,
      h('label', { class: 'notes' }, h('span', { class: 'label', text: 'Баяндамашы жазбасы' }), els.notes));
    app.replaceChildren(h('div', { class: 'editor' }, top, els.rail, main));
    pruneObserved();
    renderRail();
    renderStage();
    renderGenStatus();
    updateUndoBtn();
  }

  function thumbFor(i) {
    const d = state.deck;
    const s = d.slides[i];
    const sc = h('div', { class: 'scaler mini' }, renderSlide(s, i, d, false));
    observeScale(sc);
    return h('button', { type: 'button', class: 'thumb', 'aria-current': i === state.current ? 'true' : 'false', 'aria-label': `${i + 1}-слайд: ${slideLabel(s)}`, onclick: () => select(i) },
      h('span', { class: 'n', text: String(i + 1) }), sc);
  }

  function renderRail() {
    if (!els.rail || !state.deck) return;
    const d = state.deck;
    const thumbs = d.slides.map((_, i) => thumbFor(i));
    const add = h('button', { type: 'button', class: 'add-slide', onclick: addSlide, 'aria-label': 'Слайд қосу' }, icon('plus'), h('span', { text: 'Слайд қосу' }));
    els.rail.replaceChildren(...thumbs, add);
    pruneObserved();
    scrollThumbIntoView();
  }

  function appendThumb(i) {
    if (!els.rail) return;
    const t = thumbFor(i);
    t.classList.add('arrive');
    els.rail.insertBefore(t, els.rail.querySelector('.add-slide'));
  }

  function refreshThumb(i) {
    if (!els.rail || !state.deck) return;
    const old = els.rail.children[i];
    if (old && old.classList.contains('thumb')) {
      old.replaceWith(thumbFor(i));
      pruneObserved();
    }
  }
  const refreshThumbSoon = debounce(() => refreshThumb(state.current), 400);

  function scrollThumbIntoView() {
    const t = els.rail && els.rail.children[state.current];
    if (t && t.scrollIntoView) t.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  function updateToolbar() {
    const d = state.deck;
    const s = d.slides[state.current];
    const has = !!s;
    for (const b of [els.layout, els.dupBtn, els.delBtn]) b.disabled = !has;
    els.upBtn.disabled = !has || state.current === 0;
    els.downBtn.disabled = !has || state.current >= d.slides.length - 1;
    els.layout.value = has ? s.layout : 'bullets';
    els.imgBtn.hidden = !has || s.layout !== 'image';
    if (has) {
      const lbl = s.image ? 'Суретті ауыстыру' : 'Сурет қою';
      els.imgBtn.querySelector('.lbl').textContent = lbl;
      els.imgBtn.setAttribute('aria-label', lbl);
      els.imgBtn.title = lbl;
    }
    els.pos.textContent = has ? `${state.current + 1} / ${d.slides.length}` : '';
    els.notes.disabled = !has;
    els.notes.value = has ? s.notes || '' : '';
  }

  function renderStage() {
    if (!els.stage || !state.deck) return;
    const d = state.deck;
    const s = d.slides[state.current];
    if (!s) {
      const msg = gen && gen.deck === d ? 'Алғашқы слайд жазылып жатыр…' : 'Слайд жоқ. Сол жақтағы «Слайд қосу» батырмасын басыңыз.';
      els.stage.replaceChildren(h('div', { class: 'stage-empty', text: msg }));
    } else {
      const el = renderSlide(s, state.current, d, true);
      els.stage.replaceChildren(el);
      requestAnimationFrame(() => fit(el));
    }
    updateToolbar();
  }

  const fitStageSoon = debounce(() => {
    const el = els.stage && els.stage.querySelector('.slide');
    if (el) fit(el);
  }, 120);

  function onEdited() {
    if (pendingSnap) { pushUndo(pendingSnap); pendingSnap = null; }
    fitStageSoon();
    refreshThumbSoon();
    scheduleSave();
  }

  function select(i) {
    const d = state.deck;
    if (!d || i < 0 || i >= d.slides.length) return;
    state.current = i;
    if (els.rail) [...els.rail.querySelectorAll('.thumb')].forEach((t, k) => t.setAttribute('aria-current', k === i ? 'true' : 'false'));
    renderStage();
    scrollThumbIntoView();
  }

  /* Болдырмау */
  const snapshot = () => JSON.stringify(state.deck);
  function pushUndo(snap = snapshot()) {
    undoStack.push({ snap, current: state.current });
    if (undoStack.length > 40) undoStack.shift();
    updateUndoBtn();
  }
  function updateUndoBtn() { if (els.undo) els.undo.disabled = undoStack.length === 0; }
  function undo() {
    const u = undoStack.pop();
    if (!u || !state.deck) return;
    const restored = sanitizeDeck(JSON.parse(u.snap), true);
    Object.assign(state.deck, restored);
    state.current = clamp(u.current, 0, Math.max(0, state.deck.slides.length - 1));
    if (els.title) els.title.value = state.deck.title;
    renderRail();
    renderStage();
    updateUndoBtn();
    scheduleSave();
  }

  /* Слайдпен жұмыс */
  function addSlide() {
    const d = state.deck;
    pushUndo();
    const s = normSlide({ layout: 'bullets' });
    const at = d.slides.length ? state.current + 1 : 0;
    d.slides.splice(at, 0, s);
    state.current = at;
    renderRail();
    renderStage();
    scheduleSave();
    const first = els.stage.querySelector('[contenteditable]');
    if (first) first.focus();
  }
  function duplicateSlide() {
    const d = state.deck;
    const s = d.slides[state.current];
    if (!s) return;
    pushUndo();
    const copy = normSlide(JSON.parse(JSON.stringify(s)));
    copy.id = uid();
    d.slides.splice(state.current + 1, 0, copy);
    state.current += 1;
    renderRail();
    renderStage();
    scheduleSave();
  }
  function deleteSlide() {
    const d = state.deck;
    if (!d.slides[state.current]) return;
    pushUndo();
    d.slides.splice(state.current, 1);
    state.current = clamp(state.current, 0, Math.max(0, d.slides.length - 1));
    renderRail();
    renderStage();
    scheduleSave();
    toast('Слайд өшірілді.', { action: 'Қайтару', onAction: undo });
  }
  function moveSlide(dir) {
    const d = state.deck;
    const j = state.current + dir;
    if (j < 0 || j >= d.slides.length) return;
    pushUndo();
    [d.slides[state.current], d.slides[j]] = [d.slides[j], d.slides[state.current]];
    state.current = j;
    renderRail();
    renderStage();
    scheduleSave();
  }
  function setLayout(layout) {
    const s = state.deck.slides[state.current];
    if (!s || !LAYOUT_IDS.has(layout) || s.layout === layout) return;
    pushUndo();
    if (layout === 'two' && !s.left && !s.right) {
      const b = s.bullets || [];
      const half = Math.ceil(b.length / 2);
      s.left = { heading: '', bullets: b.slice(0, half) };
      s.right = { heading: '', bullets: b.slice(half) };
    }
    if ((layout === 'bullets' || layout === 'image') && !(s.bullets && s.bullets.length) && (s.left || s.right)) {
      s.bullets = [...((s.left && s.left.bullets) || []), ...((s.right && s.right.bullets) || [])];
    }
    s.layout = layout;
    renderStage();
    refreshThumb(state.current);
    scheduleSave();
  }

  /* Сурет */
  function pickImage() {
    const s = state.deck && state.deck.slides[state.current];
    if (!s) return;
    const input = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif', hidden: true });
    input.addEventListener('change', async () => {
      const f = input.files && input.files[0];
      input.remove();
      if (!f) return;
      try {
        const data = await imageToDataURL(f);
        pushUndo();
        s.image = data;
        if (s.layout !== 'image') s.layout = 'image';
        renderStage();
        refreshThumb(state.current);
        scheduleSave();
      } catch (e) {
        toast('Бұл суретті ашу мүмкін болмады. PNG немесе JPG файлын таңдап көріңіз.');
      }
    });
    document.body.append(input);
    input.click();
  }
  function imageToDataURL(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          const max = 1600;
          const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
          const w = Math.max(1, Math.round(img.naturalWidth * k));
          const hh = Math.max(1, Math.round(img.naturalHeight * k));
          const c = document.createElement('canvas');
          c.width = w;
          c.height = hh;
          const ctx = c.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, hh);
          ctx.drawImage(img, 0, 0, w, hh);
          resolve(c.toDataURL('image/jpeg', 0.84));
        } catch (e) { reject(e); } finally { URL.revokeObjectURL(url); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image')); };
      img.src = url;
    });
  }

  /* Дизайн терезесі */
  function openDesign(anchor) {
    const d = state.deck;
    const firstSlide = d.slides[0];
    const title = (firstSlide && firstSlide.title) || d.title;
    const grid = h('div', { class: 'themes' });
    const pick = (id) => {
      if (d.theme === id) return;
      pushUndo();
      d.theme = id;
      state.theme = id;
      savePrefs();
      grid.querySelectorAll('.theme-card').forEach((c) => c.setAttribute('aria-pressed', c.dataset.themeId === id ? 'true' : 'false'));
      renderRail();
      renderStage();
      scheduleSave();
    };
    grid.append(...THEMES.map((th) => themeCard(th, title, th.id === d.theme, pick)));
    popover(anchor, 'Дизайн таңдаңыз', grid, true);
  }

  /* Жүктеу терезесі */
  function openDownloads(anchor) {
    const item = (iconName, title, desc, fn) => h('button', { type: 'button', class: 'menu-item', onclick: () => { closePop(); fn(); } },
      icon(iconName), h('b', { text: title }), h('small', { text: desc }));
    const list = h('div', null,
      item('slides', 'PowerPoint (.pptx)', 'PowerPoint, Keynote және Google Slides-та ашылады', exportPPTX),
      IN_CLAUDE ? null : item('file', 'PDF', 'Басып шығару терезесінде «PDF ретінде сақтау» таңдаңыз', printDeck),
      item('download', 'Жоба файлы (.json)', 'Кейін Слайдшыда қайта ашып, өңдеу үшін', exportJSON));
    popover(anchor, 'Жүктеп алу', list);
  }

  /* ---------------------------------------------------------------------
     Көрсетілім
     --------------------------------------------------------------------- */
  function present(from) {
    const d = state.deck;
    if (!d || !d.slides.length) { toast('Көрсететін слайд жоқ.'); return; }
    closePop();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    let i = clamp(from, 0, d.slides.length - 1);
    const stage = h('div', { class: 'pstage' });
    const count = h('span', { class: 'pcount', 'aria-live': 'polite' });
    const progress = h('div', { class: 'pprogress', 'aria-hidden': 'true' });
    const pb = (iconName, label, fn) => h('button', { type: 'button', 'aria-label': label, title: label, onclick: (e) => { e.stopPropagation(); fn(); } }, icon(iconName));
    const canFS = !!(document.documentElement.requestFullscreen);
    const bar = h('div', { class: 'pbar' },
      pb('left', 'Алдыңғы слайд', () => go(i - 1)), count, pb('right', 'Келесі слайд', () => go(i + 1)),
      canFS ? pb('expand', 'Толық экран', toggleFS) : null,
      pb('x', 'Көрсетілімнен шығу (Esc)', close));
    const ov = h('div', { class: 'present', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Көрсетілім', tabindex: '-1' }, progress, stage, bar);

    const layout = () => ov.style.setProperty('--k', Math.min(window.innerWidth / 1280, window.innerHeight / 720).toFixed(5));
    const show = (n) => {
      i = n;
      const el = renderSlide(d.slides[i], i, d, false);
      stage.replaceChildren(el);
      fit(el);
      stage.classList.remove('enter');
      void stage.offsetWidth;
      stage.classList.add('enter');
      count.textContent = `${i + 1} / ${d.slides.length}`;
      progress.style.width = `${((i + 1) / d.slides.length) * 100}%`;
    };
    const go = (n) => { if (n >= 0 && n < d.slides.length && n !== i) show(n); };
    function toggleFS() {
      try {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        else ov.requestFullscreen().catch(() => {});
      } catch (e) { /* толық экран міндетті емес */ }
    }
    let idleT = 0;
    const wake = () => { ov.classList.remove('idle'); clearTimeout(idleT); idleT = setTimeout(() => ov.classList.add('idle'), 2500); };
    const onKey = (e) => {
      const k = e.key;
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) { e.preventDefault(); go(i + 1); }
      else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); go(i - 1); }
      else if (k === 'Home') { e.preventDefault(); go(0); }
      else if (k === 'End') { e.preventDefault(); go(d.slides.length - 1); }
      else if (k === 'Escape') { e.preventDefault(); close(); }
      else if (k === 'f' || k === 'F') toggleFS();
    };
    let tx = 0, ty = 0;
    ov.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; tx = t.clientX; ty = t.clientY; }, { passive: true });
    ov.addEventListener('touchend', (e) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - tx, dy = t.clientY - ty;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? i + 1 : i - 1);
    }, { passive: true });
    stage.addEventListener('click', (e) => {
      const r = stage.getBoundingClientRect();
      go(e.clientX - r.left > r.width / 3 ? i + 1 : i - 1);
    });
    ov.addEventListener('pointermove', wake);
    window.addEventListener('resize', layout);
    document.addEventListener('keydown', onKey);
    function close() {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', layout);
      clearTimeout(idleT);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      ov.remove();
      if (state.deck === d && state.view === 'editor') select(i);
    }
    document.body.append(ov);
    layout();
    show(i);
    ov.focus();
    wake();
    if (canFS && window.matchMedia('(pointer: fine)').matches) {
      try { ov.requestFullscreen().catch(() => {}); } catch (e) { /* міндетті емес */ }
    }
  }

  /* ---------------------------------------------------------------------
     Файлдар: PPTX, PDF, JSON
     --------------------------------------------------------------------- */
  async function saveFile(filename, blob) {
    if (downloads) {
      try {
        await downloads.save({ filename, data: blob });
        return true;
      } catch (e) {
        const code = e && e.code;
        if (code === 'declined') return false;
        if (code === 'rate_limited') { toast('Алдыңғы файл әлі дайындалып жатыр. Сәлден соң қайта көріңіз.'); return false; }
        if (code === 'rejected_extension' || code === 'extension_not_enabled') { toast('Бұл жерде мұндай файл түрін жүктеу қолжетімсіз.'); return false; }
        toast('Файлды бұл жерде жүктеу мүмкін болмады.');
        return false;
      }
    }
    if (IN_CLAUDE) toast('Бұл көріністе файл жүктеу шектелген болуы мүмкін. Жүктелмесе, бетті жаңа қойындыда ашыңыз.', { ms: 7000 });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: filename, hidden: true });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return true;
  }

  function loadScript(src, ready) {
    return new Promise((resolve, reject) => {
      if (ready()) { resolve(); return; }
      const existing = document.querySelector(`script[data-src="${src}"]`);
      const s = existing || h('script', { src, 'data-src': src, async: true });
      s.addEventListener('load', () => (ready() ? resolve() : reject(new Error('lib'))));
      s.addEventListener('error', () => { s.remove(); reject(new Error('lib')); });
      if (!existing) document.head.append(s);
    });
  }

  function measureFits(d) {
    const host = h('div', { class: 'measure', 'aria-hidden': 'true', style: 'position:fixed;left:-20000px;top:0;width:1280px;height:720px;overflow:hidden;visibility:hidden' });
    document.body.append(host);
    const out = d.slides.map((s, i) => {
      const el = renderSlide(s, i, d, false);
      host.replaceChildren(el);
      return fit(el);
    });
    host.remove();
    return out;
  }

  async function exportPPTX() {
    const d = state.deck;
    if (!d || !d.slides.length) { toast('Жүктейтін слайд жоқ.'); return; }
    toast('PowerPoint файлы дайындалып жатыр…', { ms: 2500 });
    try {
      await loadScript(PPTX_SRC, () => typeof window.PptxGenJS === 'function');
    } catch (e) {
      toast('PowerPoint кітапханасы жүктелмеді. Интернет байланысын тексеріп, қайта көріңіз.');
      return;
    }
    try {
      const th = themeById(d.theme);
      const fits = measureFits(d);
      const pptx = new window.PptxGenJS();
      pptx.layout = 'LAYOUT_16x9';
      pptx.title = d.title;
      d.slides.forEach((s, i) => pptxSlide(pptx, th, s, i, fits[i] || 1));
      const blob = await pptx.write({ outputType: 'blob' });
      await saveFile(`${fileBase(d.title)}.pptx`, blob);
    } catch (e) {
      toast('PowerPoint файлын жасау кезінде қате шықты. Қайта көріңіз.');
    }
  }

  function pptxSlide(pptx, th, s, i, f) {
    const sl = pptx.addSlide();
    const C = (c) => c.slice(1).toUpperCase();
    const IN = (px) => Math.round((px / 128) * 1000) / 1000;
    const PT = (px) => Math.max(8, Math.round(px * 0.5625 * f * 10) / 10);
    const up = (t) => (th.upper ? String(t).toUpperCase() : String(t));
    sl.background = { color: C(th.bg) };
    pptxDeco(pptx, sl, th, s.layout, C, IN);
    const base = { margin: 0, valign: 'top', fontFace: th.body, color: C(th.ink) };
    const head = { ...base, fontFace: th.head, bold: th.wh >= 600 };
    const box = (x, y, w, hh) => ({ x: IN(x), y: IN(y), w: IN(w), h: IN(hh) });
    const bullets = (items, size) => {
      const list = (items || []).filter(Boolean);
      return list.map((t, k) => ({ text: t, options: { bullet: { indent: Math.round(PT(size) * 1.1) }, breakLine: k < list.length - 1, paraSpaceAfter: Math.round(PT(size) * 0.45) } }));
    };
    const hs = th.hs;
    switch (s.layout) {
      case 'cover':
        if (s.kicker) sl.addText(s.kicker.toUpperCase(), { ...base, ...box(96, 150, 784, 40), fontSize: PT(22), bold: true, color: C(th.accent), charSpacing: 3 });
        sl.addText(up(s.title || ''), { ...head, ...box(96, 200, 784, 270), fontSize: PT(78 * hs), valign: 'middle' });
        if (s.subtitle) sl.addText(s.subtitle, { ...base, ...box(96, 490, 784, 110), fontSize: PT(30), color: C(th.muted) });
        break;
      case 'section':
        if (s.kicker) sl.addText(s.kicker, { ...head, ...box(96, 170, 784, 150), fontSize: PT(128), color: C(th.accent), valign: 'bottom' });
        sl.addText(up(s.title || ''), { ...head, ...box(96, 340, 784, 200), fontSize: PT(64 * hs) });
        break;
      case 'two': {
        sl.addText(up(s.title || ''), { ...head, ...box(96, 80, 1088, 130), fontSize: PT(56 * hs) });
        const col = (side, x, color) => {
          const c = s[side] || {};
          sl.addShape(pptx.ShapeType.rect, { ...box(x, 236, 512, 5), fill: { color: C(color) }, line: { type: 'none' } });
          if (c.heading) sl.addText(up(c.heading), { ...head, ...box(x, 258, 512, 64), fontSize: PT(32 * hs) });
          const b = bullets(c.bullets, 29);
          if (b.length) sl.addText(b, { ...base, ...box(x, 334, 512, 300), fontSize: PT(29) });
        };
        col('left', 96, th.accent);
        col('right', 672, th.accent2);
        break;
      }
      case 'stat':
        if (s.title) sl.addText(up(s.title), { ...head, ...box(96, 150, 1088, 70), fontSize: PT(38 * hs), color: C(th.muted) });
        sl.addText(s.value || '', { ...head, ...box(96, 226, 1088, 220), fontSize: PT(184), color: C(th.accent), valign: 'middle' });
        if (s.label) sl.addText(s.label, { ...base, ...box(96, 462, 920, 150), fontSize: PT(34) });
        break;
      case 'quote':
        sl.addText('“', { ...base, ...box(96, 150, 110, 170), fontFace: 'Georgia', fontSize: PT(220), color: C(th.accent) });
        sl.addText(s.quote || '', { ...head, ...box(216, 170, 968, 300), fontSize: PT(46 * hs), bold: th.wq >= 600, italic: th.id === 'oyu', valign: 'middle' });
        if (s.author) sl.addText(`— ${s.author}`, { ...base, ...box(216, 490, 968, 50), fontSize: PT(26), color: C(th.muted) });
        break;
      case 'image': {
        sl.addText(up(s.title || ''), { ...head, ...box(96, 80, 562, 140), fontSize: PT(56 * hs) });
        const b = bullets(s.bullets, 34);
        if (b.length) sl.addText(b, { ...base, ...box(96, 240, 562, 390), fontSize: PT(34) });
        if (s.image) {
          const dims = box(714, 80, 470, 552);
          sl.addImage({ data: s.image.replace(/^data:/, ''), ...dims, sizing: { type: 'cover', w: dims.w, h: dims.h } });
        } else {
          sl.addShape(pptx.ShapeType.rect, { ...box(714, 80, 470, 552), fill: { color: C(th.soft) }, line: { type: 'none' } });
        }
        break;
      }
      case 'end':
        sl.addText(up(s.title || ''), { ...head, ...box(96, 200, 784, 240), fontSize: PT(96 * hs), valign: 'middle' });
        if (s.subtitle) sl.addText(s.subtitle, { ...base, ...box(96, 460, 784, 110), fontSize: PT(32), color: C(th.muted) });
        break;
      default: {
        sl.addText(up(s.title || ''), { ...head, ...box(96, 80, 1088, 130), fontSize: PT(56 * hs) });
        const b = bullets(s.bullets, 34);
        if (b.length) sl.addText(b, { ...base, ...box(96, 236, 1088, 396), fontSize: PT(34) });
      }
    }
    if (!NO_NUMBER.has(s.layout)) sl.addText(String(i + 1), { ...base, ...box(1034, 664, 150, 28), fontSize: 10, color: C(th.muted), align: 'right' });
    if (s.notes) sl.addNotes(s.notes);
  }

  function pptxDeco(pptx, sl, th, layout, C, IN) {
    const big = NO_NUMBER.has(layout);
    const S = pptx.ShapeType;
    const shape = (type, x, y, w, hh, color, transparency = 0) => sl.addShape(type, { x: IN(x), y: IN(y), w: IN(w), h: IN(hh), fill: { color: C(color), transparency }, line: { type: 'none' } });
    switch (th.id) {
      case 'aspan':
        if (big) { shape(S.ellipse, 810, 50, 500, 500, th.soft); shape(S.ellipse, 956, 196, 208, 208, th.accent2); }
        else shape(S.ellipse, 1208, 44, 28, 28, th.accent2);
        break;
      case 'tun':
        shape(S.ellipse, big ? 780 : 900, big ? -120 : 400, 760, 760, th.accent, 84);
        break;
      case 'oyu':
        sl.addShape(S.rect, { x: IN(20), y: IN(20), w: IN(1240), h: IN(680), fill: { color: C(th.bg), transparency: 100 }, line: { color: C(th.accent), width: 1.5, transparency: 40 } });
        if (big) shape(S.diamond, 1000, 230, 100, 130, th.accent, 20);
        break;
      case 'taza':
        if (big) shape(S.rect, 0, 0, 20, 720, th.accent);
        else shape(S.rect, 96, 46, 56, 8, th.accent);
        break;
      case 'zhailau':
        if (big) { shape(S.ellipse, 1016, 126, 128, 128, th.accent2); shape(S.ellipse, -200, 570, 1100, 360, th.accent, 60); shape(S.ellipse, 520, 620, 1100, 360, th.accent); }
        else { shape(S.ellipse, 1208, 42, 32, 32, th.accent2); shape(S.ellipse, -140, 680, 600, 120, th.accent, 55); }
        break;
      case 'anar':
        if (big) { shape(S.ellipse, 910, 100, 300, 300, th.accent); shape(S.ellipse, 1110, 344, 172, 172, th.accent2, 20); shape(S.ellipse, 872, 412, 116, 116, th.accent, 40); shape(S.ellipse, 1128, 78, 68, 68, th.accent2, 20); }
        else { shape(S.ellipse, 1212, 38, 40, 40, th.accent); shape(S.ellipse, 1249, 91, 18, 18, th.accent2, 20); }
        break;
      default:
    }
  }

  function printDeck() {
    const d = state.deck;
    if (!d || !d.slides.length) return;
    let root = document.getElementById('print-root');
    if (!root) {
      root = h('div', { id: 'print-root', 'aria-hidden': 'true' });
      document.body.append(root);
    }
    root.replaceChildren(...d.slides.map((s, i) => h('div', { class: 'print-page' }, renderSlide(s, i, d, false))));
    document.body.classList.add('printing');
    requestAnimationFrame(() => {
      root.querySelectorAll('.slide').forEach(fit);
      window.print();
    });
  }
  window.addEventListener('afterprint', () => {
    document.body.classList.remove('printing');
    const root = document.getElementById('print-root');
    if (root) root.replaceChildren();
  });

  function exportJSON() {
    const d = state.deck;
    if (!d) return;
    const blob = new Blob([JSON.stringify({ app: 'slaidshy', v: 1, deck: d }, null, 2)], { type: 'application/json' });
    saveFile(`${fileBase(d.title)}.json`, blob);
  }

  function importJSON() {
    const input = h('input', { type: 'file', accept: '.json,application/json', hidden: true });
    input.addEventListener('change', async () => {
      const f = input.files && input.files[0];
      input.remove();
      if (!f) return;
      try {
        const o = JSON.parse(await f.text());
        const raw = o && o.deck ? o.deck : o;
        if (!raw || !Array.isArray(raw.slides)) throw new Error('format');
        const d = sanitizeDeck(raw);
        openDeck(d);
        toast(`«${d.title}» жобасы ашылды.`);
      } catch (e) {
        toast('Бұл файлды ашу мүмкін болмады: ол Слайдшы жобасы (.json) емес сияқты.', { ms: 7000 });
      }
    });
    document.body.append(input);
    input.click();
  }

  /* ---------------------------------------------------------------------
     Пернетақта, сақтау, іске қосу
     --------------------------------------------------------------------- */
  document.addEventListener('keydown', (e) => {
    if (state.view !== 'editor' || document.querySelector('.present')) return;
    const t = e.target;
    const typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z') && !typing) { e.preventDefault(); undo(); return; }
    if (typing || openPop) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); select(state.current + 1); }
    else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); select(state.current - 1); }
  });

  const flush = () => { if (state.deck) saveDeck(state.deck); };
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });

  async function connectClaude() {
    if (!IN_CLAUDE) return;
    try {
      const s = await window.claude.use('sample');
      if (typeof s === 'function') sample = s;
    } catch (e) { /* Claude жоқ — үлгі режимі */ }
    try {
      const dl = await window.claude.use('downloads');
      if (dl && typeof dl.save === 'function') downloads = dl;
    } catch (e) { /* жүктеу қолжетімсіз */ }
    updateAIUI();
  }

  function start(data) {
    loadPrefs();
    const snap = data && typeof data === 'object' ? data : {};
    const d = snap.view === 'editor' && typeof snap.deckId === 'string' ? loadDeck(snap.deckId) : null;
    if (d) openDeck(d, Number(snap.current) || 0);
    else renderStart();
    connectClaude();
  }

  const hot = IN_CLAUDE ? window.claude.hot : null;
  if (hot && typeof hot.snapshot === 'function') {
    try {
      hot.snapshot(() => {
        flush();
        return { view: state.view, deckId: state.deck ? state.deck.id : null, current: state.current };
      });
    } catch (e) { /* міндетті емес */ }
  }
  if (hot && typeof hot.ready === 'function') hot.ready(start);
  else start((hot && hot.data) || {});
})();
