/* Shared demo navigation — original 6 concepts + advanced/extended demos (2026-11). */
window.BANSUK_NAV = {
  core: [
    ['lab', '▤', 'AI 검사보고서 자동화'],
    ['biosecurity', '▣', '농장 방역관리 SaaS'],
    ['health', '⌁', 'AI 농장 건강관리'],
    ['risk', '◎', 'AI 질병 위험지도'],
    ['vet', '✎', '수의사 AI 업무비서'],
    ['public', '▦', '지자체 스마트 방역']
  ],
  advanced: [
    ['portal', '⊡', '고객 포털 · 의뢰 · 결과'],
    ['route', '⇄', '시료 수거 경로 최적화'],
    ['command', '◉', '검사실 운영 관제'],
    ['pcr', '⌇', 'PCR 판독 · QC 자동화'],
    ['serology', '∿', '항체가 분석 · 백신 효과'],
    ['intel', '◫', '진단 데이터 질병 동향']
  ],
  legacy: [
    ['lineage', '⑂', '계군 이력 · 난계대 추적'],
    ['biorisk', '▥', '차단방역 위험평가'],
    ['cro', '⚗', 'CRO 효능평가 시험관리']
  ],
  html: function (current) {
    var link = function (item, i, offset) {
      return '<a class="side-link ' + (item[0] === current ? 'active' : '') + '" href="./' + item[0] + '.html"><span>' + item[1] + '</span><span>' + item[2] + '</span><small>' + String(i + 1 + offset).padStart(2, '0') + '</small></a>';
    };
    return '<div class="side-heading">6 PRODUCT CONCEPTS</div><nav class="side-links" aria-label="기본 데모 선택">' +
      this.core.map(function (x, i) { return link(x, i, 0); }).join('') +
      '</nav><div class="side-heading side-heading-new">DIAGNOSTIC LAB · 확장 <em>NEW</em></div><nav class="side-links" aria-label="확장 데모 선택">' +
      this.advanced.map(function (x, i) { return link(x, i, 6); }).join('') + '</nav><div class="side-heading side-heading-new">과거 과제 고도화 <em>NEW</em></div><nav class="side-links" aria-label="과거 과제 고도화 데모">' +
      this.legacy.map(function (x, i) { return link(x, i, 12); }).join('') + '</nav>';
  }
};
