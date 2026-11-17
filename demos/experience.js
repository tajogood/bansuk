/* BANSUK AI — interactive operational scenarios & data catalogs.
   Everything here is fictional, offline and for UI evaluation only. */
'use strict';

const DATA_CATALOG = {
  lab: {
    summary:'검사의뢰 → 검체접수 → 품질관리 → 판독 → 전문가 승인에 필요한 데이터 구조',
    path:['검사의뢰','검체 식별','검사 수행·QC','전문가 검토','결과 기록'],
    groups:[
      ['검사의뢰·농장 식별','의뢰서 · 고객관리 대장',[
        'request_id|의뢰번호|문자|필수|REQ-2026-1101|의뢰별 고유 식별자',
        'farm_id|농장 관리번호|문자|필수|FARM-0142|농장별 검사 이력 연결',
        'species|축종|선택|필수|산란계|축종별 검사 구분',
        'request_date|의뢰일|날짜|필수|2026-11-18|접수 SLA 및 일정 관리',
        'requester|의뢰 담당자|문자|선택|시연 김담당|결과 문의 담당자']],
      ['검체 접수','검체 인수기록 · 바코드',[
        'specimen_id|검체 바코드|문자|필수|SP-1101-01|시료 추적성 확보',
        'collection_date|채취일시|일시|필수|2026-11-17 10:30|채취부터 접수까지 이력',
        'sample_type|검체 종류|선택|필수|혈청|검사 적합성 판단 기초',
        'sample_count|검체 수량|정수|필수|24|수량 일치 검증',
        'storage_condition|보관 조건|문자|선택|냉장 보관|시료 품질 검토']],
      ['실험·품질관리','LIMS · 검사장비 CSV',[
        'test_code|검사 코드|선택|필수|AI-ELISA|검사 방법 식별',
        'batch_id|검사 배치번호|문자|필수|BATCH-26-401|실험 배치 추적',
        'result_value|측정 결과|소수|필수|84.5|검사방법별 수치 분석',
        'qc_status|QC 적합 여부|선택|필수|적합|재검 판단 근거',
        'instrument_id|검사장비 ID|문자|선택|ELISA-02|장비별 품질 확인']],
      ['검토·결과 문서','보고서 · 검토 기록',[
        'reviewer_id|검토자 ID|문자|필수|VET-007|권한 있는 검토자 식별',
        'reviewed_at|검토일시|일시|필수|2026-11-18 15:00|검토 이력 추적',
        'report_version|보고서 버전|문자|필수|v1.0|수정 및 재발행 관리',
        'approved|최종 승인|선택|필수|승인 대기|승인 이력 확인',
        'report_file|결과 파일|파일|선택|result_1101.pdf|원본·결과 파일 연결']]
    ]
  },
  biosecurity: {
    summary:'농장 기본정보와 소독·출입·시설점검 기록을 기반으로 개선조치까지 추적',
    path:['농장 등록','정기 점검','미흡사항 확인','시정조치','재점검'],
    groups:[
      ['농장·시설 기준정보','농장 등록대장',[
        'farm_id|농장 관리번호|문자|필수|FARM-0142|점검 이력 연결',
        'species|축종|선택|필수|양계|점검표 선택',
        'house_count|축사 동수|정수|선택|4|시설 범위 파악',
        'manager_id|농장 관리자|문자|필수|MGR-014|담당자 알림·확인']],
      ['현장 방역점검','모바일 체크리스트',[
        'inspection_id|점검번호|문자|필수|CHK-2026-101|점검 1건 식별',
        'inspection_date|점검일시|일시|필수|2026-11-18 08:30|정기 점검 이력',
        'check_item|점검항목|문자|필수|출입차량 소독|점검 항목별 결과',
        'check_result|적합 여부|선택|필수|미흡|미흡사항 판정 기록',
        'evidence_photo|증빙사진|파일|선택|photo_101.jpg|확인용 증빙']],
      ['출입·소독 기록','출입대장 · 소독일지',[
        'visitor_log_id|출입기록 ID|문자|필수|VIS-00982|출입 이력 추적',
        'visitor_role|방문 목적|선택|필수|검사 방문|출입 관리',
        'disinfection_at|소독 시각|일시|필수|2026-11-18 08:15|소독 이력 연결',
        'disinfectant|소독제 종류|문자|선택|시연 소독제 A|사용내역 관리']],
      ['개선·재점검','점검 조치대장',[
        'issue_id|미흡사항 ID|문자|필수|ISSUE-010|시정조치 연결',
        'assignee|조치 담당자|문자|필수|시연 박담당|책임자 구분',
        'due_date|조치 기한|날짜|필수|2026-11-22|기한 관리',
        'resolution|조치 내용|문자|선택|소독기 점검 완료|조치 증빙',
        'recheck_status|재점검 상태|선택|필수|점검 대기|업무 종료 조건']]
    ]
  },
  health: {
    summary:'일일 사육관찰·생산·환경·검사 이력을 모아 농장 이상징후 확인을 보조',
    path:['일일 관찰','지표 수집','기준선 비교','검토 요청','후속 관찰'],
    groups:[
      ['농장·사육 기준정보','농장 관리시스템',[
        'farm_id|농장 ID|문자|필수|FARM-0142|모든 시계열 연결',
        'flock_id|사육군 ID|문자|필수|FLOCK-22|같은 사육군 변화 추적',
        'flock_age|일령|정수|선택|145|생산 지표 맥락',
        'population|사육수수|정수|필수|20000|폐사율·산란율 산식',
        'breed|품종|선택|선택|산란계 A|기준선 구분']],
      ['생산·건강 관찰','농장 일지 · IoT 연계 가능',[
        'observed_date|관찰일|날짜|필수|2026-11-18|일별 시계열',
        'egg_rate|산란율|소수|필수|88.3|생산 변화 확인',
        'mortality_count|당일 폐사수|정수|필수|6|변화 추세 확인',
        'feed_kg|사료 섭취량(kg)|소수|선택|1750|사료 추세 연계',
        'water_l|음수량(L)|소수|선택|3200|음수 변화 관찰']],
      ['축사 환경','환경센서 · 수기입력',[
        'house_temperature|축사 온도(°C)|소수|선택|23.5|환경변화 파악',
        'humidity|상대습도(%)|소수|선택|60|사육환경 맥락',
        'ammonia_ppm|암모니아(ppm)|소수|선택|8|시설 점검 판단 보조',
        'sensor_at|측정일시|일시|선택|2026-11-18 09:00|측정시점 확인']],
      ['검사·후속조치','검사보고서 · 수의사 기록',[
        'lab_result_id|검사결과 참조번호|문자|선택|LAB-1001|정기검사 결과 연결',
        'symptom_note|현장 관찰 소견|문자|선택|식욕 저하 개체 관찰|수의사 검토 보조',
        'review_requested|검토 요청 여부|선택|필수|요청 대기|검토 처리 흐름',
        'followup_date|재관찰 예정일|날짜|선택|2026-11-20|점검 일정 추적']]
    ]
  },
  risk: {
    summary:'공공 발생정보·날씨·농장 분포 등 허가된 데이터로 시나리오형 위험지도를 구성',
    path:['위치 정합','외부 데이터 연결','가중치 시나리오','지도 비교','검토 기록'],
    groups:[
      ['위치·기준정보','허가된 농장 위치정보',[
        'region_code|행정구역 코드|문자|필수|43770|지역별 데이터 결합',
        'region_name|행정구역 이름|문자|필수|충북 음성|지도 표시',
        'location_geom|위치정보|좌표|선택|위치 가명화 좌표|지도 공간분석',
        'farm_count|지역 내 농장수|정수|선택|340|분포 지표']],
      ['질병 발생·검사 신호','공개 발생정보 · 검사기관',[
        'event_date|발생·발표일|날짜|필수|2026-11-17|시간 필터',
        'disease_code|질병 분류코드|문자|필수|D-TEST|질병별 범위 필터',
        'event_source|자료 출처|문자|필수|시연 공개데이터|근거 확인',
        'event_count|발생 건수(집계)|정수|선택|2|지역 집계 지표',
        'test_signal|검사 신호|선택|선택|추가 확인|검사연계 검토']],
      ['기상·시계열','기상 관측 · 공개 데이터',[
        'weather_at|관측일시|일시|필수|2026-11-18 06:00|시점 정합',
        'temperature|기온(°C)|소수|선택|9.1|분석 시나리오 입력',
        'rain_mm|강수량(mm)|소수|선택|2.5|시계열 요소',
        'wind_speed|풍속(m/s)|소수|선택|2.1|시나리오 변수']],
      ['시나리오·검토 기록','설정된 분석 파라미터',[
        'scenario_id|시나리오 ID|문자|필수|SCN-001|시뮬레이션 버전',
        'density_weight|밀집도 가중치|소수|필수|0.30|가상 점수 계산',
        'report_weight|발생정보 가중치|소수|필수|0.50|가상 점수 계산',
        'observation_weight|관찰가중치|소수|필수|0.20|가상 점수 계산',
        'review_note|검토 의견|문자|선택|추가 자료 확인 필요|해석·근거 보관']]
    ]
  },
  vet: {
    summary:'현장 방문, 주관적 소견과 객관 관찰, 계획 및 후속 업무를 분리하여 기록',
    path:['방문 예약','현장 메모','SOAP 초안','수의사 검토','후속 일정'],
    groups:[
      ['농장·방문 기본정보','방문 예약 · 담당자 일정',[
        'visit_id|방문 ID|문자|필수|VISIT-2026-018|방문별 고유번호',
        'farm_id|방문 농장 ID|문자|필수|FARM-0142|진료 이력 연결',
        'visit_date|방문일시|일시|필수|2026-11-18 10:30|업무 순서 추적',
        'veterinarian_id|담당 수의사 ID|문자|필수|VET-007|기록 소유자 구분']],
      ['현장 대화·관찰','현장 입력 · 음성 전사(연동 후보)',[
        'raw_memo|원문 메모|문자|필수|사료 섭취 변화 확인|원문 보존',
        'subjective|주관적 소견(S)|문자|선택|농장주 설명|SOAP 초안',
        'objective|객관적 관찰(O)|문자|선택|일지 지표 확인|SOAP 초안',
        'observed_at|관찰 시각|일시|선택|2026-11-18 10:40|기록 근거']],
      ['수의사 검토·서명','SOAP 기록·검토 승인',[
        'assessment|평가(A) 초안|문자|선택|추가 검사 고려|수의사 검토',
        'plan|계획(P) 초안|문자|선택|재방문 일정 조율|후속 조치',
        'approval_status|승인 상태|선택|필수|검토 대기|승인 전 사용 방지',
        'signed_by|서명자|문자|선택|시연 수의사|문서 승인 이력']],
      ['후속 방문·업무','담당 업무·일정',[
        'task_id|후속 업무 ID|문자|필수|TASK-0102|업무 추적',
        'followup_date|후속 기한|날짜|필수|2026-11-21|방문 일정 알림',
        'task_owner|담당자|문자|필수|시연 이담당|담당 업무 배정',
        'task_state|업무상태|선택|필수|대기|후속 완료 관리']]
    ]
  },
  public: {
    summary:'민원·검사·현장 점검을 접수번호 단위로 관리하고 기관별 권한과 처리기록을 추적',
    path:['업무 접수','담당자 배정','현장·검사 진행','검토','처리 완료'],
    groups:[
      ['접수·기관 정보','기관 업무접수 대장',[
        'case_id|업무 접수번호|문자|필수|GOV-2026-041|기관 업무 추적',
        'department_id|소관 부서 코드|문자|필수|ANIMAL-01|부서별 권한',
        'region_code|관할 행정구역|문자|필수|43770|관할 구역 조회',
        'received_at|접수일시|일시|필수|2026-11-18 09:00|처리 이력 기록',
        'case_type|업무 유형|선택|필수|시료 검사 의뢰|처리절차 분기']],
      ['현장·검사 진행','업무 담당자·검사기관',[
        'assigned_staff|담당자 ID|문자|필수|STAFF-007|할당·권한 구분',
        'visit_date|현장 예정일|날짜|선택|2026-11-20|현장 일정 관리',
        'sample_ref|검체 참조번호|문자|선택|SP-1101-01|검사기관 연계',
        'progress_state|처리 단계|선택|필수|검사 진행|사건 상태 관리']],
      ['검토·증빙','업무 문서 및 검토기록',[
        'evidence_doc|업무 증빙파일|파일|선택|inspection_041.pdf|점검 근거',
        'reviewer_id|검토 담당자|문자|필수|REVIEW-001|상급자 검토',
        'review_at|검토일시|일시|선택|2026-11-20 13:00|승인 기록',
        'result_note|처리 결과|문자|선택|재점검 예정|후속 판단 근거']],
      ['처리·감사 이력','행정 처리이력',[
        'closed_at|처리 완료일|일시|선택|2026-11-21 16:00|처리 현황',
        'audit_event|업무 변경 이벤트|문자|필수|담당자 변경|행위 감사',
        'actor_id|변경 주체|문자|필수|STAFF-007|감사 추적',
        'external_link|외부 시스템 참조|문자|선택|시연-참조-102|기존 업무 연결']]
    ]
  }
};
const EXPERIENCE = {
 lab:{brief:'검체를 한 건 접수하고 QC와 결과 검토를 거쳐, 승인된 보고서 초안을 만들어 보세요.',role:'검사실 실무자 · 검토 수의사',stages:['검사 접수','검체 확인','검사·QC','전문가 승인','결과 기록'],fields:[
  [['sampleType','검체 유형','select',['혈청','면봉','기타'],'혈청'],['sampleCount','접수 검체 수량','number',null,'24'],['pickup','채취일','date',null,'2026-11-17']],
  [['barcode','검체 바코드','text',null,'SP-1101-01'],['integrity','검체 상태','select',['적합','추가 확인 필요','부적합'],'적합'],['storage','보관 이력','select',['확인 완료','확인 대기'],'확인 완료']],
  [['method','검사법','select',['ELISA','PCR','기타'],'ELISA'],['batch','장비 배치번호','text',null,'BATCH-26-401'],['qc','대조군·품질관리','select',['적합','재검 필요'],'적합']],
  [['reviewer','검토자','text',null,'시연 수의사 김'],['decision','검토 판단','select',['검토 완료','추가 검토 필요'],'검토 완료'],['comment','검토 의견','text',null,'검사 방법과 원본 확인']],
  [['reportRef','보고서 참조번호','text',null,'RPT-2026-018'],['delivery','결과 전달 방식','select',['포털 조회','현장 전달 기록','내부 보관'],'포털 조회']]],
  highlight:'장비 데이터의 품질관리와 전문가 검토를 분리해 추적합니다.'},
 biosecurity:{brief:'점검 항목을 체크하고 미흡사항을 개선조치로 등록한 뒤 재점검까지 진행해 보세요.',role:'농장 관리자 · 현장 점검자',stages:['점검 계획','현장 점검','개선조치','재점검','기록 종료'],fields:[
  [['inspector','점검 담당자','text',null,'시연 점검자 박'],['inspectionType','점검 유형','select',['정기 점검','수시 점검','개선 후 확인'],'정기 점검']],
  [['checkResult','현장 점검 결과','select',['전체 적합','미흡사항 있음'],'미흡사항 있음'],['evidence','사진 증빙 파일명','text',null,'photo_101.jpg']],
  [['issue','개선 필요 내용','text',null,'출입구 소독기 상태 확인'],['due','조치 기한','date',null,'2026-11-21'],['assignee','조치 담당','text',null,'시연 관리자']],
  [['recheck','재점검 결과','select',['적합','보완 필요'],'적합'],['checkedAt','재점검 예정일','date',null,'2026-11-22']],
  [['closeReason','종결 메모','text',null,'점검·조치 증빙 확인']]],highlight:'일지 작성에 그치지 않고 미흡사항의 조치 완료까지 기록합니다.'},
 health:{brief:'일일 생산·환경 관찰값을 입력하고, 기준선 대비 변화를 검토해 후속 관찰을 등록해 보세요.',role:'농장 관리자 · 수의사',stages:['관찰 등록','지표 확인','기준선 비교','전문가 검토','후속 관찰'],fields:[
  [['flock','사육군 식별자','text',null,'FLOCK-22'],['eggRate','산란율(%)','number',null,'86.5'],['mortality','당일 폐사수','number',null,'5']],
  [['feed','사료 섭취량(kg)','number',null,'1750'],['water','음수량(L)','number',null,'3200'],['temp','축사 온도(°C)','number',null,'23.5']],
  [['baseline','기준선 산란율(%)','number',null,'90'],['changeReason','지표 변화 메모','text',null,'일지 변화 추세 확인']],
  [['reviewer','검토 요청 담당','text',null,'시연 수의사'],['reviewNote','검토 의견','text',null,'환경·생산·검사 기록 함께 확인']],
  [['followup','후속 관찰일','date',null,'2026-11-21'],['action','후속 관찰 계획','text',null,'이틀 뒤 동일 지표 재확인']]],highlight:'단일 지표로 질병을 진단하지 않고 검토 요청과 관찰 과정을 연결합니다.'},
 risk:{brief:'위험지도에서 지역을 선택하고, 가상 데이터 가중치를 바꿔 시나리오별 차이를 비교하세요.',role:'방역 분석가 · 기관 담당자',stages:['지역 선정','정보 확인','시나리오 분석','검토 기록','공유용 초안'],fields:[
  [['area','분석 범위','select',['시연 전체 지역','선택 지역만'],'시연 전체 지역'],['disease','관심 질병 그룹','select',['AI 가상 시나리오','구제역 가상 시나리오','전체'],'AI 가상 시나리오']],
  [['publicData','공개자료 확인','select',['출처 확인','확인 대기'],'출처 확인'],['observation','관찰시점','date',null,'2026-11-18']],
  [['density','밀집도 가중치(%)','number',null,'30'],['events','발생정보 가중치(%)','number',null,'50'],['other','환경·관찰 가중치(%)','number',null,'20']],
  [['reviewer','검토자','text',null,'시연 방역 분석가'],['caution','해석 주의사항','text',null,'본 지표는 예측 정확도가 검증되지 않은 시연값']],
  [['memo','공유 메모','text',null,'가상 시나리오 결과로 회의에서만 사용']]],highlight:'발생 가능성 예측이 아닌 가상 가중치 실험 화면입니다.'},
 vet:{brief:'방문 메모를 SOAP 형식으로 구조화하고, 수의사 검토 후 후속 업무를 지정해 보세요.',role:'산업동물 수의사 · 방문 지원인력',stages:['방문 준비','메모 입력','SOAP 정리','전문가 승인','후속 일정'],fields:[
  [['purpose','방문 목적','select',['정기 방문','사육 상담','재방문'],'정기 방문'],['visitAt','방문일','date',null,'2026-11-18']],
  [['rawNote','현장 원문 메모','textarea',null,'농장주가 산란율 변화 언급. 축사 환경과 일지 확인. 추가 관찰 예정.']],
  [['s','S · 주관적 정보','textarea',null,'농장주가 평소보다 산란율이 낮다고 설명'],['o','O · 객관 관찰','textarea',null,'생산 일지와 축사 온도 기록 확인'],['a','A · 평가 초안','textarea',null,'추가 관찰 및 검사 자료 검토 필요'],['p','P · 후속 계획','textarea',null,'이틀 후 재방문 일정 조율']],
  [['reviewer','승인 수의사','text',null,'시연 수의사 김'],['signature','검토 확인','select',['검토 완료','추가 검토 필요'],'검토 완료']],
  [['nextDate','후속 점검일','date',null,'2026-11-21'],['task','후속 작업','text',null,'생산 일지 변화 재확인'],['taskOwner','담당자','text',null,'시연 수의사 김']]],highlight:'원문 보존·SOAP 문서·전문가 승인·후속 일정을 분리하여 기록합니다.'},
 public:{brief:'신규 업무를 접수해 담당자를 배정하고 처리 단계를 바꿔 최종 이력까지 남겨 보세요.',role:'지자체 방역 담당자 · 동물위생시험소',stages:['업무 접수','담당 배정','현장·검사','검토·보고','처리 완료'],fields:[
  [['received','접수 경로','select',['기관 내부 접수','현장 점검','검사기관 의뢰'],'기관 내부 접수'],['purpose','요청 내용','text',null,'현장 점검 및 검사 의뢰 확인']],
  [['team','담당 부서','select',['방역팀','검사팀','현장지원팀'],'방역팀'],['owner','처리 담당자','text',null,'시연 담당자 김'],['due','처리 예정일','date',null,'2026-11-22']],
  [['sampleRef','검사 참조번호','text',null,'SP-1101-01'],['siteResult','현장 확인 내용','text',null,'시연 현장 점검 완료']],
  [['reviewer','검토 책임자','text',null,'시연 팀장'],['reviewDecision','검토 상태','select',['승인','보완 요청'],'승인']],
  [['closing','처리 결과','text',null,'검토 및 기록 보관 완료'],['archived','문서 분류','select',['내부 보관','추가 조치 예정'],'내부 보관']]],highlight:'기관별 처리 절차의 단계·책임자·검토 이력을 사례 단위로 관리합니다.'}
};

