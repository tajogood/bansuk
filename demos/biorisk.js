/* 14 차단방역 위험평가 · 컨설팅 — digital version of the 2017 farm-type biosecurity assessment.
   Factors, weights, swab results and disinfectant tests are fabricated for demonstration. */
(function () {
  const { esc, rng, toast, download, csv, shell, fmt, store, save, lineChart } = PRO;
  const TYPES = { layer: '산란계 (케이지)', broiler: '육계 (평사)', breeder: '종계', duck: '육용오리 (평사)' };
  const CAT = { 출입통제: '#2c7fd0', 동선분리: '#0e806b', 야생동물: '#9a4fd6', 위생소독: '#e08a1e', 입지환경: '#c2394f', 인력교육: '#46607a' };
  // [id, 항목, 범주, 기본가중치, {type 가중치 보정}, 개선 권고, 비용]
  const F = [
    ['F01', '차량 출입구 소독시설 (고정식·바퀴)', '출입통제', 8, {}, '고정식 차량 소독기 + 바퀴 소독조 설치, 동절기 동결 방지 확인', '중'],
    ['F02', '대인 소독·환복실 운영', '출입통제', 7, {}, '샤워 또는 환복 후 입장, 농장 전용 의복 비치', '중'],
    ['F03', '전실(앞방) 장화 교체·발판 소독', '출입통제', 8, {}, '축사별 전실에서 장화 교체, 발판 소독조 매일 교체', '하'],
    ['F04', '외부인·차량 출입 기록', '출입통제', 5, {}, '출입 기록부 → QR 출입 기록으로 전환', '하'],
    ['F05', '사료 운반 동선 (외부 차량 내부 진입 여부)', '동선분리', 7, {}, '사료빈 외곽 배치, 외부 차량 내부 진입 금지', '상'],
    ['F06', `계란·출하 동선 분리`, '동선분리', 6, { duck: 7, broiler: 7 }, '출하 차량 전용 구역 지정, 작업 후 구역 소독', '중'],
    ['F07', '분뇨·깔짚 반출 관리', '동선분리', 6, { duck: 9, broiler: 7 }, '반출 차량 동선 분리, 반출 후 진입로 소독', '중'],
    ['F08', '축사 간 이동 동선', '동선분리', 5, {}, '어린 계군 → 성계 순 작업, 축사별 장화 구분', '하'],
    ['F09', '야생조류 차단망·틈새', '야생동물', 8, { duck: 10 }, '그물망 보수, 환기구 차단망 설치, 사료 유실 정리', '중'],
    ['F10', '설치류·해충 관리', '야생동물', 6, {}, '쥐덫 지도화·월 점검, 축사 주변 1m 정리', '하'],
    ['F11', '폐사체 보관·처리', '위생소독', 7, {}, '밀폐 냉장 보관함, 수거 차량 농장 외곽 인계', '중'],
    ['F12', '음수 소독·수질', '위생소독', 5, { duck: 7 }, '음수 소독 농도 주 1회 측정, 니플 라인 세척', '하'],
    ['F13', '소독제 희석·교체 주기', '위생소독', 7, {}, '희석 배수 표기, 발판 소독조 1일 1회 교체, 효능 확인 검사', '하'],
    ['F14', '철새도래지·하천 근접', '입지환경', 6, { duck: 9 }, '고위험 시기 출입 최소화, 주변 소독 강화', '상'],
    ['F15', '인근 가금농장 밀집도', '입지환경', 5, {}, '인근 농장과 장비·인력 공유 금지 협약', '하'],
    ['F16', '종사자 교육·모국어 매뉴얼', '인력교육', 6, {}, '분기 1회 교육, 외국인 근로자 모국어 그림 매뉴얼 제공', '하']
  ];
  const FARMS = [
    { id: 'BF1', name: '가상농장 음성-03', type: 'layer', model: true }, { id: 'BF2', name: '가상농장 천안-05', type: 'broiler', model: true },
    { id: 'BF3', name: '가상농장 나주-01', type: 'duck', model: true }, { id: 'BF4', name: '가상 종계장 다', type: 'breeder', model: false }, { id: 'BF5', name: '가상농장 영암-02', type: 'duck', model: true }
  ];
  function seedScores(seed, improved) { const r = rng(seed); const o = {}; F.forEach((f, k) => { const base = Math.floor(r() * 3.2); const bump = r(); o[f[0]] = improved ? Math.min(3, base + (base <= 1 ? 1 : 0) + (bump < .35 ? 1 : 0)) : base; }); return o; }
  const SWAB = ['차량 출입구 바닥', '전실 장화·발판', '사료빈 주변', '음수 니플', '축사 내부 바닥', '폐사체 보관함', '출하 작업장'];
  function seedSwab(seed, improved) { const r = rng(seed + 50); return SWAB.map(p => { const base = 3.6 + r() * 2.6; const red = .4 + r() * 1.8; const s1 = r() < .35; const s2 = s1 && r() < .25; const cfu = improved ? base - red : base; return { p, cfu: +cfu.toFixed(1), coli: +(cfu - 1.5).toFixed(1), sal: improved ? s2 : s1 }; }); }
  const STATE = store('biorisk', null);
  const S = Object.assign({ farm: 'BF3', round: 2, scores: {} }, STATE || {});
  FARMS.forEach((f, i) => { if (!S.scores[f.id]) S.scores[f.id] = { 1: seedScores(100 + i, false), 2: seedScores(100 + i, true) }; });
  const persist = () => save('biorisk', { farm: S.farm, round: S.round, scores: S.scores });
  const farm = () => FARMS.find(f => f.id === S.farm);
  const w = (f, type) => f[4][type] ?? f[3];
  function evalRound(fid, round) { const fm = FARMS.find(x => x.id === fid); const sc = S.scores[fid][round]; let tot = 0, got = 0; const cats = {}; const gaps = []; F.forEach(f => { const ww = w(f, fm.type); tot += ww * 3; got += ww * sc[f[0]]; const c = cats[f[2]] = cats[f[2]] || { tot: 0, got: 0 }; c.tot += ww * 3; c.got += ww * sc[f[0]]; gaps.push({ f, gap: ww * (3 - sc[f[0]]), v: sc[f[0]] }); }); const risk = Math.round((1 - got / tot) * 100); return { risk, cats, gaps: gaps.sort((a, b) => b.gap - a.gap) }; }
  const DISINF = [['4급 암모늄 A (가상)', '1:500', '발판 소독조', '3일 경과', 'fail'], ['과산화물 B (가상)', '1:200', '차량 소독기', '당일 조제', 'pass'], ['알데하이드 C (가상)', '1:1000', '대인 분무', '7일 경과', 'fail'], ['4급 암모늄 A (가상)', '1:500', '전실 발판', '당일 교체', 'pass'], ['차아염소산 D (가상)', '1:400', '음수 라인', '보관 21일', 'warn']];
  const body = shell({
    key: 'biorisk', code: 'BIOSECURITY ASSESSMENT', title: '차단방역 위험평가 · 컨설팅',
    subtitle: '2017년 사육유형별 차단방역 매뉴얼 과제의 <b>평가표·위험요소·오염도 조사·전후 비교</b>를 디지털로 옮겼습니다. 현장에서 점수를 매기면 <b>사육유형별 가중 위험지수</b>, <b>파레토 핵심 개선 항목</b>, 환경 시료 검사 결과와 함께 컨설팅 보고서가 바로 나옵니다.',
    toolbar: '<button class="btn" id="brCsv" type="button">↓ 평가표 CSV</button><button class="btn btn-primary" id="brReport" type="button">✳ 컨설팅 보고서</button>',
    reset: () => { localStorage.removeItem('bansuk_pro_biorisk'); location.reload(); },
    note: '평가 항목·가중치·환경 시료·소독제 결과는 시연용 가상값입니다. 실제 평가표와 가중치는 반석의 2017년 과제 결과와 현장 자문으로 확정합니다. 법정 방역 기준 점검을 대신하지 않습니다.'
  });
  function render() {
    const fm = farm(); const e1 = evalRound(fm.id, 1), e2 = evalRound(fm.id, 2); const cur = S.round === 1 ? e1 : e2; const sc = S.scores[fm.id][S.round];
    const sw1 = seedSwab(FARMS.indexOf(fm), false), sw2 = seedSwab(FARMS.indexOf(fm), true); const swCur = S.round === 1 ? sw1 : sw2;
    const totalGap = cur.gaps.reduce((s, x) => s + x.gap, 0) || 1; let cum = 0; const pareto = cur.gaps.filter(x => x.gap > 0).map(x => { cum += x.gap; return { ...x, pct: x.gap / totalGap * 100, cum: cum / totalGap * 100 }; });
    const tone = v => v >= 50 ? 'red' : v >= 30 ? 'amber' : 'green';
    body.innerHTML = `<div class="panel" style="margin-bottom:18px"><div class="pro-inline" style="justify-content:space-between"><div class="pro-inline"><label class="pro-field" style="min-width:260px">평가 농장<select class="select" id="brFarm">${FARMS.map(f => `<option value="${f.id}" ${f.id === S.farm ? 'selected' : ''}>${esc(f.name)} · ${TYPES[f.type]}${f.model ? ' · 모델농가' : ''}</option>`).join('')}</select></label><div class="pro-inline" style="margin-top:18px">${[[1, '1차 평가 (컨설팅 전)'], [2, '2차 평가 (컨설팅 후)']].map(([k, n]) => `<button class="pro-tab ${S.round === k ? 'active' : ''}" data-round="${k}">${n}</button>`).join('')}</div></div><span class="pro-chip">사육유형 가중치: ${TYPES[fm.type]}</span></div></div>
    <div class="pro-kpis"><div class="pro-kpi ${cur.risk >= 50 ? 'alert' : ''}"><small>위험지수 (0=최저)</small><b style="color:${cur.risk >= 50 ? '#c2394f' : cur.risk >= 30 ? '#a76a0c' : '#127b62'}">${cur.risk}</b><em class="${cur.risk >= 30 ? 'down' : ''}">${cur.risk >= 50 ? '고위험' : cur.risk >= 30 ? '주의' : '양호'}</em></div><div class="pro-kpi"><small>컨설팅 전 → 후</small><b>${e1.risk} → ${e2.risk}</b><em>${e1.risk - e2.risk >= 0 ? '−' : '+'}${Math.abs(e1.risk - e2.risk)}점</em></div><div class="pro-kpi"><small>미흡 항목 (0–1점)</small><b>${Object.values(sc).filter(v => v <= 1).length}</b><em>${F.length}개 항목 중</em></div><div class="pro-kpi ${swCur.some(x => x.sal) ? 'alert' : ''}"><small>살모넬라 검출 지점</small><b>${swCur.filter(x => x.sal).length}</b><em class="${swCur.some(x => x.sal) ? 'down' : ''}">환경 시료 ${SWAB.length}지점</em></div><div class="pro-kpi"><small>평균 일반세균</small><b>${(swCur.reduce((a, b) => a + b.cfu, 0) / swCur.length).toFixed(1)}</b><em>log CFU/㎠ · 전 ${(sw1.reduce((a, b) => a + b.cfu, 0) / sw1.length).toFixed(1)}</em></div><div class="pro-kpi"><small>소독제 효능 부적합</small><b>${DISINF.filter(d => d[4] === 'fail').length}/${DISINF.length}</b><em class="down">수거 시료 기준</em></div></div>
    <div class="pro-grid pro-2"><div class="panel"><div class="panel-head"><div><h2>현장 평가표 · ${S.round}차</h2><div class="panel-sub">0 미흡 · 1 보통 · 2 양호 · 3 우수 — 바꾸면 즉시 재계산 · 가중치는 사육유형별</div></div><span class="pro-badge-ai">TABLET FORM</span></div><div class="pro-table-wrap" style="max-height:560px"><table class="pro-table"><thead><tr><th>항목</th><th>범주</th><th>가중</th><th>점수</th></tr></thead><tbody>${F.map(f => `<tr><td><b>${esc(f[1])}</b></td><td><span class="pro-chip" style="color:${CAT[f[2]]}">${f[2]}</span></td><td>${w(f, fm.type)}</td><td><div class="pro-inline" style="gap:3px">${[0, 1, 2, 3].map(v => `<button class="btn btn-tiny" data-score="${f[0]}|${v}" style="min-width:28px;padding:4px 0;${sc[f[0]] === v ? `background:${['#c2394f', '#e08a1e', '#7cc4ad', '#0e806b'][v]};color:#fff;border-color:transparent` : ''}">${v}</button>`).join('')}</div></td></tr>`).join('')}</tbody></table></div></div>
    <div class="panel"><div class="panel-head"><div><h2>범주별 충족도</h2><div class="panel-sub">막대 = ${S.round}차 · 점선 = ${S.round === 1 ? '2차' : '1차'}</div></div></div>${Object.entries(cur.cats).map(([c, v]) => { const o = (S.round === 1 ? e2 : e1).cats[c]; const p = Math.round(v.got / v.tot * 100), po = Math.round(o.got / o.tot * 100); return `<div class="progress-row"><span class="progress-label" style="width:80px">${c}</span><div class="progress-track" style="position:relative"><span style="width:${p}%;background:${CAT[c]}"></span><i style="position:absolute;left:${po}%;top:-3px;bottom:-3px;border-left:2px dashed #10283b"></i></div><span class="progress-number">${p}%</span></div>`; }).join('')}
      <h3 style="font-size:13px;margin:18px 0 8px">핵심 개선 항목 (파레토 80%)</h3><div class="pro-list" style="max-height:300px">${pareto.filter((x, i) => i === 0 || pareto[i - 1].cum < 80).map(x => `<div class="pro-item"><span class="score-pill" style="background:#fdecee;color:#c2394f">${Math.round(x.pct)}%</span><span class="grow"><b>${esc(x.f[1])}</b><small>${esc(x.f[5])} · 비용 ${x.f[6]} · 누적 ${Math.round(x.cum)}%</small></span></div>`).join('') || '<div class="flag green"><i>✓</i><div><b>개선 필요 항목 없음</b></div></div>'}</div><p class="pro-hint">2014년 과제에서 쓴 "문제점 60–80%를 점유하는 항목을 핵심으로 선정" 방식을 그대로 자동화했습니다.</p></div></div>
    <div class="pro-grid pro-2 pro-row"><div class="panel"><div class="panel-head"><div><h2>환경 시료 오염도 (반석 검사)</h2><div class="panel-sub">컨설팅 전 1차 vs 후 2차 · 지점별 일반세균 log CFU/㎠ · 살모넬라 검출</div></div></div><table class="pro-table"><thead><tr><th>채취 지점</th><th>1차</th><th>2차</th><th>변화</th><th>살모넬라</th></tr></thead><tbody>${SWAB.map((p, i) => { const a = sw1[i], b = sw2[i]; return `<tr><td><b>${p}</b></td><td>${a.cfu}</td><td>${b.cfu}</td><td><div class="pro-inline"><div class="pro-bar" style="width:60px"><span style="width:${Math.min(100, (a.cfu - b.cfu) / a.cfu * 100 * 2)}%"></span></div>−${Math.round((1 - Math.pow(10, b.cfu - a.cfu)) * 1000) / 10}%</div></td><td>${a.sal ? '<span class="pro-chip red">1차 검출</span>' : ''} ${b.sal ? '<span class="pro-chip red">2차 검출</span>' : (a.sal ? '<span class="pro-chip green">2차 불검출</span>' : '<span class="pro-chip green">불검출</span>')}</td></tr>`; }).join('')}</tbody></table><p class="pro-hint">오염도 감소율 = 1 − 10^(2차−1차). 시료 채취는 수거 경로·LIMS와 같은 계군 ID로 연결됩니다.</p></div>
    <div class="panel"><div class="panel-head"><div><h2>모델농가 전후 비교</h2><div class="panel-sub">과제처럼 모델농가 묶음의 컨설팅 효과를 한 번에 평가</div></div></div>${lineChart({ series: [{ values: FARMS.filter(f => f.model).map(f => evalRound(f.id, 1).risk), color: '#c2394f', dots: true }, { values: FARMS.filter(f => f.model).map(f => evalRound(f.id, 2).risk), color: '#0e806b', dots: true }], labels: FARMS.filter(f => f.model).map(f => f.name.replace('가상농장 ', '')), yMax: 100, h: 200 })}<div class="sim-legend"><span><i style="background:#c2394f"></i>1차 위험지수</span><span><i style="background:#0e806b"></i>2차 위험지수</span></div>
      <h3 style="font-size:13px;margin:16px 0 8px">수거 소독제 효능 확인</h3><table class="pro-table"><thead><tr><th>제품</th><th>희석</th><th>사용처</th><th>상태</th><th>효능</th></tr></thead><tbody>${DISINF.map(d => `<tr><td>${esc(d[0])}</td><td>${d[1]}</td><td>${d[2]}</td><td>${d[3]}</td><td><span class="pro-chip ${d[4] === 'pass' ? 'green' : d[4] === 'warn' ? 'amber' : 'red'}">${d[4] === 'pass' ? '적합' : d[4] === 'warn' ? '경계' : '부적합'}</span></td></tr>`).join('')}</tbody></table><p class="pro-hint">부적합은 대부분 "조제 후 경과일" 문제 → 발판 소독조 1일 교체 권고가 자동 반영됩니다.</p></div></div>`;
  }
  function report() { const fm = farm(); const e1 = evalRound(fm.id, 1), e2 = evalRound(fm.id, 2); const top = e2.gaps.filter(x => x.gap > 0).slice(0, 5); return `차단방역 컨설팅 보고서 (초안 · 가상 데이터)\n━━━━━━━━━━━━━━━━━━━━\n농장: ${fm.name} · ${TYPES[fm.type]}\n평가: 1차(컨설팅 전) / 2차(컨설팅 후)\n\n1. 위험지수: ${e1.risk} → ${e2.risk} (${e1.risk - e2.risk >= 0 ? '−' : '+'}${Math.abs(e1.risk - e2.risk)}점)\n2. 범주별 충족도 (2차)\n${Object.entries(e2.cats).map(([c, v]) => ` - ${c}: ${Math.round(v.got / v.tot * 100)}%`).join('\n')}\n\n3. 남은 핵심 개선 항목\n${top.map((x, i) => ` ${i + 1}. ${x.f[1]} — ${x.f[5]} (비용 ${x.f[6]})`).join('\n') || ' - 없음'}\n\n4. 환경 시료 · 소독제\n - 살모넬라 검출 지점: 1차 ${seedSwab(FARMS.indexOf(fm), false).filter(x => x.sal).length} → 2차 ${seedSwab(FARMS.indexOf(fm), true).filter(x => x.sal).length}\n - 소독제 효능 부적합 ${DISINF.filter(d => d[4] === 'fail').length}건: 조제 후 경과일 관리 필요\n\n5. 다음 방문: 4주 후 재평가 권장\n※ 가중치·기준은 시연값이며 최종 권고는 담당 수의사가 작성합니다.\n`; }
  body.addEventListener('change', e => { if (e.target.id === 'brFarm') { S.farm = e.target.value; persist(); render(); } });
  document.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.round) { S.round = +t.dataset.round; persist(); render(); }
    if (t.dataset.score) { const [id, v] = t.dataset.score.split('|'); S.scores[S.farm][S.round][id] = +v; persist(); render(); }
    if (t.id === 'brReport') { download(`BANSUK_biosecurity_${S.farm}.txt`, report()); toast('컨설팅 보고서 초안을 내려받았습니다.'); }
    if (t.id === 'brCsv') { const fm = farm(); download(`BANSUK_assessment_${fm.id}.csv`, csv([['농장', '사육유형', '항목ID', '항목', '범주', '가중치', '1차', '2차'], ...F.map(f => [fm.name, TYPES[fm.type], f[0], f[1], f[2], w(f, fm.type), S.scores[fm.id][1][f[0]], S.scores[fm.id][2][f[0]]])]), 'text/csv;charset=utf-8'); toast('평가표 CSV를 내려받았습니다.'); }
  });
  render();
})();
