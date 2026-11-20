/* Multi-year contribution-style tracker (2026 .. current year).
   Data: plain-text island #ct-data, rendered by Jekyll from _data/tracker/records.yml.
   Format per entry: YYYY-MM-DD|task,task,task   (one per line, any whitespace around).
   Pure client-side: year grids, colors, tooltips, stats, Beijing-time "today". */
(function () {
  'use strict';
  var dataEl = document.getElementById('ct-data');
  var yearsEl = document.getElementById('ct-years');
  if (!dataEl || !yearsEl) return;

  /* parse entries out of the raw text — immune to whitespace collapsing/concatenation,
     because task names contain only letters and commas (regex stops at digits/other chars) */
  var DATA = {};
  var raw = dataEl.textContent || '';
  var entries = raw.match(/\d{4}-\d{2}-\d{2}\|[A-Za-z,]*/g) || [];
  for (var i = 0; i < entries.length; i++) {
    var m = entries[i];
    var sep = m.indexOf('|');
    var day = m.slice(0, sep);
    var tasks = m.slice(sep + 1);
    var arr = [];
    if (tasks) {
      var parts = tasks.split(',');
      for (var j = 0; j < parts.length; j++) {
        var t = parts[j].replace(/^\s+|\s+$/g, '');
        if (t) arr.push(t);
      }
    }
    DATA[day] = arr;
  }
  if (raw.replace(/\s+/g, '').length === 0) {
    yearsEl.innerHTML = '<div class="ct-err">tracker island is empty — is _data/tracker/records.yml in the build?</div>';
    return;
  }

  var START = '2026-11-20';
  var START_YEAR = 2026;
  var TASKS = ['exercise', 'study', 'diet', 'sleep'];
  var COLORS = ['#eac54f', '#9be9a8', '#40c463', '#30a14e', '#216e39'];
  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var DOWS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var wrap = document.getElementById('ct-2026');
  var tip = document.getElementById('ct-tip');
  var stats = document.getElementById('ct-stats');

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function keyOf(d) { return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }

  // "today" in Asia/Shanghai (UTC+8, no DST) — live in the visitor's browser
  var TODAY = keyOf(new Date(Date.now() + 8 * 3600 * 1000));
  var CURRENT_YEAR = parseInt(TODAY.slice(0, 4), 10);

  // ---------- one grid section per year, START_YEAR..CURRENT_YEAR ----------
  var html = '', y, cells, cur, end, ii, mm, first, col, row, day, entry, count, bg;
  for (y = START_YEAR; y <= CURRENT_YEAR; y++) {
    var yStart = y + '-01-01';
    var yEnd = y + '-12-31';

    // cells: Sunday on/before Jan 1 .. Saturday after Dec 31
    cells = [];
    cur = new Date(Date.UTC(y, 0, 1));
    cur.setUTCDate(1 - cur.getUTCDay());           // back up to Sunday (underflows to Dec of prior year correctly)
    end = new Date(Date.UTC(y, 11, 31));
    while (cur <= end) {
      var k = keyOf(cur);
      cells.push((k < yStart || k > yEnd) ? null : k);
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    while (cells.length % 7 !== 0) cells.push(null); // pad to whole weeks
    var cols = cells.length / 7;                    // 53 or 54 depending on year/leap

    html += '<div class="ct-year-block">';
    html += '<div class="ct-year-lab">' + y + '</div>';
    html += '<div class="ct-grid" style="grid-template-columns:26px repeat(' + cols + ',10px)">';

    // month labels: week containing the 1st of each month
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
    // weekday labels: rows 2..8 = Sun..Sat, so Mon=3, Wed=5, Fri=7
    html += '<span class="ct-lab" style="grid-column:1;grid-row:3">Mon</span>' +
            '<span class="ct-lab" style="grid-column:1;grid-row:5">Wed</span>' +
            '<span class="ct-lab" style="grid-column:1;grid-row:7">Fri</span>';

    // day cells: index ii → week floor(ii/7), weekday ii%7 (0=Sun)
    for (ii = 0; ii < cells.length; ii++) {
      day = cells[ii];
      if (!day) continue;
      col = Math.floor(ii / 7) + 2;
      row = (ii % 7) + 2;
      entry = DATA[day];
      count = entry ? entry.length : 0;
      if (day < START) bg = '#ffffff';              // before 2026-11-20
      else if (day > TODAY) bg = '#cdd5dc';         // upcoming
      else bg = COLORS[Math.min(count, 4)];         // yellow + 4 green shades
      html += '<div class="ct-cell' + (day === TODAY ? ' ct-today' : '') +
              '" data-day="' + day +
              '" style="background:' + bg + ';grid-column:' + col + ';grid-row:' + row + '"></div>';
    }
    html += '</div></div>';
  }
  yearsEl.innerHTML = html;

  // ---------- tooltip: hover to follow, click to pin ----------
  function tipHTML(day) {
    var d = new Date(day + 'T00:00:00Z');
    var head = day + ' (' + DOWS[d.getUTCDay()] + ')';
    if (day < START) return head + '<br><span class="no">before tracker start</span>';
    if (day > TODAY) return head + '<br><span class="no">upcoming</span>';
    var entry = DATA[day] || [];
    var lines = '';
    for (var jj = 0; jj < TASKS.length; jj++) {
      var done = entry.indexOf(TASKS[jj]) >= 0;
      lines += '<span class="' + (done ? 'ok' : 'no') + '">' + (done ? '\u2713' : '\u2717') + ' ' + TASKS[jj] + '</span>&nbsp;&nbsp;';
    }
    return head + '<br>' + lines + '<br><b>' + entry.length + '/4</b>' + (entry.length === 4 ? ' &nbsp;perfect!' : '');
  }

  var pinned = null;
  function showTip(cell, x, y) {
    tip.innerHTML = tipHTML(cell.getAttribute('data-day'));
    tip.style.display = 'block';
    var r = tip.getBoundingClientRect();
    var left = x + 14;
    if (left + r.width > window.innerWidth - 8) left = x - r.width - 14;
    var top = y - r.height - 10;
    if (top < 8) top = y + 18;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }
  function hideTip() { if (!pinned) tip.style.display = 'none'; }
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
    if (cell) showTip(cell, e.clientX, e.clientY); else hideTip();
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

  // ---------- stats (all years) ----------
  var logged = 0, tasksSum = 0, perfect = 0, k2, v;
  for (k2 in DATA) {
    if (!Object.prototype.hasOwnProperty.call(DATA, k2)) continue;
    v = DATA[k2];
    logged++;
    tasksSum += v.length;
    if (v.length === 4) perfect++;
  }
  var streak = 0;
  var probe = new Date(TODAY + 'T00:00:00Z');
  while (true) {
    var pk = keyOf(probe);
    if (pk < START) break;
    var pe = DATA[pk];
    if (pe && pe.length > 0) { streak++; probe.setUTCDate(probe.getUTCDate() - 1); }
    else break;
  }
  stats.textContent = logged + 'd logged \u00b7 ' + tasksSum + ' tasks \u00b7 ' +
                      perfect + ' perfect \u00b7 streak ' + streak + 'd';
})();