const expStorageKey='bansuk_experience_v1_'+KEY;
function expSeed(){const cases={};rows.forEach((r,i)=>{cases[r.id]={step:i%5,values:{},events:[{label:'가상 업무 생성',at:'2026-11-18 09:00'}],notes:[],checks:[true,true,false,true,false],observations:[{date:'2026-11-16',egg:r.value,mortality:5,temperature:23.1}],tasks:[{title:'원자료 확인',done:i%3===0}],weights:[30,50,20]};});return cases;}
function expRead(){try{let x=JSON.parse(localStorage.getItem(expStorageKey));return x&&typeof x==='object'&&!Array.isArray(x)?x:expSeed()}catch{return expSeed()}}
let work=expRead();
const reqState={group:'all',query:''};
function wfGet(id){if(!id)return null;if(!work[id])work[id]={step:0,values:{},events:[],notes:[],checks:[true,false,false,true,false],observations:[],tasks:[],weights:[30,50,20]};return work[id]}
function wfCurrent(){const r=selected();return r?wfGet(r.id):null}
function wfSave(){try{localStorage.setItem(expStorageKey,JSON.stringify(work))}catch{toast('브라우저 저장이 불가능합니다.')}}
function wfLog(t){const c=wfCurrent();if(!c)return;c.events.unshift({label:t,at:today()});c.events=c.events.slice(0,25);wfSave();activity(`${selected().id}: ${t}`)}
function wfSync(c){const r=selected();if(!r)return;r.status=c.step>=4?'완료':c.step===0?'검토 필요':'진행 중';save()}
function toStages(){return EXPERIENCE[KEY].stages}
function wfFields(){return EXPERIENCE[KEY].fields[wfCurrent()?.step||0]||[]}
const getFieldDefaults=(field,c)=>c.values[field[0]]===undefined?field[4]:c.values[field[0]];
function wfInputs(fields,c){return fields.map(([id,label,type,opts,value])=>{const v=getFieldDefaults([id,label,type,opts,value],c);return `<label class="work-field ${type==='textarea'?'full':''}"><span>${esc(label)} <em>필수</em></span>${type==='select'?`<select name="${esc(id)}" required>${opts.map(o=>`<option value="${esc(o)}" ${String(v)===o?'selected':''}>${esc(o)}</option>`).join('')}</select>`:type==='textarea'?`<textarea name="${esc(id)}" rows="4" maxlength="1500" required>${esc(v)}</textarea>`:`<input name="${esc(id)}" type="${type}" value="${esc(v)}" ${type==='number'?'step="any" min="0"':''} maxlength="120" required>`}</label>`}).join('')}
const progressLabel=c=>toStages()[Math.max(0,Math.min(4,c.step))];
function workQueue(){return `<aside class="work-queue"><div class="queue-top"><div><span class="ui-kicker">WORKLIST</span><h3>진행 중인 업무</h3></div><span class="count-bubble">${rows.length}</span></div><p>목록에서 업무를 선택해 실제 처리 흐름을 체험해보세요.</p><div class="queue-list">${rows.map(r=>{const c=wfGet(r.id);return `<button type="button" class="queue-row ${r.id===state.selected?'active':''}" data-wf-select="${esc(r.id)}"><span class="queue-row-top"><b>${esc(r.id)}</b><span class="queue-pill ${c.step>=4?'complete':''}">${esc(progressLabel(c))}</span></span><strong>${esc(KEY==='risk'?r.region:r.farm)}</strong><small>${esc(r.type)} · ${esc(r.date)}</small></button>`}).join('')}</div><div class="queue-foot"><button type="button" class="btn btn-tiny" id="wfAddCase">＋ 새 업무 추가</button><button type="button" class="linkish" id="goRequirementsSide">필요 데이터 보기 ↗</button></div></aside>`}
function stageBar(c){return `<div class="stage-bar" aria-label="업무 단계">${toStages().map((s,i)=>`<div class="stage-node ${i<c.step?'passed':i===c.step?'current':''}"><span>${i<c.step?'✓':i+1}</span><small>${esc(s)}</small></div>`).join('')}</div>`}
function sampleInsight(r,c){const by={lab:`${r.type} · ${r.value}${C.unit} · ${r.farm} / 원본 검사 결과 확인 및 전문 검토 필요`,biosecurity:`점검 이행률 ${r.value}% · 개선조치 ${c.tasks.filter(x=>!x.done).length}건 대기`,health:`산란율 ${r.value}% · 복수 지표와 과거 기록을 함께 검토해야 합니다`,risk:`시연 위험 지표 ${r.value}점 · 실제 발생 확률이나 지역 경보와 무관`,vet:`후속 점검 ${r.value}건 · 승인 전 임상문서로 사용할 수 없음`,public:`업무 진행률 ${r.value}% · 부서별 처리 이력을 기록하는 화면`};return by[KEY]}
function wfNotePanel(c){return `<div class="work-note-panel"><div class="card-heading"><h3>작업 메모 · 이력</h3><small>브라우저 내에서만 저장</small></div><form id="wfNoteForm" class="work-note-entry"><input name="note" placeholder="검토 의견이나 협의사항을 남겨보세요" maxlength="180" required><button type="submit" class="btn btn-primary btn-tiny">기록</button></form><div class="work-log">${[...c.notes.map(n=>({label:'메모 · '+n.text,at:n.at})),...c.events].sort((a,b)=>b.at.localeCompare(a.at)).slice(0,8).map(e=>`<div class="work-log-item"><i></i><div><b>${esc(e.label)}</b><small>${esc(e.at)}</small></div></div>`).join('')}</div></div>`}
function wfGenericCard(r,c){const f=EXPERIENCE[KEY].fields[c.step]||[];return `<section class="work-main-card"><div class="card-heading"><div><div class="ui-kicker">STEP ${String(c.step+1).padStart(2,'0')} / 05</div><h2>${esc(progressLabel(c))}</h2><p>${esc(EXPERIENCE[KEY].highlight)}</p></div><span class="demo-mark">DEMO</span></div>${stageBar(c)}<form id="wfStageForm" class="stage-form"><div class="work-input-grid">${wfInputs(f,c)}</div><div class="stage-actions"><button class="btn" type="button" id="wfBack" ${c.step===0?'disabled':''}>← 이전 단계</button><div class="spacer-flex"></div><button class="btn" type="submit" data-wf-save="1">현재 단계 저장</button><button class="btn btn-primary" type="submit" data-wf-next="1">${c.step===4?'✓ 최종 처리 완료':'다음 단계 →'}</button></div></form><div class="work-fineprint">모든 승인·전송·검토는 가상 작업입니다. 실제 검사 판정이나 공공 시스템에 영향을 주지 않습니다.</div></section>`}
function qualityBand(value,label,warning){return `<div class="quality-card"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(warning)}</small></div>`}
function wfSpecial(r,c){const p=c.values;
if(KEY==='lab')return `<section class="experience-card"><div class="card-heading"><div><div class="ui-kicker">SPECIMEN TRACE</div><h3>검체·판독 작업대</h3></div><button type="button" class="btn btn-tiny" id="wfCaseDocSecondary">시료 접수서 내보내기</button></div><div class="quality-grid">${qualityBand(r.id,'의뢰번호','가상 접수번호')}${qualityBand(p.barcode||'SP-1101-01','시료 바코드','보관 및 검체 일치 확인')}${qualityBand(String(r.value)+'%','임의 검사 요약값','임상적 해석 불가')}</div><div class="work-alert">검사 결과의 최종 해석은 검사법별 판정 기준, QC 기록, 담당 수의사 검토가 필요합니다.</div><div class="micro-table"><div><b>장비 결과 행</b><b>OD / 값 (예시)</b><b>검증</b></div>${['대조군 양성','대조군 음성','샘플 평균'].map((x,i)=>`<div><span>${x}</span><span>${[1.42,.08,.91][i]}</span><em>${i===2?'검토 대상':'시연 적합'}</em></div>`).join('')}</div></section>`;
if(KEY==='biosecurity')return `<section class="experience-card"><div class="card-heading"><div><div class="ui-kicker">ON-SITE INSPECTION</div><h3>현장 점검 및 시정조치</h3></div><span class="count-bubble">${c.checks.filter(Boolean).length}/5</span></div><p class="experience-hint">체크 결과를 바꾸고 저장하면 농장 점검 이행률에 반영됩니다.</p><div class="work-checklist">${['출입차량·인원기록 확인','소독시설 상태 점검','축사별 전용 장화·의복 확인','야생동물 차단시설 확인','정기검사·교육 기록 확인'].map((x,i)=>`<label class="check-row"><input type="checkbox" class="wf-check" data-check-index="${i}" ${c.checks[i]?'checked':''}><span>${esc(x)}</span></label>`).join('')}</div><div class="stage-actions"><button type="button" class="btn btn-primary" id="wfSaveChecks">점검 저장</button><button type="button" class="btn" id="wfAddTask">＋ 개선조치 등록</button></div>${taskUI(c)}</section>`;
if(KEY==='health')return `<section class="experience-card"><div class="card-heading"><div><div class="ui-kicker">DAILY FARM LOG</div><h3>일일 사육 관찰 기록</h3></div><button type="button" class="btn btn-tiny" id="wfHealthAdd">＋ 오늘 관찰 등록</button></div><div class="quality-grid">${qualityBand(r.value+'%','현재 산란율','가상 관찰 값')}${qualityBand((c.observations.at(-1)?.mortality??5)+'수','관찰 폐사 수','진단 데이터 아님')}${qualityBand((c.observations.at(-1)?.temperature??23.1)+'°C','마지막 축사 온도','임의 측정값')}</div><div class="observation-bars">${c.observations.slice(-7).map(o=>`<div title="${esc(o.date)} / 산란율 ${esc(o.egg)}%"><span style="height:${Math.max(10,Math.min(100,Number(o.egg)||0))}%"></span><small>${esc(o.date.slice(5))}</small></div>`).join('')}</div><div class="work-alert">관찰 기록에 변화가 보이면 검증된 기준선과 검사결과를 함께 확인하고 수의사에게 검토를 요청하세요.</div></section>`;
if(KEY==='risk'){const w=c.weights||[30,50,20],score=Math.round(r.value*(w[0]*.3+w[1]*.5+w[2]*.2)/40);return `<section class="experience-card"><div class="card-heading"><div><div class="ui-kicker">SCENARIO STUDIO</div><h3>가상 지역 위험 시나리오</h3></div><button type="button" class="btn btn-tiny" id="wfRiskReset">가중치 초기화</button></div><div class="risk-region">${mapSVG()}</div><p class="experience-hint">지역을 선택하고 가중치를 조정해 <b>가상 합성 점수</b>의 변화를 확인해보세요. 점수는 예측·경보가 아닙니다.</p>${[['농장 밀집도',0],['가상 발생 신호',1],['환경·관찰 신호',2]].map(([name,i])=>`<label class="range-row"><span>${name}</span><input class="wf-weight" type="range" min="0" max="100" step="5" data-weight-index="${i}" value="${w[i]}"><strong>${w[i]}%</strong></label>`).join('')}<div class="risk-score"><small>${esc(r.region)} · 임의 합성 점수</small><b id="riskScorePreview">${score}점</b></div><div class="stage-actions"><button class="btn btn-primary" type="button" id="wfSaveScenario">시나리오 저장</button><button class="btn" type="button" id="wfCaseDocSecondary">비교표 내보내기</button></div></section>`;}
if(KEY==='vet')return `<section class="experience-card"><div class="card-heading"><div><div class="ui-kicker">VETERINARY NOTEBOOK</div><h3>방문기록 · SOAP 초안</h3></div><button type="button" class="btn btn-tiny" id="wfVetDraft">원문에서 초안 작성</button></div><div class="soap-grid">${[['S','주관적 정보',p.s||'농장주가 최근 생산 변화가 있다고 설명함'],['O','객관 관찰',p.o||'사육일지와 환경 기록을 확인함'],['A','평가 초안',p.a||'추가 자료 검토 및 전문가 확인 필요'],['P','후속 계획',p.p||'후속 관찰 일정을 조율 예정']].map(([letter,title,v])=>`<div class="soap-item"><strong>${letter}</strong><div><b>${title}</b><p>${esc(v)}</p></div></div>`).join('')}</div><div class="work-alert">자동 기록 초안은 임상적 결론이 아니며 담당 수의사의 원문 대조·검토·승인 후에만 활용할 수 있습니다.</div><button type="button" class="btn" id="wfAddTask">＋ 후속 방문 작업 등록</button>${taskUI(c)}</section>`;
return `<section class="experience-card"><div class="card-heading"><div><div class="ui-kicker">CASE OPERATIONS</div><h3>업무 처리 보드</h3></div><button type="button" class="btn btn-tiny" id="wfAddTask">＋ 후속 업무</button></div><div class="kanban-flow">${toStages().map((s,i)=>`<button type="button" class="kanban-stage ${c.step===i?'active':''}" data-wf-jump="${i}"><small>0${i+1}</small><b>${esc(s)}</b><span>${i<c.step?'완료':i===c.step?'진행 중':'대기'}</span></button>`).join('')}</div><div class="quality-grid">${qualityBand(p.team||'방역팀','소관 부서','가상 기관')}${qualityBand(p.owner||r.owner,'처리 담당자','임의 담당')}${qualityBand(p.due||'2026-11-22','처리 예정일','가상 일정')}</div><div class="work-alert">업무 처리 단계 변경은 시연용 이력만 남기며 실제 행정 접수·통보·법정 신고가 이루어지지 않습니다.</div>${taskUI(c)}</section>`
}
function taskUI(c){return `<div class="task-stack">${(c.tasks||[]).map((t,i)=>`<label class="task-item"><input type="checkbox" class="wf-task" data-task-index="${i}" ${t.done?'checked':''}><span class="${t.done?'done':''}">${esc(t.title)}</span></label>`).join('')||'<p class="smalltext">등록된 후속 작업이 없습니다.</p>'}</div>`}
function workflowPage(){const r=selected();if(!r)return `<div class="experience-empty"><h2>첫 업무를 등록해보세요</h2><button class="btn btn-primary" id="wfAddCase">＋ 기록 등록</button></div>`;const c=wfCurrent();return `<div class="experience-intro"><div><span class="ui-kicker">GUIDED WORK EXPERIENCE · ${esc(EXPERIENCE[KEY].role)}</span><h2>실제 업무 흐름을 체험해보세요</h2><p>${esc(EXPERIENCE[KEY].brief)}</p></div><button class="btn btn-primary" id="goRequirements">필요 데이터 목록 보기 ↗</button></div><div class="work-layout">${workQueue()}<div class="work-detail"><div class="case-head"><div><small>선택한 시연 업무</small><h3>${esc(KEY==='risk'?r.region:r.farm)} <span>${esc(r.id)}</span></h3><p>${esc(sampleInsight(r,c))}</p></div><div class="case-toolbar"><button type="button" class="btn btn-tiny" id="wfCaseDoc">↓ 업무 문서</button><button type="button" class="btn btn-tiny" id="wfEditCase">✎ 기본정보 수정</button></div></div>${wfGenericCard(r,c)}${wfSpecial(r,c)}${wfNotePanel(c)}</div></div>`}

