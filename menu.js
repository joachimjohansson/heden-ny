// Menysidan: markerar var på menyn man är, ger mobilen en rullista för menyns delar,
// tonar in delarna och skriver årtalet i sidfoten.
// Själva menyn står direkt i menu.html, så den syns även om skriptet inte laddas.
(() => {
  const tabBar = document.querySelector('.menu-tabs');
  const mainTabs = [...document.querySelectorAll('.menu-tabs-main a')];
  const subs = document.querySelector('.menu-tabs-subs');
  const subRows = [...document.querySelectorAll('.menu-tabs-sub')];
  const sections = [...document.querySelectorAll('.food-section')];
  const groups = [...document.querySelectorAll('.menu-group')];

  // På mobilen: en rullista med menyns delar i stället för en rad som inte får plats.
  // Den byggs från länkarna i flikraden, så delarna står bara på ett ställe.
  const select = document.createElement('select');
  select.className = 'menu-select';
  select.setAttribute('aria-label', 'Välj del av menyn');
  subRows.forEach((row) => {
    const group = document.createElement('optgroup');
    group.label = mainTabs.find((t) => t.dataset.section === row.dataset.section)?.textContent.trim() || '';
    row.querySelectorAll('a').forEach((link) => group.append(new Option(link.textContent.trim(), link.hash.slice(1))));
    select.append(group);
  });
  subs.append(select);
  select.addEventListener('change', () => {
    document.getElementById(select.value)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    history.replaceState(null, '', `#${select.value}`);
  });

  // Raderna med underkategorier är olika långa. Raden får alltid den längstas höjd,
  // så att flikraden inte hoppar när man byter del.
  const fitSubs = () => {
    subs.style.minHeight = '';
    let tallest = 0;
    subRows.forEach((row) => {
      const wasHidden = row.hidden;
      row.hidden = false;
      tallest = Math.max(tallest, row.offsetHeight);
      row.hidden = wasHidden;
    });
    subs.style.minHeight = `${Math.max(tallest, select.offsetHeight)}px`;
  };

  // Visa rätt rad med underkategorier och markera aktiv flik.
  // aria-current talar om för skärmläsare vilken flik som är vald.
  const mark = (link, isActive) => {
    link.classList.toggle('active', isActive);
    if (isActive) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  };

  let current = '';
  const setActive = (sectionId, groupId) => {
    current = groupId;
    mainTabs.forEach((tab) => mark(tab, tab.dataset.section === sectionId));
    subRows.forEach((row) => {
      row.hidden = row.dataset.section !== sectionId;
      row.querySelectorAll('a').forEach((link) => mark(link, link.hash === `#${groupId}`));
    });
    select.value = groupId;
  };

  // Först väljs den menydel vars rubrik senast passerat under flikraden, sedan
  // gruppen inom den delen. Längst ner på sidan räknas sista delen som aktiv,
  // eftersom en kort sista del aldrig hinner nå upp till flikraden.
  const update = () => {
    const line = tabBar.getBoundingClientRect().bottom + 24;
    const passed = (el) => el.getBoundingClientRect().top <= line;
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    const section = atBottom ? sections[sections.length - 1] : sections.filter(passed).pop() || sections[0];
    const inSection = groups.filter((g) => section.contains(g));
    const group = (atBottom ? null : inSection.filter(passed).pop()) || inSection[0];
    if (group.id !== current) setActive(section.id, group.id);
  };

  // Flikraden får bakgrund först när den fastnat högst upp.
  const setStuck = () => tabBar.classList.toggle('is-stuck', tabBar.getBoundingClientRect().top <= 0);

  // Vid tryck på en flik markeras den direkt, och scrollen dit får inte
  // flytta markeringen förrän den stannat.
  let locked = null;
  document.querySelectorAll('.menu-tabs a').forEach((link) => link.addEventListener('click', () => {
    const target = document.querySelector(link.hash);
    const section = target.closest('.food-section');
    const group = target.classList.contains('menu-group') ? target : section.querySelector('.menu-group');
    setActive(section.id, group.id);
    clearTimeout(locked);
    locked = setTimeout(() => { locked = null; }, 1200);
  }));

  let queued = false;
  window.addEventListener('scroll', () => {
    setStuck();
    if (queued || locked) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; update(); });
  }, { passive: true });
  window.addEventListener('scrollend', () => { clearTimeout(locked); locked = null; });

  // Flikraden kan bli högre på smala skärmar; låt hopp till rubriker landa under den.
  const setOffset = () => {
    fitSubs();
    document.documentElement.style.setProperty('--tabs-height', `${tabBar.offsetHeight}px`);
  };
  window.addEventListener('resize', setOffset);
  document.fonts?.ready.then(setOffset);
  setOffset();
  setStuck();
  update();

  // Intoningar: delarna i varje avsnitt glider in en gång, i tur och ordning.
  if ('IntersectionObserver' in window) {
    document.querySelectorAll('section, .footer').forEach((section) => {
      section.querySelectorAll(':scope [data-reveal]').forEach((el, i) => el.style.setProperty('--delay', `${Math.min(i, 6) * 80}ms`));
    });
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
  } else {
    document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-in'));
  }

  document.querySelectorAll('.year').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
