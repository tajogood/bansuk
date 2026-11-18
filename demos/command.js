/* 07 검사실 운영 관제 — fabricated sample queue, equipment and 11-vet workload simulation. */
(function () {
  const { VETS, esc, rng, FARMS, toast, download, csv, shell, fmt, typewrite, spark } = PRO;
  const r = rng(707);
  const STAGES = ['접수·바코드', '전처리·추출', '검사 진행', '판독·QC', '수의사 승인', '결과 발송'];
  const GROUPS = {
    PCR: { items: ['AI M유전자 PCR', 'H5/H7 감별 PCR', 'H9 PCR', 'ND PCR', 'IB PCR', 'MG/MS PCR'], sla: 24, urgentSla: 6, spec: '분자진단(PCR)', color: '#2c7fd0' },
    혈청: { items: ['ND HI', 'H9 HI', 'IB ELISA', 'MG ELISA', 'EDS HI'], sla: 48, spec: '혈청(HI·ELISA)', color: '#0e806b' },
    세균: { items: ['살모넬라 배양', '대장균 동정·감수성', '마이코플라즈마 배양'], sla: 72, spec: '세균·배양', color: '#e08a1e' },
    병성감정: { items: ['부검·병성감정', '조직병리'], sla: 72, spec: '부검·병리', color: '#9a4fd6' }
  };
  const CLIENTS = [...FARMS.slice(0, 40).map(f => f.name), '가상 동물병원 A', '가상 동물병원 B', '가상 계열사 C (육계)', '가상 계열사 D (산란계)', '가상 종계장 E'];
  const S = { playing: true, clock: 13 * 60 + 20, group: '전체', samples: [], feed: [], seq: 1, sent: 128, received: 0, reruns: 4 };
  const pickGroup = () => { const x = r(); return x < .42 ? 'PCR' : x < .78 ? '혈청' : x < .92 ? '세균' : '병성감정'; };
  function newSample(age) {
    const g = pickGroup(); const G = GROUPS[g]; const urgent = g === 'PCR' && r() < .18; if (urgent) age = Math.min(age, Math.floor(200 + r() * 160));
    const vetPool = VETS.filter(v => v.spec === G.spec);
    const s = { id: 'BS-1118-' + String(S.seq++).padStart(3, '0'), client: CLIENTS[Math.floor(r() * CLIENTS.length)], group: g, item: G.items[Math.floor(r() * G.items.length)], n: [10, 15, 20, 30][Math.floor(r() * 4)], recv: S.clock - age, stage: 0, urgent, sla: (urgent ? G.urgentSla : G.sla) * 60, vet: vetPool[Math.floor(r() * vetPool.length)].id };
    const frac = age / s.sla; s.stage = Math.min(4, Math.floor(frac * 6 + r() * 1.2)); S.received++; return s;
  }
  for (let i = 0; i < 64; i++) S.samples.push(newSample(Math.floor(r() * 1800)));
  // pile up approvals on one vet so the balancing demo has something to do
  S.samples.filter(s => s.group === 'PCR').slice(0, 9).forEach(s => { s.stage = 4; s.vet = 'V01'; });
  const EQUIP = [['PCR #1', 'PCR', [[8.5, 10.2, 'Run 41 · AI M'], [10.5, 12.3, 'Run 42 · H9'], [13, 14.8, 'Run 43 · ND/IB'], [15.2, 17, 'Run 44 · 긴급 AI']]], ['PCR #2', 'PCR', [[9, 10.8, 'Run 18 · MG/MS'], [11.2, 13, 'Run 19 · AI M'], [15.6, 17.4, 'Run 20 · H5/H7']]], ['자동 핵산추출기', 'PCR', [[8.2, 9.8, '96검체'], [10, 11.5, '96검체'], [12.5, 14, '72검체'], [14.5, 16, '96검체']]], ['ELISA 리더', '혈청', [[9.5, 11, 'IB 6플레이트'], [13.5, 15.5, 'MG 4플레이트']]], ['HI 판독대', '혈청', [[8.5, 12, 'ND/H9 HI 420검체'], [13, 17, 'ND/H9 HI 380검체']]], ['배양기·동정기', '세균', [[8, 18, '살모넬라 진행 36건']]]];
  const tStr = m => { m = ((m % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(Math.round(m % 60)).padStart(2, '0'); };
  const left = s => s.sla - (S.clock - s.recv);
  const vname = id => VETS.find(v => v.id === id).name;
  function event(tone, title, sub) { S.feed.unshift({ t: tStr(S.clock), tone, title, sub }); S.feed = S.feed.slice(0, 40); }
  function step(silent) {
    S.clock += 4;
    if (r() < .55) { const s = newSample(0); S.samples.push(s); if (!silent) event(s.urgent ? 'red' : 'green', `${s.urgent ? '긴급 ' : ''}검체 접수 · ${s.id}`, `${s.client} · ${s.item} ${s.n}수 · 담당 ${vname(s.vet)}`); }
    for (let k = 0; k < 3; k++) {
      const pool = S.samples.filter(s => s.stage < 5); const s = pool[Math.floor(r() * pool.length)]; if (!s) break;
      if (s.stage === 3 && r() < .08) { S.reruns++; s.stage = 1; if (!silent) event('amber', `QC 재검 · ${s.id}`, `${s.item} 내부대조(IC) 미증폭 → 재추출 지시 (규칙 기반)`); continue; }
      s.stage++;
      if (s.stage === 5) { S.sent++; if (!silent) event('blue', `결과 발송 · ${s.id}`, `${s.client} · 포털 알림·PDF 결과지 (시연)`); S.samples = S.samples.filter(x => x !== s); }
      else if (!silent && s.stage === 4) event('', `승인 대기 · ${s.id}`, `${s.item} 판독 완료 → ${vname(s.vet)} 검토 요청`);
    }
    S.samples.filter(s => left(s) < 0 && !s.late).forEach(s => { s.late = true; if (!silent) event('red', `SLA 초과 · ${s.id}`, `${s.item} 목표 ${s.sla / 60}h 초과 — 우선 처리 권고`); });
  }
  for (let i = 0; i < 10; i++) step(false);

  const body = shell({
    key: 'command', code: 'LAB OPERATIONS', title: '검사실 운영 관제',
    subtitle: '검체 접수부터 결과 발송까지 <b>단계별 흐름·TAT·SLA</b>, 장비 가동, <b>수의사 11명</b>의 판독·승인·현장 업무량을 한 화면에서 보고 병목을 바로 조정합니다.',
    toolbar: '<button class="btn" id="cmdPlay" type="button">❚❚ 일시정지</button><button class="btn" id="cmdCsv" type="button">↓ 대기열 CSV</button><button class="btn btn-primary" id="cmdBrief" type="button">✳ 운영 브리핑</button>',
    note: '검체·의뢰처·장비 일정·수의사 이름과 역할 배분은 모두 가상입니다. 실서비스는 LIMS·장비 출력 파일과 연동하며, 결과 승인은 반드시 담당 수의사가 수행합니다.'
  });

  const active = () => S.samples.filter(s => S.group === '전체' || s.group === S.group);
  function vetLoad(v) { const mine = S.samples.filter(s => s.vet === v.id); return { approvals: mine.filter(s => s.stage === 4).length, inprog: mine.filter(s => s.stage >= 2 && s.stage <= 3).length }; }
  const FIELD = { V07: '현장 진료 · 음성', V08: '현장 진료 · 천안', V09: '현장 진료 · 나주', V10: '농장 교육 · 진천' };
  function kpis() {
    const all = S.samples; const late = all.filter(s => left(s) < 0).length; const risk = all.filter(s => left(s) >= 0 && left(s) < 120).length;
    const tat = (all.reduce((x, s) => x + (S.clock - s.recv), 0) / all.length / 60).toFixed(1);
    return `<div class="pro-kpis"><div class="pro-kpi"><small>오늘 접수 의뢰</small><b>${fmt(S.received + 151)}</b><em>${fmt(all.reduce((x, s) => x + s.n, 0))}수 처리 중</em>${spark([18, 22, 19, 25, 28, 24, 31, 29])}</div><div class="pro-kpi"><small>진행 중</small><b>${all.length}</b><em>긴급 ${all.filter(s => s.urgent).length}건</em></div><div class="pro-kpi"><small>결과 발송</small><b>${S.sent}</b><em>포털·PDF 자동 발송</em></div><div class="pro-kpi"><small>평균 경과시간</small><b>${tat}h</b><em>PCR 목표 24h · 긴급 6h</em></div><div class="pro-kpi ${late ? 'alert' : ''}"><small>SLA 초과 / 위험</small><b>${late} / ${risk}</b><em class="down">2시간 내 초과 예상 ${risk}건</em></div><div class="pro-kpi"><small>재검률</small><b>${(S.reruns / (S.sent + all.length) * 100).toFixed(1)}%</b><em>QC 재검 ${S.reruns}건</em></div></div>`;
  }
  function pipeline() {
    const counts = STAGES.map((_, i) => S.samples.filter(s => s.stage === i).length); counts[5] = S.sent; const max = Math.max(...counts.slice(0, 5)); const bott = counts.slice(0, 5).indexOf(max);
    return `<div class="panel" style="margin-bottom:18px"><div class="panel-head"><div><h2>검체 처리 파이프라인</h2><div class="panel-sub">단계별 대기 건수 · 가장 많이 쌓인 단계를 병목으로 표시</div></div><span class="pro-badge-ai">LIVE SIM</span></div><div class="pro-pipe">${STAGES.map((st, i) => `<div class="${i === bott ? 'bott' : ''}"><small>0${i + 1}</small><b>${st}</b><span style="font-size:24px;font-weight:850;letter-spacing:-.04em;color:${i === bott ? '#c2394f' : '#10283b'}">${counts[i]}<small style="font-size:11px;color:#7a8b9b"> 건${i === 5 ? ' 누적' : ''}</small></span>${i === bott ? '<span class="pro-chip red" style="align-self:flex-start">병목</span>' : ''}</div>`).join('')}</div>${bott === 4 ? `<div class="flag amber"><i>△</i><div><b>수의사 승인 단계 적체</b>판독 담당 수의사 간 승인 대기 편차가 큽니다. 아래 [승인 대기 자동 배분]으로 업무량을 맞출 수 있습니다.</div></div>` : ''}</div>`;
  }
  function queue() {
    const list = active().slice().sort((a, b) => (b.urgent - a.urgent) || (left(a) - left(b))).slice(0, 14);
    return `<div class="panel"><div class="panel-head"><div><h2>검체 대기열 <span class="result-pill">${active().length}건</span></h2><div class="panel-sub">긴급 → SLA 남은 시간 순 자동 정렬</div></div><div class="pro-inline">${['전체', ...Object.keys(GROUPS)].map(g => `<button class="pro-tab ${S.group === g ? 'active' : ''}" data-group="${g}">${g}</button>`).join('')}</div></div><div class="pro-table-wrap" style="max-height:470px"><table class="pro-table"><thead><tr><th>접수번호</th><th>의뢰처 · 검사</th><th>단계</th><th>SLA</th><th>담당</th></tr></thead><tbody>${list.map(s => { const l = left(s); const p = Math.max(0, Math.min(100, (S.clock - s.recv) / s.sla * 100)); return `<tr><td style="white-space:nowrap"><b>${s.id}</b>${s.urgent ? ' <span class="pro-chip red">긴급</span>' : ''}</td><td><b>${esc(s.item)}</b> · ${s.n}수<br><small style="color:#7a8b9b">${esc(s.client)}</small></td><td><span class="pro-chip" style="color:${GROUPS[s.group].color}">${STAGES[s.stage]}</span></td><td style="white-space:nowrap"><div class="pro-bar" style="width:70px"><span style="width:${p}%;background:${l < 0 ? '#c2394f' : l < 120 ? '#e08a1e' : '#2bb593'}"></span></div><small style="color:${l < 0 ? '#c2394f' : '#6c7f8f'}">${l < 0 ? Math.round(-l / 6) / 10 + 'h 초과' : Math.round(l / 6) / 10 + 'h 남음'}</small></td><td style="white-space:nowrap"><small>${esc(vname(s.vet).replace('가상 ', ''))}</small></td></tr>`; }).join('')}</tbody></table></div></div>`;
  }
  function feed() { return `<div class="panel"><div class="panel-head"><div><h2><span class="live-dot ${S.playing ? '' : 'paused'}"></span>실시간 이벤트</h2><div class="panel-sub">가상 시각 <b>${tStr(S.clock)}</b></div></div><span class="pro-badge-ai">STREAM SIM</span></div><div class="pro-feed">${S.feed.map(e => `<div class="feed-item ${e.tone}"><time>${e.t}</time><div><b>${esc(e.title)}</b><small>${esc(e.sub)}</small></div></div>`).join('')}</div></div>`; }
  function vets() {
    const loads = VETS.map(v => ({ v, ...vetLoad(v) })); const maxA = Math.max(1, ...loads.map(x => x.approvals + x.inprog));
    return `<div class="panel pro-row"><div class="panel-head"><div><h2>수의사 11명 업무 현황</h2><div class="panel-sub">판독·승인 4 · 병성감정 2 · 현장 진료 3 · 컨설팅 1 · 품질책임 1 (역할 배분은 시연용 가정)</div></div><button class="btn btn-tiny" id="vetBalance">⚖ 승인 대기 자동 배분</button></div><div class="pro-grid" style="grid-template-columns:repeat(auto-fill,minmax(205px,1fr));gap:10px">${loads.map(({ v, approvals, inprog }) => { const field = FIELD[v.id]; const qa = v.role === '품질책임(QA)'; return `<div class="pro-item" style="display:block;cursor:default"><div class="pro-inline" style="justify-content:space-between"><b>${esc(v.name)}</b><span class="pro-chip ${field ? 'blue' : qa ? 'purple' : approvals >= 5 ? 'red' : 'green'}">${field ? '현장' : qa ? 'QA' : approvals >= 5 ? '적체' : '근무'}</span></div><small>${esc(v.role)} · ${esc(v.spec)}</small>${field ? `<small style="margin-top:8px;color:#2c62b4">📍 ${field} · 복귀 예정 ${tStr(15 * 60 + (v.id.charCodeAt(2) % 4) * 40)}</small>` : qa ? `<small style="margin-top:8px">오늘 런 QC 검토 ${3 + S.reruns}건 · 재검 승인 ${S.reruns}건</small>` : `<div class="pro-inline" style="margin-top:8px"><div class="pro-bar" style="flex:1"><span style="width:${(approvals + inprog) / maxA * 100}%;background:${approvals >= 5 ? '#c2394f' : '#2bb593'}"></span></div><small style="margin:0">승인 ${approvals} · 판독 ${inprog}</small></div>`}</div>`; }).join('')}</div><p class="pro-hint">실서비스에서는 수의사별 전문분야·근무표·현장 일정을 반영해 판독·승인 업무를 자동 배정하고, 승인 이력은 전자서명으로 남깁니다.</p></div>`;
  }
  function equip() {
    const nowH = S.clock / 60; const X = h => Math.max(0, Math.min(100, (h - 8) / 10 * 100));
    return `<div class="panel"><div class="panel-head"><div><h2>장비 가동 일정 (오늘)</h2><div class="panel-sub">08–18시 · 붉은 선 = 현재 가상 시각</div></div></div><div class="gantt" style="gap:8px">${EQUIP.map(([n, g, runs]) => `<div class="gantt-row"><span>${n}</span><div class="gantt-track" style="background:#f3f6f9;height:22px">${runs.map(([a, b, l]) => `<i title="${l}" style="left:${X(a)}%;width:${X(b) - X(a)}%;transform:none;height:16px;background:${b < nowH ? '#b9c7d1' : a <= nowH ? GROUPS[g].color : GROUPS[g].color + '66'}"></i>`).join('')}<i style="left:${X(nowH)}%;width:2px;height:22px;top:0;background:#c2394f;transform:none"></i></div></div>`).join('')}<div class="gantt-row"><span></span><div class="pro-inline" style="justify-content:space-between;font-size:10px;color:#8395a5"><span>08시</span><span>13시</span><span>18시</span></div></div></div><p class="pro-hint">가동률: PCR #1 ${Math.round(EQUIP[0][2].reduce((s, x) => s + x[1] - x[0], 0) * 10)}% · PCR #2 ${Math.round(EQUIP[1][2].reduce((s, x) => s + x[1] - x[0], 0) * 10)}% — 긴급 PCR 접수 시 PCR #2의 13–15시 빈 시간 우선 배정 권고.</p></div>`;
  }
  function briefPanel() { return `<div class="panel"><div class="panel-head"><div><h2>운영 브리핑</h2><div class="panel-sub">현재 관제 데이터를 요약한 <b>규칙 기반 초안</b></div></div><div class="pro-inline"><button class="btn btn-tiny" id="cmdBriefCopy">복사</button><button class="btn btn-primary btn-tiny" id="cmdBrief2">✳ 생성</button></div></div><div class="brief" id="cmdBriefBox">${esc(S.brief || '[운영 브리핑]을 누르면 SLA 위험·병목·인력 배분 제안이 작성됩니다.')}</div></div>`; }
  function briefing() {
    const all = S.samples; const late = all.filter(s => left(s) < 0); const risk = all.filter(s => left(s) >= 0 && left(s) < 120); const counts = STAGES.map((_, i) => all.filter(s => s.stage === i).length); const bott = counts.slice(0, 5).indexOf(Math.max(...counts.slice(0, 5)));
    const loads = VETS.filter(v => v.role === '판독·승인').map(v => ({ v, a: vetLoad(v).approvals })).sort((a, b) => b.a - a.a);
    return `[검사실 운영 브리핑 · ${tStr(S.clock)} 기준 / 가상 데이터]

1. 처리 현황
 · 진행 중 ${all.length}건 (긴급 ${all.filter(s => s.urgent).length}), 결과 발송 ${S.sent}건, QC 재검 ${S.reruns}건
 · 병목 단계: ${STAGES[bott]} (${counts[bott]}건 대기)

2. SLA
 · 초과 ${late.length}건${late.length ? ': ' + late.slice(0, 3).map(s => s.id + ' ' + s.item).join(', ') : ''}
 · 2시간 내 초과 예상 ${risk.length}건 → 우선 처리 대상

3. 인력·장비 제안 (초안)
 · 승인 대기 최다: ${loads[0].v.name} ${loads[0].a}건 / 최소: ${loads[loads.length - 1].v.name} ${loads[loads.length - 1].a}건${loads[0].a - loads[loads.length - 1].a >= 3 ? ' → 자동 배분 권고' : ' → 균형 양호'}
 · 현장 출장 중인 수의사 4명(15~17시 복귀) — 오후 병성감정 접수는 수의사 05·06 우선 배정
 · 긴급 PCR은 PCR #2 13–15시 빈 슬롯 활용 권고

4. 고객 커뮤니케이션
 · SLA 초과 건 의뢰처에 지연 안내 발송 검토 (포털 알림, 시연)

※ 규칙 기반 자동 요약이며 최종 운영 판단은 검사실 책임자가 합니다.`;
  }
  function render() { body.innerHTML = kpis() + pipeline() + `<div class="pro-grid pro-2">${queue()}${feed()}</div>${vets()}<div class="pro-grid pro-2e pro-row">${equip()}${briefPanel()}</div>`; }
  setInterval(() => { if (!S.playing) return; step(false); render(); }, 3000);
  document.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.group) { S.group = t.dataset.group; render(); }
    if (t.id === 'cmdPlay') { S.playing = !S.playing; t.textContent = S.playing ? '❚❚ 일시정지' : '▶ 재개'; render(); }
    if (t.id === 'vetBalance') {
      let moved = 0;
      S.samples.filter(s => s.stage === 4).forEach(s => { const G = GROUPS[s.group]; const pool = VETS.filter(v => v.spec === G.spec && !FIELD[v.id]); if (pool.length < 2) return; const best = pool.slice().sort((a, b) => vetLoad(a).approvals - vetLoad(b).approvals)[0]; if (best.id !== s.vet && vetLoad(best).approvals + 1 < vetLoad(VETS.find(v => v.id === s.vet)).approvals) { s.vet = best.id; moved++; } });
      event('blue', '승인 업무 재배분', `전문분야·현재 대기량 기준 ${moved}건 재배정 (시연)`); render(); toast(moved ? `승인 대기 ${moved}건을 전문분야별로 재배분했습니다.` : '이미 업무량이 균형 상태입니다.');
    }
    if (t.id === 'cmdBrief' || t.id === 'cmdBrief2') { S.playing = false; document.getElementById('cmdPlay').textContent = '▶ 재개'; S.brief = briefing(); render(); const box = document.getElementById('cmdBriefBox'); box.scrollIntoView({ behavior: 'smooth', block: 'center' }); typewrite(box, S.brief, 9); toast('브리핑을 읽는 동안 스트림을 일시정지했습니다.'); }
    if (t.id === 'cmdBriefCopy') navigator.clipboard?.writeText(S.brief || briefing()).then(() => toast('브리핑을 복사했습니다.'));
    if (t.id === 'cmdCsv') { download('BANSUK_lab_queue.csv', csv([['접수번호', '의뢰처', '검사군', '검사항목', '시료수', '긴급', '단계', '경과(분)', 'SLA(시간)', '담당 수의사'], ...S.samples.map(s => [s.id, s.client, s.group, s.item, s.n, s.urgent ? 'Y' : '', STAGES[s.stage], S.clock - s.recv, s.sla / 60, vname(s.vet)])]), 'text/csv;charset=utf-8'); toast('대기열 CSV를 내려받았습니다.'); }
  });
  render();
})();
