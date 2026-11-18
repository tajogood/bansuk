/* 07 방역 통합 상황실 — fabricated live-feed simulation. */
(function () {
  const { esc, rng, FARMS, mapBase, P, bbox, spark, toast, download, csv, shell, fmt, typewrite } = PRO;
  const r = rng(77);
  const S = { playing: true, prov: '전체', clock: 13 * 60 + 38, received: 612, done: 497, flags: 6, feed: [], selected: null, hourly: [], brief: '' };
  const HOURS = ['08', '09', '10', '11', '12', '13', '14', '15', '16', '17'];
  S.hourly = HOURS.map((h, i) => ({ h, rec: i < 6 ? Math.round(55 + r() * 45) : 0, done: i < 6 ? Math.round(40 + r() * 45) : 0 }));
  const TESTS = [['AI 항원 PCR', 32], ['ND HI 항체', 26], ['IB ELISA', 18], ['살모넬라 배양', 14], ['MG/MS 항체', 10]];
  const PROVS = ['전체', '경기', '충북', '충남', '전북', '전남', '경북', '경남'];
  const tier = f => f.risk >= 75 ? 'high' : f.risk >= 50 ? 'mid' : 'low';
  const TC = { high: '#ff6b81', mid: '#f7b955', low: '#3fd3a6' };
  const EV = [
    ['rec', 38, 'green', f => [`시료 접수 · ${f.name}`, `${['ND HI', 'AI 항원 PCR', 'IB ELISA', '살모넬라'][Math.floor(r() * 4)]} ${10 + Math.floor(r() * 4) * 5}수 · 바코드 자동 매칭`]],
    ['done', 30, 'blue', f => [`검사 완료 · ${f.name}`, `결과 자동 집계 → 보고서 초안 생성 대기`]],
    ['cv', 10, 'amber', f => [`검토 필요 · ${f.name}`, `항체가 CV ${38 + Math.floor(r() * 15)}% — 접종 균일도 검토 권고(규칙 기반)`]],
    ['dis', 8, 'amber', f => [`소독 기록 미입력 · ${f.name}`, `최근 48시간 출입 소독 기록 없음 — 농장 담당자 알림(시연)`]],
    ['car', 9, '', f => [`수거 차량 도착 · ${f.region}`, `냉장 시료 ${8 + Math.floor(r() * 20)}건 인수 · 온도 ${(2 + r() * 4).toFixed(1)}°C`]],
    ['alert', 5, 'red', f => [`이상 신호 · ${f.name}`, `폐사·산란 급변 신고(가상) — 정밀검사 의뢰 및 역학 확인 권고`]]
  ];
  const tStr = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  function pickEvent() { const tot = EV.reduce((s, e) => s + e[1], 0); let x = r() * tot; for (const e of EV) { x -= e[1]; if (x <= 0) return e; } return EV[0]; }
  function pushEvent(silent, forced) {
    const f = forced ? FARMS.slice().sort((a, b) => b.risk - a.risk)[2] : FARMS[Math.floor(r() * FARMS.length)]; const e = forced || pickEvent(); const [title, sub] = e[3](f);
    S.feed.unshift({ t: tStr(S.clock), kind: e[0], tone: e[2], title, sub, farm: f.id }); S.feed = S.feed.slice(0, 40);
    const hi = Math.min(HOURS.length - 1, Math.max(0, Math.floor(S.clock / 60) - 8));
    if (e[0] === 'rec') { const n = 10 + Math.floor(r() * 20); S.received += n; S.hourly[hi].rec += n; }
    if (e[0] === 'done') { const n = 8 + Math.floor(r() * 18); S.done += n; S.hourly[hi].done += n; }
    if (e[0] === 'cv' || e[0] === 'alert') S.flags++;
    if (e[0] === 'alert') { f.risk = Math.min(98, f.risk + 18); }
    if (!silent) S.lastPing = f.id;
    S.clock += 2 + Math.floor(r() * 4);
  }
  for (let i = 0; i < 9; i++) pushEvent(true, i === 6 ? EV[5] : null);

  const body = shell({
    key: 'command', code: 'SITUATION ROOM', title: '방역 통합 상황실',
    subtitle: '검사·방역·수거·위험 신호를 한 화면에서 보는 운영 콘솔. 이벤트를 <b>가상 실시간</b>으로 흘려보내며, 클릭 한 번으로 지도·확산 시뮬레이터·접촉 추적으로 이어집니다.',
    toolbar: '<button class="btn" id="cmdPlay" type="button">❚❚ 일시정지</button><button class="btn" id="cmdCsv" type="button">↓ 현황 CSV</button><button class="btn btn-primary" id="cmdBrief" type="button">✳ AI 일일 브리핑</button>'
  });

  const visibleFarms = () => FARMS.filter(f => S.prov === '전체' || f.prov.startsWith(S.prov));
  function kpis() {
    const tat = (4.6 + Math.sin(S.clock / 37) * .4).toFixed(1); const insp = Math.round(FARMS.reduce((s, f) => s + f.insp, 0) / FARMS.length);
    const hi = FARMS.filter(f => tier(f) === 'high').length;
    return `<div class="pro-kpis">
      <div class="pro-kpi"><small>관리 농장</small><b>${FARMS.length}</b><em>${new Set(FARMS.map(f => f.region)).size}개 시·군</em></div>
      <div class="pro-kpi"><small>오늘 접수 시료</small><b>${fmt(S.received)}</b><em>▲ 전주 동시간 대비 +8%</em>${spark([12, 18, 15, 22, 19, 26, 24, 30])}</div>
      <div class="pro-kpi"><small>검사 완료</small><b>${fmt(S.done)}</b><em>처리율 ${Math.round(S.done / S.received * 100)}%</em></div>
      <div class="pro-kpi"><small>평균 검사 TAT</small><b>${tat}h</b><em>목표 6h 이내</em>${spark([6.1, 5.8, 5.2, 5.4, 4.9, 4.7, 4.8, +tat], '#4a8de0')}</div>
      <div class="pro-kpi ${S.flags > 8 ? 'alert' : ''}"><small>검토 필요 신호</small><b>${S.flags}</b><em class="down">고위험 농장 ${hi}곳</em></div>
      <div class="pro-kpi"><small>방역 점검 이행률</small><b>${insp}%</b><em>미흡 ${FARMS.filter(f => f.insp < 75).length}곳 후속조치</em></div></div>`;
  }
  function map() {
    const vb = bbox(126.05, 34.55, 129.6, 38.2); const k = vb[2] / 560;
    const farms = visibleFarms();
    return `<div class="pro-mapbox dark" id="cmdMap"><svg viewBox="${vb.join(' ')}" role="img" aria-label="관리 농장 위험 등급 지도">${mapBase(vb)}
      ${farms.map(f => { const [x, y] = P(f.lon, f.lat); const t = tier(f); const sel = S.selected === f.id; return `<g class="farm-dot" data-farm="${f.id}">${S.lastPing === f.id ? `<circle class="ping" cx="${x}" cy="${y}" r="${9 * k}" fill="none" stroke="${TC[t]}" stroke-width="${2 * k}"/>` : ''}<circle cx="${x}" cy="${y}" r="${(sel ? 7 : t === 'high' ? 5.2 : 4) * k}" fill="${TC[t]}" stroke="${sel ? '#fff' : '#0b2233'}" stroke-width="${(sel ? 2 : 1) * k}"><title>${esc(f.name)} · ${f.type} ${fmt(f.heads)}수 · 위험 ${f.risk}</title></circle></g>`; }).join('')}
      </svg><div class="maplegend"><span><i style="background:${TC.high}"></i>고위험 (75+)</span><span><i style="background:${TC.mid}"></i>주의 (50–74)</span><span><i style="background:${TC.low}"></i>안정</span></div><div class="mapnote">점: 가상 농장 ${farms.length}곳 · 위험 점수는 임의 생성값</div></div>`;
  }
  function feed() {
    return `<div class="panel"><div class="panel-head"><div><h2><span class="live-dot ${S.playing ? '' : 'paused'}"></span>실시간 이벤트</h2><div class="panel-sub">가상 시각 <b id="cmdClock">${tStr(S.clock)}</b> · 클릭하면 지도에서 농장을 강조합니다</div></div><span class="pro-badge-ai">STREAM SIM</span></div><div class="pro-feed" id="cmdFeed">${S.feed.map(feedItem).join('')}</div></div>`;
  }
  function feedItem(e) { return `<button type="button" class="feed-item ${e.tone}" data-farm="${e.farm}"><time>${e.t}</time><div><b>${esc(e.title)}</b><small>${esc(e.sub)}</small>${e.kind === 'alert' ? `<small style="margin-top:6px"><a class="linkish" href="./outbreak.html?farm=${e.farm}">확산 시뮬레이션 ↗</a> · <a class="linkish" href="./trace.html?farm=${e.farm}">접촉 추적 ↗</a></small>` : ''}</div></button>`; }
  function throughput() {
    const max = Math.max(60, ...S.hourly.map(h => Math.max(h.rec, h.done))); const w = 360, h = 170, bw = w / HOURS.length;
    return `<div class="panel"><div class="panel-head"><div><h2>시간대별 시료 처리</h2><div class="panel-sub">접수 vs 완료 (건)</div></div></div><div class="chart-box"><svg viewBox="0 0 ${w} ${h + 22}">${S.hourly.map((d, i) => { const x = i * bw + 6; const h1 = d.rec / max * h, h2 = d.done / max * h; return `<rect x="${x}" y="${h - h1}" width="${bw / 2 - 5}" height="${h1}" rx="3" fill="#9fd9c7"><title>${d.h}시 접수 ${d.rec}</title></rect><rect x="${x + bw / 2 - 4}" y="${h - h2}" width="${bw / 2 - 5}" height="${h2}" rx="3" fill="#2c7f6c"><title>${d.h}시 완료 ${d.done}</title></rect><text x="${x + bw / 2 - 5}" y="${h + 15}" class="c-axis" text-anchor="middle">${d.h}시</text>`; }).join('')}</svg></div><div class="sim-legend"><span><i style="background:#9fd9c7"></i>접수</span><span><i style="background:#2c7f6c"></i>완료</span></div></div>`;
  }
  function mix() { return `<div class="panel"><div class="panel-head"><div><h2>검사 항목 구성</h2><div class="panel-sub">오늘 접수 기준 비율</div></div></div>${TESTS.map(([n, p]) => `<div class="progress-row"><span class="progress-label" style="width:110px">${n}</span><div class="progress-track"><span style="width:${p * 2.6}%"></span></div><span class="progress-number">${p}%</span></div>`).join('')}<p class="pro-hint">LIMS 연동 시 항목별 대기열·장비 가동률·재검률까지 확장할 수 있습니다.</p></div>`; }
  function topRisk() {
    const list = visibleFarms().slice().sort((a, b) => b.risk - a.risk).slice(0, 7);
    return `<div class="panel"><div class="panel-head"><div><h2>위험 상위 농장</h2><div class="panel-sub">검사·점검·밀집도 합성 점수(가상)</div></div></div><div class="pro-list" style="max-height:300px">${list.map(f => `<button type="button" class="pro-item ${S.selected === f.id ? 'active' : ''}" data-farm="${f.id}"><span class="dot" style="background:${TC[tier(f)]}"></span><span class="grow"><b>${esc(f.name)}</b><small>${f.type} ${fmt(f.heads)}수 · 점검 ${f.insp}%</small></span><span class="score-pill" style="background:${TC[tier(f)]}22;color:${tier(f) === 'high' ? '#c2394f' : tier(f) === 'mid' ? '#a76a0c' : '#127b62'}">${f.risk}</span></button>`).join('')}</div></div>`;
  }
  function provTable() {
    const by = {}; FARMS.forEach(f => { const p = f.prov; by[p] = by[p] || { n: 0, heads: 0, hi: 0, insp: 0 }; by[p].n++; by[p].heads += f.heads; by[p].hi += tier(f) === 'high' ? 1 : 0; by[p].insp += f.insp; });
    return `<div class="panel"><div class="panel-head"><div><h2>시·도별 현황</h2><div class="panel-sub">행을 누르면 지도를 해당 지역으로 필터링</div></div></div><div class="pro-table-wrap"><table class="pro-table"><thead><tr><th>시·도</th><th>농장</th><th>사육 규모</th><th>고위험</th><th>점검 이행</th></tr></thead><tbody>${Object.entries(by).sort((a, b) => b[1].n - a[1].n).map(([p, d]) => { const ins = Math.round(d.insp / d.n); return `<tr class="${S.prov === p ? 'hl' : ''}" data-prov="${p}" style="cursor:pointer"><td><b>${p}</b></td><td>${d.n}</td><td>${fmt(Math.round(d.heads / 10000))}만 수</td><td>${d.hi ? `<span class="pro-chip red">${d.hi}</span>` : '<span class="pro-chip green">0</span>'}</td><td><div class="pro-inline"><div class="pro-bar" style="width:70px"><span style="width:${ins}%;background:${ins < 75 ? '#f0a63a' : '#2bb593'}"></span></div>${ins}%</div></td></tr>`; }).join('')}</tbody></table></div></div>`;
  }
  function briefPanel() { return `<div class="panel"><div class="panel-head"><div><h2>AI 일일 브리핑</h2><div class="panel-sub">현재 상황판 데이터를 요약한 <b>규칙 기반 초안</b> — 실서비스에서는 LLM + 검증 규칙</div></div><div class="pro-inline"><button class="btn btn-tiny" id="cmdBriefCopy">복사</button><button class="btn btn-primary btn-tiny" id="cmdBrief2">✳ 생성</button></div></div><div class="brief" id="cmdBriefBox">${esc(S.brief || '오른쪽 위 [AI 일일 브리핑] 또는 [생성]을 누르면 현재 상황판 기준 요약이 작성됩니다.')}</div></div>`; }
  function briefing() {
    const hi = FARMS.filter(f => tier(f) === 'high').sort((a, b) => b.risk - a.risk); const alerts = S.feed.filter(e => e.kind === 'alert'); const cv = S.feed.filter(e => e.kind === 'cv'); const dis = S.feed.filter(e => e.kind === 'dis');
    const lowInsp = FARMS.filter(f => f.insp < 75);
    return `[BANSUK 방역 상황 브리핑 · 2026-11-18 ${tStr(S.clock)} 기준 / 가상 데이터]

1. 총괄
 · 관리 농장 ${FARMS.length}곳, 오늘 시료 ${fmt(S.received)}건 접수 / ${fmt(S.done)}건 완료 (처리율 ${Math.round(S.done / S.received * 100)}%).
 · 검토 필요 신호 ${S.flags}건, 고위험 등급 농장 ${hi.length}곳.

2. 우선 확인 대상
${hi.slice(0, 4).map((f, i) => ` ${i + 1}) ${f.name} (${f.region}, ${f.type} ${fmt(f.heads)}수) — 합성 점수 ${f.risk}`).join('\n')}
${alerts.length ? `\n3. 이상 신호 (${alerts.length}건)\n${alerts.slice(0, 3).map(e => ` · ${e.t} ${e.title.replace('이상 신호 · ', '')} — 정밀검사 의뢰 여부 담당 수의사 확인`).join('\n')}` : '\n3. 이상 신호\n · 금일 신규 이상 신호 없음'}

4. 검사·방역 운영
 · 항체가 균일도 검토 ${cv.length}건 → 접종 기록·시료 수 재확인 권고
 · 소독 기록 미입력 ${dis.length}건, 점검 이행률 75% 미만 농장 ${lowInsp.length}곳 → 농장 담당자 알림 및 재점검 일정 편성

5. 권장 조치 (초안)
 · 고위험 상위 2곳: 접촉 차량 21일 이력 조회(역학 접촉 추적) 및 예찰 시료 추가
 · 오후 수거 노선: 긴급 시료 우선 배차(시료 수거 경로 최적화)
 · 본 요약은 가상 데이터와 규칙에 따른 초안이며, 최종 판단은 담당 수의사·방역관이 합니다.`;
  }
  function render() {
    body.innerHTML = kpis() + `<div class="pro-tabs">${PROVS.map(p => `<button class="pro-tab ${S.prov === p ? 'active' : ''}" data-prov="${p}">${p}</button>`).join('')}</div>
      <div class="pro-grid pro-2"><div class="panel"><div class="panel-head"><div><h2>농장 위험 지도</h2><div class="panel-sub">점을 클릭하면 해당 농장 상세 · 이벤트 발생 시 위치가 깜빡입니다</div></div><span class="pro-chip dark">${S.prov}</span></div>${map()}<div id="cmdFarmCard"></div></div>${feed()}</div>
      <div class="pro-grid pro-3 pro-row">${throughput()}${mix()}${topRisk()}</div>
      <div class="pro-grid pro-2e pro-row">${provTable()}${briefPanel()}</div>`;
    farmCard();
  }
  function farmCard() {
    const el = document.getElementById('cmdFarmCard'); if (!el) return; const f = FARMS.find(x => x.id === S.selected); if (!f) { el.innerHTML = ''; return; }
    el.innerHTML = `<div class="flag ${tier(f) === 'high' ? 'red' : tier(f) === 'mid' ? 'amber' : 'green'}" style="margin-top:12px"><i>◉</i><div style="flex:1"><b>${esc(f.name)} · ${f.region}</b>${f.type} ${fmt(f.heads)}수 · 합성 위험 ${f.risk} · 방역 점검 ${f.insp}%<div class="pro-inline" style="margin-top:8px"><a class="btn btn-tiny" href="./outbreak.html?farm=${f.id}">확산 시뮬레이션 ↗</a><a class="btn btn-tiny" href="./trace.html?farm=${f.id}">접촉 추적 ↗</a><a class="btn btn-tiny" href="./serology.html">항체가 분석 ↗</a></div></div></div>`;
  }
  function tick() {
    if (!S.playing) return; pushEvent(false);
    const feedEl = document.getElementById('cmdFeed'); if (!feedEl) return;
    // partial updates for smoothness
    const tmp = document.createElement('div'); tmp.innerHTML = feedItem(S.feed[0]); feedEl.prepend(tmp.firstChild); while (feedEl.children.length > 40) feedEl.lastChild.remove();
    document.getElementById('cmdClock').textContent = tStr(S.clock);
    const k = document.querySelector('.pro-kpis'); const nk = document.createElement('div'); nk.innerHTML = kpis(); k.replaceWith(nk.firstChild);
    const m = document.getElementById('cmdMap'); const nm = document.createElement('div'); nm.innerHTML = map(); m.replaceWith(nm.firstChild);
  }
  setInterval(tick, 2600);
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-farm],[data-prov],button'); if (!t) return;
    if (t.dataset.farm && !e.target.closest('a')) { S.selected = t.dataset.farm; S.lastPing = t.dataset.farm; const f = FARMS.find(x => x.id === S.selected); if (S.prov !== '전체' && !f.prov.startsWith(S.prov)) S.prov = '전체'; render(); document.getElementById('cmdMap').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    if (t.dataset.prov) { S.prov = S.prov === t.dataset.prov && t.tagName === 'TR' ? '전체' : t.dataset.prov; render(); return; }
    if (t.id === 'cmdPlay') { S.playing = !S.playing; t.textContent = S.playing ? '❚❚ 일시정지' : '▶ 재개'; document.querySelector('.live-dot')?.classList.toggle('paused', !S.playing); toast(S.playing ? '가상 실시간 이벤트를 재개합니다.' : '이벤트 스트림을 일시정지했습니다.'); }
    if (t.id === 'cmdBrief' || t.id === 'cmdBrief2') { S.brief = briefing(); const box = document.getElementById('cmdBriefBox'); box.scrollIntoView({ behavior: 'smooth', block: 'center' }); typewrite(box, S.brief, 9); }
    if (t.id === 'cmdBriefCopy') { navigator.clipboard?.writeText(S.brief || briefing()).then(() => toast('브리핑을 복사했습니다.')); }
    if (t.id === 'cmdCsv') { download('BANSUK_situation_farms.csv', csv([['농장ID', '농장명', '지역', '축종', '사육수', '합성위험(가상)', '점검이행률'], ...FARMS.map(f => [f.id, f.name, f.region, f.type, f.heads, f.risk, f.insp])]), 'text/csv;charset=utf-8'); toast('현황 CSV를 내려받았습니다.'); }
  });
  render();
})();
