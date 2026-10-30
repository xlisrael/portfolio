/* ==========================================================================
   Excel — Portfolio
   Progressive enhancement only: every feature here has a working
   no-JavaScript fallback.
   ========================================================================== */

(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");


  const element = document.getElementById("typewriter");
      const firstName = "X_L";
      const secondName = "Excel";

      const typeSpeed = 120;     // Time per letter typing (ms)
      const eraseSpeed = 80;     // Time per letter backspacing (ms)
      const delayBeforeErase = 1500; // Pause after full "Excel" is written (ms)
    
      function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      }

      async function runAnimation() {
        // 1. Type "Excel"
        for (let i = 0; i <= firstName.length; i++) {
          element.textContent = firstName.substring(0, i);
          await sleep(typeSpeed);
        }

        // 2. Pause before backspacing
        await sleep(delayBeforeErase);

        // 3. Erase "Excel" letter by letter
        for (let i = firstName.length; i >= 0; i--) {
          element.textContent = firstName.substring(0, i);
          await sleep(eraseSpeed);
        }

        // Small pause before typing new text
        await sleep(300);

        // 4. Type "X_L"
        for (let i = 0; i <= secondName.length; i++) {
          element.textContent = secondName.substring(0, i);
          await sleep(typeSpeed);
        }
      }

      // Trigger on page load
      window.addEventListener("DOMContentLoaded", runAnimation);
  

  /* --------------------------------------------------------------------
     Theme toggle
     Default follows the OS. Once the user clicks, the choice is saved
     and overrides the OS preference.
     -------------------------------------------------------------------- */

  var STORAGE_KEY = "theme";
  var toggle = document.getElementById("theme-toggle");
  var darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
  var themeMetas = document.querySelectorAll('meta[name="theme-color"]');

  function resolvedTheme() {
    var explicit = root.getAttribute("data-theme");
    if (explicit === "light" || explicit === "dark") return explicit;
    return darkQuery.matches ? "dark" : "light";
  }

  function syncToggleLabel() {
    if (!toggle) return;
    var isDark = resolvedTheme() === "dark";
    toggle.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
    toggle.setAttribute("title", isDark ? "Switch to light theme" : "Switch to dark theme");
  }

  // The browser chrome colour follows the explicit choice, not the OS media
  // query the meta tags start with.
  function syncThemeColor() {
    var colour = resolvedTheme() === "dark" ? "#0f1613" : "#eef1ef";
    Array.prototype.forEach.call(themeMetas, function (meta) {
      meta.setAttribute("content", colour);
    });
  }

  function syncThemeUi() {
    syncToggleLabel();
    syncThemeColor();
  }

  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = resolvedTheme() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch (e) {
        /* private mode — the theme still applies for this page view */
      }
      syncThemeUi();
    });
  }

  // Keep the label honest if the OS theme changes while the user has not
  // made an explicit choice.
  darkQuery.addEventListener("change", syncThemeUi);
  syncThemeUi();

  /* --------------------------------------------------------------------
     Footer year + local clock (WAT)
     -------------------------------------------------------------------- */

  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  var clock = document.getElementById("clock-time");
  if (clock) {
    var clockFormat;
    try {
      clockFormat = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Africa/Lagos",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      });
    } catch (e) {
      clockFormat = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
    }

    var tick = function () {
      clock.textContent = clockFormat.format(new Date());
    };

    tick();
    // Re-sync on the minute boundary rather than on a fixed 60s interval.
    function scheduleNext() {
      var now = new Date();
      var msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
      setTimeout(function () {
        tick();
        setInterval(tick, 60000);
      }, msToNextMinute);
    }
    scheduleNext();
  }

  /* --------------------------------------------------------------------
     Copy email to clipboard
     The address is read from the mailto: link, so there is a single
     source of truth for it.
     -------------------------------------------------------------------- */

  var emailLink = document.getElementById("email-link");

  if (emailLink) {
    emailLink.textContent = hrefValue(emailLink);
  }

  // The address inside a link href, whatever kind of link it is.
  function hrefValue(source) {
    var raw = source.getAttribute("href") || source.textContent || "";
    return raw.replace(/^(mailto:|tel:)/i, "").split("?")[0].trim();
  }

  // What to put on the clipboard. The visible label wins, because it is the
  // form a person reads out loud — "+234 906 788 5488", not "+2349067885488".
  // Non-breaking spaces become plain ones so a paste into a dialer still works.
  function copyValue(source) {
    var shown = (source.textContent || "").replace(/\u00a0/g, " ").trim();
    if (shown) return shown;
    return hrefValue(source);
  }

  function legacyCopy(text) {
    return new Promise(function (resolve, reject) {
      var helper = document.createElement("textarea");
      helper.value = text;
      helper.setAttribute("readonly", "");
      helper.style.position = "fixed";
      helper.style.top = "-1000px";
      helper.style.opacity = "0";
      document.body.appendChild(helper);
      helper.select();
      var ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (e) {
        ok = false;
      }
      helper.remove();
      ok ? resolve() : reject(new Error("copy failed"));
    });
  }

  function copyText(text) {
    // The Clipboard API can be present but still reject (no focus, no
    // permission, insecure context), so fall back in both cases.
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () {
        return legacyCopy(text);
      });
    }
    return legacyCopy(text);
  }

  Array.prototype.forEach.call(document.querySelectorAll("[data-copy-from]"), function (button) {
    var label = button.textContent;
    var timer;

    button.addEventListener("click", function () {
      var source = document.querySelector(button.getAttribute("data-copy-from"));
      if (!source) return;

      var value = copyValue(source);

      copyText(value).then(
        function () {
          button.textContent = "Copied";
          button.setAttribute("data-state", "copied");
          clearTimeout(timer);
          timer = setTimeout(function () {
            button.textContent = label;
            button.removeAttribute("data-state");
          }, 2000);
        },
        function () {
          button.textContent = "Press Ctrl+C";
          clearTimeout(timer);
          timer = setTimeout(function () {
            button.textContent = label;
          }, 2000);
        }
      );
    });
  });

  /* --------------------------------------------------------------------
     Sticky header state + scroll spy
     -------------------------------------------------------------------- */

  var topbar = document.querySelector(".topbar");
  var sections = Array.prototype.slice.call(document.querySelectorAll("main section[id]"));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".topbar nav a[href]"));
  var nav = document.querySelector(".topbar nav");

  // A nav click is an explicit statement of intent: remember it so the
  // spy highlights the clicked section even when the page cannot scroll
  // far enough for that section to reach the detection line.
  var forced = null;

  function clearForced() {
    forced = null;
  }

  // Links can be written as "#work" or "index.html#work". The data-section
  // attribute covers links such as the contact CTA that point at another page.
  function sectionFor(link) {
    var explicit = link.getAttribute("data-section");
    if (explicit) return explicit;
    var href = link.getAttribute("href") || "";
    var hash = href.indexOf("#");
    return hash === -1 ? "" : href.slice(hash + 1);
  }

  // Only same-page links should drive the spy; cross-page links navigate.
  function isSamePage(link) {
    var destination = new URL(link.href, window.location.href);
    return destination.pathname === window.location.pathname;
  }

  if (nav) {
    nav.addEventListener("click", function (event) {
      var link = event.target.closest(".topbar nav a[href]");
      if (!link || !isSamePage(link)) return;
      forced = sectionFor(link) || null;
      if (!forced) return;
      // The page may already be at that position, in which case no scroll
      // event fires and the highlight would never update.
      requestUpdate();
    });
  }

  // Any real scroll gesture hands control back to position-based detection.
  window.addEventListener("wheel", clearForced, { passive: true });
  window.addEventListener("touchstart", clearForced, { passive: true });
  window.addEventListener("keydown", function (event) {
    var keys = ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "];
    if (keys.indexOf(event.key) !== -1) clearForced();
  });

  var ticking = false;

  // Read the offset the stylesheet uses for anchored headings so the spy
  // and the actual scroll position can never drift apart.
  function scrollOffset() {
    var raw = window.getComputedStyle(root).getPropertyValue("--scroll-offset");
    var parsed = parseFloat(raw);
    return isNaN(parsed) ? 80 : parsed;
  }

  function onScroll() {
    var scrolled = window.scrollY > 8;
    if (topbar) topbar.setAttribute("data-stuck", scrolled ? "true" : "false");

    var offset = window.scrollY + scrollOffset() + 4;
    var index = -1;

    for (var i = 0; i < sections.length; i++) {
      var rect = sections[i].getBoundingClientRect();
      if (rect.top + window.scrollY <= offset) index = i;
    }

    // Nothing reached yet (still in the hero) — fall back to the first section.
    if (index === -1) index = 0;

    // At the very bottom the last section is the one being read.
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
      index = sections.length - 1;
    }

    // An explicit nav click wins over both.
    if (forced) {
      for (var f = 0; f < sections.length; f++) {
        if (sections[f].id === forced) {
          index = f;
          break;
        }
      }
    }

    var activeId = sections[index] ? sections[index].id : "";

    for (var j = 0; j < navLinks.length; j++) {
      var linkId = sectionFor(navLinks[j]);
      var isCurrent = linkId && linkId === activeId;

      if (isCurrent) {
        if (navLinks[j].getAttribute("aria-current") !== "page") {
          navLinks[j].setAttribute("aria-current", "location");
        }
      } else if (navLinks[j].getAttribute("aria-current") === "location") {
        navLinks[j].removeAttribute("aria-current");
      }
    }

    ticking = false;
  }

  function requestUpdate() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(onScroll);
  }

  if (sections.length) {
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    onScroll();
  }
  /* --------------------------------------------------------------------
     Scroll reveal
     -------------------------------------------------------------------- */
  var revealTargets = document.querySelectorAll("main > section, .project");
  if (revealTargets.length && "IntersectionObserver" in window && !reduceMotion.matches) {
    for (var r = 0; r < revealTargets.length; r++) {
      revealTargets[r].classList.add("reveal");
    }
    var revealObserver = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            entries[i].target.classList.add("is-visible");
            revealObserver.unobserve(entries[i].target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    for (var r2 = 0; r2 < revealTargets.length; r2++) {
      revealObserver.observe(revealTargets[r2]);
    }
  }


})();
