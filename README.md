# BANSUK × AI — 협업 제안 & 인터랙티브 데모

반석엘티씨의 가축 질병 검사·방역 전문성과 IT·AI 기술의 협업 가능성을 설명하는 **독립적인 제안 및 시연 사이트**입니다.

## 온라인 페이지

**[제안서 보기](https://tajogood.github.io/bansuk/)**

### 6개 클릭형 데모

| 아이템 | 데모 URL | 시연 기능 |
|---|---|---|
| AI 검사보고서 자동화 | [검사보고서 데모](https://tajogood.github.io/bansuk/demos/lab.html) | 검사결과 등록/수정, CSV 업로드, 보고서 생성 |
| 농장 방역관리 SaaS | [방역관리 데모](https://tajogood.github.io/bansuk/demos/biosecurity.html) | 방역 체크리스트, 점검 이력, 개선 상태 |
| AI 농장 건강관리 | [농장 건강관리 데모](https://tajogood.github.io/bansuk/demos/health.html) | 가상 건강지표, 농장 비교, 추세 차트 |
| AI 질병 위험지도 | [위험지도 데모](https://tajogood.github.io/bansuk/demos/risk.html) | 가상 지도 핀, 위험 표시 기준 조정 |
| 수의사 AI 업무비서 | [수의사 업무비서 데모](https://tajogood.github.io/bansuk/demos/vet.html) | 방문 메모 구조화, 후속 점검 관리 |
| 지자체 스마트 방역 | [지자체 데모](https://tajogood.github.io/bansuk/demos/public.html) | 시료·점검 이력, 담당자 배정, 업무 상태 |

각 데모에서 검색, 상태 필터, 데이터 등록·수정·삭제, 분석 초안, 보고서 열람, CSV 내보내기, 데이터 초기화, 브라우저 내 저장을 제공합니다.

## 기술 구성

정적 HTML + CSS + JavaScript 기반의 GitHub Pages 호스팅입니다. **백엔드나 외부 AI API는 연결하지 않습니다.** 가상 데이터와 단순 규칙 기반 분석 초안을 사용합니다.

데모 변경 이력은 사용자 브라우저의 localStorage에만 저장되며, 각 페이지의 **초기화** 버튼으로 기본값을 복원할 수 있습니다.

## 유의사항

- 반석엘티씨 공식 제품 또는 확정된 협력관계를 나타내지 않습니다.
- 농장명·좌표·검사결과·위험 점수·담당자·기록은 모두 **가상 데이터**입니다.
- 검사 결과 해석, 질병 진단, 법정 신고, 실제 문자·이메일 발송 기능을 수행하지 않습니다.
- 상용화 시 실제 데이터 이용권·보안체계·수의학적 검증·신고 절차가 별도로 필요합니다.

배포: GitHub → **Settings → Pages → Deploy from a branch → main / (root)**.


## 업무 흐름 체험 · 필요 데이터 (2026-11)

6개 데모의 첫 화면은 실무 흐름 중심으로 구성되어 있습니다. **① 업무 직접 체험**에서는 실제 업무처럼 접수, 확인, 기록, 담당자 검토 및 완료 단계를 진행합니다. **② 필요 데이터 목록**에서는 서비스별 데이터 그룹, 필드 키, 자료형, 필수 여부, 예시값, 사용 목적과 수집 출처를 확인하고 CSV 데이터 정의서 및 JSON 샘플을 내려받을 수 있습니다.

| 데모 | 업무 시나리오 |
|---|---|
| 검사보고서 자동화 | 접수 → 검체 확인 → QC → 전문가 승인 → 결과 기록 |
| 농장 방역관리 | 점검 계획 → 체크리스트 → 시정 조치 → 재점검 → 종료 |
| 농장 건강관리 | 일일 관찰 → 지표 확인 → 기준선 비교 → 전문가 검토 → 후속 관찰 |
| 위험지도 | 지역 선택 → 공공자료 확인 → 가중치 시나리오 → 검토 → 공유 초안 |
| 수의사 AI 업무비서 | 방문 준비 → 원문 메모 → SOAP 초안 → 전문가 승인 → 후속 업무 |
| 지자체 스마트 방역 | 업무 접수 → 담당 배정 → 검사·현장 진행 → 검토 → 완료 |

데모 변경사항은 브라우저 localStorage에 저장되며, 실제 AI 추론·검사시스템·알림 전송·법정 신고 기능은 연결되지 않습니다. **모든 농장명과 검사값, 위험 점수, 지역 표시는 가상 데이터**입니다.

## 진단기관 관점 확장 데모 6종 (2026-11-18)

반석엘티씨는 **수의사 11명이 근무하는 가금 진단전문기관**이라는 점에 맞춰, 진단기관의 업무 흐름(의뢰 → 수거 → 검사실 운영 → 판독·QC → 결과 → 데이터 사업)을 따라 구성했습니다. 제안서 첫 화면의 **01-B** 섹션과 모든 데모의 좌측 메뉴에서 이동할 수 있습니다.

| # | 데모 | URL | 시연 기능 | 구분 |
|---|---|---|---|---|
| 07 | 고객 포털 · 의뢰 · 결과 | [portal.html](https://tajogood.github.io/bansuk/demos/portal.html) | 농장주·수의사·계열사 역할 전환, 온라인 의뢰 4단계(패키지·견적·수거 일정·라벨), 진행 추적, 수의사 승인 결과·코멘트, 청구·정산, 알림 설정 | 신규 |
| 08 | 시료 수거 경로 최적화 | [route.html](https://tajogood.github.io/bansuk/demos/route.html) | 포털 수거 요청 자동 반영, 스윕+최근접+2-opt 배차, 콜드체인·긴급·적재 한도, 접수순 대비 거리·시간·CO₂ 비교 | 신규 |
| 09 | 검사실 운영 관제 | [command.html](https://tajogood.github.io/bansuk/demos/command.html) | 검체 6단계 파이프라인·병목, SLA 정렬 대기열, **수의사 11명** 업무 현황·승인 대기 자동 배분, 장비 가동 일정, 운영 브리핑 | 고도화 |
| 10 | PCR 판독 · QC 자동화 | [pcr.html](https://tajogood.github.io/bansuk/demos/pcr.html) | 96웰 플레이트, 증폭곡선·Ct 자동 판정(cut-off 조정), NTC·양성·추출 대조군, 내부대조 실패, Levey-Jennings·Westgard, 풀링 역추적, 승인 요청·LIMS CSV | 신규 |
| 11 | 항체가 분석 · 백신 효과 | [serology.html](https://tajogood.github.io/bansuk/demos/serology.html) | ND/H9 HI·IB ELISA GMT·CV·기준 이상 비율, 백신 기대곡선·비교군, 패턴 표시, 붙여넣기 분석, 해석 초안 | 고도화 |
| 12 | 진단 데이터 질병 동향 | [intel.html](https://tajogood.github.io/bansuk/demos/intel.html) | 52주 지역·질병별 양성률, 계절 기대 대비 이항 z-점수 이상 신호, 시·도 지도(표본 부족 비공개), 대상별 월간 리포트, 데이터 사업 모델 | 신규 |

**연결:** 포털 수거 요청 → 수거 경로 자동 반영(localStorage) · 결과 화면 → 항체가 분석·결과지 편집기·질병 동향으로 이동.

**기존 데모 보완:** AI 질병 위험지도를 실제 시·도 경계 지도(통계청 2013 경계 단순화, [southkorea-maps](https://github.com/southkorea/southkorea-maps))로 교체, 12개 데모 공통 좌측 메뉴(`demos/nav.js`), 모바일 가로 넘침 수정.

**구성 파일:** `demos/nav.js` · `demos/korea.js` · `demos/pro.css`/`pro.js`(공통, 가상 수의사 11명 정의 포함) · `demos/{portal,route,command,pcr,serology,intel}.js`

모든 계산은 브라우저 안에서 이루어지며 외부 API를 호출하지 않습니다. 판정 기준·SLA·단가·수의사 역할 배분은 **설명용 예시값**이며 실제 판정, 법정 신고, 가격 정책이 아닙니다.