function parsedSchema(){return DATA_CATALOG[KEY].groups.flatMap(([group,source,lines],gi)=>lines.map((line,i)=>{const [field,label,type,required,sample,description]=line.split('|');return {group,source,gi,field,label,type,required,sample,description,id:`${gi}-${i}`}}))}
function schemaRows(){const q=reqState.query.toLowerCase();const data=parsedSchema().filter(s=>(reqState.group==='all'||String(s.gi)===reqState.group)&&(!q||[s.label,s.field,s.source,s.description].join(' ').toLowerCase().includes(q)));return data.length?data.map(s=>`<tr><td><b>${esc(s.label)}</b><code>${esc(s.field)}</code></td><td>${esc(s.type)}</td><td><span class="data-necessity ${s.required==='필수'?'required':''}">${esc(s.required)}</span></td><td>${esc(s.sample)}</td><td>${esc(s.description)}</td></tr>`).join(''):'<tr><td colspan="5" class="empty">검색 조건에 일치하는 데이터 항목이 없습니다.</td></tr>'}
function requirementsPage(){const catalog=DATA_CATALOG[KEY];const fields=parsedSchema();return `<div class="data-cover"><div><span class="ui-kicker">DATA CONTRACT / REQUIREMENTS</span><h2>이 서비스를 구현하려면 어떤 데이터가 필요할까요?</h2><p>${esc(catalog.summary)}</p><div class="data-cover-pills"><span>${catalog.groups.length}개 데이터 그룹</span><span>${fields.length}개 정의 항목</span><span>${fields.filter(f=>f.required==='필수').length}개 필수 항목</span></div></div><div class="data-cover-actions"><button class="btn btn-primary" id="schemaDownload">↓ 데이터 정의서 CSV</button><button class="btn" id="schemaSample">↓ 샘플 JSON</button><button class="btn" id="goWorkflow">업무 체험 돌아가기 ↗</button></div></div><div class="source-process"><div class="ui-kicker">DATA FLOW</div><div class="source-steps">${catalog.path.map((n,i)=>`<div class="source-step"><span>${i+1}</span><b>${esc(n)}</b></div>`).join('')}</div></div><div class="source-group-grid">${catalog.groups.map(([name,src,fs],i)=>`<button type="button" class="source-group ${reqState.group===String(i)?'active':''}" data-schema-group="${i}"><small>GROUP 0${i+1}</small><strong>${esc(name)}</strong><span>${esc(src)}</span><em>${fs.length}개 항목 · 보기 ↗</em></button>`).join('')}</div><div class="panel requirements-card"><div class="table-top"><div><h2>필요 데이터 상세 목록</h2><div class="panel-sub">필드명·자료 출처·값 예시·활용 목적을 검토하세요. 현재 단계는 협업을 위한 설계안입니다.</div></div><div class="table-controls"><input id="reqSearch" aria-label="데이터 항목 검색" class="input" type="search" placeholder="항목명 또는 필드명 검색" value="${esc(reqState.query)}"><button class="btn btn-tiny" id="schemaAll">모두 보기</button></div></div><div class="table-container"><table class="data-table data-dictionary"><thead><tr><th>데이터 필드</th><th>형식</th><th>구분</th><th>예시값</th><th>용도</th></tr></thead><tbody id="schemaRows">${schemaRows()}</tbody></table></div></div><div class="source-bottom"><div class="experience-card"><h3>데이터 확보 전 확인할 사항</h3><ul><li>해당 원본이 실제 존재하는지와 전산화된 형태인지 확인</li><li>수집 주기, 누락률, 장비 제조사별 파일 형식 확인</li><li>개인정보·농장 식별정보의 최소 수집 및 권한 분리</li><li>기관과 농장별 데이터 제공 동의·이용 목적·보존기간 협의</li><li>전문가 검토 책임과 법정 신고 체계를 별도 유지</li></ul></div><div class="experience-card"><h3>초기 연계 방식 제안</h3><div class="integration-list"><div><b>01 · CSV / Excel</b><span>첫 단계: 샘플 파일 확보, 필드 매핑·검증</span></div><div><b>02 · 일괄 동기화</b><span>정기 파일 교환 및 누락·중복 체크</span></div><div><b>03 · API / LIMS 연동</b><span>실제 시스템 제공 여부와 접근권한 확인 후 추진</span></div></div><div class="work-alert">표에 표시된 항목은 제안 기준이며, 반석엘티씨가 실제로 보유하는 데이터임을 뜻하지 않습니다.</div></div></div>`}
function downloadSchema(){const f=parsedSchema();const cols=['데이터 그룹','수집 출처','필드 키','표시명','자료형','필수 여부','예시값','활용 목적'];const lines=[cols,...f.map(s=>[s.group,s.source,s.field,s.label,s.type,s.required,s.sample,s.description])].map(a=>a.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(','));download(`BANSUK_${KEY}_required_data.csv`,'\ufeff'+lines.join('\r\n'),'text/csv;charset=utf-8');toast('필요 데이터 정의서를 내려받았습니다.')}
function downloadSample(){const groups={};parsedSchema().forEach(s=>{if(!groups[s.group])groups[s.group]={};groups[s.group][s.field]=s.sample});download(`BANSUK_${KEY}_sample.json`,JSON.stringify({demo:true,application:KEY,notice:'All values are fictional examples.',data:groups},null,2),'application/json;charset=utf-8');toast('가상 JSON 예시를 내려받았습니다.')}
function expTabs(){return `<nav class="tabs experience-tabs" aria-label="서비스 화면 선택">${[['workspace','① 업무 직접 체험'],['requirements','② 필요 데이터 목록'],['overview','현황 요약'],['data','전체 기록'],['reports','보고서 초안'],['activity','변경 이력']].map(([k,n])=>`<button class="tab ${state.view===k?'active':''}" data-view="${k}" type="button">${n}</button>`).join('')}</nav>`}
// Extend the original demo instead of replacing its data management, exports or reporting features.
renderBody=function(){const target=document.getElementById('mainBody');if(!target)return;target.innerHTML=expTabs()+(state.view==='workspace'?workflowPage():state.view==='requirements'?requirementsPage():state.view==='overview'?`${statHtml()}<div class="grid-primary">${vizPanel()}${insightPanel()}</div>${tablePanel()}<div style="margin-top:18px">${detailPanel()}</div>`:state.view==='data'?`${tablePanel()}<div style="margin-top:18px">${detailPanel()}</div>`:state.view==='reports'?reportPanel():activityPanel())};
state.view='workspace';renderBody();

