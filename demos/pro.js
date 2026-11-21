/* BANSUK AI — shared core for the extended demos.
   Every farm, vehicle, titer, score and event below is fabricated demonstration data. */
'use strict';
const PRO = (function () {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function rng(seed) { let a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const R = rng(20261118);
  const pick = (arr, r = R) => arr[Math.floor(r() * arr.length)];
  const gauss = (r = R) => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  // Poultry-dense areas (real place names, fabricated farms)
  const CLUSTERS = [
    ['충북 음성', 127.69, 36.94, 9], ['충북 진천', 127.43, 36.86, 7], ['경기 안성', 127.28, 37.01, 6], ['경기 이천', 127.44, 37.27, 4],
    ['충남 천안', 127.15, 36.81, 6], ['충남 아산', 127.00, 36.79, 3], ['충남 논산', 127.10, 36.19, 4], ['충남 홍성', 126.66, 36.60, 4],
    ['전북 김제', 126.88, 35.80, 5], ['전북 익산', 126.95, 35.95, 4], ['전북 정읍', 126.86, 35.57, 4], ['전남 나주', 126.71, 35.02, 5],
    ['전남 영암', 126.70, 34.80, 4], ['경북 상주', 128.16, 36.41, 3], ['경북 경주', 129.22, 35.85, 3], ['경남 함안', 128.41, 35.27, 3], ['경기 포천', 127.20, 37.89, 3]
  ];
  const TYPES = [['산란계', 0.42], ['육계', 0.28], ['오리', 0.18], ['종계', 0.12]];
  function farmType(r) { let x = r(), s = 0; for (const [t, p] of TYPES) { s += p; if (x < s) return t; } return '산란계'; }
  const HEADS = { 산란계: [60000, 350000], 육계: [40000, 160000], 오리: [10000, 40000], 종계: [15000, 60000] };
  const FARMS = [];
  CLUSTERS.forEach(([region, lon, lat, n], ci) => {
    for (let i = 0; i < n; i++) {
      const t = farmType(R); const [a, b] = HEADS[t];
      FARMS.push({ id: 'F' + String(FARMS.length + 1).padStart(3, '0'), name: '가상농장 ' + region.split(' ')[1] + '-' + String(i + 1).padStart(2, '0'), region, prov: region.split(' ')[0], type: t,
        heads: Math.round((a + R() * (b - a)) / 1000) * 1000, lon: lon + gauss() * 0.06, lat: lat + gauss() * 0.045, risk: Math.round(18 + R() * 70), insp: Math.round(62 + R() * 38) });
    }
  });


  // 11 veterinarians (fabricated names/roles for the demo)
  const VETS = [
    ['V01', '가상 수의사 01', '판독·승인', '분자진단(PCR)'], ['V02', '가상 수의사 02', '판독·승인', '분자진단(PCR)'],
    ['V03', '가상 수의사 03', '판독·승인', '혈청(HI·ELISA)'], ['V04', '가상 수의사 04', '판독·승인', '혈청(HI·ELISA)'],
    ['V05', '가상 수의사 05', '병성감정', '부검·병리'], ['V06', '가상 수의사 06', '병성감정', '세균·배양'],
    ['V07', '가상 수의사 07', '현장 진료', '산란계'], ['V08', '가상 수의사 08', '현장 진료', '육계·종계'],
    ['V09', '가상 수의사 09', '현장 진료', '오리'], ['V10', '가상 수의사 10', '컨설팅·교육', '차단방역'],
    ['V11', '가상 수의사 11', '품질책임(QA)', '정도관리·승인']
  ].map(([id, name, role, spec]) => ({ id, name, role, spec }));
  // Haversine km
  function km(a, b) { const R0 = 6371, t = Math.PI / 180; const dLat = (b.lat - a.lat) * t, dLon = (b.lon - a.lon) * t; const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dLon / 2) ** 2; return 2 * R0 * Math.asin(Math.sqrt(h)); }

  // ---------- Map ----------
  function bbox(lon0, lat0, lon1, lat1) { const K = window.KOREA; const [x0, y0] = K.project(lon0, lat1), [x1, y1] = K.project(lon1, lat0); return [x0, y0, x1 - x0, y1 - y0]; }
  function mapBase(vb, opts = {}) {
    const K = window.KOREA; const scale = vb[2] / K.w; const lw = Math.max(.25, scale * 1.1);
    const labels = opts.labels === false ? '' : K.provinces.map(p => `<text class="prov-label" x="${p.c[0]}" y="${p.c[1]}" style="font-size:${Math.max(3, 11 * scale)}px">${esc(p.n)}</text>`).join('');
    return `<g>${K.provinces.map(p => `<path class="prov" d="${p.d}" style="stroke-width:${lw}"><title>${esc(p.n)}</title></path>`).join('')}${labels}</g>`;
  }
  const P = (lon, lat) => window.KOREA.project(lon, lat);
  function svgPoint(svg, evt) { const pt = svg.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); }
  function unproject(x, y) { const K = window.KOREA; // invert linear projection using two reference points
    const [ax, ay] = K.project(126, 36), [bx, by] = K.project(127, 37); const lon = 126 + (x - ax) / (bx - ax), lat = 36 + (y - ay) / (by - ay); return [lon, lat]; }
  // degree→svg units per km at given latitude
  function kmToSvg(lat) { const [x0] = P(127, lat), [x1] = P(128, lat); return (x1 - x0) / (111.32 * Math.cos(lat * Math.PI / 180)); }

  // ---------- Charts ----------
  function lineChart({ series, labels, w = 640, h = 220, yMax, yMin = 0, yFmt = v => v, band, markers = [], threshold }) {
    const padL = 38, padR = 12, padT = 14, padB = 26; const n = labels.length; const iw = w - padL - padR, ih = h - padT - padB;
    const raw = Math.max(1, ...series.flatMap(s => s.values.filter(v => v != null)), ...(band ? band.hi : [])) * 1.08; const mag = Math.pow(10, Math.floor(Math.log10(raw))); const max = yMax ?? Math.ceil(raw / (mag / 2)) * (mag / 2); const X = i => padL + (n <= 1 ? 0 : i * iw / (n - 1)); const Y = v => padT + ih - (v - yMin) / (max - yMin) * ih;
    const ticks = 4; let g = '';
    for (let i = 0; i <= ticks; i++) { const v = yMin + (max - yMin) * i / ticks; g += `<line class="c-grid" x1="${padL}" x2="${w - padR}" y1="${Y(v)}" y2="${Y(v)}"/><text class="c-axis" x="${padL - 6}" y="${Y(v) + 3}" text-anchor="end">${yFmt(Math.round(v * 10) / 10)}</text>`; }
    const step = Math.ceil(n / 12); labels.forEach((l, i) => { if (i % step === 0 || i === n - 1) g += `<text class="c-axis" x="${X(i)}" y="${h - 8}" text-anchor="middle">${esc(l)}</text>`; });
    if (threshold != null) g += `<line x1="${padL}" x2="${w - padR}" y1="${Y(threshold.v)}" y2="${Y(threshold.v)}" stroke="${threshold.color || '#dc6477'}" stroke-dasharray="5 5" stroke-width="1.4"/><text x="${w - padR}" y="${Y(threshold.v) - 5}" text-anchor="end" class="c-axis" style="fill:${threshold.color || '#dc6477'};font-weight:700">${esc(threshold.label)}</text>`;
    if (band) g += `<polygon fill="${band.color}" opacity=".18" points="${band.hi.map((v, i) => X(i) + ',' + Y(v)).join(' ')} ${band.lo.map((v, i) => X(i) + ',' + Y(v)).reverse().join(' ')}"/>`;
    markers.forEach((m, mi) => { g += `<line x1="${X(m.i)}" x2="${X(m.i)}" y1="${padT}" y2="${padT + ih}" stroke="${m.color || '#7b61d1'}" stroke-dasharray="3 4"/><text x="${X(m.i) > w - 70 ? X(m.i) - 4 : X(m.i) + 4}" text-anchor="${X(m.i) > w - 70 ? 'end' : 'start'}" y="${padT + 10 + mi * 13}" class="c-axis" style="fill:${m.color || '#7b61d1'};font-weight:700">${esc(m.label)}</text>`; });
    series.forEach(s => { const segs = [[]]; s.values.forEach((v, i) => { if (v == null) { if (segs[segs.length - 1].length) segs.push([]); } else segs[segs.length - 1].push(X(i) + ',' + Y(v)); }); segs.filter(x => x.length).forEach(seg => { g += seg.length === 1 ? `<circle cx="${seg[0].split(',')[0]}" cy="${seg[0].split(',')[1]}" r="2.2" fill="${s.color}"/>` : `<polyline class="c-line" stroke="${s.color}" ${s.dash ? `stroke-dasharray="${s.dash}"` : ''} points="${seg.join(' ')}"/>`; }); if (s.dots) s.values.forEach((v, i) => { if (v != null) g += `<circle cx="${X(i)}" cy="${Y(v)}" r="3.4" fill="#fff" stroke="${s.color}" stroke-width="2"><title>${esc(labels[i])}: ${yFmt(v)}</title></circle>`; }); });
    return `<div class="chart-box"><svg viewBox="0 0 ${w} ${h}" role="img">${g}</svg></div>`;
  }
  function spark(values, color = '#2bb593', w = 70, h = 24) { const max = Math.max(...values), min = Math.min(...values); const pts = values.map((v, i) => `${i * w / (values.length - 1)},${h - 2 - (v - min) / (max - min || 1) * (h - 4)}`).join(' '); return `<svg class="spark" width="${w}" height="${h}"><polyline fill="none" stroke="${color}" stroke-width="1.8" points="${pts}"/></svg>`; }

  // ---------- UI shell ----------
  function toast(msg) { let el = document.getElementById('toast'); if (el) el.remove(); el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = msg; document.body.append(el); clearTimeout(toast.t); toast.t = setTimeout(() => el.remove(), 3200); }
  function download(name, content, type = 'text/plain;charset=utf-8') { const b = new Blob([content], { type }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 1500); }
  function csv(rows) { return '﻿' + rows.map(r => r.map(x => '"' + String(x ?? '').replaceAll('"', '""') + '"').join(',')).join('\r\n'); }
  function store(key, fallback) { try { const v = JSON.parse(localStorage.getItem('bansuk_pro_' + key)); return v ?? fallback; } catch { return fallback; } }
  function save(key, v) { try { localStorage.setItem('bansuk_pro_' + key, JSON.stringify(v)); } catch { } }
  function typewrite(el, text, speed = 6) { el.classList.add('typing'); el.textContent = ''; let i = 0; clearInterval(el._tw); el._tw = setInterval(() => { i += speed; el.textContent = text.slice(0, i); el.scrollTop = el.scrollHeight; if (i >= text.length) { clearInterval(el._tw); el.classList.remove('typing'); } }, 16); }

  function shell(cfg) {
    const root = document.getElementById('root');
    root.innerHTML = `<div class="app"><div class="mobile-overlay" id="mobileOverlay"></div><aside class="sidebar" id="sidebar"><a class="brand" href="../index.html#advanced"><span class="brand-symbol">✳</span><span class="brand-text"><strong>BANSUK / AI</strong><small>INTERACTIVE LAB</small></span></a><div class="side-scroll">${window.BANSUK_NAV.html(cfg.key)}</div><div class="sidebar-bottom"><p>모든 농장·차량·검사값은 가상의 시연 데이터입니다.</p><a href="../index.html#advanced">← 협업 제안서 돌아가기</a></div></aside><div class="content"><header class="topbar"><div class="contact-row"><button class="btn btn-tiny mobile-menu" id="mobileMenu" type="button" aria-label="메뉴 열기">☰</button><div class="crumb">BANSUK AI / ADVANCED / <b>${esc(cfg.code)}</b></div></div><div class="top-right"><span class="demo-chip">● SAMPLE DATA ONLY</span><button class="btn btn-tiny" id="proShare" type="button">↗ 링크 공유</button>${cfg.reset ? '<button class="btn btn-tiny" id="proReset" type="button">↺ 초기화</button>' : ''}</div></header><main class="main"><section class="page-intro"><div><div class="eyebrow">ADVANCED DEMO / ${esc(cfg.code)}</div><h1>${esc(cfg.title)}</h1><p>${cfg.subtitle}</p></div><div class="toolbar">${cfg.toolbar || ''}</div></section><div class="demo-note"><span>ⓘ</span><div><b>시연 전용 환경</b> · ${cfg.note || '모든 농장명, 좌표, 검사값, 점수는 임의로 만든 더미데이터입니다. 실제 AI 추론·행정 시스템·법정 신고와 연결되지 않으며 수의사 판단을 대신하지 않습니다.'}</div></div><section id="proBody" aria-live="polite"></section></main><footer class="footer"><span>© 2026 BANSUK AI — Concept prototype for discussion</span><span>가상 데이터 · 브라우저 내 계산 · 비운영 서비스</span></footer></div></div>`;
    document.addEventListener('click', e => {
      const t = e.target.closest('button,a'); if (!t) return;
      if (t.id === 'mobileMenu') { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('mobileOverlay').classList.toggle('visible'); }
      if (t.id === 'proShare') { navigator.clipboard?.writeText(location.href).then(() => toast('데모 링크를 복사했습니다.'), () => toast(location.href)); }
      if (t.id === 'proReset' && cfg.reset) { cfg.reset(); toast('시연 데이터를 초기 상태로 되돌렸습니다.'); }
    });
    document.getElementById('mobileOverlay').addEventListener('click', () => { document.getElementById('sidebar').classList.remove('open'); document.getElementById('mobileOverlay').classList.remove('visible'); });
    return document.getElementById('proBody');
  }
  const fmt = n => Number(n).toLocaleString('ko-KR');
  const typeColor = { 산란계: '#2bb593', 육계: '#f0a63a', 오리: '#4a8de0', 종계: '#9a6fe0' };
  return { VETS, esc, rng, R, pick, gauss, FARMS, CLUSTERS, km, bbox, mapBase, P, svgPoint, unproject, kmToSvg, lineChart, spark, toast, download, csv, store, save, typewrite, shell, fmt, typeColor };
})();
