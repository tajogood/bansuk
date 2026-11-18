/* 10 시료 수거 경로 최적화 — sweep clustering + nearest-neighbour + 2-opt on fabricated requests. */
(function () {
  const { esc, rng, FARMS, mapBase, P, bbox, km, toast, download, csv, shell, fmt, store, save } = PRO;
  const DEPOT = { id: 'LAB', name: '가상 검사센터 (음성)', lon: 127.62, lat: 36.935 };
  const AREA = FARMS.filter(f => ['경기', '충북', '충남'].includes(f.prov) && f.lat > 36.45 && f.lat < 37.4);
  const COLORS = ['#0e806b', '#2c7fd0', '#e08a1e', '#9a4fd6'];
  const ROAD = 1.32, SPEED = 52, SERVICE = 15, START = 8 * 60 + 30;
  function seed() { const r = rng(1010); const pool = AREA.slice().sort(() => r() - .5).slice(0, 16); return pool.map((f, i) => ({ id: f.id, samples: [20, 20, 30, 40, 10, 60][Math.floor(r() * 6)], urgent: r() < .22, order: i })); }
  const queue = store('portal_pickups', []);
  const S = { reqs: store('route_reqs', null) || seed(), vehicles: 3, cap: 180, limit: 240, showBase: false, plan: null };
  // Contacts queued from the tracing demo become urgent pickups
  let imported = 0; queue.forEach(q => { if (AREA.some(f => f.id === q.id) && !S.reqs.some(x => x.id === q.id)) { S.reqs.push({ id: q.id, samples: q.samples || 20, urgent: !!q.urgent, order: S.reqs.length, fromPortal: q.req }); imported++; } });
  const F = id => id === 'LAB' ? DEPOT : AREA.find(f => f.id === id);
  const dist = (a, b) => km(F(a), F(b)) * ROAD;
  const persist = () => save('route_reqs', S.reqs);

  const body = shell({
    key: 'route', code: 'SAMPLE LOGISTICS', title: '시료 수거 경로 최적화',
    subtitle: '고객 포털로 들어온 방문 수거 요청의 시료량·긴급도·<b>콜드체인 허용시간</b>을 반영해 차량별 최적 경로를 계산하고, 접수 순서대로 도는 기존 방식과 거리·시간·탄소배출을 비교합니다.',
    toolbar: '<button class="btn" id="rtBase" type="button">◌ 기존 경로 겹쳐보기</button><button class="btn" id="rtCsv" type="button">↓ 배차표 CSV</button><button class="btn btn-primary" id="rtRun" type="button">⇄ 경로 최적화</button>',
    reset: () => { localStorage.removeItem('bansuk_pro_route_reqs'); localStorage.removeItem('bansuk_pro_portal_pickups'); S.reqs = seed(); S.plan = null; optimize(); },
    note: '농장 위치·수거 요청은 가상이며, 거리는 직선거리×1.32 도로계수로 근사합니다. 실서비스에서는 도로망 API·실시간 교통·차량 냉장 온도 로그를 연동합니다.'
  });

  function routeStats(route) { let t = START, d = 0, prev = 'LAB', samples = 0; const stops = []; route.forEach(id => { const leg = dist(prev, id); d += leg; t += leg / SPEED * 60; const req = S.reqs.find(x => x.id === id); stops.push({ id, eta: t, leg, samples: req.samples, urgent: req.urgent }); samples += req.samples; t += SERVICE; prev = id; }); const back = dist(prev, 'LAB'); d += back; t += back / SPEED * 60; stops.forEach(s => s.hold = t - s.eta); const viol = stops.filter(s => s.hold > S.limit).length; const urgentLate = stops.filter(s => s.urgent && s.eta > START + 150).length; return { stops, d, end: t, samples, viol, urgentLate }; }
  function cost(route) { const st = routeStats(route); return st.d + st.viol * 40 + st.urgentLate * 25 + Math.max(0, st.samples - S.cap) * 2 + st.stops.reduce((s, x) => s + (x.urgent ? (x.eta - START) / 60 * 6 : 0), 0); }
  function twoOpt(route) { let best = route.slice(), bc = cost(best), improved = true, guard = 0; while (improved && guard++ < 60) { improved = false; for (let i = 0; i < best.length - 1; i++) for (let k = i + 1; k < best.length; k++) { const cand = best.slice(0, i).concat(best.slice(i, k + 1).reverse(), best.slice(k + 1)); const c = cost(cand); if (c < bc - 1e-6) { best = cand; bc = c; improved = true; } } } return best; }
  function nn(ids) { const left = ids.slice(); const out = []; let cur = 'LAB'; while (left.length) { left.sort((a, b) => (dist(cur, a) - (S.reqs.find(x => x.id === a).urgent ? 25 : 0)) - (dist(cur, b) - (S.reqs.find(x => x.id === b).urgent ? 25 : 0))); cur = left.shift(); out.push(cur); } return out; }
  function sweep() { const ang = id => Math.atan2(F(id).lat - DEPOT.lat, (F(id).lon - DEPOT.lon) * .81); const ids = S.reqs.map(x => x.id).sort((a, b) => ang(a) - ang(b)); const total = S.reqs.reduce((s, x) => s + x.samples, 0); const per = total / S.vehicles; let best = null;
    for (let off = 0; off < ids.length; off++) { const rot = ids.slice(off).concat(ids.slice(0, off)); const groups = Array.from({ length: S.vehicles }, () => []); let g = 0, acc = 0; rot.forEach(id => { const s = S.reqs.find(x => x.id === id).samples; if (acc + s / 2 > per * (g + 1) && g < S.vehicles - 1) g++; acc += s; groups[g].push(id); }); const routes = groups.map(gr => twoOpt(nn(gr))); const c = routes.reduce((s, r) => s + cost(r), 0); if (!best || c < best.c) best = { c, routes }; if (ids.length > 14 && off > 6) break; }
    return best.routes; }
  function baseline() { const sorted = S.reqs.slice().sort((a, b) => a.order - b.order); const groups = Array.from({ length: S.vehicles }, () => []); sorted.forEach((x, i) => groups[i % S.vehicles].push(x.id)); return groups; }
  function optimize() { const t0 = performance.now(); const opt = sweep().map(routeStats), base = baseline().map(routeStats); S.plan = { opt, base, ms: Math.round(performance.now() - t0) }; render(); }
  const sum = (arr, k) => arr.reduce((s, x) => s + x[k], 0);
  const tStr = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(Math.round(m % 60)).padStart(2, '0');

  function mapSvg() {
    const vb = bbox(126.45, 36.42, 127.98, 37.42); const k = vb[2] / 300; const [dx, dy] = P(DEPOT.lon, DEPOT.lat); let g = mapBase(vb);
    const reqIds = new Set(S.reqs.map(x => x.id));
    AREA.filter(f => !reqIds.has(f.id)).forEach(f => { const [x, y] = P(f.lon, f.lat); g += `<g class="farm-dot" data-addreq="${f.id}"><circle cx="${x}" cy="${y}" r="${2 * k}" fill="#fff" stroke="#9fb1bd" stroke-width="${.7 * k}"><title>${esc(f.name)} — 클릭하여 수거 요청 추가</title></circle></g>`; });
    const line = (st, color, dash) => { const pts = [[dx, dy], ...st.stops.map(s => P(F(s.id).lon, F(s.id).lat)), [dx, dy]]; return `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="${(dash ? .7 : 1.2) * k}" stroke-linejoin="round" ${dash ? `stroke-dasharray="${2 * k} ${1.6 * k}" stroke-opacity=".6"` : 'stroke-opacity=".9"'}/>`; };
    if (S.plan) { if (S.showBase) S.plan.base.forEach(st => g += line(st, '#c2394f', true)); S.plan.opt.forEach((st, vi) => g += line(st, COLORS[vi], false)); S.plan.opt.forEach((st, vi) => st.stops.forEach((s, i) => { const [x, y] = P(F(s.id).lon, F(s.id).lat); g += `<g class="farm-dot" data-delreq="${s.id}"><circle cx="${x}" cy="${y}" r="${3.3 * k}" fill="${COLORS[vi]}" stroke="${s.urgent ? '#c2394f' : '#fff'}" stroke-width="${(s.urgent ? 1.1 : .7) * k}"><title>${esc(F(s.id).name)} · ${s.samples}수${s.urgent ? ' · 긴급' : ''} · 도착 ${tStr(s.eta)} — 클릭하여 요청 삭제</title></circle><text x="${x}" y="${y + 1.2 * k}" text-anchor="middle" style="font-size:${3.2 * k}px;font-weight:800;fill:#fff;pointer-events:none">${i + 1}</text></g>`; })); }
    g += `<rect x="${dx - 4.2 * k}" y="${dy - 4.2 * k}" width="${8.4 * k}" height="${8.4 * k}" rx="${1.6 * k}" fill="#10283b"/><text x="${dx}" y="${dy + 1.3 * k}" text-anchor="middle" style="font-size:${4 * k}px;fill:#55e5ba;font-weight:800">✳</text><text x="${dx}" y="${dy + 9 * k}" text-anchor="middle" style="font-size:${3.6 * k}px;font-weight:800;fill:#10283b;paint-order:stroke;stroke:#fff;stroke-width:${k}px">검사센터</text>`;
    return `<svg viewBox="${vb.join(' ')}" role="img" aria-label="수거 경로 지도">${g}</svg>`;
  }
  function render() {
    const p = S.plan; const od = p ? sum(p.opt, 'd') : 0, bd = p ? sum(p.base, 'd') : 0; const ot = p ? Math.max(...p.opt.map(x => x.end)) : 0, bt = p ? Math.max(...p.base.map(x => x.end)) : 0; const ov = p ? sum(p.opt, 'viol') : 0, bv = p ? sum(p.base, 'viol') : 0; const totalS = S.reqs.reduce((s, x) => s + x.samples, 0);
    body.innerHTML = `${imported ? `<div class="flag blue" style="margin:0 0 16px"><i>↪</i><div><b>고객 포털에서 ${imported}건 연결됨</b>포털에서 접수된 방문 수거 요청을 노선에 추가했습니다.</div></div>` : ''}
    <div class="pro-kpis"><div class="pro-kpi"><small>수거 요청</small><b>${S.reqs.length}곳</b><em>시료 ${fmt(totalS)}수 · 긴급 ${S.reqs.filter(x => x.urgent).length}</em></div><div class="pro-kpi"><small>총 주행거리</small><b>${Math.round(od)}km</b><em>기존 ${Math.round(bd)}km 대비 −${bd ? Math.round((1 - od / bd) * 100) : 0}%</em></div><div class="pro-kpi"><small>전 차량 복귀</small><b>${p ? tStr(ot) : '—'}</b><em>기존 ${p ? tStr(bt) : '—'}</em></div><div class="pro-kpi ${ov ? 'alert' : ''}"><small>콜드체인 초과 시료</small><b>${ov}곳</b><em class="${bv ? 'down' : ''}">기존 ${bv}곳 · 허용 ${S.limit / 60}h</em></div><div class="pro-kpi"><small>CO₂ 절감</small><b>${Math.round((bd - od) * .26)}kg</b><em>1톤 냉장탑차 0.26kg/km 가정</em></div><div class="pro-kpi"><small>계산 시간</small><b>${p ? p.ms : 0}ms</b><em>스윕+2-opt · 브라우저</em></div></div>
    <div class="pro-grid pro-2"><div class="panel"><div class="panel-head"><div><h2>수거 경로</h2><div class="panel-sub">흰 점 클릭 = 요청 추가 · 번호 점 클릭 = 요청 삭제 · 붉은 테두리 = 긴급</div></div><div class="pro-inline">${p ? p.opt.map((_, i) => `<span class="pro-chip" style="color:${COLORS[i]}">● ${i + 1}호차</span>`).join('') : ''}${S.showBase ? '<span class="pro-chip red">┅ 기존</span>' : ''}</div></div><div class="pro-mapbox" id="rtMap">${mapSvg()}<div class="mapnote">경기·충청 일대 · 출발 08:30 · 정차당 ${SERVICE}분 · 평균 ${SPEED}km/h</div></div></div>
    <div class="panel"><div class="panel-head"><div><h2>배차 조건</h2><div class="panel-sub">값을 바꾸면 즉시 재계산</div></div><span class="pro-badge-ai">VRP SOLVER</span></div><div class="pro-controls"><label class="pro-field">운행 차량<span class="val">${S.vehicles}대</span><input type="range" id="rtVeh" min="1" max="4" value="${S.vehicles}"></label><label class="pro-field">차량당 적재 한도<span class="val">${S.cap}수</span><input type="range" id="rtCap" min="80" max="300" step="20" value="${S.cap}"></label><label class="pro-field">콜드체인 허용시간 (수거→입고)<span class="val">${S.limit / 60}h</span><input type="range" id="rtLim" min="120" max="360" step="30" value="${S.limit}"></label></div>
    <div class="compare" style="grid-template-columns:1fr 1fr;margin-top:16px"><div><small>최적화</small><b>${Math.round(od)}km</b><em>${p ? tStr(ot) : ''} 복귀 · 초과 ${ov}</em></div><div><small>접수순 (기존)</small><b>${Math.round(bd)}km</b><em class="bad">${p ? tStr(bt) : ''} 복귀 · 초과 ${bv}</em></div></div>
    <p class="pro-hint">목적함수 = 주행거리 + 콜드체인 초과 패널티 + 긴급 시료 지연 패널티 + 적재 초과 패널티. 실서비스는 OR-Tools 등 VRPTW 솔버와 도로망 거리행렬로 대체합니다.</p></div></div>
    <div class="pro-grid pro-row" style="grid-template-columns:repeat(${Math.min(S.vehicles, 4)},minmax(0,1fr))">${p ? p.opt.map((st, vi) => `<div class="panel"><div class="panel-head"><div><h2 style="color:${COLORS[vi]}">${vi + 1}호차</h2><div class="panel-sub">${st.stops.length}곳 · ${Math.round(st.d)}km · 시료 ${st.samples}수${st.samples > S.cap ? ' <b style="color:#c2394f">(적재 초과)</b>' : ''}</div></div><span class="pro-chip">${tStr(START)}→${tStr(st.end)}</span></div>${st.stops.map((s, i) => `<div class="route-stop"><span class="no" style="background:${COLORS[vi]}">${i + 1}</span><div><b>${esc(F(s.id).name)}</b>${s.urgent ? ' <span class="pro-chip red">긴급</span>' : ''}<br><small style="color:#7a8b9b">${s.samples}수 · +${s.leg.toFixed(1)}km · 보관 ${Math.round(s.hold)}분</small></div><b style="color:${s.hold > S.limit ? '#c2394f' : '#25384a'}">${tStr(s.eta)}</b></div>`).join('')}<div class="route-stop"><span class="no" style="background:#10283b">✳</span><div><b>검사센터 입고</b></div><b>${tStr(st.end)}</b></div></div>`).join('') : ''}</div>`;
  }
  body.addEventListener('input', e => { const v = +e.target.value; if (e.target.id === 'rtVeh') S.vehicles = v; else if (e.target.id === 'rtCap') S.cap = v; else if (e.target.id === 'rtLim') S.limit = v; else return; clearTimeout(S.t); S.t = setTimeout(optimize, 120); });
  document.addEventListener('click', e => {
    const t = e.target.closest('button,[data-addreq],[data-delreq]'); if (!t) return;
    if (t.dataset.addreq) { S.reqs.push({ id: t.dataset.addreq, samples: 20, urgent: false, order: S.reqs.length }); persist(); optimize(); toast(`${F(t.dataset.addreq).name} 수거 요청을 추가했습니다.`); return; }
    if (t.dataset.delreq) { if (S.reqs.length <= 2) return toast('요청은 최소 2건 이상이어야 합니다.'); S.reqs = S.reqs.filter(x => x.id !== t.dataset.delreq); persist(); optimize(); toast('수거 요청을 삭제했습니다.'); return; }
    if (t.id === 'rtRun') { optimize(); toast('경로를 다시 계산했습니다.'); }
    if (t.id === 'rtBase') { S.showBase = !S.showBase; t.textContent = S.showBase ? '◌ 기존 경로 숨기기' : '◌ 기존 경로 겹쳐보기'; render(); }
    if (t.id === 'rtCsv' && S.plan) { const rows = [['차량', '순번', '농장ID', '농장명', '시료수', '긴급', '도착예정', '구간거리(km)', '보관시간(분)']]; S.plan.opt.forEach((st, vi) => st.stops.forEach((s, i) => rows.push([vi + 1 + '호차', i + 1, s.id, F(s.id).name, s.samples, s.urgent ? 'Y' : '', tStr(s.eta), s.leg.toFixed(1), Math.round(s.hold)]))); download('BANSUK_dispatch_plan.csv', csv(rows), 'text/csv;charset=utf-8'); toast('배차표를 내려받았습니다.'); }
  });
  optimize();
})();
