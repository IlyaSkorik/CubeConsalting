/* SPA navigation (vanilla JS) - production-ready
   Features:
   - Smooth, premium scroll with easing
   - IntersectionObserver for active link updates
   - Accounts for fixed navbar offset
   - Works with links using data-section or href="#id"
*/
(function () {
  'use strict';

  const NAV_SELECTOR = '#site-nav';
  const LINK_SELECTOR = 'a[data-section], a[href^="#"]';

  const NAV_ACTIVE_CLASSES = [
    'relative',
    'text-sm',
    'font-semibold',
    'filter',
    'drop-shadow-[0_0_8px_var(--primary)]',
    'transition-all'
  ];

  const HERO_ACTIVE_CLASS = 'hero-active';
  const INACTIVE_CLASSES = [];

  const nav = document.querySelector(NAV_SELECTOR);
  if (!nav) return;

  // Utility: parse various CSS color formats into "r,g,b"
  function parseToRgb(input) {
    if (!input) return null;
    const v = input.trim();
    if (!v) return null;
    if (v[0] === '#') {
      let hex = v.slice(1);
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      if (hex.length === 6) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return `${r},${g},${b}`;
      }
    }
    const m = v.match(/rgba?\(([^)]+)\)/i);
    if (m) {
      const parts = m[1].split(',').map(s => s.trim());
      if (parts.length >= 3) return `${parseInt(parts[0])},${parseInt(parts[1])},${parseInt(parts[2])}`;
    }
    if (v.indexOf(',') !== -1) {
      const parts = v.split(',').map(s => s.replace(/[^0-9]/g, '').trim());
      if (parts.length >= 3) return `${parseInt(parts[0])},${parseInt(parts[1])},${parseInt(parts[2])}`;
    }
    return null;
  }

  function getLogoRgb() {
    const docStyle = getComputedStyle(document.documentElement);
    const raw = (docStyle.getPropertyValue('--logo') || docStyle.getPropertyValue('--color-logo') || docStyle.getPropertyValue('--color-primary') || '').trim();
    return parseToRgb(raw) || parseToRgb(docStyle.getPropertyValue('--primary')) || '99,102,241';
  }

  const allLinks = Array.from(document.querySelectorAll(LINK_SELECTOR));
  const links = allLinks.filter(l => {
    // ignore links that are purely '#'
    const href = l.getAttribute('href') || '';
    const ds = l.dataset.section;
    if ((href.trim() === '#' || href.trim() === '') && !ds) return false;
    return true;
  });

  const sections = links
    .map(l => {
      const id = (l.dataset.section && l.dataset.section.trim()) || (l.getAttribute('href') || '').replace(/^#/, '');
      if (!id) return null;
      const el = document.getElementById(id);
      return el ? { id, link: l, el } : null;
    })
    .filter(Boolean);

  let navHeight = nav.offsetHeight || 0;
  let isAutoScrolling = false;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Reapply hero SVG glow based on current CSS var color
  function updateHeroGlow() {
    const activeHero = document.querySelector(`${NAV_SELECTOR} a[data-section="hero"].${HERO_ACTIVE_CLASS}`) || document.querySelector(`a[data-section="hero"].${HERO_ACTIVE_CLASS}`);
    if (!activeHero) return;
    try {
      const rgb = getLogoRgb();
      const svg = activeHero.querySelector && activeHero.querySelector('svg');
      if (svg) {
        svg.style.filter = `drop-shadow(0 4px 12px rgba(${rgb},0.5)) drop-shadow(0 0 6px rgba(${rgb},0.35)) saturate(1.3)`;
        svg.style.transition = 'filter 240ms ease';
      } else {
        activeHero.style.boxShadow = `0 4px 12px rgba(${rgb},0.5), 0 0 6px rgba(${rgb},0.35)`;
        activeHero.style.border = `1px solid rgba(${rgb},0.18)`;
      }
    } catch (e) {
      // noop
    }
  }

  // Observe theme changes on <html> (data-theme, class, style) and update glow immediately
  try {
    const mo = new MutationObserver(muts => {
      if (!muts || muts.length === 0) return;
      const relevant = muts.some(m => ['data-theme', 'class', 'style'].includes(m.attributeName));
      if (relevant) updateHeroGlow();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
  } catch (e) {
    // MutationObserver may not be available in very old browsers — ignore
  }

  // If there's a theme toggle element, hook its click to update glow after toggle
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) themeToggle.addEventListener('click', () => setTimeout(updateHeroGlow, 50));

  function setClassesActive(link) {
    links.forEach(l => {
      l.classList.remove(...NAV_ACTIVE_CLASSES);
      l.classList.remove(HERO_ACTIVE_CLASS);
      // remove inline styles that we may have added for hero (svg filter)
      if (l.dataset && l.dataset.section === 'hero') {
        const svg = l.querySelector && l.querySelector('svg');
        if (svg) {
          svg.style.filter = '';
          svg.style.transition = '';
        }
        l.style.boxShadow = '';
        l.style.border = '';
        l.style.background = '';
      }
      l.setAttribute('aria-current', 'false');
    });
    if (!link) return;
    if (link.dataset.section === 'hero') {
      // add hero class and inline glow using --logo CSS variable (RGB)
      link.classList.add(HERO_ACTIVE_CLASS);
      try {
        const rgb = getLogoRgb();
        const svg = link.querySelector && link.querySelector('svg');
        if (svg) {
          svg.style.filter = `drop-shadow(0 4px 12px rgba(${rgb},0.5)) drop-shadow(0 0 6px rgba(${rgb},0.35)) saturate(1.3)`;
          svg.style.transition = 'filter 240ms ease';
        } else {
          link.style.boxShadow = `0 4px 12px rgba(${rgb},0.5), 0 0 6px rgba(${rgb},0.35)`;
          link.style.border = `1px solid rgba(${rgb},0.18)`;
          link.style.background = 'transparent';
        }
      } catch (e) {
        const svg = link.querySelector && link.querySelector('svg');
        if (svg) {
          svg.style.filter = 'drop-shadow(0 4px 12px rgba(99,102,241,0.5)) drop-shadow(0 0 6px rgba(99,102,241,0.35)) saturate(1.3)';
          svg.style.transition = 'filter 240ms ease';
        } else {
          link.style.boxShadow = '0 4px 12px rgba(99,102,241,0.5), 0 0 6px rgba(99,102,241,0.35)';
          link.style.border = '1px solid rgba(99,102,241,0.18)';
        }
      }
    } else {
      link.classList.add(...NAV_ACTIVE_CLASSES);
    }
    link.setAttribute('aria-current', 'true');
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function smoothScrollTo(targetY, duration = 650) {
    if (prefersReducedMotion) {
      window.scrollTo(0, targetY);
      return Promise.resolve();
    }
    return new Promise(resolve => {
      const startY = window.scrollY || window.pageYOffset;
      const distance = targetY - startY;
      if (Math.abs(distance) < 2) {
        resolve();
        return;
      }
      let startTime = null;
      function step(ts) {
        if (!startTime) startTime = ts;
        const elapsed = Math.min(1, (ts - startTime) / duration);
        const eased = easeInOutCubic(elapsed);
        window.scrollTo(0, Math.round(startY + distance * eased));
        if (elapsed < 1) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      }
      requestAnimationFrame(step);
    });
  }

  async function onLinkClick(e) {
    const link = e.currentTarget;
    const id = (link.dataset.section && link.dataset.section.trim()) || (link.getAttribute('href') || '').replace(/^#/, '');
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    isAutoScrolling = true;

    const sceneScroll = window.__sceneScroll;
    if (sceneScroll && typeof sceneScroll.goToId === 'function') {
      sceneScroll.goToId(id, prefersReducedMotion);
      setClassesActive(link);
      setTimeout(() => { isAutoScrolling = false; }, prefersReducedMotion ? 80 : 900);
      return;
    }

    let targetY;
    if (id === 'hero') {
      targetY = 0;
    } else {
      const rect = target.getBoundingClientRect();
      targetY = Math.round(rect.top + window.pageYOffset);
    }
    await smoothScrollTo(targetY);
    history.replaceState(null, '', `#${id}`);
    setClassesActive(link);
    setTimeout(() => { isAutoScrolling = false; }, 80);
  }

  links.forEach(l => l.addEventListener('click', onLinkClick));

  document.addEventListener('cub:scene-active', (e) => {
    if (isAutoScrolling || !e.detail) return;
    const id = e.detail.id;
    const match = links.find(l => ((l.dataset.section && l.dataset.section.trim()) || (l.getAttribute('href') || '').replace(/^#/, '')) === id);
    if (match) setClassesActive(match);
  });

  // Default active link on fresh load (no hash) in cinema mode
  window.addEventListener('load', () => {
    if (document.documentElement.dataset.sceneMode === 'cinema' && !location.hash) {
      syncCinemaNav();
    }
  }, { passive: true });

  function syncCinemaNav() {
    if (document.documentElement.dataset.sceneMode !== 'cinema') return;
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    const active = document.querySelector('[data-scene].is-active');
    if (!active || !active.id) return;
    const match = links.find(
      (l) =>
        ((l.dataset.section && l.dataset.section.trim()) ||
          (l.getAttribute('href') || '').replace(/^#/, '')) === active.id,
    );
    if (match) setClassesActive(match);
  }

  let observer = null;
  function buildObserver() {
    if (document.documentElement.dataset.sceneMode === 'cinema') {
      syncCinemaNav();
      return;
    }
    if (observer) observer.disconnect();
    navHeight = nav.offsetHeight || nav.clientHeight || 0;
    // Do not offset rootMargin by navbar height — we want sections to be detected based
    // on their actual position relative to viewport top (no header reserve)
    const rootMargin = `0px 0px -40% 0px`;
    observer = new IntersectionObserver((entries) => {
      if (isAutoScrolling) return;
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        const match = links.find(l => ((l.dataset.section && l.dataset.section.trim()) || (l.getAttribute('href') || '').replace(/^#/, '')) === id);
        if (match) setClassesActive(match);
      });
    }, { root: null, rootMargin, threshold: [0.25, 0.5, 0.75] });

    sections.forEach(s => observer.observe(s.el));
  }
  buildObserver();
  // landing.ts sets data-scene-mode after this script — re-sync once cinema boots
  requestAnimationFrame(() => {
    requestAnimationFrame(buildObserver);
  });
  // ensure hero glow reflects current theme on init
  updateHeroGlow();

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      buildObserver();
    }, 120);
  });

  window.addEventListener('scroll', () => {
    const nearBottom = (window.innerHeight + window.pageYOffset) >= (document.body.offsetHeight - 4);
    if (nearBottom) {
      const last = sections[sections.length - 1];
      if (last) {
        const match = links.find(l => ((l.dataset.section && l.dataset.section.trim()) || (l.getAttribute('href') || '').replace(/^#/, '')) === last.id);
        if (match) setClassesActive(match);
      }
    }
  }, { passive: true });

  // Инициализация aria и сброс активных классов
  links.forEach(l => {
    l.classList.remove(...NAV_ACTIVE_CLASSES);
    l.classList.remove(HERO_ACTIVE_CLASS);
    // clear any inline styles
    if (l.dataset && l.dataset.section === 'hero') {
      l.style.boxShadow = '';
      l.style.border = '';
      l.style.background = '';
    }
    l.setAttribute('aria-current', 'false');
  });

  // Если есть хеш при загрузке, установить active и прокрутить корректно
  window.addEventListener('load', async () => {
    const hash = (location.hash || '').replace('#', '');
    if (!hash) return;
    const sceneScroll = window.__sceneScroll;
    if (sceneScroll && typeof sceneScroll.goToId === 'function') {
      const link = links.find(l => ((l.dataset.section && l.dataset.section.trim()) || (l.getAttribute('href') || '').replace(/^#/, '')) === hash);
      sceneScroll.goToId(hash, true);
      if (link) setClassesActive(link);
      return;
    }
    const target = document.getElementById(hash);
    const link = links.find(l => ((l.dataset.section && l.dataset.section.trim()) || (l.getAttribute('href') || '').replace(/^#/, '')) === hash);
    if (target) {
      const hashId = hash;
      if (hashId === 'hero') {
        await smoothScrollTo(0, 20);
      } else {
        const targetY = Math.round(target.getBoundingClientRect().top + window.pageYOffset);
        await smoothScrollTo(targetY, 20);
      }
    }
    if (link) setClassesActive(link);
  }, { passive: true });

})();
