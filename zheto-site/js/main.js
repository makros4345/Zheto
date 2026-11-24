(function () {
  "use strict";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
  var OPEN_MIN = 8 * 60 + 30;   // 08:30
  var CLOSE_MIN = 23 * 60;      // 23:00

  function fmtMoney(n) { return n.toLocaleString("ru-RU") + " ₴"; }
  function pad(n) { return String(n).padStart(2, "0"); }
  function fmtTime(m) { return pad(Math.floor(m / 60)) + ":" + pad(m % 60); }
  function store(key, val) { try { if (val === undefined) return JSON.parse(localStorage.getItem(key)); localStorage.setItem(key, JSON.stringify(val)); } catch (e) { return null; } }

  /* Current time in Odesa (Europe/Kyiv) as minutes since midnight */
  function kyivNow() {
    try {
      var parts = new Intl.DateTimeFormat("ru-UA", { timeZone: "Europe/Kyiv", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(new Date());
      var h = 0, m = 0;
      parts.forEach(function (p) { if (p.type === "hour") h = parseInt(p.value, 10) % 24; if (p.type === "minute") m = parseInt(p.value, 10); });
      return h * 60 + m;
    } catch (e) { var d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
  }
  function isOpen(m) { return m >= OPEN_MIN && m < CLOSE_MIN; }

  var toastEl = $("#toast"), toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2400);
  }

  /* ---------- preloader ---------- */
  function finishLoading() {
    var p = $("#preloader");
    if (!p || p.classList.contains("done")) return;
    p.classList.add("done");
    document.body.classList.remove("is-loading");
    setTimeout(function () { document.body.classList.add("ready"); }, 150);
  }
  window.addEventListener("load", function () { setTimeout(finishLoading, reduceMotion ? 0 : 900); });
  setTimeout(finishLoading, 3000); // never block the page on slow images

  /* ---------- header, progress, active link ---------- */
  var header = $("#header"), progress = $("#scrollProgress");
  function onScroll() {
    header.classList.toggle("scrolled", window.scrollY > 40);
    var max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = "scaleX(" + (max > 0 ? window.scrollY / max : 0) + ")";
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var navLinks = $$(".nav__link");
  if ("IntersectionObserver" in window) {
    var secIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    navLinks.forEach(function (a) { var s = $(a.getAttribute("href")); if (s) secIO.observe(s); });
  }

  /* ---------- burger ---------- */
  var burger = $("#burger"), nav = $("#nav");
  function setNav(open) {
    nav.classList.toggle("open", open);
    burger.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
  }
  burger.addEventListener("click", function () { setNav(!nav.classList.contains("open")); });
  $$("a", nav).forEach(function (l) { l.addEventListener("click", function () { setNav(false); }); });

  /* ---------- evening (candle) mode ---------- */
  var glow = $("#candleGlow"), eveningBtn = $("#eveningBtn");
  function setEvening(on, silent) {
    document.body.classList.toggle("evening", on);
    eveningBtn.setAttribute("aria-pressed", on ? "true" : "false");
    store("zh-evening", on);
    if (!silent) toast(on ? "Зажгли свечи. Водите курсором — это ваш подсвечник" : "Свечи погашены");
  }
  eveningBtn.addEventListener("click", function () { setEvening(!document.body.classList.contains("evening")); });
  if (store("zh-evening")) setEvening(true, true);
  function moveGlow(x, y) { glow.style.setProperty("--x", x + "px"); glow.style.setProperty("--y", y + "px"); }
  window.addEventListener("pointermove", function (e) { moveGlow(e.clientX, e.clientY); }, { passive: true });
  window.addEventListener("touchmove", function (e) { var t = e.touches[0]; if (t) moveGlow(t.clientX, t.clientY); }, { passive: true });

  /* ---------- hero parallax ---------- */
  var heroBg = $("#heroBg"), hero = $("#hero");
  if (finePointer && !reduceMotion) {
    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      var dx = (e.clientX - r.left) / r.width - .5, dy = (e.clientY - r.top) / r.height - .5;
      heroBg.style.setProperty("--px", (-dx * 24) + "px");
      heroBg.style.setProperty("--py", (-dy * 18) + "px");
    });
  }

  /* ---------- magnetic buttons ---------- */
  if (finePointer && !reduceMotion) {
    $$(".magnetic").forEach(function (b) {
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        b.style.transform = "translate(" + (e.clientX - r.left - r.width / 2) * .25 + "px," + (e.clientY - r.top - r.height / 2) * .35 + "px)";
      });
      b.addEventListener("pointerleave", function () { b.style.transform = ""; });
    });
  }

  /* ---------- open / closed status ---------- */
  var statusDot = $("#statusDot"), statusText = $("#statusText");
  function updateStatus() {
    var m = kyivNow(), open = isOpen(m);
    statusDot.classList.toggle("open", open);
    statusDot.classList.toggle("closed", !open);
    var left = CLOSE_MIN - m;
    statusText.textContent = open
      ? (left <= 60 ? "Открыто ещё " + left + " мин · до 23:00" : "Сейчас открыто · до 23:00")
      : "Сейчас закрыто · откроемся в 08:30";
  }
  updateStatus();
  setInterval(updateStatus, 60000);

  /* ---------- reveal + counters ---------- */
  function countUp(el) {
    var target = parseFloat(el.getAttribute("data-count")), dec = parseInt(el.getAttribute("data-decimals") || "0", 10), suf = el.getAttribute("data-suffix") || "";
    var start = null, dur = reduceMotion ? 1 : 1600;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1), v = target * (1 - Math.pow(1 - p, 3));
      el.textContent = v.toFixed(dec).replace(".", ",") + suf;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var revealEls = $$(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        $$("[data-count]", entry.target).forEach(countUp);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el, i) { el.style.transitionDelay = (i % 3) * 90 + "ms"; io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("visible"); $$("[data-count]", el).forEach(countUp); });
  }

  /* ---------- 3D tilt cards ---------- */
  if (finePointer && !reduceMotion) {
    $$(".tilt").forEach(function (c) {
      c.addEventListener("pointermove", function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty("--ry", ((e.clientX - r.left) / r.width - .5) * 12 + "deg");
        c.style.setProperty("--rx", (.5 - (e.clientY - r.top) / r.height) * 10 + "deg");
      });
      c.addEventListener("pointerleave", function () { c.style.setProperty("--rx", "0deg"); c.style.setProperty("--ry", "0deg"); });
    });
  }

  /* ---------- a day at ZheTto ---------- */
  var DAY = [
    { from: 0,    to: 509,  title: "Город спит", text: "Мы закрыты, но уже скоро откроемся. Забронируйте столик на утро — займём лучший у окна.", pick: "Совет: бронь на завтрак" },
    { from: 510,  to: 719,  title: "Утро и завтраки", text: "Открываем двери. Пахнет свежей обжаркой, на столах — сырники и утренние круассаны.", pick: "Советуем: сырники + капучино" },
    { from: 720,  to: 959,  title: "Кофе в разгар дня", text: "Время встреч и деловых разговоров. Самое время для кусочка фирменного «Киевского».", pick: "Советуем: «Киевский» + флэт уайт" },
    { from: 960,  to: 1139, title: "Чайная пауза", text: "Солнце садится за крыши Гаванной. Чайник ароматного чая и десерт — идеальная пауза.", pick: "Советуем: чай + чизкейк" },
    { from: 1140, to: 1379, title: "Вечер и живая музыка", text: "Зажигаем свечи, зал наполняется музыкой. Лучшее время для свидания или встречи с друзьями.", pick: "Советуем: раф + тирамису" },
    { from: 1380, to: 1439, title: "Мы закрылись", text: "Спасибо за вечер! Гасим свечи и ждём вас завтра с 08:30.", pick: "До завтра, Одесса!" }
  ];
  var SKY = [ // [minute, top colour, bottom colour, city colour]
    [0, "#0d1626", "#1f2b45", "#090d16"], [330, "#1b2340", "#4a3f63", "#120f1a"], [400, "#f29e7c", "#fbd6ae", "#3b2a1f"],
    [540, "#9ccbe9", "#e4f2fb", "#3b2a1f"], [900, "#8fc3e8", "#f3ead6", "#3b2a1f"], [1110, "#e07a5f", "#f5c78d", "#2f2118"],
    [1230, "#2a2848", "#6b4a63", "#140f14"], [1439, "#0d1626", "#1f2b45", "#090d16"]
  ];
  function hex(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  function mix(a, b, t) { var x = hex(a), y = hex(b); return "rgb(" + x.map(function (v, i) { return Math.round(v + (y[i] - v) * t); }).join(",") + ")"; }
  var stage = $("#dayStage"), range = $("#dayRange"), dayCard = $("#dayCard");
  var lastBlock = -1;
  function renderDay(m) {
    m = parseInt(m, 10);
    for (var i = 0; i < SKY.length - 1; i++) {
      if (m >= SKY[i][0] && m <= SKY[i + 1][0]) {
        var t = (m - SKY[i][0]) / (SKY[i + 1][0] - SKY[i][0]);
        stage.style.setProperty("--sky1", mix(SKY[i][1], SKY[i + 1][1], t));
        stage.style.setProperty("--sky2", mix(SKY[i][2], SKY[i + 1][2], t));
        stage.style.setProperty("--city", mix(SKY[i][3], SKY[i + 1][3], t));
        break;
      }
    }
    var sunUp = m >= 360 && m <= 1200, p;
    if (sunUp) p = (m - 360) / 840; else p = ((m < 360 ? m + 1440 : m) - 1200) / 600;
    stage.style.setProperty("--ox", (8 + p * 84) + "%");
    stage.style.setProperty("--oy", (70 - Math.sin(Math.PI * p) * 55) + "%");
    stage.classList.toggle("night", !sunUp);

    var open = isOpen(m), st = $("#dayStatus");
    $("#dayTime").textContent = fmtTime(m);
    st.textContent = open ? "открыто" : "закрыто";
    st.classList.toggle("closed", !open);
    for (var b = 0; b < DAY.length; b++) {
      if (m >= DAY[b].from && m <= DAY[b].to) {
        if (b !== lastBlock) {
          $("#dayTitle").textContent = DAY[b].title;
          $("#dayText").textContent = DAY[b].text;
          $("#dayPick").textContent = DAY[b].pick;
          dayCard.classList.remove("bump"); void dayCard.offsetWidth; dayCard.classList.add("bump");
          lastBlock = b;
        }
        break;
      }
    }
  }
  range.value = Math.round(kyivNow() / 15) * 15;
  renderDay(range.value);
  range.addEventListener("input", function () { renderDay(range.value); });

  /* ---------- menu: tabs, search, order tray ---------- */
  var tabs = $$(".menu__tab"), ink = $("#tabInk"), panels = $$(".menu__panel"), search = $("#menuSearch"), emptyMsg = $("#menuEmpty");
  function moveInk(tab) { ink.style.left = tab.offsetLeft + "px"; ink.style.width = tab.offsetWidth + "px"; ink.style.top = tab.offsetTop + "px"; ink.style.height = tab.offsetHeight + "px"; }
  function activateTab(tab) {
    tabs.forEach(function (t) { t.classList.toggle("is-active", t === tab); t.setAttribute("aria-selected", t === tab ? "true" : "false"); });
    panels.forEach(function (p) { var a = p.id === "tab-" + tab.getAttribute("data-tab"); p.classList.toggle("is-active", a); p.hidden = !a; });
    moveInk(tab);
  }
  tabs.forEach(function (tab) { tab.addEventListener("click", function () { search.value = ""; applySearch(); activateTab(tab); }); });
  window.addEventListener("resize", function () { moveInk($(".menu__tab.is-active")); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { moveInk($(".menu__tab.is-active")); });
  moveInk($(".menu__tab.is-active"));

  var items = $$(".menu-item");
  items.forEach(function (it) {
    var h = $("h3", it);
    it.setAttribute("data-name", h.textContent);
    var btn = document.createElement("button");
    btn.className = "add-btn";
    btn.type = "button";
    btn.textContent = "+";
    btn.setAttribute("aria-label", "Добавить в заказ: " + h.textContent);
    btn.addEventListener("click", function () { addToTray(it.getAttribute("data-name"), +it.getAttribute("data-price"), btn); });
    it.appendChild(btn);
  });

  function applySearch() {
    var q = search.value.trim().toLowerCase();
    if (!q) {
      items.forEach(function (it) { it.hidden = false; var h = $("h3", it); h.textContent = it.getAttribute("data-name"); });
      emptyMsg.hidden = true;
      activateTab($(".menu__tab.is-active"));
      return;
    }
    var found = 0;
    panels.forEach(function (p) { p.hidden = false; });
    items.forEach(function (it) {
      var name = it.getAttribute("data-name"), text = (name + " " + $("p", it).textContent).toLowerCase(), ok = text.indexOf(q) !== -1;
      it.hidden = !ok;
      var h = $("h3", it), idx = name.toLowerCase().indexOf(q);
      if (ok && idx !== -1) {
        h.innerHTML = "";
        h.appendChild(document.createTextNode(name.slice(0, idx)));
        var mk = document.createElement("mark"); mk.textContent = name.slice(idx, idx + q.length); h.appendChild(mk);
        h.appendChild(document.createTextNode(name.slice(idx + q.length)));
      } else { h.textContent = name; }
      if (ok) found++;
    });
    panels.forEach(function (p) { p.hidden = !$$(".menu-item", p).some(function (i) { return !i.hidden; }); });
    emptyMsg.hidden = found > 0;
  }
  search.addEventListener("input", applySearch);

  var tray = $("#tray"), trayPanel = $("#trayPanel"), trayToggle = $("#trayToggle");
  var order = store("zh-order") || {};
  function renderTray() {
    var list = $("#trayList"), total = 0, count = 0;
    list.innerHTML = "";
    Object.keys(order).forEach(function (name) {
      var o = order[name]; total += o.price * o.qty; count += o.qty;
      var li = document.createElement("li");
      var n = document.createElement("span"); n.textContent = name;
      var q = document.createElement("span"); q.className = "tray__qty";
      var minus = document.createElement("button"); minus.type = "button"; minus.textContent = "−"; minus.setAttribute("aria-label", "Убрать одну порцию: " + name);
      var num = document.createElement("b"); num.textContent = o.qty;
      var plus = document.createElement("button"); plus.type = "button"; plus.textContent = "+"; plus.setAttribute("aria-label", "Добавить ещё: " + name);
      minus.addEventListener("click", function () { o.qty--; if (o.qty <= 0) delete order[name]; saveTray(); });
      plus.addEventListener("click", function () { o.qty++; saveTray(); });
      q.appendChild(minus); q.appendChild(num); q.appendChild(plus);
      var s = document.createElement("span"); s.className = "sum"; s.textContent = fmtMoney(o.price * o.qty);
      li.appendChild(n); li.appendChild(q); li.appendChild(s);
      list.appendChild(li);
    });
    $("#trayCount").textContent = count;
    $("#trayTotal").textContent = fmtMoney(total);
    $("#trayTotalMini").textContent = fmtMoney(total);
    tray.classList.toggle("has-items", count > 0);
    if (!count) { trayPanel.hidden = true; trayToggle.setAttribute("aria-expanded", "false"); }
  }
  function saveTray() { store("zh-order", order); renderTray(); }
  function addToTray(name, price, fromEl) {
    order[name] = order[name] || { price: price, qty: 0 };
    order[name].qty++;
    saveTray();
    tray.classList.remove("bump"); void tray.offsetWidth; tray.classList.add("bump");
    if (fromEl) {
      fromEl.classList.remove("pop"); void fromEl.offsetWidth; fromEl.classList.add("pop");
      if (!reduceMotion) flyDot(fromEl);
    }
  }
  function flyDot(fromEl) {
    var a = fromEl.getBoundingClientRect(), b = trayToggle.getBoundingClientRect();
    var d = document.createElement("span"); d.className = "fly";
    d.style.left = a.left + a.width / 2 - 7 + "px"; d.style.top = a.top + a.height / 2 - 7 + "px";
    document.body.appendChild(d);
    requestAnimationFrame(function () {
      d.style.transform = "translate(" + (b.left + 30 - a.left) + "px," + (b.top + b.height / 2 - a.top - a.height / 2) + "px) scale(.6)";
      d.style.opacity = ".2";
    });
    setTimeout(function () { d.remove(); }, 750);
  }
  trayToggle.addEventListener("click", function () {
    var open = trayPanel.hidden;
    trayPanel.hidden = !open;
    trayToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  $("#trayClear").addEventListener("click", function () { order = {}; saveTray(); toast("Заказ очищен"); });
  renderTray();

  /* ---------- coffee oracle ---------- */
  var MENU = {};
  items.forEach(function (it) { MENU[it.getAttribute("data-name")] = +it.getAttribute("data-price"); });
  var Q = [
    { q: "Какое у вас сейчас настроение?", key: "mood", opts: [["☀️", "Бодрое", 0], ["📖", "Задумчивое", 1], ["🕯️", "Романтическое", 2], ["🛋️", "Ленивое", 3]] },
    { q: "Кофе для вас — это…", key: "coffee", opts: [["⚡", "Чистый вкус", "strong"], ["☁️", "Молоко и пенка", "milky"], ["🍯", "Сладкое удовольствие", "sweet"], ["🍋", "Лучше без кофе", "none"]] },
    { q: "А что к нему?", key: "food", opts: [["🍳", "Что-то сытное", "hearty"], ["🎂", "Классический десерт", "classic"], ["🍫", "Побольше шоколада", "choco"], ["🥐", "Что-то лёгкое", "light"]] }
  ];
  var DRINKS = { strong: ["Эспрессо", "Американо", "Эспрессо", "Американо"], milky: ["Капучино", "Флэт уайт", "Латте", "Латте"], sweet: ["Раф", "Мокко", "Раф", "Мокко"], none: ["Домашний лимонад", "Чай", "Какао", "Какао"] };
  var FOODS = { hearty: ["Завтрак «Пражский бульвар»", "Одесский форшмак", "Сырники", "Сырники"], classic: ["«Киевский» торт", "«Киевский» торт", "Французский гато", "«Киевский» торт"], choco: ["Шоколадный торт", "Тирамису", "Тирамису", "Шоколадный торт"], light: ["Круассан с миндалём", "Чизкейк", "Мороженое", "Круассан с миндалём"] };
  var VERDICTS = ["Бодрость по-одесски!", "Для тех, кто размышляет о вечном.", "Идеально под свечи и музыку.", "Отдых, который вы заслужили."];
  var answers = {}, step = 0, stageEl = $("#oracleStage"), bar = $("#oracleBar");
  function renderQ() {
    bar.style.width = (step / Q.length * 100) + "%";
    if (step >= Q.length) return renderResult();
    var q = Q[step];
    stageEl.innerHTML = "";
    var wrap = document.createElement("div"); wrap.className = "oracle__q";
    var sm = document.createElement("small"); sm.textContent = "Вопрос " + (step + 1) + " из " + Q.length;
    var h = document.createElement("h3"); h.textContent = q.q;
    var grid = document.createElement("div"); grid.className = "oracle__opts";
    q.opts.forEach(function (o) {
      var b = document.createElement("button"); b.type = "button"; b.className = "oracle__opt";
      var e = document.createElement("span"); e.textContent = o[0];
      b.appendChild(e); b.appendChild(document.createTextNode(o[1]));
      b.addEventListener("click", function () { answers[q.key] = o[2]; step++; renderQ(); });
      grid.appendChild(b);
    });
    wrap.appendChild(sm); wrap.appendChild(h); wrap.appendChild(grid);
    stageEl.appendChild(wrap);
  }
  function dish(name) {
    var d = document.createElement("div"); d.className = "oracle__dish";
    var b = document.createElement("b"); b.textContent = name;
    var s = document.createElement("small"); s.textContent = fmtMoney(MENU[name] || 0);
    d.appendChild(b); d.appendChild(s); return d;
  }
  function renderResult() {
    var drink = DRINKS[answers.coffee][answers.mood], food = FOODS[answers.food][answers.mood];
    stageEl.innerHTML = "";
    var r = document.createElement("div"); r.className = "oracle__result";
    var sm = document.createElement("small"); sm.className = "section__eyebrow"; sm.textContent = "Ваш идеальный дуэт";
    var h = document.createElement("h3"); h.textContent = VERDICTS[answers.mood];
    var pair = document.createElement("div"); pair.className = "oracle__pair";
    var plus = document.createElement("span"); plus.className = "oracle__plus"; plus.textContent = "+";
    pair.appendChild(dish(drink)); pair.appendChild(plus); pair.appendChild(dish(food));
    var p = document.createElement("p"); p.textContent = "Вместе: " + fmtMoney((MENU[drink] || 0) + (MENU[food] || 0)) + " — Одесса одобряет";
    var add = document.createElement("button"); add.type = "button"; add.className = "btn btn--primary"; add.textContent = "Добавить в заказ";
    add.addEventListener("click", function () { addToTray(drink, MENU[drink], add); addToTray(food, MENU[food]); toast("Дуэт добавлен в заказ"); });
    var again = document.createElement("button"); again.type = "button"; again.className = "btn btn--ghost"; again.textContent = "Пройти заново";
    again.addEventListener("click", function () { step = 0; answers = {}; renderQ(); });
    r.appendChild(sm); r.appendChild(h); r.appendChild(pair); r.appendChild(p); r.appendChild(add); r.appendChild(again);
    stageEl.appendChild(r);
  }
  renderQ();

  /* ---------- gallery lightbox ---------- */
  var figs = $$(".gallery__item"), lb = $("#lightbox"), lbImg = $("#lbImg"), lbCap = $("#lbCap"), lbIdx = 0, lastFocus = null;
  function showLb(i) {
    lbIdx = (i + figs.length) % figs.length;
    var img = $("img", figs[lbIdx]);
    lbImg.src = img.src.replace("w=800", "w=1600");
    lbImg.alt = img.alt;
    lbCap.textContent = $("figcaption", figs[lbIdx]).textContent;
    $("#lbCount").textContent = (lbIdx + 1) + " / " + figs.length;
    lbImg.style.animation = "none"; void lbImg.offsetWidth; lbImg.style.animation = "";
  }
  function openLb(i) { lastFocus = document.activeElement; lb.hidden = false; document.body.style.overflow = "hidden"; showLb(i); $("#lbClose").focus(); }
  function closeLb() { lb.hidden = true; document.body.style.overflow = ""; if (lastFocus) lastFocus.focus(); }
  figs.forEach(function (f, i) {
    f.tabIndex = 0;
    f.setAttribute("role", "button");
    f.setAttribute("aria-label", "Открыть фото: " + $("figcaption", f).textContent);
    f.addEventListener("click", function () { openLb(i); });
    f.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLb(i); } });
  });
  $("#lbClose").addEventListener("click", closeLb);
  $("#lbPrev").addEventListener("click", function () { showLb(lbIdx - 1); });
  $("#lbNext").addEventListener("click", function () { showLb(lbIdx + 1); });
  lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });
  var tx = null;
  lb.addEventListener("touchstart", function (e) { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", function (e) { if (tx === null) return; var dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 50) showLb(lbIdx + (dx < 0 ? 1 : -1)); tx = null; });

  /* ---------- booking ---------- */
  var form = $("#bookingForm"), dateIn = $("#bkDate"), timeSel = $("#bkTime"), guests = 2, err = $("#bkError");
  function kyivDateStr(offsetDays) {
    var d = new Date(Date.now() + (offsetDays || 0) * 864e5);
    try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Kyiv", year: "numeric", month: "2-digit", day: "2-digit" }).format(d); }
    catch (e) { return d.toISOString().slice(0, 10); }
  }
  dateIn.min = kyivDateStr(0);
  dateIn.max = kyivDateStr(60);
  dateIn.value = kyivNow() >= 22 * 60 ? kyivDateStr(1) : kyivDateStr(0);
  function fillTimes() {
    var today = dateIn.value === kyivDateStr(0), now = kyivNow(), prev = timeSel.value;
    timeSel.innerHTML = "";
    for (var m = OPEN_MIN; m <= 22 * 60; m += 30) {
      var o = document.createElement("option");
      o.value = o.textContent = fmtTime(m);
      if (today && m < now + 30) { o.disabled = true; o.textContent += " — занято"; }
      timeSel.appendChild(o);
    }
    var first = $$("option", timeSel).filter(function (o) { return !o.disabled; })[0];
    var keep = $$("option", timeSel).filter(function (o) { return o.value === prev && !o.disabled; })[0];
    if (keep) timeSel.value = prev; else if (first) timeSel.value = first.value;
    if (!first) { var none = document.createElement("option"); none.textContent = "На сегодня мест нет — выберите другую дату"; none.value = ""; none.selected = true; timeSel.insertBefore(none, timeSel.firstChild); }
  }
  dateIn.addEventListener("change", fillTimes);
  fillTimes();
  function renderGuests() {
    $("#gCount").textContent = guests;
    var c = $("#gChairs"); c.innerHTML = "";
    for (var i = 0; i < guests; i++) c.appendChild(document.createElement("i"));
  }
  $("#gMinus").addEventListener("click", function () { if (guests > 1) { guests--; renderGuests(); } });
  $("#gPlus").addEventListener("click", function () { if (guests < 12) { guests++; renderGuests(); } else toast("Для компании больше 12 гостей — позвоните нам"); });
  renderGuests();

  var phoneIn = $("#bkPhone");
  phoneIn.addEventListener("input", function () {
    var d = phoneIn.value.replace(/\D/g, "");
    if (d.indexOf("380") === 0) d = d.slice(2); else if (d.indexOf("80") === 0) d = d.slice(1);
    d = d.slice(0, 10);
    var out = "+38";
    if (d.length) out += " (" + d.slice(0, 3);
    if (d.length >= 3) out += ")";
    if (d.length > 3) out += " " + d.slice(3, 6);
    if (d.length > 6) out += "-" + d.slice(6, 8);
    if (d.length > 8) out += "-" + d.slice(8, 10);
    phoneIn.value = d.length ? out : "";
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = $("#bkName"), digits = phoneIn.value.replace(/\D/g, "");
    [name, phoneIn, dateIn].forEach(function (f) { f.classList.remove("invalid"); });
    var problem = "";
    if (!name.value.trim()) { problem = "Укажите, пожалуйста, имя"; name.classList.add("invalid"); }
    else if (digits.length < 12) { problem = "Проверьте номер телефона"; phoneIn.classList.add("invalid"); }
    else if (!dateIn.value || dateIn.value < dateIn.min) { problem = "Выберите дату не раньше сегодняшней"; dateIn.classList.add("invalid"); }
    else if (!timeSel.value) { problem = "Выберите время"; }
    err.textContent = problem;
    if (problem) return;

    var d = new Date(dateIn.value + "T12:00:00");
    $("#tName").textContent = name.value.trim();
    $("#tDate").textContent = d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "short" });
    $("#tTime").textContent = timeSel.value;
    $("#tGuests").textContent = guests;
    $("#tPhone").textContent = phoneIn.value;
    $("#tNo").textContent = "№ " + String(Math.floor(1000 + Math.random() * 9000));
    $("#ticketModal").hidden = false;
    $("#ticketClose").focus();
    form.reset(); guests = 2; renderGuests(); dateIn.value = kyivDateStr(0); fillTimes();
  });
  function closeTicket() { $("#ticketModal").hidden = true; }
  $("#ticketClose").addEventListener("click", closeTicket);
  $("#ticketModal").addEventListener("click", function (e) { if (e.target.id === "ticketModal") closeTicket(); });

  /* ---------- keyboard ---------- */
  document.addEventListener("keydown", function (e) {
    if (!lb.hidden) {
      if (e.key === "Escape") closeLb();
      if (e.key === "ArrowLeft") showLb(lbIdx - 1);
      if (e.key === "ArrowRight") showLb(lbIdx + 1);
      return;
    }
    if (e.key === "Escape") {
      if (!$("#ticketModal").hidden) closeTicket();
      if (!trayPanel.hidden) { trayPanel.hidden = true; trayToggle.setAttribute("aria-expanded", "false"); }
      if (nav.classList.contains("open")) setNav(false);
    }
  });

  /* ---------- gramophone: a small waltz synthesized with WebAudio ---------- */
  var gram = $("#gramophone"), gramLabel = $("#gramLabel"), actx = null, master = null, playing = false, timer = null, nextTime = 0, beat = 0;
  var BPM = 132, BEAT = 60 / BPM;
  // Melody in A minor, 3/4 — [note (semitones from A4) or null, length in beats]
  var MELODY = [[7,1],[3,1],[0,1], [5,2],[3,1], [2,1],[3,1],[5,1], [3,3],
                [0,1],[2,1],[3,1], [5,2],[7,1], [8,1],[7,1],[5,1], [3,3],
                [7,1],[8,1],[10,1], [12,2],[10,1], [8,1],[7,1],[5,1], [7,3],
                [5,1],[3,1],[2,1], [3,2],[0,1], [-1,1],[0,1],[2,1], [0,3]];
  var BASS = [-12,-12,-7,-7,-9,-9,-12,-12, -12,-12,-7,-7,-5,-5,-12,-12]; // one root per bar (A, A, D, D, C, C, ...)
  var CHORD = { "-12": [0, 3, 7], "-7": [5, 8, 12], "-9": [3, 7, 10], "-5": [7, 11, 14] };
  function freq(semi) { return 440 * Math.pow(2, semi / 12); }
  function tone(semi, t, dur, type, vol) {
    var o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = freq(semi);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function crackle() {
    var len = actx.sampleRate * 2, buf = actx.createBuffer(1, len, actx.sampleRate), data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() < 0.0008 ? (Math.random() * 2 - 1) * 0.6 : (Math.random() * 2 - 1) * 0.012;
    var src = actx.createBufferSource(); src.buffer = buf; src.loop = true;
    var g = actx.createGain(); g.gain.value = 0.5;
    src.connect(g); g.connect(master); src.start();
    return src;
  }
  var noise = null, melodyPos = 0, melodyBeatLeft = 0, totalBeats = 0;
  function schedule() {
    while (nextTime < actx.currentTime + 0.25) {
      var bar = Math.floor(totalBeats / 3) % BASS.length, beatInBar = totalBeats % 3, root = BASS[bar];
      if (beatInBar === 0) tone(root - 12, nextTime, BEAT * 1.4, "triangle", 0.22);
      else CHORD[String(root)].forEach(function (s) { tone(s - 12, nextTime, BEAT * 0.6, "sine", 0.05); });
      if (melodyBeatLeft <= 0) {
        var n = MELODY[melodyPos];
        if (n[0] !== null) tone(n[0], nextTime, BEAT * n[1] * 0.95, "triangle", 0.13);
        melodyBeatLeft = n[1];
        melodyPos = (melodyPos + 1) % MELODY.length;
      }
      melodyBeatLeft--;
      totalBeats++;
      nextTime += BEAT;
    }
  }
  function startMusic() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { toast("Ваш браузер не умеет играть пластинки"); return; }
    if (!actx) {
      actx = new AC();
      master = actx.createGain(); master.gain.value = 0;
      var lp = actx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2600; // warm, "old record" tone
      master.connect(lp); lp.connect(actx.destination);
    }
    actx.resume();
    master.gain.cancelScheduledValues(actx.currentTime);
    master.gain.setTargetAtTime(0.7, actx.currentTime, 0.4);
    noise = crackle();
    nextTime = actx.currentTime + 0.1;
    timer = setInterval(schedule, 60);
    playing = true;
    gram.setAttribute("aria-pressed", "true");
    gramLabel.textContent = "Играет вальс";
  }
  function stopMusic() {
    if (!actx) return;
    master.gain.setTargetAtTime(0, actx.currentTime, 0.25);
    clearInterval(timer);
    if (noise) { var nz = noise; setTimeout(function () { try { nz.stop(); } catch (e) {} }, 800); noise = null; }
    playing = false;
    gram.setAttribute("aria-pressed", "false");
    gramLabel.textContent = "Пластинка";
  }
  gram.addEventListener("click", function () { if (playing) stopMusic(); else startMusic(); });
  document.addEventListener("visibilitychange", function () { if (document.hidden && playing) stopMusic(); });

  $("#year").textContent = String(new Date().getFullYear());
})();
