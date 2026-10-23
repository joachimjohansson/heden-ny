// Startsidan: öppetstatusen, intoningar och årtalet i sidfoten.
// Öppettiderna läses från öppettidskortet i index.html, så de behöver bara ändras där.
(() => {
  const dayNames = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag'];
  const hoursCard = document.querySelector('.hours-card');
  const rows = [...document.querySelectorAll('.hours-row')];

  // "11.00" -> minuter efter midnatt
  const toMinutes = (text) => {
    const [h, m] = text.trim().split(/[.:]/).map(Number);
    return h * 60 + (m || 0);
  };
  const format = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}.${String(minutes % 60).padStart(2, '0')}`;

  // Bygg ett schema per veckodag från raderna i öppettidskortet.
  const schedule = {};
  rows.forEach((row) => {
    const hours = { open: toMinutes(row.dataset.open), close: toMinutes(row.dataset.close), row };
    row.dataset.days.split(',').forEach((day) => { schedule[Number(day)] = hours; });
  });
  const closedDates = (hoursCard.dataset.closed || '').split(',').map((d) => d.trim()).filter(Boolean);

  // Datum, veckodag och klockslag i svensk tid, oavsett var besökaren är.
  const swedishDate = (offsetDays = 0) => {
    const date = new Date(Date.now() + offsetDays * 864e5);
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit',
      weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(date).map(({ type, value }) => [type, value]));
    return {
      iso: `${parts.year}-${parts.month}-${parts.day}`,
      day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday),
      minute: Number(parts.hour) * 60 + Number(parts.minute)
    };
  };
  const hoursFor = (date) => (closedDates.includes(date.iso) ? null : schedule[date.day]);

  // Nästa dag då vi har öppet: veckodag, tid och om det är imorgon.
  const nextOpenDay = () => {
    for (let offset = 1; offset <= 14; offset += 1) {
      const date = swedishDate(offset);
      const hours = hoursFor(date);
      if (hours) return { day: date.day, open: hours.open, tomorrow: offset === 1 };
    }
    return null;
  };
  // "fredag" -> "på fredagar"
  const onDays = (day) => `på ${dayNames[day]}ar`;

  const closingNote = document.getElementById('closing-note');
  const heroStatus = document.getElementById('hero-status-text');
  const heroDot = document.getElementById('hero-dot');

  // Raden under rubriken, t.ex. "Öppet nu · stänger 22.00 på fredagar", och raden i öppettidskortet.
  const show = (line, note, isOpen) => {
    heroStatus.textContent = line;
    closingNote.textContent = note;
    heroDot.classList.toggle('is-open', isOpen);
  };

  const renderHours = () => {
    const now = swedishDate();
    const today = hoursFor(now);
    rows.forEach((row) => row.classList.toggle('is-today', schedule[now.day]?.row === row));
    const next = nextOpenDay();
    const nextText = next && `${next.tomorrow ? 'imorgon' : dayNames[next.day]} kl. ${format(next.open)}`;

    if (!today) {
      show(nextText ? `Stängt idag · öppnar ${nextText}` : 'Stängt idag', 'Vi håller stängt idag.', false);
    } else if (now.minute < today.open) {
      show(`Stängt nu · öppnar ${format(today.open)} ${onDays(now.day)}`, `Stänger idag kl. ${format(today.close)}`, false);
    } else if (now.minute < today.close) {
      show(`Öppet nu · stänger ${format(today.close)} ${onDays(now.day)}`, `Stänger idag kl. ${format(today.close)}`, true);
    } else {
      show(next ? `Stängt nu · öppnar ${format(next.open)} ${onDays(next.day)}` : 'Stängt', `Stängde idag kl. ${format(today.close)}`, false);
    }
  };

  // --- Intoningar: delarna i varje sektion glider in en gång, i tur och ordning ---
  if ('IntersectionObserver' in window) {
    document.querySelectorAll('section, .footer').forEach((section) => {
      section.querySelectorAll('[data-reveal]').forEach((el, i) => el.style.setProperty('--delay', `${Math.min(i, 6) * 80}ms`));
    });
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
  } else {
    document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-in'));
  }

  document.querySelectorAll('.year').forEach((el) => { el.textContent = new Date().getFullYear(); });
  renderHours();
  setInterval(renderHours, 60_000);
})();
