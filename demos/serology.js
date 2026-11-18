/* 11 항체가 분석 · 백신 효과 — fabricated HI/ELISA titers, rule-based pattern flags. */
(function () {
  const { esc, rng, lineChart, toast, download, csv, shell, fmt, typewrite } = PRO;
  const r = rng(1111); const gauss = () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const WEEKS = [4, 8, 12, 16, 20, 24, 30, 40, 52];
  const ASSAYS = {
    nd: { name: 'ND HI 항체', unit: 'log2', kind: 'hi', thr: 5, vacc: [[1, 'ND 생독'], [4, 'ND 생독'], [10, 'ND 생독'], [16, 'ND 사독(오일)']], exp: w => w < 16 ? 5.2 + Math.sin(w / 3) * .5 : 8.6 - Math.max(0, w - 22) * .055 },
    h9: { name: 'AI(H9N2) HI 항체', unit: 'log2', kind: 'hi', thr: 4, vacc: [[6, 'H9 사독'], [16, 'H9 사독']], exp: w => w < 6 ? 1.5 : w < 16 ? 6 - (w - 8) * .1 : 8.2 - Math.max(0, w - 22) * .06 },
    ib: { name: 'IB ELISA 항체', unit: 'titer', kind: 'elisa', thr: 1000, vacc: [[1, 'IB 생독'], [6, 'IB 생독'], [16, 'IB 사독']], exp: w => w < 16 ? 2600 + w * 60 : 7800 - Math.max(0, w - 22) * 70 }
  };
  const FLOCKS = [
    ['가상농장 음성-03', '2동 산란계', 'normal'], ['가상농장 진천-07', '1동 산란계', 'lowcv'], ['가상농장 안성-01', '3동 산란계', 'drop'], ['가상농장 천안-05', 'A동 종계', 'normal'],
    ['가상농장 김제-02', '5동 산란계', 'spike'], ['가상농장 논산-04', '1동 산란계', 'normal'], ['가상농장 홍성-03', '2동 종계', 'late'], ['가상농장 나주-01', '4동 산란계', 'normal']
  ].map(([farm, house, pattern], i) => ({ id: 'FL' + (i + 1), farm, house, pattern, age: [52, 40, 40, 30, 52, 24, 40, 52][i] }));
  // generate titers
  const DATA = {};
  FLOCKS.forEach(fl => { DATA[fl.id] = {}; Object.entries(ASSAYS).forEach(([ak, a]) => { DATA[fl.id][ak] = WEEKS.filter(w => w <= fl.age).map(w => {
    let mean = a.exp(w) + gauss() * (a.kind === 'hi' ? .35 : 500); let sd = a.kind === 'hi' ? 1.0 : mean * .28;
    if (fl.pattern === 'lowcv' && w >= 24) sd *= 2.1;
    if (fl.pattern === 'drop' && w >= 30) mean -= a.kind === 'hi' ? 2.4 : 3500;
    if (fl.pattern === 'spike' && w === 40 && ak !== 'ib') { mean += a.kind === 'hi' ? 3.4 : 0; sd *= 1.3; }
    if (fl.pattern === 'late' && w >= 16 && w < 24) mean -= a.kind === 'hi' ? 1.8 : 2500;
    const vals = Array.from({ length: 20 }, () => a.kind === 'hi' ? Math.max(0, Math.min(12, Math.round(mean + gauss() * sd))) : Math.max(0, Math.round((mean + gauss() * sd) / 10) * 10));
    return { w, vals };
  }); }); });
  const S = { flock: 'FL3', assay: 'nd', week: null, thr: null, custom: null, view: 'flock' };

  const body = shell({
    key: 'serology', code: 'SEROLOGY INSIGHT', title: '항체가 분석 · 백신 효과',
    subtitle: 'HI·ELISA 검사값을 계군·일령별로 쌓아 <b>GMT·CV·방어 기준 이상 비율</b>을 자동 산출하고, 백신 프로그램 기대곡선·동일 일령 비교군과 대조해 <b>검토가 필요한 패턴</b>을 표시합니다.',
    toolbar: '<button class="btn" id="seCsv" type="button">↓ 원자료 CSV</button><a class="btn" href="./lab.html">▤ 보고서 편집기 ↗</a><button class="btn btn-primary" id="seReport" type="button">✳ 해석 보조 초안</button>',
    note: '모든 계군·검사값·백신 일정은 가상입니다. 방어 기준선은 예시값이며, 실제 판정은 검사법·키트별 기준과 담당 수의사 판단에 따릅니다. 표시되는 패턴은 진단이 아닌 검토 우선순위입니다.'
  });

  const A = () => ASSAYS[S.assay];
  const fl = () => FLOCKS.find(f => f.id === S.flock);
  const tests = () => DATA[S.flock][S.assay];
  const thr = () => S.thr ?? A().thr;
  function stats(vals, a = A()) {
    const n = vals.length; const mean = vals.reduce((s, v) => s + v, 0) / n; const sd = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, n - 1));
    const gmt = a.kind === 'hi' ? mean : Math.exp(vals.reduce((s, v) => s + Math.log(Math.max(1, v)), 0) / n);
    const cv = a.kind === 'hi' ? (sd / Math.max(.1, mean)) * 100 : sd / Math.max(1, mean) * 100;
    return { n, mean, sd, gmt, cv, prot: vals.filter(v => v >= thr()).length / n * 100, min: Math.min(...vals), max: Math.max(...vals) };
  }
  const fmtG = (v, a = A()) => a.kind === 'hi' ? v.toFixed(1) : fmt(Math.round(v));
  function flags() {
    const a = A(); const ts = tests(); const out = []; const vweeks = a.vacc.map(x => x[0]);
    ts.forEach((t, i) => {
      const s = stats(t.vals); const e = a.exp(t.w);
      if (s.cv > (a.kind === 'hi' ? 30 : 45)) out.push(['amber', `${t.w}주령 · 균일도 낮음 (CV ${s.cv.toFixed(0)}%)`, '접종 방법(음수·분무)·접종 누락 계군·시료 채취 대표성을 점검하세요.', t.w]);
      if (a.kind === 'hi' ? s.gmt < e - 1.5 : s.gmt < e * .55) out.push(['red', `${t.w}주령 · 기대 범위 대비 낮은 항체가 (GMT ${fmtG(s.gmt)} / 기대 ${fmtG(e)})`, '백신 보관·접종 이력, 면역억제 요인 여부를 담당 수의사가 검토하고 재검사 일정을 잡는 것을 권장합니다.', t.w]);
      if (i > 0) { const p = stats(ts[i - 1].vals); const jumped = a.kind === 'hi' ? s.gmt - p.gmt > 2.5 : s.gmt / p.gmt > 2.2; const vaccBetween = vweeks.some(v => v > ts[i - 1].w - 2 && v <= t.w); if (jumped && !vaccBetween) out.push(['red', `${t.w}주령 · 접종 없이 급상승 (+${a.kind === 'hi' ? (s.gmt - p.gmt).toFixed(1) + ' log2' : '×' + (s.gmt / p.gmt).toFixed(1)})`, '야외 노출 가능성을 배제하기 위해 임상 관찰·생산 지표 확인 및 정밀검사(항원) 여부를 검토하세요.', t.w]); }
      if (s.prot < 70 && t.w >= 8) out.push(['amber', `${t.w}주령 · 기준 이상 비율 ${s.prot.toFixed(0)}%`, `설정 기준(${a.kind === 'hi' ? 'log2 ' + thr() : fmt(thr())}) 이상 개체가 70% 미만입니다.`, t.w]);
    });
    if (!out.length) out.push(['green', '검토가 필요한 패턴 없음', '모든 검사 시점이 기대 범위·균일도 기준 안에 있습니다(가상 규칙 기준).', 0]);
    return out;
  }
  function histogram(vals) {
    const a = A(); let bins;
    if (a.kind === 'hi') bins = Array.from({ length: 13 }, (_, i) => ({ label: String(i), lo: i, hi: i + 1 }));
    else bins = Array.from({ length: 10 }, (_, i) => ({ label: (i * 2) + 'k', lo: i * 2000, hi: (i + 1) * 2000 }));
    bins.forEach(b => b.n = vals.filter(v => v >= b.lo && (v < b.hi || (b === bins[bins.length - 1]))).length);
    const max = Math.max(1, ...bins.map(b => b.n));
    return `<div class="hist">${bins.map(b => `<div title="${b.label}: ${b.n}수"><b>${b.n || ''}</b><span class="${b.hi <= thr() ? 'below' : ''}" style="height:${b.n / max * 100}%"></span></div>`).join('')}</div><div class="hist-x">${bins.map(b => `<span>${b.label}</span>`).join('')}</div><div class="sim-legend"><span><i style="background:#9fd9c7"></i>기준 이상</span><span><i style="background:#f2b3bd"></i>기준 미만</span><span>가로축: ${a.kind === 'hi' ? 'HI 역가 (log2)' : 'ELISA titer'}</span></div>`;
  }
  function peerBench(w) {
    const a = A(); const peers = FLOCKS.map(f => { const t = DATA[f.id][S.assay].find(x => x.w === w); return t ? { f, g: stats(t.vals).gmt } : null; }).filter(Boolean).sort((x, y) => x.g - y.g);
    const me = peers.findIndex(p => p.f.id === S.flock); const pct = peers.length > 1 ? Math.round(me / (peers.length - 1) * 100) : 50; const max = Math.max(...peers.map(p => p.g));
    return `<div class="panel"><div class="panel-head"><div><h2>동일 일령 비교군</h2><div class="panel-sub">${w}주령 GMT · ${peers.length}개 계군 중 <b>${me + 1}위(하위부터)</b> · 백분위 ${pct}</div></div></div>${peers.map(p => `<div class="progress-row"><span class="progress-label" style="width:130px;${p.f.id === S.flock ? 'font-weight:850;color:#0e806b' : ''}">${esc(p.f.farm.replace('가상농장 ', ''))} ${esc(p.f.house)}</span><div class="progress-track"><span style="width:${p.g / max * 100}%;background:${p.f.id === S.flock ? '#0e806b' : '#b8d9cf'}"></span></div><span class="progress-number">${fmtG(p.g)}</span></div>`).join('')}<p class="pro-hint">데이터가 누적될수록 지역·계열사·백신 프로그램별 벤치마크로 확장할 수 있습니다.</p></div>`;
  }
  function render() {
    const a = A(); const ts = tests(); if (S.week == null || !ts.some(t => t.w === S.week)) S.week = ts[ts.length - 1].w;
    const cur = S.custom ? { w: '붙여넣기', vals: S.custom } : ts.find(t => t.w === S.week); const st = stats(cur.vals); const f = fl(); const fl_ = flags();
    const labels = ts.map(t => t.w + '주'); const gm = ts.map(t => +stats(t.vals).gmt.toFixed(2)); const ex = ts.map(t => a.exp(t.w));
    const band = { lo: ex.map(v => a.kind === 'hi' ? v - 1.5 : v * .55), hi: ex.map(v => a.kind === 'hi' ? v + 1.5 : v * 1.45), color: '#7b61d1' };
    const peerMed = ts.map(t => { const g = FLOCKS.map(x => DATA[x.id][S.assay].find(y => y.w === t.w)).filter(Boolean).map(y => stats(y.vals).gmt).sort((p, q) => p - q); return g[Math.floor(g.length / 2)]; });
    const markers = a.vacc.map(([w, n]) => { let idx = ts.findIndex(t => t.w >= w); return idx < 0 ? null : { i: Math.max(0, idx - (ts[idx].w > w ? .5 : 0)), label: n, color: '#9a7bd8' }; }).filter(Boolean).reduce((acc, m) => { const ex = acc.find(x => Math.abs(x.i - m.i) < .6); if (ex) { if (!ex.label.includes(m.label)) ex.label += '·' + m.label.split(' ')[1]; } else acc.push({ ...m }); return acc; }, []);
    body.innerHTML = `<div class="panel" style="margin-bottom:18px"><div class="pro-inline" style="justify-content:space-between"><div class="pro-inline"><label class="pro-field" style="min-width:250px">계군<select class="select" id="seFlock">${FLOCKS.map(x => `<option value="${x.id}" ${x.id === S.flock ? 'selected' : ''}>${esc(x.farm)} · ${esc(x.house)} (${x.age}주령)</option>`).join('')}</select></label><label class="pro-field">검사 항목<select class="select" id="seAssay">${Object.entries(ASSAYS).map(([k, v]) => `<option value="${k}" ${k === S.assay ? 'selected' : ''}>${v.name}</option>`).join('')}</select></label><label class="pro-field" style="min-width:220px">방어 기준선 (예시)<span class="val">${a.kind === 'hi' ? 'log2 ' + thr() : fmt(thr())}</span><input type="range" id="seThr" min="${a.kind === 'hi' ? 2 : 200}" max="${a.kind === 'hi' ? 9 : 5000}" step="${a.kind === 'hi' ? 1 : 200}" value="${thr()}"></label></div><div class="pro-inline">${ts.map(t => `<button class="pro-tab ${!S.custom && t.w === S.week ? 'active' : ''}" data-week="${t.w}">${t.w}주</button>`).join('')}</div></div></div>
    <div class="pro-kpis"><div class="pro-kpi"><small>${S.custom ? '붙여넣은 시료' : esc(cur.w) + '주령 시료'}</small><b>${st.n}수</b><em>${esc(f.farm)}</em></div><div class="pro-kpi"><small>${a.kind === 'hi' ? 'GMT (log2)' : 'GMT (titer)'}</small><b>${fmtG(st.gmt)}</b><em>${S.custom ? '' : '기대 ' + fmtG(a.exp(cur.w))}</em></div><div class="pro-kpi ${st.cv > (a.kind === 'hi' ? 30 : 45) ? 'alert' : ''}"><small>CV (균일도)</small><b>${st.cv.toFixed(0)}%</b><em class="${st.cv > (a.kind === 'hi' ? 30 : 45) ? 'down' : ''}">${st.cv > (a.kind === 'hi' ? 30 : 45) ? '균일도 검토' : '양호'}</em></div><div class="pro-kpi ${st.prot < 70 ? 'alert' : ''}"><small>기준 이상 비율</small><b>${st.prot.toFixed(0)}%</b><em class="${st.prot < 70 ? 'down' : ''}">기준 ${a.kind === 'hi' ? 'log2 ' + thr() : fmt(thr())} 이상</em></div><div class="pro-kpi"><small>범위</small><b style="font-size:21px;margin:9px 0 6px">${fmtG(st.min)}–${fmtG(st.max)}</b><em>최소–최대</em></div><div class="pro-kpi ${fl_.some(x => x[0] === 'red') ? 'alert' : ''}"><small>검토 패턴</small><b>${fl_.filter(x => x[0] !== 'green').length}</b><em class="${fl_.some(x => x[0] === 'red') ? 'down' : ''}">우선 ${fl_.filter(x => x[0] === 'red').length}건</em></div></div>
    <div class="pro-grid pro-2"><div class="panel"><div class="panel-head"><div><h2>일령별 GMT 추이</h2><div class="panel-sub">계군 GMT vs 백신 프로그램 기대 범위(보라 음영) · 비교군 중앙값(점선)</div></div><span class="pro-chip purple">${a.name}</span></div>${lineChart({ series: [{ values: peerMed, color: '#9fb1bd', dash: '5 5' }, { values: gm, color: '#0e806b', dots: true }], labels, band, markers, h: 240, yMin: 0, yMax: a.kind === 'hi' ? 12 : undefined, yFmt: v => a.kind === 'hi' ? v : (v >= 1000 ? Math.round(v / 100) / 10 + 'k' : v), threshold: { v: thr(), label: '방어 기준(예시)', color: '#dc6477' } })}<div class="sim-legend"><span><i style="background:#0e806b"></i>${esc(f.farm)} ${esc(f.house)}</span><span><i style="background:#7b61d155"></i>기대 범위</span><span><i style="background:#9fb1bd"></i>비교군 중앙값</span><span><i style="background:#9a7bd8"></i>접종</span></div></div>
    <div class="panel"><div class="panel-head"><div><h2>역가 분포 · ${S.custom ? '붙여넣은 값' : esc(cur.w) + '주령'}</h2><div class="panel-sub">개체별 ${st.n}수 · 기준선 이동 시 즉시 재계산</div></div></div>${histogram(cur.vals)}</div></div>
    <div class="pro-grid pro-2 pro-row"><div class="panel"><div class="panel-head"><div><h2>검토 필요 패턴</h2><div class="panel-sub">기대곡선·균일도·급변·기준 비율 규칙 · 클릭하면 해당 주령으로 이동</div></div><span class="pro-badge-ai">RULE ENGINE</span></div>${fl_.map(([tone, t, d, w]) => `<button type="button" class="flag ${tone}" data-week="${w || ''}" style="width:100%;text-align:left"><i>${tone === 'red' ? '!' : tone === 'amber' ? '△' : '✓'}</i><div><b>${esc(t)}</b>${esc(d)}</div></button>`).join('')}</div>${peerBench(S.custom ? ts[ts.length - 1].w : cur.w)}</div>
    <div class="pro-grid pro-2e pro-row"><div class="panel"><div class="panel-head"><div><h2>검사값 붙여넣어 바로 분석</h2><div class="panel-sub">장비 출력·엑셀에서 숫자 열을 복사해 붙여넣으세요 (쉼표·공백·줄바꿈 구분)</div></div></div><textarea class="textarea mono" id="sePaste" placeholder="${a.kind === 'hi' ? '예: 6 7 5 8 6 7 4 6 7 9 5 6 8 7 6 5 7 6 8 7' : '예: 4120, 5630, 3890, 7010 ...'}">${S.custom ? S.custom.join(' ') : ''}</textarea><div class="pro-inline" style="margin-top:10px"><button class="btn btn-primary btn-tiny" id="seAnalyse">분석</button><button class="btn btn-tiny" id="seSample">예시값 채우기</button>${S.custom ? '<button class="btn btn-tiny" id="seClear">계군 데이터로 돌아가기</button>' : ''}</div></div>
    <div class="panel"><div class="panel-head"><div><h2>해석 보조 초안</h2><div class="panel-sub">수치·패턴을 문장으로 정리 — 담당 수의사 검토·수정 후 보고서에 사용</div></div><div class="pro-inline"><button class="btn btn-tiny" id="seCopy">복사</button><button class="btn btn-primary btn-tiny" id="seReport2">✳ 작성</button></div></div><div class="brief" id="seBrief">[해석 보조 초안]을 누르면 현재 계군 기준 초안이 작성됩니다.</div></div></div>`;
  }
  function report() {
    const a = A(); const f = fl(); const ts = tests(); const last = ts[ts.length - 1]; const s = stats(last.vals); const fl_ = flags();
    return `${a.name} 검사 결과 해석 보조 (초안 · 가상 데이터)
농장/계군: ${f.farm} ${f.house} · 현재 ${f.age}주령
검사 이력: ${ts.map(t => t.w + '주').join(', ')} (회당 20수)

1. 최근 결과 (${last.w}주령)
 - GMT ${fmtG(s.gmt)}${a.kind === 'hi' ? ' (log2)' : ''}, CV ${s.cv.toFixed(0)}%, 기준(${a.kind === 'hi' ? 'log2 ' + thr() : fmt(thr())}) 이상 ${s.prot.toFixed(0)}%
 - 백신 프로그램 기대치 ${fmtG(a.exp(last.w))} 대비 ${a.kind === 'hi' ? (s.gmt - a.exp(last.w) >= 0 ? '+' : '') + (s.gmt - a.exp(last.w)).toFixed(1) + ' log2' : Math.round(s.gmt / a.exp(last.w) * 100) + '%'}

2. 추이 요약
${ts.map(t => { const x = stats(t.vals); return ` - ${t.w}주: GMT ${fmtG(x.gmt)} / CV ${x.cv.toFixed(0)}% / 기준 이상 ${x.prot.toFixed(0)}%`; }).join('\n')}

3. 검토 필요 사항
${fl_.map(x => ` - ${x[1]} → ${x[2]}`).join('\n')}

4. 비고
 - 본 초안은 규칙 기반 자동 문장으로, 진단·처방이 아닙니다.
 - 판정 기준은 사용 키트·검사법별 기준을 따르며, 최종 해석은 담당 수의사가 작성합니다.`;
  }
  body.addEventListener('change', e => { if (e.target.id === 'seFlock') { S.flock = e.target.value; S.custom = null; render(); } if (e.target.id === 'seAssay') { S.assay = e.target.value; S.thr = null; S.custom = null; render(); } if (e.target.id === 'seThr') { S.thr = +e.target.value; render(); } });
  document.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.week) { S.week = +t.dataset.week; S.custom = null; render(); return; }
    if (t.id === 'seAnalyse') { const vals = (document.getElementById('sePaste').value.match(/-?\d+(\.\d+)?/g) || []).map(Number).filter(v => v >= 0); if (vals.length < 3) return toast('숫자를 3개 이상 입력하세요.'); S.custom = vals.slice(0, 500); render(); toast(`${S.custom.length}개 값을 분석했습니다.`); }
    if (t.id === 'seSample') { document.getElementById('sePaste').value = A().kind === 'hi' ? '6 7 5 8 6 7 3 6 7 9 5 6 8 7 2 5 7 6 8 7 6 4' : '4120 5630 3890 7010 6550 2210 8030 5120 4470 6900 3310 5980'; }
    if (t.id === 'seClear') { S.custom = null; render(); }
    if (t.id === 'seReport' || t.id === 'seReport2') { const box = document.getElementById('seBrief'); box.scrollIntoView({ behavior: 'smooth', block: 'center' }); typewrite(box, report(), 10); }
    if (t.id === 'seCopy') navigator.clipboard?.writeText(report()).then(() => toast('초안을 복사했습니다.'));
    if (t.id === 'seCsv') { const rows = [['계군ID', '농장', '동', '검사항목', '주령', '개체번호', '값']]; FLOCKS.forEach(f => Object.entries(ASSAYS).forEach(([k, a]) => DATA[f.id][k].forEach(tt => tt.vals.forEach((v, i) => rows.push([f.id, f.farm, f.house, a.name, tt.w, i + 1, v]))))); download('BANSUK_serology_demo.csv', csv(rows), 'text/csv;charset=utf-8'); toast('원자료 CSV를 내려받았습니다.'); }
  });
  render();
})();
