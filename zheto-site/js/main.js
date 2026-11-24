(function () {
  "use strict";

  var header = document.getElementById("header");
  var burger = document.getElementById("burger");
  var nav = document.getElementById("nav");

  function onScroll() {
    if (window.scrollY > 40) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  burger.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    burger.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
  });

  nav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      nav.classList.remove("open");
      burger.classList.remove("open");
      burger.setAttribute("aria-expanded", "false");
    });
  });

  var tabs = document.querySelectorAll(".menu__tab");
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      var target = tab.getAttribute("data-tab");
      tabs.forEach(function (t) {
        t.classList.toggle("is-active", t === tab);
        t.setAttribute("aria-selected", t === tab ? "true" : "false");
      });
      document.querySelectorAll(".menu__panel").forEach(function (panel) {
        var active = panel.id === "tab-" + target;
        panel.classList.toggle("is-active", active);
        panel.hidden = !active;
      });
    });
  });

  var OPEN_HOUR = 8.5;
  var CLOSE_HOUR = 23;
  var statusDot = document.getElementById("statusDot");
  var statusText = document.getElementById("statusText");

  function updateStatus() {
    try {
      var parts = new Intl.DateTimeFormat("ru-UA", {
        timeZone: "Europe/Kyiv",
        hour: "numeric",
        minute: "numeric",
        hour12: false
      }).formatToParts(new Date());
      var h = 0, m = 0;
      parts.forEach(function (p) {
        if (p.type === "hour") h = parseInt(p.value, 10) % 24;
        if (p.type === "minute") m = parseInt(p.value, 10);
      });
      var now = h + m / 60;
      var open = now >= OPEN_HOUR && now < CLOSE_HOUR;
      statusDot.classList.add(open ? "open" : "closed");
      statusText.textContent = open
        ? "Сейчас открыто · до 23:00"
        : "Сейчас закрыто · откроемся в 08:30";
    } catch (e) {
      statusText.textContent = "Ежедневно 08:30–23:00";
    }
  }
  updateStatus();
  setInterval(updateStatus, 60000);

  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("visible"); });
  }

  document.getElementById("year").textContent = String(new Date().getFullYear());
})();