// Separate delegated handlers are used so the existing interactive demo remains intact.
document.addEventListener('click',e=>{const el=e.target.closest('button');if(!el)return;const id=el.id;
if(el.dataset.wfSelect){state.selected=el.dataset.wfSelect;renderBody();return}
if(el.dataset.schemaGroup!==undefined){reqState.group=el.dataset.schemaGroup;renderBody();return}
if(el.dataset.wfJump!==undefined){const c=wfCurrent(),target=Number(el.dataset.wfJump);if(target<=c.step){c.step=target;wfSave();renderBody()}else toast('이전 단계부터 순서대로 진행해 주세요.');return}
if(id==='schemaAll'){reqState.group='all';reqState.query='';renderBody();return}
if(id==='goRequirements'||id==='goRequirementsSide'){changeView('requirements');return}
if(id==='goWorkflow'){changeView('workspace');return}
if(id==='schemaDownload'){downloadSchema();return}
if(id==='schemaSample'){downloadSample();return}
if(id==='wfAddCase'){showRecordForm();return}
if(id==='wfEditCase'){showRecordForm(true);return}
if(id==='wfBack'){const c=wfCurrent();if(c.step>0){c.step--;wfLog('이전 단계로 되돌림');wfSync(c);renderBody()}return}
if(id==='wfCaseDoc'||id==='wfCaseDocSecondary'){const c=wfCurrent(),r=selected();const parts=[`BANSUK AI · ${C.title}`,'업무 처리 기록 (가상 시연 전용)','━━━━━━━━━━━━━━━━━━',`업무번호: ${r.id}`,`농장/지역: ${r.farm} · ${r.region}`,`현재 단계: ${progressLabel(c)}`,`진행 상태: ${c.step+1}/${toStages().length}`,`기록 생성: ${today()}`,'','[작성한 업무 필드]',...Object.entries(c.values).map(([k,v])=>`${k}: ${v}`),'','[처리 이력]',...c.events.map(x=>`${x.at}: ${x.label}`),'','※ 실제 승인·검사결과·진단·행정서류가 아닙니다.'];download(`BANSUK_${KEY}_${r.id}_workflow.txt`,parts.join('\n'));toast('가상 업무 문서를 생성했습니다.');return}
if(id==='wfSaveChecks'){const c=wfCurrent();c.checks=[...document.querySelectorAll('.wf-check')].map(x=>x.checked);const r=selected();r.value=Math.round(100*c.checks.filter(Boolean).length/Math.max(1,c.checks.length));if(c.checks.some(x=>!x)&&!c.tasks.some(x=>!x.done))c.tasks.push({title:'점검 미흡사항 확인 및 조치',done:false});wfLog(`현장 점검 ${c.checks.filter(Boolean).length}/${c.checks.length}개 기록`);renderBody();toast('체크리스트 기록을 저장했습니다.');return}
if(id==='wfAddTask'){const label=KEY==='biosecurity'?'개선조치 항목':KEY==='vet'?'후속 방문 업무':'후속 업무';modal(`${modalHeader(label+' 등록')}<form id="wfTaskForm"><label class="work-field"><span>업무 내용</span><input name="title" maxlength="120" required placeholder="조치할 업무를 입력하세요"></label><div class="modal-actions"><button type="button" class="btn" id="closeModal">취소</button><button type="submit" class="btn btn-primary">등록</button></div></form>`);return}
if(id==='wfHealthAdd'){modal(`${modalHeader('오늘 사육 관찰 등록')}<form id="wfObservationForm"><div class="work-input-grid"><label class="work-field"><span>관찰 날짜</span><input type="date" name="date" value="2026-11-18" required></label><label class="work-field"><span>산란율(%)</span><input type="number" name="egg" min="0" max="100" step="0.1" value="88.0" required></label><label class="work-field"><span>당일 폐사수</span><input type="number" name="mortality" min="0" step="1" value="5" required></label><label class="work-field"><span>축사 온도(°C)</span><input type="number" name="temperature" step="0.1" value="23.1" required></label></div><div class="modal-actions"><button class="btn" type="button" id="closeModal">취소</button><button class="btn btn-primary" type="submit">관찰 저장</button></div></form>`);return}
if(id==='wfVetDraft'){const c=wfCurrent();const raw=c.values.rawNote||'농장주가 산란율 변화 언급. 축사 환경과 일지 확인. 추가 관찰 예정.';const segments=raw.split(/[.!?。]\s*/).map(x=>x.trim()).filter(Boolean);c.values.s=segments[0]||'농장주 진술 확인 필요';c.values.o=segments[1]||'현장 관찰 사항 작성 필요';c.values.a='임상 판단 없이 입력 메모 분류만 완료. 수의사 평가 필요';c.values.p=segments.slice(2).join('. ')||'후속 일정을 담당자와 협의';wfLog('원문 메모를 SOAP 초안으로 정리 (단순 문장 분리)');renderBody();toast('SOAP 초안을 생성했습니다. 전문가 검토가 필요합니다.');return}
if(id==='wfRiskReset'){const c=wfCurrent();c.weights=[30,50,20];wfLog('시나리오 기본 가중치 복원');renderBody();return}
if(id==='wfSaveScenario'){const c=wfCurrent();c.weights=[...document.querySelectorAll('.wf-weight')].map(x=>Number(x.value));wfLog('지역 위험 가중치 시나리오 저장');renderBody();toast('가상 시나리오를 기록했습니다.');return}
if(id==='confirmReset'){work=expSeed();wfSave();state.view='workspace';renderBody();return}
});

