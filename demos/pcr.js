/* 08 PCR 판독 · QC 자동화 — fabricated plate data, rule-based calls and Westgard checks. */
(function () {
  const { VETS, esc, rng, FARMS, toast, download, csv, shell, lineChart } = PRO;
  const ROWS = 'ABCDEFGH'.split('');
  const RUNS = [
    { id: 'Run 43', target: 'AI M유전자 (rRT-PCR)', pooled: true, seed: 43, pos: 2, pcMean: 26.0 },
    { id: 'Run 44', target: 'H9 아형 (rRT-PCR)', pooled: false, seed: 44, pos: 5, pcMean: 27.2 },
    { id: 'Run 19', target: 'IB (RT-PCR) · 2동 의뢰', pooled: false, seed: 19, pos: 9, pcMean: 25.4, inhib: 3 }
  ];
  function buildRun(run) {
    const r = rng(run.seed); const wells = []; const farms = FARMS.slice(run.seed % 20, run.seed % 20 + 6);
    let posLeft = run.pos, inhib = run.inhib || 1, sus = 2;
    for (let i = 0; i < 96; i++) {
      const row = ROWS[Math.floor(i / 12)], col = i % 12 + 1, name = row + col;
      let w = { name, kind: 'S', ct: null, ic: 28 + r() * 2.5 };
      if (name === 'A1') w = { name, kind: 'NTC', ct: null, ic: null };
      else if (name === 'A2') w = { name, kind: 'PC', ct: +(run.pcMean + (r() - .5) * .8).toFixed(1), ic: 28.5 };
      else if (name === 'A3') w = { name, kind: 'EC', ct: null, ic: 28.9 };
      else {
        const f = farms[Math.floor((i - 3) / 16) % farms.length]; w.farm = f.name; w.sid = (run.pooled ? 'P' : 'S') + String(i - 2).padStart(3, '0');
        if (run.pooled) w.members = Array.from({ length: 5 }, (_, k) => `${w.sid}-${k + 1}`);
        const x = r();
        if (posLeft > 0 && x < .09) { w.ct = +(22 + r() * 11).toFixed(1); posLeft--; }
        else if (sus > 0 && x > .985) { w.ct = +(35.6 + r() * 2.2).toFixed(1); sus--; }
        else if (inhib > 0 && x > .5 && x < .515) { w.ic = null; inhib--; }
        w.ic = w.ic == null ? null : +w.ic.toFixed(1);
      }
      wells.push(w);
    }
    // ensure counts
    while (posLeft-- > 0) { const w = wells.find(x => x.kind === 'S' && x.ct == null && x.ic); w.ct = +(24 + r() * 9).toFixed(1); }
    // Levey-Jennings history for PC (30 runs)
    let prev = 0; const hist = Array.from({ length: 29 }, (_, k) => { const e = k % 2 ? -prev * .7 + (r() - .5) * .3 : (r() - .5) * 1.1; prev = e; return +(run.pcMean + e + (k > 24 && run.seed === 19 ? .9 : 0)).toFixed(2); });
    if (run.seed === 19) { hist[26] = run.pcMean + 1.35; hist[27] = run.pcMean + 1.3; }
    if (run.seed === 44) hist[12] = run.pcMean + 1.95;
    hist.push(wells[1].ct);
    return { ...run, wells, hist };
  }
  const DATA = RUNS.map(buildRun);
  const S = { run: 0, sel: 'A2', cut: 35, grey: 38, icMax: 35, approved: {} };

  const body = shell({
    key: 'pcr', code: 'PCR QC AUTOMATION', title: 'PCR 판독 · QC 자동화',
    subtitle: 'qPCR 장비 출력(Ct·증폭곡선)을 읽어 <b>웰별 자동 판정</b>, <b>NTC·양성·추출 대조군 검증</b>, <b>Levey-Jennings·Westgard 정도관리</b>, 풀링 양성 역추적까지 처리하고 수의사 승인으로 넘깁니다.',
    toolbar: '<button class="btn" id="pcrRetest" type="button">↻ 재검 목록</button><button class="btn" id="pcrCsv" type="button">↓ LIMS 업로드 CSV</button><button class="btn btn-primary" id="pcrApprove" type="button">✓ 판정 확정 · 승인 요청</button>',
    note: '플레이트·Ct·대조군·정도관리 이력은 모두 가상입니다. 판정 기준(Ct cut-off, 내부대조 기준)은 키트별 사용설명서와 기관 SOP를 따르며, 결과 확정은 담당 수의사가 수행합니다.'
  });

  const R = () => DATA[S.run];
  function call(w) {
    if (w.kind === 'NTC') return w.ct == null ? ['NTC 적합', 'ctrl'] : ['NTC 오염', 'bad'];
    if (w.kind === 'PC') return Math.abs(w.ct - R().pcMean) <= 2 ? ['양성대조 적합', 'ctrl'] : ['양성대조 범위 이탈', 'bad'];
    if (w.kind === 'EC') return w.ic != null && w.ic <= S.icMax ? ['추출대조 적합', 'ctrl'] : ['추출대조 실패', 'bad'];
    if (w.ct != null && w.ct <= S.cut) return ['양성', 'pos'];
    if (w.ct != null && w.ct <= S.grey) return ['재검(의심)', 'sus'];
    if (w.ic == null || w.ic > S.icMax) return ['무효(IC 실패)', 'inv'];
    return ['음성', 'neg'];
  }
  const COL = { pos: '#c2394f', sus: '#e08a1e', inv: '#7b55d6', neg: '#cfe9df', ctrl: '#10283b', bad: '#000' };
  function westgard(h) {
    const base = h.slice(0, 20); const m = base.reduce((a, b) => a + b, 0) / base.length; const sd = Math.sqrt(base.reduce((a, b) => a + (b - m) ** 2, 0) / (base.length - 1));
    const z = h.map(v => (v - m) / sd); const out = [];
    z.forEach((v, i) => {
      if (Math.abs(v) > 3) out.push([i, '1-3s', '단일 값이 ±3SD 초과 → 런 기각 검토']);
      else if (Math.abs(v) > 2) out.push([i, '1-2s', '±2SD 초과 경고 → 다른 규칙 확인']);
      if (i > 0 && Math.abs(v) > 2 && Math.abs(z[i - 1]) > 2 && Math.sign(v) === Math.sign(z[i - 1])) out.push([i, '2-2s', '연속 2회 같은 방향 ±2SD 초과 → 계통오차 의심']);
      if (i > 0 && Math.abs(v - z[i - 1]) > 4) out.push([i, 'R-4s', '연속 값 차이 4SD 초과 → 무작위오차 의심']);
      if (i >= 9 && z.slice(i - 9, i + 1).every(x => x > 0) || i >= 9 && z.slice(i - 9, i + 1).every(x => x < 0)) out.push([i, '10x', '연속 10회 평균 한쪽 → 시약 lot·장비 보정 확인']);
    });
    return { m, sd, out };
  }
  function curve(w, big) {
    const W = 640, H = big ? 260 : 220, pl = 40, pb = 26, pt = 12; const X = c => pl + (c - 1) / 39 * (W - pl - 12); const thrF = .18; const Y = f => pt + (1 - f / 1.15) * (H - pt - pb);
    const sig = (ct, amp = 1) => c => ct == null ? .02 + Math.sin(c) * .004 : .02 + amp / (1 + Math.exp(-(c - ct - 1.2) / 1.25)) * (1 + .002 * c);
    const path = f => Array.from({ length: 40 }, (_, i) => `${X(i + 1)},${Y(f(i + 1))}`).join(' ');
    let g = '';
    for (let i = 0; i <= 4; i++) { const f = i * .25; g += `<line class="c-grid" x1="${pl}" x2="${W - 12}" y1="${Y(f)}" y2="${Y(f)}"/><text class="c-axis" x="${pl - 6}" y="${Y(f) + 3}" text-anchor="end">${f.toFixed(2)}</text>`; }
    for (let c = 5; c <= 40; c += 5) g += `<text class="c-axis" x="${X(c)}" y="${H - 8}" text-anchor="middle">${c}</text>`;
    R().wells.filter(x => x.kind === 'S' && x.ct != null).forEach(x => g += `<polyline points="${path(sig(x.ct, .9))}" fill="none" stroke="#c9d4dc" stroke-width="1"/>`);
    if (w.ic != null) g += `<polyline points="${path(sig(w.ic, .55))}" fill="none" stroke="#7b55d6" stroke-width="2" stroke-dasharray="5 4"/>`;
    g += `<polyline points="${path(sig(w.ct, 1))}" fill="none" stroke="${w.ct != null ? COL[call(w)[1]] === '#cfe9df' ? '#2bb593' : (COL[call(w)[1]] === '#10283b' ? '#0e806b' : COL[call(w)[1]]) : '#2bb593'}" stroke-width="2.8"/>`;
    g += `<line x1="${pl}" x2="${W - 12}" y1="${Y(thrF)}" y2="${Y(thrF)}" stroke="#dc6477" stroke-dasharray="6 5"/><text x="${W - 14}" y="${Y(thrF) - 5}" text-anchor="end" class="c-axis" style="fill:#dc6477;font-weight:700">Threshold</text>`;
    if (w.ct != null) g += `<line x1="${X(w.ct)}" x2="${X(w.ct)}" y1="${Y(thrF)}" y2="${H - pb}" stroke="#10283b" stroke-dasharray="3 3"/><text x="${X(w.ct) + 4}" y="${H - pb - 6}" class="c-axis" style="fill:#10283b;font-weight:800">Ct ${w.ct}</text>`;
    g += `<line x1="${X(S.cut)}" x2="${X(S.cut)}" y1="${pt}" y2="${H - pb}" stroke="#c2394f" stroke-opacity=".35"/><text x="${X(S.cut) - 3}" y="${pt + 10}" text-anchor="end" class="c-axis" style="fill:#c2394f">cut-off ${S.cut}</text><rect x="${X(S.cut)}" y="${pt}" width="${X(S.grey) - X(S.cut)}" height="${H - pt - pb}" fill="#e08a1e" opacity=".07"/>`;
    return `<div class="chart-box"><svg viewBox="0 0 ${W} ${H}">${g}</svg></div><div class="sim-legend"><span><i style="background:#0e806b"></i>선택 웰 표적 형광</span><span><i style="background:#7b55d6"></i>내부대조(IC)</span><span><i style="background:#c9d4dc"></i>같은 런 양성 웰</span><span><i style="background:#e08a1e33"></i>재검 구간 (${S.cut}–${S.grey})</span></div>`;
  }
  function render() {
    const run = R(); const calls = run.wells.map(w => ({ w, c: call(w) })); const n = k => calls.filter(x => x.c[1] === k).length;
    const ctrls = calls.filter(x => x.w.kind !== 'S'); const runValid = ctrls.every(x => x.c[1] === 'ctrl'); const wg = westgard(run.hist); const lastFlags = wg.out.filter(x => x[0] >= run.hist.length - 3);
    const sel = run.wells.find(w => w.name === S.sel) || run.wells[1]; const sc = call(sel);
    const byFarm = {}; calls.filter(x => x.w.kind === 'S').forEach(({ w, c }) => { const b = byFarm[w.farm] = byFarm[w.farm] || { n: 0, pos: 0, sus: 0, inv: 0 }; b.n++; if (c[1] in b) b[c[1]]++; });
    const approved = S.approved[run.id];
    body.innerHTML = `<div class="pro-inline" style="margin-bottom:16px">${DATA.map((d, i) => `<button class="pro-tab ${S.run === i ? 'active' : ''}" data-run="${i}">${d.id} · ${esc(d.target)}</button>`).join('')}</div>
    <div class="pro-kpis"><div class="pro-kpi ${runValid ? '' : 'alert'}"><small>런 유효성</small><b style="color:${runValid ? '#0e806b' : '#c2394f'}">${runValid ? 'VALID' : 'INVALID'}</b><em class="${runValid ? '' : 'down'}">대조군 ${ctrls.filter(x => x.c[1] === 'ctrl').length}/3 적합</em></div><div class="pro-kpi ${n('pos') ? 'alert' : ''}"><small>양성</small><b>${n('pos')}</b><em class="down">Ct ≤ ${S.cut}${run.pooled ? ' · 풀링 시료' : ''}</em></div><div class="pro-kpi"><small>재검(의심)</small><b>${n('sus')}</b><em>Ct ${S.cut}–${S.grey}</em></div><div class="pro-kpi"><small>무효 (IC 실패)</small><b>${n('inv')}</b><em>재추출 필요</em></div><div class="pro-kpi"><small>음성</small><b>${n('neg')}</b><em>${run.wells.length - 3}웰 중</em></div><div class="pro-kpi ${lastFlags.some(f => f[1] !== '1-2s') ? 'alert' : ''}"><small>정도관리 (Westgard)</small><b>${lastFlags.length ? lastFlags.map(f => f[1]).filter((v, i, a) => a.indexOf(v) === i).join(' ') : '적합'}</b><em class="${lastFlags.length ? 'down' : ''}">최근 3런 기준</em></div></div>
    <div class="pro-grid pro-2"><div class="panel"><div class="panel-head"><div><h2>96웰 플레이트 · ${run.id}</h2><div class="panel-sub">웰을 누르면 증폭곡선 · ${run.pooled ? '<b>5검체 풀링</b> 시료' : '개별 시료'}</div></div><span class="pro-chip ${approved ? 'green' : 'amber'}">${approved ? '승인 요청됨 · ' + esc(approved.vet) : '판독 대기'}</span></div>
      <div class="plate"><span></span>${Array.from({ length: 12 }, (_, i) => `<span class="lab">${i + 1}</span>`).join('')}${ROWS.map(rw => `<span class="lab">${rw}</span>${calls.filter(x => x.w.name[0] === rw).map(({ w, c }) => `<button class="well ${S.sel === w.name ? 'sel' : ''}" data-well="${w.name}" title="${w.name} · ${c[0]}${w.ct ? ' · Ct ' + w.ct : ''}" style="background:${COL[c[1]]};${c[1] === 'neg' ? 'color:#5b8f80' : ''}">${w.kind === 'S' ? (c[1] === 'pos' ? '+' : c[1] === 'sus' ? '?' : c[1] === 'inv' ? '!' : '') : w.kind[0]}</button>`).join('')}`).join('')}</div>
      <div class="legend-row"><span><i style="background:${COL.pos}"></i>양성</span><span><i style="background:${COL.sus}"></i>재검</span><span><i style="background:${COL.inv}"></i>무효(IC)</span><span><i style="background:${COL.neg}"></i>음성</span><span><i style="background:${COL.ctrl}"></i>대조군 (N=NTC, P=양성, E=추출)</span></div>
      <div class="pro-controls" style="grid-template-columns:repeat(3,1fr);margin-top:14px"><label class="pro-field">양성 cut-off<span class="val">Ct ${S.cut}</span><input type="range" id="pcrCut" min="30" max="38" step="0.5" value="${S.cut}"></label><label class="pro-field">재검 상한<span class="val">Ct ${S.grey}</span><input type="range" id="pcrGrey" min="35" max="40" step="0.5" value="${S.grey}"></label><label class="pro-field">IC 허용 상한<span class="val">Ct ${S.icMax}</span><input type="range" id="pcrIc" min="30" max="38" step="0.5" value="${S.icMax}"></label></div></div>
      <div class="panel"><div class="panel-head"><div><h2>웰 ${sel.name} 상세</h2><div class="panel-sub">${sel.kind === 'S' ? esc(sel.farm) + ' · ' + esc(sel.sid) : { NTC: '음성대조(No Template Control)', PC: '양성대조', EC: '추출대조' }[sel.kind]}</div></div><span class="pro-chip ${sc[1] === 'pos' ? 'red' : sc[1] === 'sus' ? 'amber' : sc[1] === 'inv' ? 'purple' : sc[1] === 'bad' ? 'red' : 'green'}">${sc[0]}</span></div>${curve(sel, true)}
      <div class="compare" style="grid-template-columns:repeat(3,1fr);margin-top:12px"><div><small>표적 Ct</small><b>${sel.ct ?? 'N/A'}</b><em>${sel.ct == null ? '증폭 없음' : ''}</em></div><div><small>내부대조 Ct</small><b>${sel.ic ?? 'N/A'}</b><em class="${sel.ic == null ? 'bad' : ''}">${sel.ic == null ? '미증폭 → 억제/추출 실패' : '적합'}</em></div><div><small>자동 코멘트</small><b style="font-size:12px;line-height:1.5;font-weight:700">${sc[1] === 'pos' ? (run.pooled ? '풀 양성 → 구성 5검체 개별 재검' : '양성 — 수의사 확인 후 확정') : sc[1] === 'sus' ? '고Ct 의심 → 재추출·반복 검사' : sc[1] === 'inv' ? 'IC 실패 → 재추출' : sc[1] === 'ctrl' ? '대조군 기준 충족' : '음성'}</b></div></div></div></div>
    <div class="pro-grid pro-2 pro-row"><div class="panel"><div class="panel-head"><div><h2>양성대조 Levey-Jennings</h2><div class="panel-sub">최근 30런 PC Ct · 기준 평균 ${wg.m.toFixed(2)}, SD ${wg.sd.toFixed(2)} (첫 20런)</div></div><span class="pro-badge-ai">WESTGARD</span></div>${lineChart({ series: [{ values: run.hist, color: '#10283b', dots: true }], labels: run.hist.map((_, i) => i === run.hist.length - 1 ? '현재' : 'R' + (i + 1)), band: { lo: run.hist.map(() => wg.m - 2 * wg.sd), hi: run.hist.map(() => wg.m + 2 * wg.sd), color: '#2bb593' }, yMin: Math.floor(wg.m - 4 * wg.sd), yMax: Math.ceil(wg.m + 4 * wg.sd), threshold: { v: +(wg.m + 3 * wg.sd).toFixed(2), label: '+3SD', color: '#c2394f' }, h: 220 })}
      ${wg.out.length ? wg.out.slice(-4).map(([i, rule, d]) => `<div class="flag ${rule === '1-2s' ? 'amber' : 'red'}"><i>${rule === '1-2s' ? '△' : '!'}</i><div><b>${rule} · ${i === run.hist.length - 1 ? '현재 런' : 'R' + (i + 1)}</b>${d}</div></div>`).join('') : '<div class="flag green"><i>✓</i><div><b>정도관리 적합</b>최근 30런에서 Westgard 규칙 위반이 없습니다.</div></div>'}</div>
      <div class="panel"><div class="panel-head"><div><h2>의뢰처별 판정 요약</h2><div class="panel-sub">결과지·고객 포털로 이어지는 단위</div></div></div><div class="pro-table-wrap"><table class="pro-table"><thead><tr><th>의뢰 농장</th><th>웰</th><th>양성</th><th>재검</th><th>무효</th></tr></thead><tbody>${Object.entries(byFarm).map(([f, b]) => `<tr><td><b>${esc(f)}</b></td><td>${b.n}</td><td>${b.pos ? `<span class="pro-chip red">${b.pos}</span>` : 0}</td><td>${b.sus ? `<span class="pro-chip amber">${b.sus}</span>` : 0}</td><td>${b.inv ? `<span class="pro-chip purple">${b.inv}</span>` : 0}</td></tr>`).join('')}</tbody></table></div>
      ${run.pooled && n('pos') ? `<div class="flag red" style="margin-top:12px"><i>⇣</i><div><b>풀링 양성 역추적</b>양성 풀 ${n('pos')}개 → 개별 재검 대상 ${n('pos') * 5}검체: ${calls.filter(x => x.c[1] === 'pos').map(x => x.w.members.join(', ')).join(' / ')}</div></div>` : ''}
      ${approved ? `<div class="flag green" style="margin-top:12px"><i>✓</i><div><b>승인 요청 완료 · ${esc(approved.at)}</b>${esc(approved.vet)}에게 전자서명 요청. 승인 시 결과지 PDF 생성 → 고객 포털 알림 (시연)</div></div>` : ''}</div></div>`;
  }
  body.addEventListener('input', e => { const v = +e.target.value; if (e.target.id === 'pcrCut') S.cut = v; else if (e.target.id === 'pcrGrey') S.grey = Math.max(v, S.cut); else if (e.target.id === 'pcrIc') S.icMax = v; else return; render(); });
  document.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.well) { S.sel = t.dataset.well; render(); }
    if (t.dataset.run) { S.run = +t.dataset.run; S.sel = 'A2'; render(); }
    if (t.id === 'pcrApprove') { const run = R(); const ok = run.wells.filter(w => w.kind !== 'S').every(w => call(w)[1] === 'ctrl'); if (!ok) return toast('대조군 기준 미충족 — 런을 확정할 수 없습니다.'); const v = VETS.filter(x => x.spec === '분자진단(PCR)')[S.run % 2]; S.approved[run.id] = { vet: v.name, at: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) }; render(); toast(`${v.name}에게 판정 승인을 요청했습니다.`); }
    if (t.id === 'pcrRetest') { const run = R(); const list = run.wells.filter(w => w.kind === 'S' && ['sus', 'inv'].includes(call(w)[1]) || (run.pooled && call(w)[1] === 'pos')); download(`BANSUK_${run.id.replace(' ', '')}_retest.csv`, csv([['웰', '시료', '의뢰처', '판정', '조치'], ...list.flatMap(w => run.pooled && call(w)[1] === 'pos' ? w.members.map(m => [w.name, m, w.farm, '풀 양성', '개별 재검']) : [[w.name, w.sid, w.farm, call(w)[0], call(w)[1] === 'inv' ? '재추출' : '반복 검사']])]), 'text/csv;charset=utf-8'); toast(`재검 대상 목록을 내려받았습니다.`); }
    if (t.id === 'pcrCsv') { const run = R(); download(`BANSUK_${run.id.replace(' ', '')}_LIMS.csv`, csv([['런', '표적', '웰', '구분', '시료', '의뢰처', '표적Ct', 'IC Ct', '자동판정'], ...run.wells.map(w => [run.id, run.target, w.name, w.kind, w.sid || '', w.farm || '', w.ct ?? '', w.ic ?? '', call(w)[0]])]), 'text/csv;charset=utf-8'); toast('LIMS 업로드용 CSV를 내려받았습니다.'); }
  });
  render();
})();
