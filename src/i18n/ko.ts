export const copy = {
  productName: "IdeaGrid",
  navigation: {
    label: "주요 메뉴",
    dashboard: "대시보드",
    settings: "설정",
  },
  dashboard: {
    eyebrow: "Evidence-based idea workspace",
    title: "아이디어를 장면으로 만들고, 근거로 검증하세요.",
    description:
      "IdeaGrid는 물리·시스템·혼합 아이디어의 객체, 관계, 수치와 불확실성을 같은 작업 공간에서 다룹니다.",
    status: "제품 구조와 실행 골격이 연결되었습니다.",
    action: "샘플 편집기 골격 보기",
    items: [
      {
        title: "장면 중심",
        description:
          "객체와 관계를 직렬화 가능한 장면으로 구성하고 분석 결과를 다시 장면에 연결합니다.",
      },
      {
        title: "근거 우선",
        description:
          "수치의 단위, 범위, 출처, 신뢰도와 모르는 값을 결론에서 분리해 보여줍니다.",
      },
      {
        title: "되돌릴 수 있는 AI",
        description:
          "규칙 계산과 생성형 설명을 분리하고 AI 제안을 비교·복원할 수 있게 설계합니다.",
      },
    ],
  },
  editor: {
    eyebrow: "Editor foundation",
    description:
      "Canvas-first 편집기의 라우팅과 데이터 경계가 준비되었습니다. 3D 편집 vertical slice는 Gate B에서 이 경계 위에 구현합니다.",
    status: "프로젝트 ID와 편집기 경계가 연결되었습니다.",
    items: [
      {
        title: "Asset library",
        description: "자산 검색, 필터, 드래그 데이터 계약의 대상 영역입니다.",
      },
      {
        title: "Scene canvas",
        description: "3D 장면, 카메라, 변환, 관계 시각화의 대상 영역입니다.",
      },
      {
        title: "Context panel",
        description: "객체 속성, 분석 진행, 근거 탐색의 대상 영역입니다.",
      },
    ],
  },
  report: {
    eyebrow: "Report foundation",
    description:
      "분석 snapshot, finding, 근거와 장면 참조를 인쇄·공유 가능한 읽기 모델로 투영합니다.",
    status: "보고서 라우트와 계약 경계가 연결되었습니다.",
    items: [
      {
        title: "Snapshot identity",
        description: "보고서가 어떤 장면 버전을 분석했는지 명시합니다.",
      },
      {
        title: "Finding trace",
        description: "결론을 입력값, 규칙, 근거, 영향을 받는 객체와 연결합니다.",
      },
      {
        title: "Accessible export",
        description: "3D와 차트 정보를 텍스트와 표로도 전달하도록 설계합니다.",
      },
    ],
  },
  settings: {
    eyebrow: "Workspace settings",
    title: "설정과 공급자 상태",
    description:
      "테마, 언어, AI·검색 공급자 상태와 개인정보 경계를 한곳에서 관리할 예정입니다.",
    status: "설정 라우트와 정보 구조가 연결되었습니다.",
    items: [
      {
        title: "Appearance",
        description: "White, Gray 10, Gray 90, Gray 100 테마의 대상 영역입니다.",
      },
      {
        title: "Providers",
        description: "AI와 검색 공급자의 가용성·mock 상태를 명확히 구분합니다.",
      },
      {
        title: "Data controls",
        description: "외부 전송 데이터 미리보기와 보존 정책을 관리합니다.",
      },
    ],
  },
} as const;
