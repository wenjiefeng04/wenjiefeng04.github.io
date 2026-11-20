/* Multi-year contribution-style tracker (2026 .. current year).
   Data: JSON island #ct-data, rendered by Jekyll from _data/tracker/records.yml.
   Pure client-side: year grids, colors, tooltips, stats, Beijing-time "today". */
(function () {
  'use strict';
  var dataEl = document.getElementById('ct-data');
  var yearsEl = document.getElementById('ct-years');
  if (!dataEl || !yearsEl) return;

  var DATA = null;
  var raw = dataEl.textContent || '';
  try {
    DATA = JSON.parse(raw);
  } catch (e) {
    /* visible debug: show the parser error AND the raw text the pipeline delivered */
    var snippet = raw.replace(/\s+/g, ' ').slice(0, 200);
    yearsEl.innerHTML = '<div class="ct-err">tracker data failed to parse: ' + e.message +
      '<br>raw received: [' + snippet + ']</div>';
    return;
  }
  if (!DATA || typeof DATA !== 'object') DATA = {};

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

  // ---------- build one grid section per year, START_YEAR..CURRENT_YEAR ----------
  var html = '';
  var y, cells, cur, end, i, m, first, col, row, day, entry, count, bg;
  for (y = START_YEAR; y <= CURRENT_YEAR; y++) {
    var yStart = y + '-01-01';
    var yEnd = y + '-12-31';

    // cells: from the Sunday on/before Jan 1 to the Saturday after Dec 31
    cells = [];
    cur = new Date(Date.UTC(y, 0, 1));
    cur.setUTCDate(1 - cur.getUTCDay());           // back up to Sunday
    end = new Date(Date.UTC(y, 11, 31));
    while (cur <= end) {
      var k = keyOf(cur);
      cells.push((k < yStart || k > yEnd) ? null : k);
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    while (cells.length % 7 !== 0) cells.push(null); // pad to whole weeks
    var cols = cells.length / 7;                    // 53 or 54, per year

    html += '<div class="ct-year-block">';
    html += '<div class="ct-year-lab">' + y + '</div>';
    html += '<div class="ct-grid" style="grid-template-columns:26px repeat(' + cols + ',10px)">';

    // month labels: first week that contains each month
    for (m = 0; m < 12; m++) {
      var prefix = y + '-' + pad(m + 1) + '-';
      first = -1;
      for (i = 0; i < cells.length; i++) {
        if (cells[i] && cells[i].indexOf(prefix) === 0) { first = i; break; }
      }
      if (first >= 0) {
        col = Math.floor(first / 7) + 2;
        html += '<span class="ct-lab" style="grid-column:' + col + ';grid-row:1">' + MONTHS[m] + '</span>';
      }
    }
    // weekday labels (row 2..8 = Sun..Sat → Mon=3, Wed=5, Fri=7)
    html += '<span class="ct-lab" style="grid-column:1;grid-row:3">Mon</span>' +
            '<span class="ct-lab" style="grid-column:1;grid-row:5">Wed</span>' +
            '<span class="ct-lab" style="grid-column:1;grid-row:7">Fri</span>';

    // day cells: index i → week floor(i/7), weekday i%7 (0=Sun)
    for (i = 0; i < cells.length; i++) {
      day = cells[i];
      if (!day) continue;
      col = Math.floor(i / 7) + 2;
      row = (i % 7) + 2;
      entry = DATA[day];
      count = entry && entry.length ? entry.length : 0;
      if (day < START) bg = '#ffffff';             // before 2026-11-20
      else if (day > TODAY) bg = '#cdd5dc';        // upcoming
      else bg = COLORS[Math.min(count, 4)];        // yellow + 4 green shades
      html += '<div class="ct-cell' + (day === TODAY ? ' ct-today' : '') +
              '" data-day="' + day +
              '" style="background:' + bg + ';grid-column:' + col + ';grid-row:' + row + '"></div>';
    }
    html += '</div></div>';
  }
  yearsEl.innerHTML = html;

  // ---------- tooltip (hover to follow, click to pin) ----------
  function tipHTML(day) {
    var d = new Date(day + 'T00:00:00Z');
    var head = day + ' (' + DOWS[d.getUTCDay()] + ')';
    if (day < START) return head + '<br><span class="no">before tracker start</span>';
    if (day > TODAY) return head + '<br><span class="no">upcoming</span>';
    var entry = DATA[day] || [];
    var lines = '';
    for (var j = 0; j < TASKS.length; j++) {
      var done = entry.indexOf(TASKS[j]) >= 0;
      lines += '<span class="' + (done ? 'ok' : 'no') + '">' + (done ? '\u2713' : '\u2717') + ' ' + TASKS[j] + '</span>&nbsp;&nbsp;';
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
  var logged = 0, tasks = 0, perfect = 0, k2, v;
  for (k2 in DATA) {
    if (!Object.prototype.hasOwnProperty.call(DATA, k2)) continue;
    v = DATA[k2];
    if (v && typeof v.length === 'number') {
      logged++;
      tasks += v.length;
      if (v.length === 4) perfect++;
    }
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
  stats.textContent = logged + 'd logged \u00b7 ' + tasks + ' tasks \u00b7 ' +
                      perfect + ' perfect \u00b7 streak ' + streak + 'd';
})();