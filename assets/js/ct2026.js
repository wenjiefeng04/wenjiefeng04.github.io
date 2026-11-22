/* Multi-year contribution-style tracker (2026 .. current year): year pills,
   daily notes, progress-bar sync.
   Data island #ct-data: one line per day  YYYY-MM-DD|task,task[, "# note text"]
   Pure client-side: year grids, colors, tooltips, stats, Beijing-time "today". */
(function () {
  'use strict';
  var dataEl = document.getElementById('ct-data');
  var yearsEl = document.getElementById('ct-years');
  var navEl = document.getElementById('ct-years-nav');
  if (!dataEl || !yearsEl || !navEl) return;

  /* ---- data: split the island on date anchors (whitespace-tolerant) ---- */
  var DATA = {}; // day -> { t: [task, ...], n: 'note' }
  function rec(day) {
    if (!DATA[day]) DATA[day] = { t: [], n: '' };
    return DATA[day];
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  var raw = dataEl.textContent || '';
  var anchorRe = /\d{4}-\d{2}-\d{2}\|/g;
  var anchors = [];
  var m;
  while ((m = anchorRe.exec(raw)) !== null) anchors.push(m.index);

  for (var i = 0; i < anchors.length; i++) {
    var s = anchors[i];
    var e = (i + 1 < anchors.length) ? anchors[i + 1] : raw.length;
    var day = raw.slice(s, s + 10);
    var content = raw.slice(s + 11, e).replace(/^\s+|\s+$/g, '');
    var r = rec(day);

    var hash = content.indexOf('#');
    var taskPart = hash >= 0 ? content.slice(0, hash) : content;
    if (hash >= 0) r.n = content.slice(hash + 1).replace(/#/g, '').replace(/^\s+|\s+$/g, '');

    var toks = taskPart.split(',');
    for (var j = 0; j < toks.length; j++) {
      var name = toks[j].replace(/^\s+|\s+$/g, '');
      if (name && r.t.indexOf(name) < 0) r.t.push(name);
    }
  }

  /* ---- visible diagnostics: island present but nothing parsed ---- */
  var parsedDays = 0, d;
  for (d in DATA) {
    if (Object.prototype.hasOwnProperty.call(DATA, d) && (DATA[d].t.length || DATA[d].n)) parsedDays++;
  }
  if (raw.replace(/\s+/g, '').length === 0) {
    yearsEl.innerHTML = '<div class="ct-err">tracker island is empty — is _data/tracker/records.yml in the build?</div>';
    return;
  }
  if (anchors.length === 0 || parsedDays === 0) {
    yearsEl.innerHTML = '<div class="ct-err">no entries parsed — island received: [' +
      raw.replace(/\s+/g, ' ').slice(0, 160) + ']</div>';
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
  function keyOf(d2) { return d2.getUTCFullYear() + '-' + pad(d2.getUTCMonth() + 1) + '-' + pad(d2.getUTCDate()); }

  /* "today" in Asia/Shanghai (UTC+8, no DST) — live in the visitor's browser */
  var TODAY = keyOf(new Date(Date.now() + 8 * 3600 * 1000));
  var CURRENT_YEAR = parseInt(TODAY.slice(0, 4), 10);

  /* ---- markup for one year's grid (Sunday-first weeks, GitHub layout) ---- */
  function yearHTML(y) {
    var yStart = y + '-01-01';
    var yEnd = y + '-12-31';
    var cells = [];
    var cur = new Date(Date.UTC(y, 0, 1));
    cur.setUTCDate(1 - cur.getUTCDay());
    var end = new Date(Date.UTC(y, 11, 31));
    while (cur <= end) {
      var k = keyOf(cur);
      cells.push((k < yStart || k > yEnd) ? null : k);
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    while (cells.length % 7 !== 0) cells.push(null);
    var cols = cells.length / 7;

    var html = '<div class="ct-year-view">';
    html += '<div class="ct-year-lab">' + y + '</div>';
    html += '<div class="ct-grid" style="grid-template-columns:26px repeat(' + cols + ',10px)">';

    var mm, ii, first, col, row, dayKey, entry, count, bg;
    for (mm = 0; mm < 12; mm++) {
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
    html += '<span class="ct-lab" style="grid-column:1;grid-row:3">Mon</span>' +
            '<span class="ct-lab" style="grid-column:1;grid-row:5">Wed</span>' +
            '<span class="ct-lab" style="grid-column:1;grid-row:7">Fri</span>';

    for (ii = 0; ii < cells.length; ii++) {
      dayKey = cells[ii];
      if (!dayKey) continue;
      col = Math.floor(ii / 7) + 2;
      row = (ii % 7) + 2;
      entry = DATA[dayKey];
      count = entry ? entry.t.length : 0;
      if (dayKey < START) bg = '#ffffff';
      else if (dayKey > TODAY) bg = '#cdd5dc';
      else bg = COLORS[Math.min(count, 4)];
      html += '<div class="ct-cell' + (dayKey === TODAY ? ' ct-today' : '') +
              '" data-day="' + dayKey +
              '" style="background:' + bg + ';grid-column:' + col + ';grid-row:' + row + '"></div>';
    }
    html += '</div></div>';
    return html;
  }

  /* ---- year pills (top-right corner): default = current year ---- */
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

  /* ---- tooltip: hover to follow, click to pin; tasks + note ---- */
  function tipHTML(day) {
    var d2 = new Date(day + 'T00:00:00Z');
    var head = day + ' (' + DOWS[d2.getUTCDay()] + ')';
    if (day < START) return head + '<br><span class="no">before tracker start</span>';
    if (day > TODAY) return head + '<br><span class="no">upcoming</span>';
    var r2 = DATA[day];
    var entry = r2 ? r2.t : [];
    var lines = '';
    for (var jj = 0; jj < TASKS.length; jj++) {
      var done = entry.indexOf(TASKS[jj]) >= 0;
      lines += '<span class="' + (done ? 'ok' : 'no') + '">' + (done ? '\u2713' : '\u2717') + ' ' + TASKS[jj] + '</span>&nbsp;&nbsp;';
    }
    var html = head + '<br>' + lines + '<br><b>' + entry.length + '/4</b>' + (entry.length === 4 ? ' &nbsp;perfect!' : '');
    if (r2 && r2.n) html += '<br><span class="note">\u201c' + esc(r2.n) + '\u201d</span>';
    return html;
  }

  function showTip(cell, x, y) {
    tip.innerHTML = tipHTML(cell.getAttribute('data-day'));
    tip.style.display = 'block';
    var r3 = tip.getBoundingClientRect();
    var left = x + 14;
    if (left + r3.width > window.innerWidth - 8) left = x - r3.width - 14;
    var top = y - r3.height - 10;
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

  /* ---- stats (all years); a "logged" day = a day with >= 1 task ---- */
  var logged = 0, tasksSum = 0, perfect = 0, k2, v;
  for (k2 in DATA) {
    if (!Object.prototype.hasOwnProperty.call(DATA, k2)) continue;
    v = DATA[k2];
    if (v.t.length > 0) {
      logged++;
      tasksSum += v.t.length;
      if (v.t.length === 4) perfect++;
    }
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

  /* ---- sync the 365-day progress bar ----
     Numerator = days since START on which the BAR_TASK task was logged.
     Set BAR_TASK to re-target the bar: 'study', 'exercise', 'diet', 'sleep'
     (or '' for "any task at all"). */
  var BAR_TASK = 'study';
  var pFill = document.getElementById('pbar-fill');
  if (pFill) {
    function setText(id, str) {
      var el = document.getElementById(id);
      if (el) el.textContent = str;
    }

    var counted = 0;
    for (var dk in DATA) {
      if (!Object.prototype.hasOwnProperty.call(DATA, dk)) continue;
      if (dk < START) continue;
      if (!BAR_TASK) {
        if (DATA[dk].t.length > 0) counted++;
      } else if (DATA[dk].t.indexOf(BAR_TASK) >= 0) {
        counted++;
      }
    }
    if (counted > TOTAL_DAYS) counted = TOTAL_DAYS;

    pFill.style.width = (counted * 100 / TOTAL_DAYS) + '%';
    pFill.style.minWidth = counted > 0 ? '2px' : '0';

    var ds = String(counted);
    while (ds.length < 3) ds = '0' + ds;
    var pctVal = Math.round(counted * 10000 / TOTAL_DAYS) / 100; // 0, 0.27, ..., 100

    setText('pbar-day', ds + '/' + TOTAL_DAYS);
    setText('pbar-pct', pctVal + '%');
    setText('pbar-remaining', (TOTAL_DAYS - counted) + 'd to go');

    /* live Beijing-time clock: proof the script ran */
    var bj = new Date(Date.now() + 8 * 3600 * 1000);
    setText('pbar-clock', bj.getUTCFullYear() + '-' + pad(bj.getUTCMonth() + 1) + '-' +
      pad(bj.getUTCDate()) + ' ' + pad(bj.getUTCHours()) + ':' + pad(bj.getUTCMinutes()) + ' Beijing');
  }
})();