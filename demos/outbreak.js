/* 08 확산 시뮬레이터 · 방역대 관리 — spatial-kernel Monte Carlo on fabricated farms. Not a forecast. */
(function () {
  const { esc, rng, FARMS, mapBase, P, bbox, svgPoint, unproject, kmToSvg, km, lineChart, toast, download, csv, shell, fmt, store, save, typeColor } = PRO;
  const B = [127.22, 36.70, 127.98, 37.17];
  const r = rng(808);
  const SUBS = [[127.69, 36.94, 16], [127.58, 36.99, 9], [127.45, 36.86, 12], [127.76, 37.03, 7], [127.36, 36.97, 8], [127.62, 36.80, 8], [127.85, 36.90, 6], [127.50, 37.09, 6]];
  const TYPES = ['산란계', '산란계', '산란계', '육계', '육계', '오리', '종계'];
  const LF = []; SUBS.forEach(([lo, la, n], si) => { for (let i = 0; i < n; i++) { const t = TYPES[Math.floor(r() * TYPES.length)]; LF.push({ id: 'L' + String(LF.length + 1).padStart(3, '0'), name: '가상농장 ' + ['음성', '대소', '진천', '감곡', '광혜원', '괴산', '충주', '일죽'][si] + '-' + String(i + 1).padStart(2, '0'), type: t, heads: Math.round((t === '산란계' ? 80000 + r() * 220000 : t === '육계' ? 40000 + r() * 90000 : 12000 + r() * 30000) / 1000) * 1000, lon: lo + (r() - .5) * .09, lat: la + (r() - .5) * .065 }); } });
  const N = LF.length;
  const D = LF.map(a => LF.map(b => km(a, b)));
  const saved = store('outbreak', null);
  const S = Object.assign({ index: 'L003', point: null, radii: [0.5, 3, 10], picking: false, beta: 0.55, bio: 40, restrictDay: 1, detect: 5, runs: 200, sim: null, day: 0, playing: false, actions: {} }, saved || {});
  delete S.sim; S.sim = null; S.playing = false;
  // URL ?farm=Fxxx from situation room → nearest local farm
  const q = new URLSearchParams(location.search).get('farm');
  if (q) { const g = FARMS.find(f => f.id === q); if (g) { let best = LF[0], bd = 1e9; LF.forEach(f => { const d = km(f, g); if (d < bd) { bd = d; best = f; } }); S.index = best.id; S.fromCmd = g.name; } }
  const idx = () => LF.find(f => f.id === S.index) || LF[0];
  const persist = () => save('outbreak', { index: S.index, radii: S.radii, beta: S.beta, bio: S.bio, restrictDay: S.restrictDay, detect: S.detect, actions: S.actions });

  const body = shell({
    key: 'outbreak', code: 'OUTBREAK RESPONSE', title: '확산 시뮬레이터 · 방역대 관리',
    subtitle: '의심 농장을 지정하면 <b>관리·보호·예찰 지역</b> 내 농장과 사육 규모를 즉시 산출하고, 차단방역 수준과 이동제한 시점에 따라 <b>확산 시나리오를 몬테카를로로 비교</b>합니다.',
    toolbar: '<button class="btn" id="obPick" type="button">⊕ 발생 지점 지정</button><button class="btn" id="obCsv" type="button">↓ 방역대 농장 CSV</button><button class="btn btn-primary" id="obRun" type="button">▶ 시나리오 실행</button>',
    reset: () => { localStorage.removeItem('bansuk_pro_outbreak'); location.href = location.pathname; },
    note: '농장·좌표·사육수는 가상이며, 방역대 반경은 시연용 기본값(설정 가능)입니다. 확산 모델은 단순 공간 커널 예시로 실제 발생 예측·법정 조치 기준이 아닙니다.'
  });

  function zoneOf(d) { return d <= S.radii[0] ? 0 : d <= S.radii[1] ? 1 : d <= S.radii[2] ? 2 : 3; }
  function zoneFarms() { const c = idx(); return LF.filter(f => f.id !== c.id).map(f => ({ f, d: km(c, f), z: zoneOf(km(c, f)) })).filter(x => x.z < 3).sort((a, b) => a.d - b.d); }
  const ZN = ['관리지역', '보호지역', '예찰지역'], ZC = ['#dc4d64', '#e59a26', '#3d7fd0'];

  // ---------- Simulation ----------
  function simulate(p, rand) {
    // state: -1 S, else infection day
    const inf = new Array(N).fill(-1), det = new Array(N).fill(-1); const c = LF.indexOf(idx()); inf[c] = 0; det[c] = Math.max(1, p.detect); const rDay = det[c] + p.restrictDay;
    const days = 30; const daily = []; const bioF = 1 - 0.65 * p.bio / 100;
    for (let t = 1; t <= days; t++) {
      const newly = [];
      for (let j = 0; j < N; j++) {
        if (inf[j] >= 0) continue; let lam = 0;
        for (let i = 0; i < N; i++) {
          if (inf[i] < 0) continue; const age = t - inf[i]; if (age < 2) continue; // latent
          if (det[i] >= 0 && t > det[i] + 1) continue; // depopulated after detection
          const d = D[i][j]; let k = p.beta / (1 + Math.pow(d / 1.6, 2.6));
          if (p.restrict && t >= rDay) k *= d > 3 ? 0.35 : 0.7;
          lam += k * bioF * (LF[j].type === '오리' ? 1.4 : 1);
        }
        if (lam > 0 && rand() < 1 - Math.exp(-lam)) newly.push(j);
      }
      newly.forEach(j => { inf[j] = t; det[j] = t + Math.max(1, Math.round(p.detect + (rand() - .5) * 3)); });
      daily.push(inf.filter(x => x >= 0).length - 1);
    }
    return { inf, det, daily, final: daily[daily.length - 1] };
  }
  function quant(a, q) { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * (s.length - 1)))]; }
  function runAll() {
    const t0 = performance.now(); const rand = rng(Date.now() % 100000);
    const pA = { beta: S.beta, bio: S.bio, restrict: true, restrictDay: S.restrictDay, detect: S.detect };
    const pB = { beta: S.beta, bio: 10, restrict: false, restrictDay: 99, detect: S.detect + 2 };
    const A = [], Bs = []; for (let k = 0; k < S.runs; k++) { A.push(simulate(pA, rand)); Bs.push(simulate(pB, rand)); }
    const days = A[0].daily.length; const stat = (runs, q) => Array.from({ length: days }, (_, t) => quant(runs.map(x => x.daily[t]), q));
    const medFinal = quant(A.map(x => x.final), .5); const rep = A.slice().sort((a, b) => Math.abs(a.final - medFinal) - Math.abs(b.final - medFinal))[0];
    const heads = run => run.inf.reduce((s, v, j) => s + (v > 0 ? LF[j].heads : 0), 0);
    S.sim = { A: { med: stat(A, .5), lo: stat(A, .1), hi: stat(A, .9), final: A.map(x => x.final), heads: quant(A.map(heads), .5) }, B: { med: stat(Bs, .5), final: Bs.map(x => x.final), heads: quant(Bs.map(heads), .5) }, rep, ms: Math.round(performance.now() - t0), pA, pB };
    // per-farm infection probability (A)
    S.sim.prob = LF.map((f, j) => A.filter(x => x.inf[j] > 0).length / A.length);
    S.day = 0; persist(); render(); play();
  }
  function play() { clearInterval(S.timer); S.playing = true; S.timer = setInterval(() => { if (S.day >= 30) { clearInterval(S.timer); S.playing = false; updateMap(); return; } S.day++; updateMap(); }, 260); }

  // ---------- Views ----------
  function mapSvg() {
    const vb = bbox(...B); const c = idx(); const [cx, cy] = P(c.lon, c.lat); const u = kmToSvg(c.lat); const k = vb[2] / 300;
    const rep = S.sim?.rep; const prob = S.sim?.prob;
    const dots = LF.map((f, j) => {
      const [x, y] = P(f.lon, f.lat); let fill = '#7f95a3', stroke = '#fff', rad = 2.1 * k, extra = '';
      if (rep) { const it = rep.inf[j], dt = rep.det[j]; if (it >= 0 && it <= S.day) { fill = dt <= S.day ? '#a3172f' : '#f08a3c'; rad = 2.6 * k; if (dt <= S.day && f.id !== c.id) extra = `<path d="M${x - 1.6 * k} ${y - 1.6 * k}L${x + 1.6 * k} ${y + 1.6 * k}M${x + 1.6 * k} ${y - 1.6 * k}L${x - 1.6 * k} ${y + 1.6 * k}" stroke="#fff" stroke-width="${.5 * k}"/>`; } }
      else { const z = zoneOf(km(c, f)); if (z < 3) fill = ZC[z]; }
      if (f.id === c.id) { fill = '#6b0f20'; rad = 3.4 * k; }
      const ring = prob && !rep ? '' : '';
      return `<g class="farm-dot" data-lfarm="${f.id}"><circle cx="${x}" cy="${y}" r="${rad}" fill="${fill}" stroke="${stroke}" stroke-width="${.6 * k}"><title>${esc(f.name)} · ${f.type} ${fmt(f.heads)}수 · ${km(c, f).toFixed(1)}km${prob ? ` · 감염확률(시나리오A) ${Math.round(prob[j] * 100)}%` : ''}</title></circle>${extra}${ring}</g>`;
    }).join('');
    const rings = [2, 1, 0].map(z => `<circle cx="${cx}" cy="${cy}" r="${S.radii[z] * u}" fill="${ZC[z]}" fill-opacity="${[.13, .1, .05][z]}" stroke="${ZC[z]}" stroke-width="${.5 * k}" stroke-dasharray="${z === 2 ? `${2 * k} ${1.5 * k}` : 'none'}"/>`).join('');
    const labels = [0, 1, 2].map(z => `<text x="${cx}" y="${cy - S.radii[z] * u - 1.2 * k}" text-anchor="middle" style="font-size:${4.2 * k}px;font-weight:800;fill:${ZC[z]};paint-order:stroke;stroke:#fff;stroke-width:${1.2 * k}px">${ZN[z]} ${S.radii[z]}km</text>`).join('');
    return `<svg viewBox="${vb.join(' ')}" id="obSvg" role="img" aria-label="방역대 지도">${mapBase(vb, { labels: false })}${rings}${dots}${labels}<text x="${cx}" y="${cy + 6.5 * k}" text-anchor="middle" style="font-size:${4 * k}px;font-weight:800;fill:#6b0f20;paint-order:stroke;stroke:#fff;stroke-width:${1.2 * k}px">◆ 지정 농장</text></svg>`;
  }
  function updateMap() { const box = document.getElementById('obMapBox'); if (!box) return; box.querySelector('svg').outerHTML = mapSvg(); const dc = document.getElementById('obDay'); if (dc) dc.innerHTML = `D+${S.day}<small>/ 30일</small>`; const sl = document.getElementById('obDaySlider'); if (sl) sl.value = S.day; const st = document.getElementById('obDayStat'); if (st && S.sim) { const rep = S.sim.rep; const i = rep.inf.filter(x => x > 0 && x <= S.day).length, d = rep.det.filter((x, j) => rep.inf[j] > 0 && x <= S.day).length; st.textContent = `대표 시나리오: 누적 감염 ${i}곳 · 탐지 ${d}곳`; } }
  function zoneCards() {
    const zf = zoneFarms(); return `<div class="zone-legend">${[0, 1, 2].map(z => { const l = zf.filter(x => x.z === z); return `<div class="zone-card zone-${'abc'[z]}"><small>${ZN[z]} · ${S.radii[z]}km</small><b>${l.length}곳</b><span>${fmt(Math.round(l.reduce((s, x) => s + x.f.heads, 0) / 10000))}만 수 · ${['산란계', '육계', '오리', '종계'].map(t => { const n = l.filter(x => x.f.type === t).length; return n ? t + ' ' + n : ''; }).filter(Boolean).join(' / ') || '해당 없음'}</span></div>`; }).join('')}</div>`;
  }
  const ACTIONS = [['D+0', '지정 농장 출입 통제 및 시료 정밀검사 의뢰'], ['D+0', '관리지역 농장 예방적 조치 검토(방역관 판단)'], ['D+0', '보호지역 이동제한 안내 및 임상예찰 일정 편성'], ['D+1', '역학 관련 차량·인력 21일 이력 조회'], ['D+1', '예찰지역 농장 시료 채취 계획 수립·수거 노선 배차'], ['D+3', '거점 소독시설 운영 및 소독 기록 점검'], ['D+7', '보호지역 정밀검사 1차 결과 검토'], ['D+21', '이동제한 해제 요건 검토 (최종 검사 음성 시)']];
  function checklist() { const key = S.index; const st = S.actions[key] || []; return `<div class="panel"><div class="panel-head"><div><h2>대응 체크리스트</h2><div class="panel-sub">지정 농장 기준 자동 생성 · 체크 상태 브라우저 저장</div></div><span class="pro-chip">${st.filter(Boolean).length}/${ACTIONS.length}</span></div><ul class="step-list">${ACTIONS.map(([d, t], i) => `<li class="${st[i] ? 'done' : ''}"><span>${esc(t)}</span><label class="pro-inline"><span class="pro-chip ${d === 'D+0' ? 'red' : 'blue'}">${d}</span><input type="checkbox" data-act="${i}" ${st[i] ? 'checked' : ''}></label></li>`).join('')}</ul><p class="pro-foot-note">※ 조치 항목·시점은 시연용 예시입니다. 실제 조치는 관련 법령·긴급행동지침과 방역당국 판단에 따릅니다.</p></div>`; }
  function farmTable() { const zf = zoneFarms(); return `<div class="panel"><div class="panel-head"><div><h2>방역대 내 농장 <span class="result-pill">${zf.length}곳</span></h2><div class="panel-sub">거리순 · ${S.sim ? '시나리오A 감염확률 포함' : '시나리오 실행 시 감염확률 표시'}</div></div></div><div class="pro-table-wrap"><table class="pro-table"><thead><tr><th>농장</th><th>구역</th><th>거리</th><th>축종</th><th>사육수</th><th>감염확률</th></tr></thead><tbody>${zf.map(({ f, d, z }) => { const p = S.sim ? S.sim.prob[LF.indexOf(f)] : null; return `<tr data-lfarm="${f.id}" style="cursor:pointer"><td><b>${esc(f.name)}</b></td><td><span class="pro-chip ${['red', 'amber', 'blue'][z]}">${ZN[z]}</span></td><td>${d.toFixed(1)}km</td><td><span style="color:${typeColor[f.type]};font-weight:800">●</span> ${f.type}</td><td>${fmt(f.heads)}</td><td>${p == null ? '—' : `<div class="pro-inline"><div class="pro-bar" style="width:56px"><span style="width:${p * 100}%;background:${p > .4 ? '#dc4d64' : p > .15 ? '#e59a26' : '#2bb593'}"></span></div>${Math.round(p * 100)}%</div>`}</td></tr>`; }).join('')}</tbody></table></div></div>`; }
  function controls() {
    const f = (id, label, val, min, max, step, unit, hint) => `<label class="pro-field">${label}<span class="val" id="${id}V">${val}${unit}</span><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}">${hint ? `<small style="font-weight:500;color:#8a9aa8">${hint}</small>` : ''}</label>`;
    return `<div class="panel"><div class="panel-head"><div><h2>시나리오 파라미터</h2><div class="panel-sub">시나리오 A(대응) vs B(미대응 기준선)</div></div><span class="pro-badge-ai">MONTE CARLO</span></div><div class="pro-controls">
      ${f('obR1', '관리지역 반경', S.radii[0], .3, 1, .1, 'km')}${f('obR2', '보호지역 반경', S.radii[1], 1, 5, .5, 'km')}${f('obR3', '예찰지역 반경', S.radii[2], 5, 15, 1, 'km')}
      <hr style="border:0;border-top:1px solid #e6edf3;margin:2px 0">
      ${f('obBeta', '전파 강도 β (가정)', S.beta, .2, 1.2, .05, '', '농장 간 거리 커널의 기본 전파율')}${f('obBio', '차단방역 수준', S.bio, 0, 100, 5, '%', '소독·출입통제 이행 정도 → 전파율 감소')}${f('obRd', '이동제한 개시 (탐지 후)', S.restrictDay, 0, 7, 1, '일', '이후 원거리(3km+) 전파 65%·근거리 30% 감소 가정')}${f('obDet', '평균 탐지 지연', S.detect, 2, 10, 1, '일', 'D0=지정 농장 감염 추정일 · 감염→신고·확진까지 걸리는 시간')}
      </div><button class="btn btn-primary" id="obRun2" style="width:100%;margin-top:14px">▶ ${S.runs}회 시뮬레이션 실행</button></div>`;
  }
  function simPanel() {
    if (!S.sim) return `<div class="panel"><div class="panel-head"><div><h2>확산 시나리오 비교</h2><div class="panel-sub">[시나리오 실행]을 누르면 A/B 각 ${S.runs}회 반복 계산 결과가 표시됩니다</div></div></div><div class="empty-detail" style="padding:60px 10px;text-align:center;color:#7a8b9b">지도의 농장을 클릭해 지정 농장을 바꾸거나, [발생 지점 지정]으로 위치를 고른 뒤 실행해보세요.</div></div>`;
    const s = S.sim; const fa = quant(s.A.final, .5), fb = quant(s.B.final, .5); const red = fb ? Math.round((1 - fa / fb) * 100) : 0; const labels = Array.from({ length: 30 }, (_, i) => 'D' + (i + 1));
    return `<div class="panel"><div class="panel-head"><div><h2>확산 시나리오 비교</h2><div class="panel-sub">누적 추가 감염 농장 수 · 중앙값과 10–90% 구간 · 계산 ${s.ms}ms</div></div><span class="pro-badge-ai">${S.runs}×2 RUNS</span></div>
      <div class="compare"><div><small>A · 추가 감염 (중앙값)</small><b>${fa}곳</b><em>90% 구간 ${quant(s.A.final, .1)}–${quant(s.A.final, .9)}곳</em></div><div><small>B · 미대응 기준선</small><b>${fb}곳</b><em class="bad">최대 ${quant(s.B.final, .9)}곳</em></div><div><small>대응 효과</small><b>−${Math.max(0, red)}%</b><em>추가 감염 감소</em></div><div><small>영향 사육수 (A)</small><b>${fmt(Math.round(s.A.heads / 10000))}만</b><em>B: ${fmt(Math.round(s.B.heads / 10000))}만 수</em></div></div>
      ${lineChart({ series: [{ values: s.B.med, color: '#c2394f', dash: '6 5' }, { values: s.A.med, color: '#0e806b', dots: true }], labels, band: { lo: s.A.lo, hi: s.A.hi, color: '#2bb593' }, markers: [{ i: Math.max(0, S.detect - 1), label: '최초 탐지', color: '#c2394f' }, { i: Math.min(29, S.detect + S.restrictDay - 1), label: '이동제한' }], h: 210 })}
      <div class="sim-legend"><span><i style="background:#0e806b"></i>A: 차단방역 ${S.bio}% · 탐지 ${S.detect}일 · 이동제한 탐지+${S.restrictDay}일</span><span><i style="background:#c2394f"></i>B: 차단방역 10% · 이동제한 없음 · 탐지 +2일</span><span><i style="background:#2bb59355"></i>A 10–90%</span></div></div>`;
  }
  function playback() { if (!S.sim) return ''; return `<div class="pro-inline" style="margin-top:12px;justify-content:space-between"><div class="day-counter" id="obDay">D+${S.day}<small>/ 30일</small></div><div class="pro-inline"><button class="btn btn-tiny" id="obPlay">▶ 재생</button><input type="range" id="obDaySlider" min="0" max="30" value="${S.day}" style="width:220px;accent-color:#0e806b"></div></div><div class="sim-legend"><span id="obDayStat"></span><span><i style="background:#f08a3c"></i>감염(미탐지)</span><span><i style="background:#a3172f"></i>탐지·조치</span><span><i style="background:#7f95a3"></i>미감염</span></div>`; }
  function render() {
    const c = idx(); const zf = zoneFarms();
    body.innerHTML = `${S.fromCmd ? `<div class="flag blue" style="margin:0 0 16px"><i>↪</i><div><b>상황실에서 연결됨</b>${esc(S.fromCmd)} 위치와 가장 가까운 지역 시연 농장(${esc(c.name)})을 지정 농장으로 불러왔습니다.</div></div>` : ''}
    <div class="pro-kpis"><div class="pro-kpi alert"><small>지정 농장</small><b style="font-size:19px;margin:9px 0 6px">${esc(c.name)}</b><em class="down">${c.type} ${fmt(c.heads)}수</em></div><div class="pro-kpi"><small>방역대 내 농장</small><b>${zf.length}</b><em>${S.radii[2]}km 이내</em></div><div class="pro-kpi"><small>방역대 사육 규모</small><b>${fmt(Math.round(zf.reduce((s, x) => s + x.f.heads, 0) / 10000))}만</b><em>수</em></div><div class="pro-kpi"><small>보호지역 오리 농장</small><b>${zf.filter(x => x.z <= 1 && x.f.type === '오리').length}</b><em>고감수성 축종 우선 예찰</em></div><div class="pro-kpi"><small>예찰 시료 예상</small><b>${fmt(zf.length * 20)}</b><em>농장당 20수 가정</em></div><div class="pro-kpi"><small>시나리오 A 추가 감염</small><b>${S.sim ? quant(S.sim.A.final, .5) + '곳' : '—'}</b><em>${S.sim ? '중앙값' : '실행 전'}</em></div></div>
    <div class="pro-grid pro-2"><div class="panel"><div class="panel-head"><div><h2>방역대 지도</h2><div class="panel-sub">${S.picking ? '<b style="color:#c2394f">지도를 클릭해 발생 지점을 지정하세요</b>' : '농장 점을 클릭하면 지정 농장 변경 · 반경은 오른쪽에서 조정'}</div></div><span class="pro-chip red">◆ ${esc(c.name)}</span></div><div class="pro-mapbox ${S.picking ? 'picking' : ''}" id="obMapBox">${mapSvg()}<div class="maplegend"><span><i style="background:${ZC[0]}"></i>관리 ${S.radii[0]}km</span><span><i style="background:${ZC[1]}"></i>보호 ${S.radii[1]}km</span><span><i style="background:${ZC[2]}"></i>예찰 ${S.radii[2]}km</span></div><div class="mapnote">충북 음성·진천 일대 · 시·도 경계만 실제, 농장은 가상</div></div>${playback()}${zoneCards()}</div>${controls()}</div>
    <div class="pro-grid pro-2 pro-row">${simPanel()}${checklist()}</div>
    <div class="pro-row">${farmTable()}</div>`;
    updateMap();
  }
  body.addEventListener('input', e => {
    const id = e.target.id; const v = Number(e.target.value); const set = (u) => { const el = document.getElementById(id + 'V'); if (el) el.textContent = v + u; };
    if (id === 'obR1') { S.radii[0] = v; set('km'); }
    if (id === 'obR2') { S.radii[1] = v; set('km'); }
    if (id === 'obR3') { S.radii[2] = v; set('km'); }
    if (id === 'obBeta') { S.beta = v; set(''); }
    if (id === 'obBio') { S.bio = v; set('%'); }
    if (id === 'obRd') { S.restrictDay = v; set('일'); }
    if (id === 'obDet') { S.detect = v; set('일'); }
    if (id === 'obDaySlider') { clearInterval(S.timer); S.day = v; updateMap(); return; }
    if (/^obR\d/.test(id)) { if (S.radii[0] >= S.radii[1]) S.radii[1] = S.radii[0] + .5; S.sim = null; updateMap(); const zc = document.querySelector('.zone-legend'); if (zc) zc.outerHTML = zoneCards(); persist(); }
  });
  body.addEventListener('change', e => { if (/^obR\d/.test(e.target.id)) render(); if (e.target.dataset.act != null) { const st = S.actions[S.index] || []; st[+e.target.dataset.act] = e.target.checked; S.actions[S.index] = st; persist(); render(); } });
  document.addEventListener('click', e => {
    const t = e.target.closest('button,[data-lfarm],svg#obSvg'); if (!t) return;
    if (S.picking && e.target.closest('#obSvg')) { const svg = document.getElementById('obSvg'); const p = svgPoint(svg, e); const [lon, lat] = unproject(p.x, p.y); let best = LF[0], bd = 1e9; LF.forEach(f => { const d = km(f, { lon, lat }); if (d < bd) { bd = d; best = f; } }); S.index = best.id; S.picking = false; S.sim = null; S.fromCmd = null; persist(); render(); toast(`가장 가까운 농장 ${best.name}을(를) 발생 지점으로 지정했습니다.`); return; }
    if (t.dataset && t.dataset.lfarm) { S.index = t.dataset.lfarm; S.sim = null; S.fromCmd = null; persist(); render(); toast('지정 농장을 변경했습니다. 시나리오를 다시 실행하세요.'); return; }
    if (t.id === 'obPick') { S.picking = !S.picking; render(); toast(S.picking ? '지도를 클릭해 지점을 지정하세요.' : '지정 모드를 종료했습니다.'); }
    if (t.id === 'obRun' || t.id === 'obRun2') { toast('시뮬레이션 계산 중…'); setTimeout(runAll, 30); }
    if (t.id === 'obPlay') { if (S.day >= 30) S.day = 0; play(); }
    if (t.id === 'obCsv') { const c = idx(); download(`BANSUK_zone_${c.id}.csv`, csv([['지정농장', c.name], [], ['농장ID', '농장명', '구역', '거리(km)', '축종', '사육수', '감염확률A(가상)'], ...zoneFarms().map(({ f, d, z }) => [f.id, f.name, ZN[z], d.toFixed(2), f.type, f.heads, S.sim ? Math.round(S.sim.prob[LF.indexOf(f)] * 100) + '%' : ''])]), 'text/csv;charset=utf-8'); toast('방역대 농장 목록을 내려받았습니다.'); }
  });
  render();
})();
