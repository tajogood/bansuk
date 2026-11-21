/* 16 산란계 농장 사양관리 데이터 분석 — real daily records (anonymised), pre-processed into farmdata.json. */
(function () {
  const { esc, lineChart, toast, download, csv, shell, fmt } = PRO;
  const body = shell({
    key: 'farmdata', code: 'FARM DATA ANALYTICS', title: '산란계 농장 사양관리 데이터 분석',
    subtitle: '한 산란계 농장이 2017년부터 엑셀로 쓴 <b>109개 월별 시트</b>(계사 6동, 일별 수수·폐사·산란·사료·급수·난중·등급)를 하나로 모아 <b>계군 단위</b>로 다시 계산했습니다. 데이터가 쌓이면 무엇이 보이는지, 반석이 어디서 개입할 수 있는지를 보여줍니다.',
    toolbar: '<button class="btn" id="fdCsv" type="button">↓ 계군 성적표 CSV</button>',
    note: '<b>실제 농장 기록을 익명화</b>한 데이터입니다. 농장명·부화장·공급처 등 메모의 고유명은 제외했고 품종만 남겼습니다. 계군 구분·주령은 수수 변화와 주령 기록으로 추정했으며, 이상치(산란율 105% 초과 등)는 제외했습니다. 2021년 2–8월 시트는 원본에 없습니다.'
  });
  body.innerHTML = '<div class="panel"><p class="smalltext">데이터를 불러오는 중…</p></div>';
  const M = { lay: ['산란율 (%)', v => v], birds: ['사육수수 (수)', v => v], mort10k: ['일평균 폐사 (만 수당)', v => v], fpb: ['수당 사료 (g/일)', v => v], wpb: ['수당 급수 (ml/일)', v => v], ew: ['평균 난중 (g)', v => v], fcr: ['사료요구율 (kg/kg)', v => v] };
  const S = { metric: 'lay', sel: [], heat: 'lay', detail: null, sort: 'start', dir: 1 };
  let D;
  fetch('./farmdata.json').then(r => r.json()).then(j => { D = j; D.flocks.forEach(f => { f.trunc = f.end === '2021-01-31'; f.ongoing = f.end === D.meta.last; f.complete = !f.trunc && !f.ongoing && f.ageOut >= 60; f.year = +f.start.slice(0, 4); }); const best = D.flocks.filter(f => f.complete).sort((a, b) => b.hh - a.hh)[0]; const worst = D.flocks.filter(f => f.complete).sort((a, b) => b.mortPct - a.mortPct)[0]; S.sel = [best.id, worst.id]; S.detail = worst.id; render(); }).catch(() => { body.innerHTML = '<div class="flag red"><i>!</i><div><b>데이터를 불러오지 못했습니다</b>farmdata.json 경로를 확인하세요. (로컬 파일로 열면 브라우저가 차단할 수 있습니다)</div></div>'; });

  const COLORS = ['#c2394f', '#0e806b', '#2c7fd0', '#e08a1e', '#9a4fd6', '#10283b'];
  const flock = id => D.flocks.find(f => f.id === id);
  const label = f => `${f.house}동 · ${f.start.slice(2, 7).replace('-', '.')} 입식`;
  function kpis() {
    const m = D.meta; const comp = D.flocks.filter(f => f.complete); const avg = k => comp.reduce((s, f) => s + (f[k] || 0), 0) / comp.length;
    const recent = comp.filter(f => f.year >= 2023), old = comp.filter(f => f.year <= 2020); const mr = a => a.reduce((s, f) => s + f.mortCore, 0) / a.length;
    return `<div class="pro-kpis"><div class="pro-kpi"><small>기록 기간</small><b style="font-size:20px;margin:9px 0 6px">${m.first.slice(0, 7)} – ${m.last.slice(0, 7)}</b><em>${fmt(m.days)}일 · 월 시트 ${m.months}개</em></div><div class="pro-kpi"><small>평균 사육수수</small><b>${fmt(Math.round(m.birdsAvg / 1000))}천</b><em>계사 ${m.houses}동</em></div><div class="pro-kpi"><small>누적 산란수</small><b>${(m.eggs / 1e8).toFixed(1)}억 개</b><em>기록 기준</em></div><div class="pro-kpi"><small>분석 계군</small><b>${D.flocks.length}</b><em>완결 ${comp.length} · 진행 ${D.flocks.filter(f => f.ongoing).length}</em></div><div class="pro-kpi"><small>완결 계군 평균 피크</small><b>${avg('peak').toFixed(1)}%</b><em>입식수당 산란 ${Math.round(avg('hh'))}개</em></div><div class="pro-kpi alert"><small>누적 폐사율 변화</small><b>${mr(old).toFixed(1)} → ${mr(recent).toFixed(1)}%</b><em class="down">2020년 이전 → 2023년 이후 입식 · 종료 전 3주 제외</em></div></div>`;
  }
  function trend() {
    const ms = D.monthly; const labels = ms.map(x => x.ym.slice(2).replace('-', '.')); const v = ms.map(x => x[S.metric]);
    const gapIdx = ms.findIndex(x => x.ym === '2021-09');
    return `<div class="panel"><div class="panel-head"><div><h2>월별 농장 추이</h2><div class="panel-sub">계사 6동 합산 · 2021년 2–8월 원본 시트 없음</div></div><div class="pro-inline">${Object.entries(M).map(([k, x]) => `<button class="pro-tab ${S.metric === k ? 'active' : ''}" data-metric="${k}">${x[0].split(' (')[0]}</button>`).join('')}</div></div>${lineChart({ series: [{ values: v, color: '#0e806b' }], labels, markers: [{ i: gapIdx, label: '기록 단절 후 재개', color: '#9fb1bd' }, { i: ms.findIndex(x => x.ym === '2018-08'), label: '2018.08 전 동 수수 감소', color: '#c2394f' }], h: 230, yMin: S.metric === 'lay' ? 50 : S.metric === 'ew' ? 55 : S.metric === 'fcr' ? 1.8 : 0, yMax: S.metric === 'lay' ? 100 : S.metric === 'fcr' ? 3.2 : undefined })}</div>`;
  }
  function curves() {
    const b = D.bench; const ws = Object.keys(b).map(Number).sort((x, y) => x - y); const labels = ws.map(w => w + '주');
    const series = S.sel.map((id, i) => { const f = flock(id); return { values: ws.map(w => f.curve[w] ?? null), color: COLORS[i % COLORS.length] }; });
    return `<div class="panel"><div class="panel-head"><div><h2>계군 산란곡선 vs 농장 내 기준</h2><div class="panel-sub">회색 띠 = 이 농장 전체 계군의 주령별 25–75% 범위, 점선 = 중앙값 · 아래 성적표에서 계군을 눌러 겹쳐보기 (최대 6)</div></div></div>${lineChart({ series: [{ values: ws.map(w => b[w][1]), color: '#9fb1bd', dash: '5 5' }, ...series], labels, band: { lo: ws.map(w => b[w][0]), hi: ws.map(w => b[w][2]), color: '#9fb1bd' }, yMin: 0, yMax: 100, h: 250, threshold: { v: 90, label: '90%', color: '#0e806b' } })}<div class="sim-legend">${S.sel.map((id, i) => `<span><i style="background:${COLORS[i % COLORS.length]}"></i>${esc(label(flock(id)))} <button class="btn btn-tiny" data-unsel="${id}" style="padding:0 6px">×</button></span>`).join('')}<span><i style="background:#9fb1bd"></i>농장 중앙값</span></div><p class="pro-hint">품종 표준곡선 대신 <b>같은 농장의 과거 계군</b>을 기준으로 삼았습니다. 기준선보다 일찍 꺾이는 계군이 검사·컨설팅 대상입니다.</p></div>`;
  }
  function table() {
    const cols = [['house', '계사'], ['breed', '품종'], ['start', '입식'], ['ageOut', '종료 주령'], ['peak', '피크 %'], ['wk90', '90%↑ 주'], ['hh', '입식수당 산란'], ['mortPct', '누적 폐사 %'], ['mortCore', '폐사 % (종료 3주 제외)'], ['eggwt', '난중 g'], ['fcr', 'FCR']];
    const list = D.flocks.slice().sort((a, b) => { const x = a[S.sort], y = b[S.sort]; return (x > y ? 1 : x < y ? -1 : 0) * S.dir; });
    const st = f => f.ongoing ? '<span class="pro-chip blue">진행 중</span>' : f.trunc ? '<span class="pro-chip">기록 단절</span>' : f.ageOut < 60 ? '<span class="pro-chip amber">조기 종료</span>' : '<span class="pro-chip green">완결</span>';
    return `<div class="panel pro-row"><div class="panel-head"><div><h2>계군 성적표 <span class="result-pill">${D.flocks.length}개</span></h2><div class="panel-sub">열 제목 = 정렬 · 행 = 산란곡선에 추가 · ◉ = 일별 상세 · 붉은 값 = 누적 폐사 10% 초과 / 피크 90% 미만</div></div></div><div class="pro-table-wrap" style="max-height:440px"><table class="pro-table"><thead><tr>${cols.map(([k, n]) => `<th data-sort="${k}" style="cursor:pointer;white-space:nowrap">${n}${S.sort === k ? (S.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('')}<th>상태</th><th></th></tr></thead><tbody>${list.map(f => `<tr data-flock="${f.id}" class="${S.sel.includes(f.id) ? 'hl' : ''}" style="cursor:pointer"><td><b>${f.house}동</b></td><td>${esc(f.breed)}</td><td style="white-space:nowrap">${f.start}</td><td>${f.ageOut}</td><td style="color:${f.peak < 90 ? '#c2394f' : 'inherit'};font-weight:700">${f.peak}</td><td>${f.wk90}</td><td>${f.hh}</td><td style="color:${f.mortPct > 10 ? '#c2394f' : 'inherit'};font-weight:700">${f.mortPct}</td><td style="color:${f.mortCore > 10 ? '#c2394f' : 'inherit'}">${f.mortCore}</td><td>${f.eggwt || '—'}</td><td>${f.fcr ?? '—'}</td><td>${st(f)}</td><td><button class="btn btn-tiny" data-detail="${f.id}">◉</button></td></tr>`).join('')}</tbody></table></div><p class="pro-foot-note">입식수당 산란 = 계군 총 산란수 ÷ 입식 직후 수수. FCR = 사료 kg ÷ 계란 kg(난중 기록 기준). 계군 경계·주령은 기록에서 추정한 값입니다.</p></div>`;
  }
  function mortYear() {
    const comp = D.flocks.filter(f => f.complete || (f.ongoing && f.ageOut >= 50)); const yrs = [...new Set(comp.map(f => f.year))].sort();
    const rows = yrs.map(y => { const a = comp.filter(f => f.year === y); return { y, n: a.length, m: a.reduce((s, f) => s + f.mortCore * 70 / Math.max(f.ageOut, 50), 0) / a.length, hh: a.reduce((s, f) => s + f.hh, 0) / a.length }; }); const max = Math.max(...rows.map(r => r.m));
    return `<div class="panel"><div class="panel-head"><div><h2>입식 연도별 누적 폐사율</h2><div class="panel-sub">70주령 환산 · 종료 전 3주(도태 기록 혼입 가능) 제외 · 완결·50주 이상 진행 계군</div></div><span class="pro-badge-ai">KEY FINDING</span></div><div class="hist" style="height:190px">${rows.map(r => `<div title="${r.y}년 입식 ${r.n}개 계군 · 평균 ${r.m.toFixed(1)}%"><b>${r.m.toFixed(1)}%</b><span style="height:${r.m / max * 100}%;background:${r.m > 10 ? '#e8899a' : '#9fd9c7'}"></span><small>n=${r.n}</small></div>`).join('')}</div><div class="hist-x">${rows.map(r => `<span>${r.y}</span>`).join('')}</div><div class="flag red" style="margin-top:12px"><i>!</i><div><b>2023년 이후 입식 계군의 폐사가 뚜렷하게 늘었습니다</b>산란율 피크는 비슷한데 폐사만 늘어난 패턴입니다. 도태가 몰리는 종료 전 3주를 빼도 같은 경향입니다. 만성 질병(MG·대장균증·닭진드기 등), 더위 관리, 기록 방식 변화를 구분해야 합니다. 병성감정과 혈청 모니터링으로 원인을 가릴 수 있는 지점입니다.</div></div></div>`;
  }
  function heat() {
    const months = D.monthly.map(x => x.ym); const k = S.heat === 'lay' ? 0 : 1; const col = v => { if (v == null) return '#f3f6f8'; if (k === 0) { const t = Math.max(0, Math.min(1, (v - 60) / 35)); return `hsl(${160 * t},55%,${78 - t * 30}%)`; } const t = Math.max(0, Math.min(1, v / 8)); return `hsl(${350},${30 + t * 50}%,${95 - t * 45}%)`; };
    return `<div class="panel pro-row"><div class="panel-head"><div><h2>계사 × 월 히트맵</h2><div class="panel-sub">${k === 0 ? '월 산란율 — 밝은 칸 = 입식 초기·노계·이상 하락' : '일평균 폐사 (만 수당) — 진한 칸 = 폐사 많음'}</div></div><div class="pro-inline"><button class="pro-tab ${S.heat === 'lay' ? 'active' : ''}" data-heat="lay">산란율</button><button class="pro-tab ${S.heat === 'mort' ? 'active' : ''}" data-heat="mort">폐사</button></div></div><div style="overflow-x:auto"><div style="display:grid;grid-template-columns:44px repeat(${months.length},minmax(9px,1fr));gap:1px;min-width:900px">${['1', '2', '3', '4', '5', '6'].map(h => `<span style="font-size:11px;font-weight:800;color:#4b6274">${h}동</span>${months.map(m => { const v = (D.heat[h] || {})[m]; const x = v ? v[k] : null; return `<i title="${h}동 ${m}: ${x == null ? '기록 없음' : x + (k === 0 ? '%' : ' /만수/일')}" style="height:22px;background:${col(x)};display:block"></i>`; }).join('')}`).join('')}<span></span>${months.map((m, i) => `<span style="font-size:9px;color:#8395a5;writing-mode:vertical-rl;height:34px">${m.endsWith('-01') ? m.slice(0, 4) : ''}</span>`).join('')}</div></div></div>`;
  }
  function season() {
    const yrs = Object.keys(D.season).map(Number).sort(); const mo = Array.from({ length: 12 }, (_, i) => i + 1);
    const series = yrs.map((y, i) => ({ values: mo.map(m => D.season[y][m] ?? null), color: y === 2018 ? '#c2394f' : y >= 2024 ? '#e08a1e' : '#b8c6cf', dots: y === 2018 || y >= 2025 }));
    return `<div class="panel"><div class="panel-head"><div><h2>월별 폐사 계절성</h2><div class="panel-sub">연도별 일평균 폐사 (만 수당) · 붉은 선 = 2018년 · 주황 = 2024년 이후</div></div></div>${lineChart({ series, labels: mo.map(m => m + '월'), h: 220, yMin: 0 })}<p class="pro-hint">${seasonNote()}</p></div>`;
  }
  function seasonNote() {
    const cells = []; Object.entries(D.season).forEach(([y, v]) => Object.entries(v).forEach(([m, x]) => cells.push({ y, m, x }))); cells.sort((a, b) => b.x - a.x);
    const med = cells.map(c => c.x).sort((a, b) => a - b)[Math.floor(cells.length / 2)]; const top = cells.slice(0, 3);
    const evs = t => D.events.filter(e => e.t === 'mort' && e.date.startsWith(`${t.y}-${String(t.m).padStart(2, '0')}`)).map(e => e.house + '동').filter((v, i, a) => a.indexOf(v) === i).join('·');
    return `월 폐사가 가장 높았던 달: ${top.map(t => `<b>${t.y}년 ${t.m}월</b> ${t.x}/만수 (${evs(t) || '여러 동'})`).join(', ')} — 전체 월 중앙값 ${med}의 ${Math.round(top[0].x / med)}배. 2024년 11월은 4동 계군 종료(70주령) 직전에 하루 1천 수 이상이 폐사로 기록돼, 도태가 폐사 칸에 함께 적혔을 가능성이 있습니다. 2018년 8월에는 전 계사 수수가 40% 안팎 줄었는데 폐사로는 잡히지 않아 도태·출하를 별도 칸으로 적어야 합니다.`;
  }
  function events() {
    const ev = D.events.slice().sort((a, b) => b.date.localeCompare(a.date));
    return `<div class="panel"><div class="panel-head"><div><h2>자동 탐지된 이상 구간 <span class="result-pill">${ev.length}건</span></h2><div class="panel-sub">폐사 급증: 직전 21일 중앙값의 5배 & 만 수당 6수 초과 · 산란 하락: 24–70주령에서 7일 평균이 직전 2주 대비 6%p 이상 하락</div></div></div><div class="pro-list" style="max-height:420px">${ev.map(e => `<button type="button" class="pro-item" data-detail="${e.flock}" data-ev="${e.date}"><span class="dot" style="background:${e.t === 'mort' ? '#c2394f' : '#e08a1e'}"></span><span class="grow"><b>${e.date}${e.end !== e.date ? ' ~ ' + e.end.slice(5) : ''} · ${e.house}동 · ${e.t === 'mort' ? '폐사 급증' : '산란율 하락'}</b><small>${e.t === 'mort' ? `폐사 ${fmt(e.val)}수 · 최고 ${e.peak}/만수 (평소 ${e.base})` : `7일 평균 ${e.val}% (직전 ${e.base}%)`}${e.aw ? ` · ${e.aw}주령` : ''} → ${e.t === 'mort' ? '병성감정 의뢰 후보' : 'IB·EDS·AI(H9) 검사 후보'}</small></span></button>`).join('')}</div></div>`;
  }
  function detail() {
    const f = flock(S.detail); if (!f) return ''; const d = f.daily; const n = d.lay.length; const start = new Date(f.start); const labels = Array.from({ length: n }, (_, i) => { const t = new Date(start.getTime() + i * 864e5); return `${String(t.getFullYear()).slice(2)}.${t.getMonth() + 1}`; });
    const evs = D.events.filter(e => e.flock === f.id); const mk = evs.slice(0, 4).map(e => ({ i: Math.round((new Date(e.date) - start) / 864e5), label: e.t === 'mort' ? '폐사↑' : '산란↓', color: e.t === 'mort' ? '#c2394f' : '#e08a1e' }));
    const sm = (a, k = 7) => a.map((_, i) => { const w = a.slice(Math.max(0, i - k + 1), i + 1).filter(x => x != null); return w.length ? Math.round(w.reduce((s, x) => s + x, 0) / w.length * 10) / 10 : null; });
    return `<div class="panel pro-row" id="fdDetail"><div class="panel-head"><div><h2>계군 일별 상세 · ${esc(label(f))}</h2><div class="panel-sub">${esc(f.breed)} · ${f.start} ~ ${f.end} · 입식 ${fmt(f.birds0)}수 → ${fmt(f.birdsEnd)}수 · 피크 ${f.peak}% (${f.peakAge}주) · 누적 폐사 ${f.mortPct}%</div></div><span class="pro-chip">${evs.length ? '이상 구간 ' + evs.length + '건' : '이상 구간 없음'}</span></div>
      <div class="pro-grid pro-2e"><div><b style="font-size:12px">산란율 (%)</b>${lineChart({ series: [{ values: d.lay, color: '#b8d9cf' }, { values: sm(d.lay), color: '#0e806b' }], labels, markers: mk, yMin: 0, yMax: 100, h: 170 })}</div><div><b style="font-size:12px">일 폐사 (수)</b>${lineChart({ series: [{ values: d.mort, color: '#e8a3ae' }, { values: sm(d.mort), color: '#c2394f' }], labels, markers: mk, yMin: 0, h: 170 })}</div><div><b style="font-size:12px">수당 사료 (g/일)</b>${lineChart({ series: [{ values: sm(d.fpb), color: '#e08a1e' }], labels, yMin: 60, h: 150 })}</div><div><b style="font-size:12px">수당 급수 (ml/일)</b>${lineChart({ series: [{ values: sm(d.wpb), color: '#2c7fd0' }], labels, yMin: 100, h: 150 })}</div></div></div>`;
  }
  function grade() {
    const ws = Object.keys(D.grade).map(Number).filter(w => w >= 20 && w <= 90).sort((a, b) => a - b); const W = 640, H = 220, pl = 34, pb = 24; const X = i => pl + i / (ws.length - 1) * (W - pl - 10); const Y = v => 8 + (1 - v / 100) * (H - pb - 8);
    const names = ['왕란', '특란', '대란', '중란', '소란'], cols = ['#10283b', '#0e806b', '#7cc4ad', '#e8c27a', '#e8899a']; let acc = ws.map(() => 0); let g = '';
    for (let k = 0; k < 5; k++) { const lo = acc.slice(); const hi = ws.map((w, i) => acc[i] + D.grade[w][k]); g += `<polygon fill="${cols[k]}" opacity=".9" points="${hi.map((v, i) => X(i) + ',' + Y(Math.min(100, v))).join(' ')} ${lo.map((v, i) => X(i) + ',' + Y(Math.min(100, v))).reverse().join(' ')}"><title>${names[k]}</title></polygon>`; acc = hi; }
    ws.forEach((w, i) => { if (w % 10 === 0) g += `<text class="c-axis" x="${X(i)}" y="${H - 6}" text-anchor="middle">${w}주</text>`; });
    [0, 50, 100].forEach(v => g += `<text class="c-axis" x="${pl - 4}" y="${Y(v) + 3}" text-anchor="end">${v}%</text>`);
    const defMax = Math.max(...ws.map(w => D.grade[w][5])); g += `<polyline fill="none" stroke="#c2394f" stroke-width="2" stroke-dasharray="4 3" points="${ws.map((w, i) => X(i) + ',' + Y(D.grade[w][5] / Math.max(defMax, .1) * 60)).join(' ')}"/>`;
    return `<div class="panel"><div class="panel-head"><div><h2>주령별 계란 등급 구성</h2><div class="panel-sub">전 계군 합산 · 붉은 점선 = 파란·크랙 비율 (상대 척도, 최대 ${defMax.toFixed(2)}%)</div></div></div><div class="chart-box"><svg viewBox="0 0 ${W} ${H}">${g}</svg></div><div class="sim-legend">${names.map((n, k) => `<span><i style="background:${cols[k]}"></i>${n}</span>`).join('')}</div><p class="pro-hint">주령이 오를수록 왕·특란 비중이 커지고 파란·크랙도 늘어납니다. 출하 단가와 묶으면 도태 시점 판단(경제적 주령)에 쓸 수 있습니다.</p></div>`;
  }
  function lead() {
    const l = D.lead; return `<div class="panel"><div class="panel-head"><div><h2>검증: 급수량 감소가 폐사를 예고할까?</h2><div class="panel-sub">수당 급수가 직전 7일 평균보다 12% 이상 줄어든 날(${fmt(l.nDrop)}일) vs 나머지(${fmt(l.nAll - l.nDrop)}일)</div></div><span class="pro-badge-ai">HYPOTHESIS TEST</span></div><div class="compare" style="grid-template-columns:1fr 1fr"><div><small>다음 3일 폐사 / 평소 (중앙값)</small><b>${l.ratioDrop}배</b><em>급수 감소일 · 나머지 ${l.ratioOther}배</em></div><div><small>다음 3일 폐사 2배 이상 확률</small><b>${l.pSpikeDrop}%</b><em>나머지 ${l.pSpikeOther}%</em></div></div><div class="flag amber" style="margin-top:12px"><i>△</i><div><b>이 농장 기록만으로는 약한 신호입니다</b>일 단위 수기 기록(계량 시점·누락)의 잡음이 커서 조기경보로 쓰기 어렵습니다. 유량계 자동 수집(시간 단위)과 검사 결과를 붙이면 다시 검증할 가치가 있습니다. — 안 되는 것도 숫자로 확인해 두는 것이 분석의 출발점입니다.</div></div></div>`;
  }
  function insight() {
    return `<div class="panel pro-row"><div class="panel-head"><div><h2>이 데이터로 반석이 할 수 있는 것</h2><div class="panel-sub">진단기관 관점 정리</div></div></div><div class="pro-grid pro-3">${[
      ['red', '폐사 증가 원인 규명', '2023년 이후 계군 누적 폐사가 2020년 이전의 약 2배. 이상 구간 목록을 병성감정·세균 분리·MG 혈청검사 일정과 연결하면 원인을 가릴 수 있습니다.'],
      ['amber', '이상 하락 → 검사 권고 자동화', `산란율 하락 ${D.events.filter(e => e.t === 'lay').length}건, 폐사 급증 ${D.events.filter(e => e.t === 'mort').length}건이 9년 기록에서 자동으로 잡힙니다. 실시간으로 받으면 포털에 "검사 권고" 알림을 띄울 수 있습니다.`],
      ['blue', '계군 성적 벤치마크', '같은 농장 과거 계군 대비 곡선은 농장주가 바로 이해합니다. 여러 고객 농장 데이터가 모이면 지역·품종 벤치마크 서비스가 됩니다.'],
      ['green', '항체가와 생산성 연결', '같은 계군 ID로 ND·IB·H9 항체가를 붙이면 "항체가가 낮았던 계군의 산란 지속성"처럼 백신 효과를 생산성으로 설명할 수 있습니다.'],
      ['blue', '입력 부담 줄이기', '109개 시트·수식 오류(#DIV/0!)·주령 표기 혼재를 정리하는 데 대부분의 시간이 들었습니다. 일일 입력 앱이나 기존 엑셀 업로드 자동 정리만으로도 가치가 큽니다.'],
      ['amber', '기록 항목 보완', '도태·출하 수수, 체중, 온도·습도 기록이 거의 없습니다. 폐사와 도태를 나눠 적고 체중을 주 1회만 기록해도 원인 분석 정확도가 크게 오릅니다.']
    ].map(([c, t, x]) => `<div class="flag ${c}" style="margin:0"><i>◆</i><div><b>${t}</b>${x}</div></div>`).join('')}</div></div>`;
  }
  function render() {
    body.innerHTML = kpis() + `<div class="pro-grid pro-2">${trend()}${mortYear()}</div><div class="pro-row">${curves()}</div>${table()}${detail()}${heat()}<div class="pro-grid pro-2 pro-row">${events()}${season()}</div><div class="pro-grid pro-2 pro-row">${grade()}${lead()}</div>${insight()}`;
  }
  document.addEventListener('click', e => {
    if (!D) return; const t = e.target.closest('button,[data-flock],th[data-sort]'); if (!t) return;
    if (t.dataset.metric) { S.metric = t.dataset.metric; render(); return; }
    if (t.dataset.heat) { S.heat = t.dataset.heat; render(); return; }
    if (t.dataset.sort) { if (S.sort === t.dataset.sort) S.dir *= -1; else { S.sort = t.dataset.sort; S.dir = t.dataset.sort === 'start' ? 1 : -1; } render(); return; }
    if (t.dataset.unsel) { S.sel = S.sel.filter(x => x !== t.dataset.unsel); render(); return; }
    if (t.dataset.detail) { S.detail = t.dataset.detail; if (!S.sel.includes(t.dataset.detail)) S.sel = [...S.sel, t.dataset.detail].slice(-6); render(); document.getElementById('fdDetail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (t.dataset.flock) { const id = t.dataset.flock; S.sel = S.sel.includes(id) ? S.sel.filter(x => x !== id) : [...S.sel, id].slice(-6); render(); return; }
    if (t.id === 'fdCsv') { download('farm_flock_scorecard.csv', csv([['계군', '계사', '품종', '입식', '종료', '입식주령', '종료주령', '입식수수', '피크산란율', '피크주령', '90%이상주수', '입식수당산란', '누적폐사율', '폐사율(종료3주제외)', '평균난중', 'FCR', '수당사료g', '수당급수ml', '파란크랙%'], ...D.flocks.map(f => [f.id, f.house, f.breed, f.start, f.end, f.ageIn, f.ageOut, f.birds0, f.peak, f.peakAge, f.wk90, f.hh, f.mortPct, f.mortCore, f.eggwt, f.fcr, f.fpb, f.wpb, f.defect])]), 'text/csv;charset=utf-8'); toast('계군 성적표를 내려받았습니다.'); }
  });
})();
