/* 09 역학 접촉 추적 — fabricated vehicle/visit logs, rule-based contact scoring. */
(function () {
  const { esc, rng, FARMS, mapBase, P, bbox, km, toast, download, csv, shell, fmt, store, save } = PRO;
  const r = rng(909);
  const AREA = FARMS.filter(f => ['경기', '충북', '충남'].includes(f.prov) && f.lat > 36.4);
  const FAC = [['FAC1', '가상 사료공장 (진천)', 127.47, 36.88, '사료공장'], ['FAC2', '가상 사료공장 (천안)', 127.18, 36.78, '사료공장'], ['FAC3', '가상 GP센터 (음성)', 127.64, 36.97, 'GP센터'], ['FAC4', '가상 도계장 (안성)', 127.31, 37.03, '도계장'], ['FAC5', '가상 거점소독시설 (음성)', 127.70, 36.91, '거점소독']].map(([id, name, lon, lat, kind]) => ({ id, name, lon, lat, kind }));
  const VT = { 생계운반: { w: 1.0, c: '#c2394f', n: 3, fac: 'FAC4' }, 분뇨수거: { w: .9, c: '#8a5a2b', n: 2, fac: null }, 계란수집: { w: .8, c: '#e08a1e', n: 4, fac: 'FAC3' }, 백신접종팀: { w: .8, c: '#7b55d6', n: 2, fac: null }, 사료운반: { w: .5, c: '#2c7fd0', n: 5, fac: 'FAC1' }, 약품·컨설팅: { w: .4, c: '#13957a', n: 3, fac: null } };
  const VEH = []; Object.entries(VT).forEach(([type, v]) => { for (let i = 0; i < v.n; i++) VEH.push({ id: type.slice(0, 2) + '-' + String(i + 1).padStart(2, '0'), type, home: AREA[Math.floor(r() * AREA.length)] }); });
  // 21-day visit logs: day -20..0
  const VISITS = [];
  VEH.forEach(v => {
    const near = AREA.map(f => ({ f, d: km(f, v.home) })).sort((a, b) => a.d - b.d).slice(0, 22);
    for (let day = -20; day <= 0; day++) {
      if (r() < .4) continue; const n = 1 + Math.floor(r() * (v.type === '사료운반' ? 3 : 4)); const used = new Set(); let order = 0, hour = 7 + Math.floor(r() * 2);
      for (let k = 0; k < n; k++) { const c = near[Math.min(near.length - 1, Math.floor(Math.pow(r(), 1.6) * near.length))].f; if (used.has(c.id)) continue; used.add(c.id); VISITS.push({ day, veh: v.id, farm: c.id, order: order++, hour: hour }); hour += 1 + Math.floor(r() * 2); }
      if (VT[v.type].fac && r() < .6) VISITS.push({ day, veh: v.id, farm: VT[v.type].fac, order: order++, hour });
    }
  });
  const farmById = id => AREA.find(f => f.id === id) || FAC.find(f => f.id === id);
  const vehById = id => VEH.find(v => v.id === id);
  const q = new URLSearchParams(location.search).get('farm');
  const visited = new Set(VISITS.map(v => v.farm));
  const defaultIdx = (q && AREA.some(f => f.id === q)) ? q : AREA.filter(f => visited.has(f.id)).sort((a, b) => VISITS.filter(v => v.farm === b.id).length - VISITS.filter(v => v.farm === a.id).length)[0].id;
  const S = { index: defaultIdx, window: 21, second: false, view: 'net', sel: null, queue: store('trace_queue', []) };

  const body = shell({
    key: 'trace', code: 'CONTACT TRACING', title: '역학 접촉 추적',
    subtitle: '의심 농장을 지정하면 축산차량·인력·시설의 방문 이력을 역추적해 <b>1·2차 접촉 농장</b>을 찾고, 차량 종류·방문 순서·경과일로 <b>우선 검사 순위</b>를 매깁니다.',
    toolbar: '<button class="btn" id="trDoc" type="button">↓ 역학조사서 초안</button><button class="btn" id="trCsv" type="button">↓ 우선순위 CSV</button><button class="btn btn-primary" id="trQueueAll" type="button">＋ 고위험 검사 의뢰</button>',
    reset: () => { localStorage.removeItem('bansuk_pro_trace_queue'); S.queue = []; render(); },
    note: '차량 번호·방문 이력·농장은 모두 가상입니다. 실제 서비스는 축산차량 GPS(KAHIS 등) 데이터 이용 권한과 방역당국 협의가 전제되며, 점수는 역학조사관 판단을 돕는 참고값입니다.'
  });

  function analyse() {
    const idx = S.index; const W = S.window; const vis = VISITS.filter(v => v.day > -W);
    const idxVisits = vis.filter(v => v.farm === idx);
    const contacts = {}; const vehs = new Set(); const facs = new Set();
    const add = (fid, w, reason, veh, degree) => { if (fid === idx || fid.startsWith('FAC')) return; const c = contacts[fid] = contacts[fid] || { id: fid, p: 1, reasons: [], vehs: new Set(), degree }; c.p *= (1 - w); c.reasons.push({ w, reason }); c.vehs.add(veh); c.degree = Math.min(c.degree, degree); };
    idxVisits.forEach(iv => {
      const v = vehById(iv.veh); const tw = VT[v.type].w; vehs.add(v.id);
      vis.filter(x => x.veh === iv.veh && x.farm !== idx).forEach(x => {
        let w = 0, why = '';
        if (x.day === iv.day && x.order > iv.order) { w = tw * .6; why = `같은 날 지정 농장 방문 직후 (${x.order - iv.order}번째 후)`; }
        else if (x.day === iv.day) { w = tw * .22; why = '같은 날 지정 농장 방문 전 (유입 경로 후보)'; }
        else if (x.day > iv.day && x.day - iv.day <= 3) { w = tw * .28 * Math.pow(.65, x.day - iv.day - 1); why = `지정 농장 방문 ${x.day - iv.day}일 후`; }
        else return;
        if (x.farm.startsWith('FAC')) { facs.add(x.farm); return; }
        add(x.farm, w, `${v.type} ${v.id} · D${iv.day} · ${why}`, v.id, 1);
      });
    });
    // shared facility same day
    [...facs].forEach(fc => { const days = new Set(vis.filter(x => x.farm === fc && vehs.has(x.veh)).map(x => x.day)); vis.filter(x => x.farm === fc && !vehs.has(x.veh) && days.has(x.day)).forEach(x => { const v = vehById(x.veh); vis.filter(y => y.veh === x.veh && y.day === x.day && y.order > x.order && !y.farm.startsWith('FAC')).forEach(y => add(y.farm, .18 * VT[v.type].w, `${farmById(fc).name} 같은 날 경유 → ${v.type} ${v.id}`, v.id, 2)); }); });
    if (S.second) {
      Object.values(contacts).filter(c => 1 - c.p >= .6 && c.degree === 1).forEach(c => {
        vis.filter(x => x.farm === c.id).forEach(iv => { const v = vehById(iv.veh); vis.filter(x => x.veh === iv.veh && x.day === iv.day && x.order > iv.order && !x.farm.startsWith('FAC')).forEach(x => add(x.farm, VT[v.type].w * .25, `2차: ${farmById(c.id).name} 경유 ${v.type} ${v.id}`, v.id, 2)); });
      });
    }
    const list = Object.values(contacts).map(c => ({ ...c, score: Math.round((1 - c.p) * 100), f: farmById(c.id) })).sort((a, b) => b.score - a.score);
    return { idxVisits, list, vehs: [...vehs], facs: [...facs] };
  }
  const lvl = s => s >= 60 ? ['높음', 'red', '#c2394f'] : s >= 30 ? ['중간', 'amber', '#e08a1e'] : ['낮음', 'green', '#2bb593'];

  function network(a) {
    const W = 640, H = 470, cx = W / 2, cy = H / 2; const vehs = a.vehs.map(vehById); const list = a.list.slice(0, 26);
    const vp = {}; vehs.forEach((v, i) => { const t = (i / Math.max(1, vehs.length)) * Math.PI * 2 - Math.PI / 2; vp[v.id] = [cx + Math.cos(t) * 105, cy + Math.sin(t) * 95]; });
    const fp = {}; list.forEach((c, i) => { const t = (i / Math.max(1, list.length)) * Math.PI * 2 - Math.PI / 2 + .12; const rr = c.degree === 2 ? 215 : 185; fp[c.id] = [cx + Math.cos(t) * rr * 1.25, cy + Math.sin(t) * rr * .98]; });
    let g = '';
    vehs.forEach(v => { g += `<line class="net-link" x1="${cx}" y1="${cy}" x2="${vp[v.id][0]}" y2="${vp[v.id][1]}" stroke="${VT[v.type].c}" stroke-width="2.6"/>`; });
    list.forEach(c => [...c.vehs].forEach(vid => { const s = vp[vid] || [cx, cy]; g += `<line class="net-link" x1="${s[0]}" y1="${s[1]}" x2="${fp[c.id][0]}" y2="${fp[c.id][1]}" stroke="${VT[vehById(vid).type].c}" stroke-width="${c.score >= 60 ? 1.8 : 1}" ${c.degree === 2 ? 'stroke-dasharray="4 4"' : ''}/>`; }));
    vehs.forEach(v => { const [x, y] = vp[v.id]; g += `<g class="net-node"><rect x="${x - 27}" y="${y - 11}" width="54" height="22" rx="11" fill="#fff" stroke="${VT[v.type].c}" stroke-width="2"/><text x="${x}" y="${y + 3.5}" text-anchor="middle" style="fill:${VT[v.type].c}">${esc(v.id)}</text><title>${esc(v.type)} ${esc(v.id)}</title></g>`; });
    list.forEach(c => { const [x, y] = fp[c.id]; const L = lvl(c.score); const rad = 6 + c.score / 12; g += `<g class="net-node" data-tfarm="${c.id}"><circle cx="${x}" cy="${y}" r="${rad}" fill="${L[2]}" fill-opacity="${S.sel === c.id ? 1 : .85}" stroke="${S.sel === c.id ? '#10283b' : '#fff'}" stroke-width="${S.sel === c.id ? 3 : 2}"/><text x="${x}" y="${y + rad + 11}" text-anchor="middle">${esc(c.f.name.replace('가상농장 ', ''))} · ${c.score}</text><title>${esc(c.f.name)} — 접촉 점수 ${c.score}</title></g>`; });
    const idx = farmById(S.index);
    g += `<g class="net-node"><circle cx="${cx}" cy="${cy}" r="24" fill="#6b0f20"/><circle cx="${cx}" cy="${cy}" r="31" fill="none" stroke="#6b0f20" stroke-opacity=".3" stroke-width="5"/><text x="${cx}" y="${cy + 4}" text-anchor="middle" style="fill:#fff;font-size:11px">지정</text><text x="${cx}" y="${cy + 46}" text-anchor="middle" style="font-size:11px;fill:#6b0f20">${esc(idx.name)}</text></g>`;
    return `<div class="chart-box" style="background:#fbfdfe;border:1px solid #e6edf3;border-radius:12px"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="접촉 네트워크">${g}</svg></div>`;
  }
  function geo(a) {
    const pts = [farmById(S.index), ...a.list.map(c => c.f)]; const lo0 = Math.min(...pts.map(p => p.lon)) - .08, lo1 = Math.max(...pts.map(p => p.lon)) + .08, la0 = Math.min(...pts.map(p => p.lat)) - .06, la1 = Math.max(...pts.map(p => p.lat)) + .06; const span = Math.max(lo1 - lo0, (la1 - la0) * 1.25, .5); const mlo = (lo0 + lo1) / 2, mla = (la0 + la1) / 2; const vb = bbox(mlo - span / 2, mla - span / 2.5, mlo + span / 2, mla + span / 2.5); const k = vb[2] / 300; const idx = farmById(S.index); const [ix, iy] = P(idx.lon, idx.lat);
    let g = mapBase(vb, { labels: true });
    AREA.forEach(f => { const [x, y] = P(f.lon, f.lat); g += `<circle cx="${x}" cy="${y}" r="${1.6 * k}" fill="#9fb1bd"/>`; });
    a.list.forEach(c => { const [x, y] = P(c.f.lon, c.f.lat); const L = lvl(c.score); g += `<line x1="${ix}" y1="${iy}" x2="${x}" y2="${y}" stroke="${L[2]}" stroke-width="${(c.score >= 60 ? 1 : .6) * k}" stroke-opacity=".7" ${c.degree === 2 ? `stroke-dasharray="${2 * k} ${2 * k}"` : ''}/>`; });
    a.list.forEach(c => { const [x, y] = P(c.f.lon, c.f.lat); const L = lvl(c.score); g += `<g class="farm-dot" data-tfarm="${c.id}"><circle cx="${x}" cy="${y}" r="${(2.4 + c.score / 40) * k}" fill="${L[2]}" stroke="#fff" stroke-width="${.6 * k}"><title>${esc(c.f.name)} · ${c.score}</title></circle></g>`; });
    FAC.forEach(f => { const [x, y] = P(f.lon, f.lat); const used = a.facs.includes(f.id); g += `<rect x="${x - 2.4 * k}" y="${y - 2.4 * k}" width="${4.8 * k}" height="${4.8 * k}" fill="${used ? '#10283b' : '#b9c7d1'}" rx="${k}"><title>${esc(f.name)}${used ? ' (관련 차량 경유)' : ''}</title></rect>`; });
    g += `<circle cx="${ix}" cy="${iy}" r="${4.5 * k}" fill="#6b0f20" stroke="#fff" stroke-width="${k}"/>`;
    return `<div class="pro-mapbox"><svg viewBox="${vb.join(' ')}">${g}</svg><div class="maplegend"><span><i style="background:#6b0f20"></i>지정 농장</span><span><i style="background:#c2394f"></i>접촉 높음</span><span><i style="background:#e08a1e"></i>중간</span><span><i style="background:#10283b;border-radius:2px"></i>경유 시설</span></div><div class="mapnote">경기·충청 일대 가상 농장 · 실선 1차 / 점선 2차</div></div>`;
  }
  function gantt(a) {
    const W = S.window; const ids = new Set(a.list.map(c => c.id)); const vehs = a.vehs.map(vehById);
    return `<div class="panel"><div class="panel-head"><div><h2>차량 방문 타임라인</h2><div class="panel-sub">최근 ${W}일 · <b style="color:#6b0f20">■</b> 지정 농장 <b style="color:#e08a1e">■</b> 접촉 농장 <b style="color:#b7c4ce">■</b> 기타 방문</div></div></div><div class="gantt">${vehs.map(v => `<div class="gantt-row"><span style="color:${VT[v.type].c}">${esc(v.type)} ${esc(v.id)}</span><div class="gantt-track" style="background-size:calc(100%/${W}) 100%">${VISITS.filter(x => x.veh === v.id && x.day > -W && !x.farm.startsWith('FAC')).map(x => { const pos = ((x.day + W - 1) + (x.order + .5) / 6) / W * 100; const col = x.farm === S.index ? '#6b0f20' : ids.has(x.farm) ? '#e08a1e' : '#c7d2da'; return `<i style="left:${pos}%;background:${col}" title="D${x.day} ${String(x.hour).padStart(2, '0')}시 · ${esc(farmById(x.farm).name)}"></i>`; }).join('')}</div></div>`).join('') || '<p class="smalltext">해당 기간 지정 농장을 방문한 차량이 없습니다.</p>'}<div class="gantt-row"><span></span><div class="pro-inline" style="justify-content:space-between;font-size:10px;color:#8395a5"><span>D-${W - 1}</span><span>D-${Math.round(W / 2)}</span><span>D0 (오늘)</span></div></div></div></div>`;
  }
  function priority(a) {
    return `<div class="panel"><div class="panel-head"><div><h2>우선 검사 대상 <span class="result-pill">${a.list.length}곳</span></h2><div class="panel-sub">점수 = 1 − Π(1 − 차량가중치 × 방문순서·경과일 계수) · 행을 누르면 근거 표시</div></div></div><div class="pro-table-wrap" style="max-height:420px"><table class="pro-table"><thead><tr><th>#</th><th>농장</th><th>접촉 점수</th><th>등급</th><th></th></tr></thead><tbody>${a.list.map((c, i) => { const L = lvl(c.score); const queued = S.queue.some(x => x.id === c.id); return `<tr data-tfarm="${c.id}" class="${S.sel === c.id ? 'hl' : ''}" style="cursor:pointer"><td>${i + 1}</td><td style="white-space:nowrap"><b>${esc(c.f.name)}</b><br><small style="color:#7a8b9b">${c.f.type} ${fmt(c.f.heads)}수 · ${km(c.f, farmById(S.index)).toFixed(1)}km</small></td><td><div class="pro-inline"><div class="pro-bar" style="width:60px"><span style="width:${c.score}%;background:${L[2]}"></span></div><b>${c.score}</b></div></td><td style="white-space:nowrap"><span class="pro-chip ${L[1]}">${L[0]}</span><br><small style="color:#7a8b9b">${c.degree}차 · 차량 ${c.vehs.size}대</small></td><td><button class="btn btn-tiny" data-queue="${c.id}" ${queued ? 'disabled' : ''}>${queued ? '✓' : '의뢰'}</button></td></tr>${S.sel === c.id ? `<tr class="hl"><td></td><td colspan="4"><div style="font-size:12px;line-height:1.8;color:#3f5566">${c.reasons.sort((x, y) => y.w - x.w).slice(0, 5).map(x => `• ${esc(x.reason)} <b style="color:#0e806b">(+${Math.round(x.w * 100)})</b>`).join('<br>')}</div></td></tr>` : ''}`; }).join('') || '<tr><td colspan="5" class="empty">해당 기간 접촉 농장이 없습니다. 기간을 늘려보세요.</td></tr>'}</tbody></table></div></div>`;
  }
  function render() {
    const a = analyse(); const idx = farmById(S.index); const hi = a.list.filter(c => c.score >= 60).length;
    body.innerHTML = `<div class="panel" style="margin-bottom:18px"><div class="pro-inline" style="justify-content:space-between"><div class="pro-inline"><label class="pro-field" style="min-width:260px">지정(의심) 농장<select class="select" id="trIndex">${AREA.filter(f => visited.has(f.id)).map(f => `<option value="${f.id}" ${f.id === S.index ? 'selected' : ''}>${esc(f.name)} · ${f.type}</option>`).join('')}</select></label><label class="pro-field">추적 기간<select class="select" id="trWin">${[7, 14, 21].map(w => `<option value="${w}" ${S.window === w ? 'selected' : ''}>최근 ${w}일</option>`).join('')}</select></label><label class="pro-inline" style="font-size:12px;font-weight:700;color:#53697b;margin-top:18px"><input type="checkbox" id="trSecond" ${S.second ? 'checked' : ''}> 2차 접촉 포함</label></div><div class="pro-inline" style="margin-top:18px">${Object.entries(VT).map(([t, v]) => `<span class="pro-chip" style="color:${v.c}">● ${t} ×${v.w}</span>`).join('')}</div></div></div>
    <div class="pro-kpis"><div class="pro-kpi alert"><small>지정 농장</small><b style="font-size:19px;margin:9px 0 6px">${esc(idx.name)}</b><em class="down">${idx.type} ${fmt(idx.heads)}수</em></div><div class="pro-kpi"><small>지정 농장 방문 차량</small><b>${a.vehs.length}</b><em>${a.idxVisits.length}회 방문 / ${S.window}일</em></div><div class="pro-kpi"><small>접촉 농장</small><b>${a.list.length}</b><em>1차 ${a.list.filter(c => c.degree === 1).length} · 2차 ${a.list.filter(c => c.degree === 2).length}</em></div><div class="pro-kpi ${hi ? 'alert' : ''}"><small>고위험 접촉 (60+)</small><b>${hi}</b><em class="down">우선 정밀검사 대상</em></div><div class="pro-kpi"><small>경유 시설</small><b>${a.facs.length}</b><em>${a.facs.map(f => farmById(f).kind).join(' · ') || '없음'}</em></div><div class="pro-kpi"><small>검사 의뢰 대기열</small><b>${S.queue.length}</b><em>브라우저 저장</em></div></div>
    <div class="pro-grid pro-2"><div class="panel"><div class="panel-head"><div><h2>접촉 관계</h2><div class="panel-sub">지정 농장 → 차량 → 접촉 농장 · 원 크기 = 접촉 점수</div></div><div class="pro-inline"><button class="pro-tab ${S.view === 'net' ? 'active' : ''}" data-tview="net">네트워크</button><button class="pro-tab ${S.view === 'geo' ? 'active' : ''}" data-tview="geo">지도</button></div></div>${S.view === 'net' ? network(a) : geo(a)}</div>${priority(a)}</div>
    <div class="pro-grid pro-2 pro-row">${gantt(a)}<div class="panel"><div class="panel-head"><div><h2>검사 의뢰 대기열</h2><div class="panel-sub">접촉 농장 검사 의뢰 → 시료 수거 경로 최적화로 연결</div></div><a class="btn btn-tiny" href="./route.html">수거 경로 만들기 ↗</a></div><div class="pro-list">${S.queue.map(x => `<div class="pro-item"><span class="dot" style="background:${lvl(x.score)[2]}"></span><span class="grow"><b>${esc(x.name)}</b><small>점수 ${x.score} · 근거 농장 ${esc(x.from)} · ${esc(x.at)}</small></span><button class="btn btn-tiny" data-unqueue="${x.id}">취소</button></div>`).join('') || '<p class="smalltext">아직 의뢰된 농장이 없습니다. 표에서 [검사 의뢰] 또는 상단 [고위험 검사 의뢰]를 누르세요.</p>'}</div></div></div>`;
  }
  function enqueue(c) { if (S.queue.some(x => x.id === c.id)) return; S.queue.push({ id: c.id, name: c.f.name, score: c.score, from: farmById(S.index).name, at: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) }); save('trace_queue', S.queue); }
  body.addEventListener('change', e => { if (e.target.id === 'trIndex') { S.index = e.target.value; S.sel = null; render(); } if (e.target.id === 'trWin') { S.window = +e.target.value; render(); } if (e.target.id === 'trSecond') { S.second = e.target.checked; render(); } });
  document.addEventListener('click', e => {
    const t = e.target.closest('button,[data-tfarm]'); if (!t) return;
    if (t.dataset.queue) { const c = analyse().list.find(x => x.id === t.dataset.queue); enqueue(c); render(); toast(`${c.f.name} 검사 의뢰를 대기열에 추가했습니다.`); return; }
    if (t.dataset.unqueue) { S.queue = S.queue.filter(x => x.id !== t.dataset.unqueue); save('trace_queue', S.queue); render(); return; }
    if (t.dataset.tview) { S.view = t.dataset.tview; render(); return; }
    if (t.dataset.tfarm) { S.sel = S.sel === t.dataset.tfarm ? null : t.dataset.tfarm; render(); return; }
    if (t.id === 'trQueueAll') { const l = analyse().list.filter(c => c.score >= 60); l.forEach(enqueue); render(); toast(`고위험 접촉 ${l.length}곳을 검사 의뢰 대기열에 추가했습니다.`); }
    if (t.id === 'trCsv') { const a = analyse(); download(`BANSUK_trace_${S.index}.csv`, csv([['순위', '농장ID', '농장명', '축종', '사육수', '접촉점수', '등급', '차수', '관련차량', '주요근거'], ...a.list.map((c, i) => [i + 1, c.id, c.f.name, c.f.type, c.f.heads, c.score, lvl(c.score)[0], c.degree, [...c.vehs].join(' '), c.reasons.sort((x, y) => y.w - x.w)[0].reason])]), 'text/csv;charset=utf-8'); toast('우선순위 목록을 내려받았습니다.'); }
    if (t.id === 'trDoc') { const a = analyse(); const idx = farmById(S.index); download(`BANSUK_epi_draft_${S.index}.txt`, `역학조사 보조 자료 (초안 · 가상 데이터)\n━━━━━━━━━━━━━━━━━━━━\n지정 농장: ${idx.name} (${idx.region}, ${idx.type} ${fmt(idx.heads)}수)\n추적 기간: 최근 ${S.window}일 / 2차 접촉 ${S.second ? '포함' : '미포함'}\n작성: 2026-11-18 (자동 생성)\n\n1. 지정 농장 출입 차량 (${a.vehs.length}대)\n${a.vehs.map(id => { const v = vehById(id); const n = a.idxVisits.filter(x => x.veh === id); return ` - ${v.type} ${id}: ${n.length}회 (${n.map(x => 'D' + x.day).join(', ')})`; }).join('\n')}\n\n2. 경유 시설\n${a.facs.map(f => ' - ' + farmById(f).name).join('\n') || ' - 없음'}\n\n3. 우선 검사 대상 (상위 10)\n${a.list.slice(0, 10).map((c, i) => ` ${i + 1}. ${c.f.name} — 점수 ${c.score} (${lvl(c.score)[0]}) · ${c.reasons.sort((x, y) => y.w - x.w)[0].reason}`).join('\n')}\n\n4. 검토 의견\n - 위 순위는 차량 종류·방문 순서·경과일에 따른 규칙 기반 참고값입니다.\n - 최종 역학 판단과 조치는 역학조사관·방역당국이 결정합니다.\n`); toast('역학조사서 초안(TXT)을 내려받았습니다.'); }
  });
  render();
})();
