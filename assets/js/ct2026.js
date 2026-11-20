/* Multi-year contribution-style tracker (2026 .. current year) with year tabs,
   daily notes, and progress-bar sync.
   Data: plain-text island #ct-data, rendered by Jekyll from _data/tracker/records.yml.
   Entry formats: YYYY-MM-DD|task,task
                  YYYY-MM-DD|note:free text
   Pure client-side: year grids, colors, tooltips, stats, Beijing-time "today". */
(function () {
  'use strict';
  var dataEl = document.getElementById('ct-data');
  var yearsEl = document.getElementById('ct-years');
  var navEl = document.getElementById('ct-years-nav');
  if (!dataEl || !yearsEl || !navEl) return;

  /* ---- data: whitespace-tolerant regex extraction from the island ---- */
  var DATA = {}; // day -> { t: [task, ...], n: 'note text' }
  function rec(day) {
    if (!DATA[day]) DATA[day] = { t: [], n: '' };
    return DATA[day];
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  var raw = dataEl.textContent || '';

  // task entries: date + '|' + letters/commas; skip lines that are note lines
  var taskRe = /\d{4}-\d{2}-\d{2}\|([A-Za-z,]*)/g;
  var mt;
  while ((mt = taskRe.exec(raw)) !== null) {
    var dayT = mt[0].slice(0, 10);
    var toks = mt[1].split(',');
    var isNoteLine = false;
    for (var a = 0; a < toks.length; a++) {
      if (toks[a].replace(/^\s+|\s+$/g, '') === 'note') { isNoteLine = true; break; }
    }
    if (isNoteLine) continue;
    for (var b = 0; b < toks.length; b++) {
      var name = toks[b].replace(/^\s+|\s+$/g, '');
      if (!name) continue;
      var r = rec(dayT);
      var dup = false;
      for (var c = 0; c < r.t.length; c++) if (r.t[c] === name) dup = true;
      if (!dup) r.t.push(name);
    }
  }

  // note entries: date + '|note:' + text up to the next entry (or end)
  var noteRe = /\d{4}-\d{2}-\d{2}\|note:(.*?)(?=\s*\d{4}-\d{2}-\d{2}\||$)/g;
  var mn;
  while ((mn = noteRe.exec(raw)) !== null) {
    var dayN = mn[0].slice(0, 10);
    var note = mn[1].replace(/^\s+|\s+$/g, '');
    if (note) rec(dayN).n = note;
  }

  if (raw.replace(/\s+/g, '').length === 0) {
    yearsEl.innerHTML = '<div class="ct-err">tracker island is empty — is _data/tracker/records.yml in the build?</div>';
    return;
  }

  var START = '2026-11-20';
  var START_YEAR = 2026;
  var TOTAL_DAYS = 365;
  var TASKS = ['exercise', 'study', 'diet', 'sleep'];
  var COLORS = ['#eac54f', '#9be9a8', '#40c463', '#30a14e', '#216e39'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DOWS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var wrap = document.getElementById('ct-2026');
  var tip = document.getElementById('ct-tip');
  var stats = document.getElementById('ct-stats');

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function keyOf(d) { return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }

  /* "today" in Asia/Shanghai (UTC+8, no DST) — live in the visitor's browser */
  var TODAY = keyOf(new Date(Date.now() + 8 * 3600 * 1000));
  var CURRENT_YEAR = parseInt(TODAY.slice(0, 4), 10);

  /* ---- markup for one year's grid (Sunday-first weeks, GitHub layout) ---- */
  function yearHTML(y) {
    var yStart = y + '-01-01';
    var yEnd = y + '-12-31';
    var cells = [];
    var cur = new Date(Date.UTC(y, 0, 1));
    cur.setUTCDate(1 - cur.getUTCDay());              // back to Sunday (underflows into Dec correctly)
    var end = new Date(Date.UTC(y, 11, 31));
    while (cur <= end) {
      var k = keyOf(cur);
      cells.push((k < yStart || k > yEnd) ? null : k);
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    while (cells.length % 7 !== 0) cells.push(null);  // pad to whole weeks
    var cols = cells.length / 7;                      // 53 or 54 depending on year

    var html = '<div class="ct-year-view">';
    html += '<div class="ct-year-lab">' + y + '</div>';
    html += '<div class="ct-grid" style="grid-template-columns:26px repeat(' + cols + ',10px)">';

    var mm, ii, first, col, row, day, entry, count, bg;
    for (mm = 0; mm < 12; mm++) {                     // month labels at the first week containing the month
      var prefix = y + '-' + pad(mm + 1) + '-';
      first = -1;
      for (ii = 0; ii < cells.length; ii++) {
        if (cells[ii] && cells[ii].indexOf(prefix) === 0) { first = ii; break; }
      }
      if (first >= 0) {
        col = Math.floor(first / 7) + 2;
        html += '<span class="ct-lab" style="grid-column:' + col + ';grid-row:1">' + MONTHS[mm] + '</span>';
      }
    }
    html += '<span class="ct-lab" style="grid-column:1;grid-row:3">Mon</span>' +   // rows 2..8 = Sun..Sat
            '<span class="ct-lab" style="grid-column:1;grid-row:5">Wed</span>' +
            '<span class="ct-lab" style="grid-column:1;grid-row:7">Fri</span>';

    for (ii = 0; ii < cells.length; ii++) {
      day = cells[ii];
      if (!day) continue;
      col = Math.floor(ii / 7) + 2;
      row = (ii % 7) + 2;
      entry = DATA[day];
      count = entry ? entry.t.length : 0;
      if (day < START) bg = '#ffffff';                // before tracker start
      else if (day > TODAY) bg = '#cdd5dc';           // upcoming
      else bg = COLORS[Math.min(count, 4)];           // 0 = yellow, 1..4 = green shades
      html += '<div class="ct-cell' + (day === TODAY ? ' ct-today' : '') +
              '" data-day="' + day +
              '" style="background:' + bg + ';grid-column:' + col + ';grid-row:' + row + '"></div>';
    }
    html += '</div></div>';
    return html;
  }

  /* ---- year tabs (corner pills): default = current year ---- */
  var pinned = null;
  function hideTip() { if (!pinned) tip.style.display = 'none'; }

  var navHtml = '';
  for (var y = START_YEAR; y <= CURRENT_YEAR; y++) {
    navHtml += '<button type="button" class="ct-year-btn" data-year="' + y + '">' + y + '</button>';
  }
  navEl.innerHTML = navHtml;

  function selectYear(y) {
    yearsEl.innerHTML = yearHTML(y);
    var btns = navEl.querySelectorAll('.ct-year-btn');
    for (var b = 0; b < btns.length; b++) {
      var active = parseInt(btns[b].getAttribute('data-year'), 10) === y;
      if (active) btns[b].classList.add('active');
      else btns[b].classList.remove('active');
    }
    pinned = null;
    hideTip();
  }
  navEl.addEventListener('click', function (e) {
    var t = e.target;
    while (t && t !== navEl) {
      if (t.getAttribute && t.getAttribute('data-year')) {
        selectYear(parseInt(t.getAttribute('data-year'), 10));
        return;
      }
      t = t.parentNode;
    }
  });
  selectYear(CURRENT_YEAR);

  /* ---- tooltip: hover to follow, click to pin; shows tasks + note ---- */
  function tipHTML(day) {
    var d = new Date(day + 'T00:00:00Z');
    var head = day + ' (' + DOWS[d.getUTCDay()] + ')';
    if (day < START) return head + '<br><span class="no">before tracker start</span>';
    if (day > TODAY) return head + '<br><span class="no">upcoming</span>';
    var r = DATA[day];
    var entry = r ? r.t : [];
    var lines = '';
    for (var jj = 0; jj < TASKS.length; jj++) {
      var done = entry.indexOf(TASKS[jj]) >= 0;
      lines += '<span class="' + (done ? 'ok' : 'no') + '">' + (done ? '\u2713' : '\u2717') + ' ' + TASKS[jj] + '</span>&nbsp;&nbsp;';
    }
    var html = head + '<br>' + lines + '<br><b>' + entry.length + '/4</b>' + (entry.length === 4 ? ' &nbsp;perfect!' : '');
    if (r && r.n) html += '<br><span class="note">\u201c' + esc(r.n) + '\u201d</span>';
    return html;
  }

  function showTip(cell, x, y) {
    tip.innerHTML = tipHTML(cell.getAttribute('data-day'));
    tip.style.display = 'block';
    var r2 = tip.getBoundingClientRect();
    var left = x + 14;
    if (left + r2.width > window.innerWidth - 8) left = x - r2.width - 14;
    var top = y - r2.height - 10;
    if (top < 8) top = y + 18;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }
  function cellFrom(e) {
    var t = e.target;
    while (t && t !== wrap) {
      if (t.nodeType === 1 && String(t.className).indexOf('ct-cell') >= 0) return t;
      t = t.parentNode;
    }
    return null;
  }
  wrap.addEventListener('mousemove', function (e) {
    if (pinned) return;
    var cell = cellFrom(e);
    if (cell) showTip(cell, e.clientX, e.clientY);
    else hideTip();
  });
  wrap.addEventListener('mouseleave', hideTip);
  wrap.addEventListener('click', function (e) {
    var cell = cellFrom(e);
    if (!cell) return;
    e.stopPropagation();
    if (pinned === cell) { pinned = null; hideTip(); return; }
    pinned = cell;
    var r = cell.getBoundingClientRect();
    showTip(cell, r.left + r.width / 2, r.top);
  });
  document.addEventListener('click', function () { pinned = null; hideTip(); });

  /* ---- stats (all years) ---- */
  var logged = 0, tasksSum = 0, perfect = 0, k2, v;
  for (k2 in DATA) {
    if (!Object.prototype.hasOwnProperty.call(DATA, k2)) continue;
    v = DATA[k2];
    logged++;
    tasksSum += v.t.length;
    if (v.t.length === 4) perfect++;
  }
  var streak = 0;
  var probe = new Date(TODAY + 'T00:00:00Z');
  while (true) {
    var pk = keyOf(probe);
    if (pk < START) break;
    var pe = DATA[pk];
    if (pe && pe.t.length > 0) { streak++; probe.setUTCDate(probe.getUTCDate() - 1); }
    else break;
  }
  stats.textContent = logged + 'd logged \u00b7 ' + tasksSum + ' tasks \u00b7 ' +
                      perfect + ' perfect \u00b7 streak ' + streak + 'd';

  /* ---- sync the 365-day progress bar (same Beijing clock, same START) ---- */
  var pFill = document.getElementById('pbar-fill');
  if (pFill) {
    var elapsed = Math.floor(
      (new Date(TODAY + 'T00:00:00Z') - new Date(START + 'T00:00:00Z')) / 86400000
    );
    if (elapsed < 0) elapsed = 0;
    if (elapsed > TOTAL_DAYS) elapsed = TOTAL_DAYS;

    pFill.style.width = (elapsed * 100 / TOTAL_DAYS) + '%';
    pFill.style.minWidth = elapsed > 0 ? '2px' : '0';

    var ds = String(elapsed);
    while (ds.length < 3) ds = '0' + ds;
    var pctVal = Math.round(elapsed * 10000 / TOTAL_DAYS) / 100; // 0, 0.27, 8.22, 100

    function setText(id, s) {
      var el = document.getElementById(id);
      if (el) el.textContent = s;
    }
    setText('pbar-day', ds + '/' + TOTAL_DAYS);
    setText('pbar-pct', pctVal + '%');
    setText('pbar-remaining', (TOTAL_DAYS - elapsed) + 'd remaining');
  }
})();