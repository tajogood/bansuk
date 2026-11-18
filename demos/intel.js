/* 10 진단 데이터 질병 동향 — fabricated aggregated test results, binomial z-score anomaly flags. */
(function () {
  const { esc, rng, mapBase, bbox, lineChart, toast, download, csv, shell, fmt, typewrite } = PRO;
  const r = rng(1010);
  const REG = [['경기', 1.1], ['강원', .3], ['충북', 1.3], ['충남', 1.4], ['전북', 1.0], ['전남', .9], ['경북', .7], ['경남', .5], ['제주', .15]];
  const DIS = {
    H9: { name: 'H9N2 (LPAI) PCR', base: .06, amp: .05, peak: 6, color: '#c2394f' },
    IB: { name: 'IB PCR', base: .12, amp: .06, peak: 4, color: '#2c7fd0' },
    MG: { name: 'MG (마이코플라즈마) PCR', base: .09, amp: .015, peak: 0, color: '#9a4fd6' },
    SAL: { name: '살모넬라(SE/SG) 배양', base: .035, amp: .02, peak: 33, color: '#e08a1e' },
    APEC: { name: '병원성 대장균 분리', base: .18, amp: .04, peak: 30, color: '#0e806b' }
  };
  const W = 52; const weekLabel = i => { const d = new Date(2025, 10, 24 + i * 7); return `${String(d.getFullYear()).slice(2)}.${d.getMonth() + 1}.${d.getDate()}`; };
  const expected = (dk, i) => { const D = DIS[dk]; const wk = (i + 47) % 52; return Math.max(.005, D.base + D.amp * Math.cos((wk - D.peak) / 52 * 2 * Math.PI)); };
  // data[dk][reg][i] = {n, pos}
  const DATA = {};
  Object.keys(DIS).forEach(dk => { DATA[dk] = {}; REG.forEach(([rg, sz]) => { DATA[dk][rg] = Array.from({ length: W }, (_, i) => { const n = Math.max(0, Math.round((40 + r() * 25) * sz * (dk === 'SAL' || dk === 'APEC' ? .6 : 1))); let p = expected(dk, i) * (0.85 + r() * .3);
    if (dk === 'IB' && rg === '충남' && i >= W - 3) p *= 1.9 + (i - (W - 3)) * .25;
    if (dk === 'H9' && rg === '전북' && i === W - 5) p *= 2.6;
    if (dk === 'MG' && rg === '경기' && i >= W - 8) p *= 1 + (i - (W - 8)) * .12;
    let pos = 0; for (let k = 0; k < n; k++) if (r() < p) pos++; return { n, pos }; }); }); });
  const S = { dis: 'IB', week: W - 1, region: null, audience: '계열사' };
  const body = shell({
    key: 'intel', code: 'DIAGNOSTIC INTELLIGENCE', title: '진단 데이터 질병 동향',
    subtitle: '매주 쌓이는 검사 결과를 <b>지역·질병·주차별 양성률</b>로 모아 계절 기대치와 비교하고, <b>통계적으로 튀는 신호</b>를 먼저 알립니다. 비식별 집계 리포트는 고객 서비스이자 <b>데이터 사업</b>이 됩니다.',
    toolbar: '<button class="btn" id="inCsv" type="button">↓ 집계 데이터 CSV</button><button class="btn btn-primary" id="inReport" type="button">✳ 고객용 월간 리포트</button>',
    note: '모든 검사 건수·양성률·이상 신호는 가상입니다. 실서비스에서는 고객 동의·비식별 처리(표본 부족 지역 비공개) 후 집계하며, 법정 전염병 양성은 별도 신고 절차를 따릅니다.'
  });
  const agg = (dk, i, rg) => { const regs = rg ? [rg] : REG.map(x => x[0]); let n = 0, pos = 0; regs.forEach(x => { const d = DATA[dk][x][i]; n += d.n; pos += d.pos; }); return { n, pos, rate: n ? pos / n : 0 }; };
  const zscore = (dk, i, rg) => { const a = agg(dk, i, rg); const e = expected(dk, i); return a.n ? (a.rate - e) / Math.sqrt(e * (1 - e) / a.n) : 0; };
  function anomalies() { const out = []; Object.keys(DIS).forEach(dk => REG.forEach(([rg]) => { for (let i = W - 6; i < W; i++) { const a = agg(dk, i, rg); if (a.n < 15) continue; const z = zscore(dk, i, rg); if (z > 2.5) out.push({ dk, rg, i, z, a }); } })); const best = {}; out.forEach(o => { const k = o.dk + o.rg; if (!best[k] || o.i > best[k].i) best[k] = o; }); return Object.values(best).sort((a, b) => b.z - a.z); }
  const rateCol = (v, max) => { const t = Math.min(1, v / max); const c = [[231, 245, 240], [244, 197, 117], [194, 57, 79]]; const m = t < .5 ? [c[0], c[1], t * 2] : [c[1], c[2], (t - .5) * 2]; return `rgb(${m[0].map((x, j) => Math.round(x + (m[1][j] - x) * m[2])).join(',')})`; };
  function map() {
    const K = window.KOREA; const vb = bbox(125.9, 33.1, 129.7, 38.4); const max = Math.max(.05, ...REG.map(([rg]) => agg(S.dis, S.week, rg).rate)) ;
    return `<div class="pro-mapbox"><svg viewBox="${vb.join(' ')}">${K.provinces.map(p => { const reg = REG.find(x => p.n === x[0] || (['서울', '인천'].includes(p.n) && x[0] === '경기') || (['대전', '세종'].includes(p.n) && x[0] === '충남') || (p.n === '광주' && x[0] === '전남') || (['대구'].includes(p.n) && x[0] === '경북') || (['부산', '울산'].includes(p.n) && x[0] === '경남')); if (!reg) return `<path d="${p.d}" class="prov"/>`; const a = agg(S.dis, S.week, reg[0]); const hidden = a.n < 15; return `<path d="${p.d}" data-region="${reg[0]}" style="cursor:pointer;fill:${hidden ? '#eef2f5' : rateCol(a.rate, max)};stroke:${S.region === reg[0] ? '#10283b' : '#fff'};stroke-width:${S.region === reg[0] ? 2.4 : 1}"><title>${reg[0]} · ${hidden ? '표본 부족(비공개)' : (a.rate * 100).toFixed(1) + '% (' + a.pos + '/' + a.n + ')'}</title></path>`; }).join('')}${REG.map(([rg]) => { const p = K.provinces.find(x => x.n === rg); const a = agg(S.dis, S.week, rg); return p ? `<text x="${p.c[0]}" y="${p.c[1]}" text-anchor="middle" style="font-size:12px;font-weight:800;fill:#10283b;pointer-events:none;paint-order:stroke;stroke:#ffffffcc;stroke-width:3px">${rg} ${a.n < 15 ? '—' : (a.rate * 100).toFixed(0) + '%'}</text>` : ''; }).join('')}</svg><div class="maplegend"><span><i style="background:${rateCol(0, 1)}"></i>낮음</span><span><i style="background:${rateCol(.5, 1)}"></i>중간</span><span><i style="background:${rateCol(1, 1)}"></i>높음</span><span><i style="background:#eef2f5"></i>표본 부족 비공개</span></div><div class="mapnote">${esc(DIS[S.dis].name)} · ${weekLabel(S.week)} 주 · 시·도 클릭 = 추이 비교</div></div>`;
  }
  function heat() { const cells = Object.keys(DIS).map(dk => ({ dk, v: REG.map(([rg]) => ({ rg, a: agg(dk, S.week, rg), z: zscore(dk, S.week, rg) })) })); return `<div class="panel"><div class="panel-head"><div><h2>질병 × 지역 양성률 (${weekLabel(S.week)})</h2><div class="panel-sub">셀 색 = 양성률 · <b style="color:#c2394f">▲</b> = 계절 기대 대비 유의 증가(z&gt;2.5)</div></div></div><div class="pro-table-wrap"><table class="pro-table"><thead><tr><th>질병</th>${REG.map(([rg]) => `<th style="text-align:center">${rg}</th>`).join('')}</tr></thead><tbody>${cells.map(c => { const max = Math.max(.05, ...c.v.map(x => x.a.rate)); return `<tr><td style="white-space:nowrap"><b>${esc(DIS[c.dk].name.split(' ')[0])}</b></td>${c.v.map(x => `<td data-cell="${c.dk}|${x.rg}" style="cursor:pointer;text-align:center;background:${x.a.n < 15 ? '#f4f6f8' : rateCol(x.a.rate, max)};font-weight:700">${x.a.n < 15 ? '—' : (x.a.rate * 100).toFixed(0) + '%'}${x.z > 2.5 && x.a.n >= 15 ? ' <b style="color:#c2394f">▲</b>' : ''}</td>`).join('')}</tr>`; }).join('')}</tbody></table></div></div>`; }
  function render() {
    const D = DIS[S.dis]; const nat = Array.from({ length: W }, (_, i) => agg(S.dis, i).rate * 100); const exp = Array.from({ length: W }, (_, i) => expected(S.dis, i) * 100);
    const reg = S.region ? Array.from({ length: W }, (_, i) => { const a = agg(S.dis, i, S.region); return a.n < 15 ? null : a.rate * 100; }) : null;
    const cur = agg(S.dis, S.week), prev = agg(S.dis, Math.max(0, S.week - 1)); const an = anomalies(); const totalTests = Object.keys(DIS).reduce((s, dk) => s + Array.from({ length: W }, (_, i) => agg(dk, i).n).reduce((a, b) => a + b, 0), 0);
    body.innerHTML = `<div class="panel" style="margin-bottom:18px"><div class="pro-inline" style="justify-content:space-between"><div class="pro-inline">${Object.entries(DIS).map(([k, d]) => `<button class="pro-tab ${S.dis === k ? 'active' : ''}" data-dis="${k}">${esc(d.name)}</button>`).join('')}</div><label class="pro-field" style="min-width:280px">기준 주차<span class="val">${weekLabel(S.week)}</span><input type="range" id="inWeek" min="0" max="${W - 1}" value="${S.week}"></label></div></div>
    <div class="pro-kpis"><div class="pro-kpi"><small>누적 집계 검사 (52주)</small><b>${fmt(totalTests)}</b><em>5개 질병 · 9개 시·도</em></div><div class="pro-kpi"><small>이번 주 ${esc(D.name.split(' ')[0])} 검사</small><b>${fmt(cur.n)}</b><em>양성 ${cur.pos}건</em></div><div class="pro-kpi ${zscore(S.dis, S.week) > 2.5 ? 'alert' : ''}"><small>전국 양성률</small><b>${(cur.rate * 100).toFixed(1)}%</b><em class="${cur.rate > prev.rate ? 'down' : ''}">전주 대비 ${cur.rate >= prev.rate ? '+' : ''}${((cur.rate - prev.rate) * 100).toFixed(1)}%p</em></div><div class="pro-kpi"><small>계절 기대치</small><b>${(expected(S.dis, S.week) * 100).toFixed(1)}%</b><em>z = ${zscore(S.dis, S.week).toFixed(1)}</em></div><div class="pro-kpi ${an.length ? 'alert' : ''}"><small>이상 증가 신호</small><b>${an.length}</b><em class="down">최근 6주 · 전 질병</em></div><div class="pro-kpi"><small>집계 참여 고객</small><b>318</b><em>동의 농장·병원·계열사</em></div></div>
    <div class="pro-grid pro-2"><div class="panel"><div class="panel-head"><div><h2>주간 양성률 추이 · ${esc(D.name)}</h2><div class="panel-sub">전국 vs 계절 기대 범위${S.region ? ` vs <b>${S.region}</b>` : ' · 지도에서 시·도를 누르면 비교선 추가'}</div></div>${S.region ? `<button class="btn btn-tiny" id="inClear">비교 해제</button>` : ''}</div>${lineChart({ series: [...(reg ? [{ values: reg, color: '#c2394f', dots: false }] : []), { values: nat, color: D.color, dots: false }, { values: exp, color: '#9fb1bd', dash: '5 5' }], labels: Array.from({ length: W }, (_, i) => weekLabel(i)), band: { lo: exp.map(v => v * .7), hi: exp.map(v => v * 1.3), color: '#9fb1bd' }, markers: [{ i: S.week, label: '기준 주', color: '#10283b' }], h: 250, yFmt: v => v + '%' })}<div class="sim-legend"><span><i style="background:${D.color}"></i>전국</span>${S.region ? `<span><i style="background:#c2394f"></i>${S.region}</span>` : ''}<span><i style="background:#9fb1bd"></i>계절 기대(±30%)</span></div></div><div class="panel"><div class="panel-head"><div><h2>시·도별 양성률 지도</h2><div class="panel-sub">표본 15건 미만 지역은 비식별 보호를 위해 비공개</div></div></div>${map()}</div></div>
    <div class="pro-grid pro-2 pro-row">${heat()}<div class="panel"><div class="panel-head"><div><h2>이상 증가 신호</h2><div class="panel-sub">관측 양성률 vs 계절 기대치 이항 z-점수 &gt; 2.5 · 최근 6주</div></div><span class="pro-badge-ai">EARLY SIGNAL</span></div>${an.length ? an.map(o => `<button type="button" class="flag ${o.z > 4 ? 'red' : 'amber'}" data-anom="${o.dk}|${o.rg}|${o.i}" style="width:100%;text-align:left"><i>▲</i><div><b>${o.rg} · ${esc(DIS[o.dk].name)} · ${weekLabel(o.i)}</b>양성률 ${(o.a.rate * 100).toFixed(1)}% (${o.a.pos}/${o.a.n}) · 기대 ${(expected(o.dk, o.i) * 100).toFixed(1)}% · z ${o.z.toFixed(1)} → 해당 지역 고객 알림·추가 검사 권고 검토</div></button>`).join('') : '<div class="flag green"><i>✓</i><div><b>유의한 증가 없음</b></div></div>'}</div></div>
    <div class="pro-grid pro-2 pro-row"><div class="panel"><div class="panel-head"><div><h2>고객용 월간 질병 동향 리포트</h2><div class="panel-sub">대상별 문구·상세도 자동 조정 · 표본 부족 지역 자동 비공개</div></div><div class="pro-inline">${['계열사', '수의사', '농장', '연구기관'].map(a => `<button class="pro-tab ${S.audience === a ? 'active' : ''}" data-aud="${a}">${a}</button>`).join('')}</div></div><div class="brief" id="inBrief">[고객용 월간 리포트]를 누르면 선택한 대상에 맞춰 초안이 작성됩니다.</div><div class="pro-inline" style="margin-top:10px"><button class="btn btn-primary btn-tiny" id="inReport2">✳ 작성</button><button class="btn btn-tiny" id="inDl">↓ TXT</button></div></div>
    <div class="panel"><div class="panel-head"><div><h2>데이터 사업 모델 (안)</h2><div class="panel-sub">진단기관이 이미 가진 데이터로 만드는 서비스</div></div></div>${[['기본 · 무료', '검사 고객 전체', '전국·질병별 월간 양성률 요약, 결과지 하단 동향 한 줄', 'green'], ['프리미엄 구독', '계열사 · 대형 농장 · 동물병원', '시·도·축종별 상세 추이, 이상 신호 즉시 알림, 자사 농장 vs 지역 벤치마크', 'blue'], ['기관 · 연구', '지자체 · 연구기관 · 백신사', '비식별 집계 데이터셋·API, 백신 효과·유전형 동향 공동연구', 'purple']].map(([t, who, what, c]) => `<div class="flag ${c === 'green' ? 'green' : c === 'blue' ? 'blue' : 'amber'}"><i>◆</i><div><b>${t} · ${who}</b>${what}</div></div>`).join('')}<p class="pro-foot-note">※ 데이터 활용 범위는 고객 동의서·개인정보/영업비밀 보호·법정 신고 체계를 먼저 정한 뒤 확정합니다.</p></div></div>`;
  }
  function report() {
    const an = anomalies(); const last4 = [W - 4, W - 3, W - 2, W - 1]; const aud = S.audience;
    const lines = Object.entries(DIS).map(([dk, d]) => { const a = last4.reduce((s, i) => { const x = agg(dk, i); return { n: s.n + x.n, pos: s.pos + x.pos }; }, { n: 0, pos: 0 }); const e = last4.reduce((s, i) => s + expected(dk, i), 0) / 4; const rate = a.pos / a.n; return ` - ${d.name}: ${(rate * 100).toFixed(1)}% (${fmt(a.n)}건) · 계절 기대 ${(e * 100).toFixed(1)}% → ${rate > e * 1.2 ? '높음' : rate < e * .8 ? '낮음' : '평년 수준'}`; });
    return `BANSUK 월간 질병 동향 리포트 (${aud}용 · 초안 · 가상 데이터)
기간: ${weekLabel(W - 4)} ~ ${weekLabel(W - 1)} (최근 4주)

1. 전국 요약
${lines.join('\n')}

2. 주의 지역${an.length ? '\n' + an.slice(0, 4).map(o => ` - ${o.rg} ${DIS[o.dk].name}: 계절 기대 대비 유의 증가 (z ${o.z.toFixed(1)})`).join('\n') : '\n - 유의한 증가 지역 없음'}

3. ${aud === '계열사' ? '권고 (계열 농장 관리)\n - 주의 지역 소속 농장 입추 전 검사 강화 및 백신 프로그램 점검 권장\n - 자사 농장 양성률 vs 지역 평균 비교표는 프리미엄 리포트 별첨' : aud === '수의사' ? '임상 참고\n - IB 양성 증가 지역에서는 호흡기 증상 계군의 유전형 분석 의뢰를 권장\n - H9 의심 시 PCR 아형 감별 → 결과 승인 후 공유' : aud === '농장' ? '농장 실천 사항\n - 주의 지역이라면 출입 차량 소독과 기록을 한 번 더 확인하세요\n - 증상이 보이면 담당 수의사와 상의 후 검사를 의뢰하세요 (포털에서 접수 가능)' : '데이터 안내\n - 비식별 집계(시·도·주차 단위), 표본 15건 미만 셀 비공개\n - 원자료 접근은 공동연구 협약 및 데이터 이용 심의 후 제공'}

※ 본 리포트는 검사 의뢰 고객의 동의를 받은 비식별 집계이며, 질병 발생의 공식 통계나 진단이 아닙니다.`;
  }
  body.addEventListener('input', e => { if (e.target.id === 'inWeek') { S.week = +e.target.value; render(); } });
  document.addEventListener('click', e => {
    const t = e.target.closest('button,[data-region],[data-cell]'); if (!t) return;
    if (t.dataset.dis) { S.dis = t.dataset.dis; render(); }
    if (t.dataset.region) { S.region = t.dataset.region; render(); }
    if (t.dataset.cell) { const [dk, rg] = t.dataset.cell.split('|'); S.dis = dk; S.region = rg; render(); window.scrollTo({ top: 300, behavior: 'smooth' }); }
    if (t.dataset.anom) { const [dk, rg, i] = t.dataset.anom.split('|'); S.dis = dk; S.region = rg; S.week = +i; render(); window.scrollTo({ top: 300, behavior: 'smooth' }); toast(`${rg} · ${DIS[dk].name} 추이를 표시합니다.`); }
    if (t.dataset.aud) { S.audience = t.dataset.aud; render(); typewrite(document.getElementById('inBrief'), report(), 12); }
    if (t.id === 'inClear') { S.region = null; render(); }
    if (t.id === 'inReport' || t.id === 'inReport2') { const b = document.getElementById('inBrief'); b.scrollIntoView({ behavior: 'smooth', block: 'center' }); typewrite(b, report(), 12); }
    if (t.id === 'inDl') download(`BANSUK_monthly_trend_${S.audience}.txt`, report());
    if (t.id === 'inCsv') { const rows = [['질병', '시도', '주차', '검사수', '양성수', '양성률(%)', '계절기대(%)']]; Object.entries(DIS).forEach(([dk, d]) => REG.forEach(([rg]) => DATA[dk][rg].forEach((x, i) => rows.push([d.name, rg, weekLabel(i), x.n, x.n < 15 ? '비공개' : x.pos, x.n < 15 ? '' : (x.pos / x.n * 100).toFixed(1), (expected(dk, i) * 100).toFixed(1)])))); download('BANSUK_trend_aggregate.csv', csv(rows), 'text/csv;charset=utf-8'); toast('비식별 집계 CSV를 내려받았습니다.'); }
  });
  render();
})();