document.addEventListener('input',e=>{if(e.target.id==='reqSearch'){reqState.query=e.target.value;const body=document.getElementById('schemaRows');if(body)body.innerHTML=schemaRows();return}
if(e.target.classList?.contains('wf-weight')){const c=wfCurrent();const inputs=[...document.querySelectorAll('.wf-weight')];const w=inputs.map(x=>Number(x.value));inputs.forEach((x,i)=>x.parentElement.querySelector('strong').textContent=w[i]+'%');const score=Math.round(selected().value*(w[0]*.3+w[1]*.5+w[2]*.2)/40);document.getElementById('riskScorePreview').textContent=score+'점';return}
});

document.addEventListener('change',e=>{if(e.target.classList?.contains('wf-task')){const c=wfCurrent(),idx=Number(e.target.dataset.taskIndex);if(c.tasks[idx]){c.tasks[idx].done=e.target.checked;wfLog(c.tasks[idx].title+(e.target.checked?' 완료':' 재개'));renderBody()}}});

document.addEventListener('submit',e=>{
if(!['wfStageForm','wfNoteForm','wfTaskForm','wfObservationForm'].includes(e.target.id))return;
e.preventDefault();const form=e.target;if(!form.reportValidity())return;const fd=new FormData(form),c=wfCurrent();
if(form.id==='wfStageForm'){
const next=e.submitter?.dataset?.wfNext==='1';const fields=wfFields();for(const [k,,type] of fields){const v=String(fd.get(k)||'').trim();if(!v){toast('필수 입력값을 작성해 주세요.');return}if(type==='number'&&!Number.isFinite(Number(v))){toast('숫자 입력값을 확인해 주세요.');return}c.values[k]=v}
if(KEY==='risk'&&c.step===2){const sum=Number(c.values.density)+Number(c.values.events)+Number(c.values.other);if(sum!==100){toast('가중치 합계가 100%가 되도록 입력하세요.');return}}
if(next){if(KEY==='lab'&&c.step===2&&c.values.qc!=='적합')return toast('QC 재검이 필요한 배치는 다음 단계로 이동할 수 없습니다.');if(KEY==='vet'&&c.step===3&&c.values.signature!=='검토 완료')return toast('수의사 검토 확인 후 다음 단계로 이동할 수 있습니다.');if(KEY==='public'&&c.step===3&&c.values.reviewDecision!=='승인')return toast('보완 요청 상태에서는 최종 완료가 불가능합니다.');if(c.step<4)c.step++}
wfSync(c);wfLog((next?'단계 진행: ':'단계 저장: ')+progressLabel(c));renderBody();toast(next?'다음 업무 단계로 진행했습니다.':'입력 내용을 저장했습니다.');return}
if(form.id==='wfNoteForm'){const text=String(fd.get('note')||'').trim();if(!text)return;c.notes.unshift({text,at:today()});wfLog('업무 메모 등록');renderBody();toast('메모를 기록했습니다.');return}
if(form.id==='wfTaskForm'){const title=String(fd.get('title')||'').trim();if(!title)return;c.tasks.push({title,done:false});wfLog('후속 작업 등록: '+title);closeModal();renderBody();toast('후속 업무를 등록했습니다.');return}
if(form.id==='wfObservationForm'){const obs={date:String(fd.get('date')),egg:Number(fd.get('egg')),mortality:Number(fd.get('mortality')),temperature:Number(fd.get('temperature'))};if(obs.egg<0||obs.egg>100||obs.mortality<0)return toast('관찰값 범위를 확인해주세요.');c.observations.push(obs);c.observations.sort((a,b)=>a.date.localeCompare(b.date));selected().value=obs.egg;wfLog('사육 관찰 기록 추가: '+obs.date);closeModal();renderBody();toast('일일 관찰기록을 저장했습니다.');return}
});
