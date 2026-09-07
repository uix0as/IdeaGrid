export type Field = {
  key: string;
  name: string;
  unit: string;
  min?: number;
  max?: number;
  optional?: boolean;
};
export type Pair = { id: string; actual: string; limit: string; title: string };
export type Profile = { description: string; fields: Field[]; pairs: Pair[] };
const field = (key: string, name: string, unit: string, min = 0): Field => ({
  key,
  name,
  unit,
  min,
});
const pair = (
  id: string,
  actual: string,
  limit: string,
  title: string,
): Pair => ({ id, actual, limit, title });
const throughput: Profile = {
  description: "요청을 처리합니다. 입력한 요청량과 처리 용량을 비교합니다.",
  fields: [
    field("demand", "요청량", "req/s"),
    field("capacity", "처리량", "req/s"),
    field("latency", "응답 시간", "ms"),
    field("latencyBudget", "목표 응답 시간", "ms"),
  ],
  pairs: [
    pair("capacity", "demand", "capacity", "처리량 초과"),
    pair("latency", "latency", "latencyBudget", "응답 시간 초과"),
  ],
};
const storage: Profile = {
  description:
    "데이터를 저장합니다. 사용량과 저장 한도를 비교합니다. 실제 데이터베이스를 실행하지는 않습니다.",
  fields: [
    field("usedStorage", "사용 저장량", "GB"),
    field("storageCapacity", "저장 용량", "GB"),
    field("cost", "예상 월 비용", "KRW/month"),
    field("budget", "월 예산", "KRW/month"),
  ],
  pairs: [
    pair("storage", "usedStorage", "storageCapacity", "저장 용량 초과"),
    pair("budget", "cost", "budget", "예산 초과"),
  ],
};
const energy: Profile = {
  description:
    "전력을 공급합니다. 전력 공급 관계로 연결한 대상들의 입력 소비 전력 합계를 출력 한도와 비교합니다.",
  fields: [
    field("outputPower", "최대 출력 전력", "W"),
    field("energy", "저장 에너지", "Wh"),
  ],
  pairs: [],
};
const equipment: Profile = {
  description:
    "장비의 소비 전력·적재·작동 온도를 기록하고 입력된 한도와 비교합니다. 배치 크기는 물리적 치수가 아닙니다.",
  fields: [
    field("power", "소비 전력", "W"),
    field("load", "적재량", "kg"),
    field("loadCapacity", "허용 적재량", "kg"),
    field("temperature", "작동 온도", "°C", -273.15),
    field("maxTemperature", "최대 작동 온도", "°C", -273.15),
  ],
  pairs: [
    pair("load", "load", "loadCapacity", "적재 한도 초과"),
    pair("temperature", "temperature", "maxTemperature", "장비 작동 온도 초과"),
  ],
};
const flow: Profile = {
  description:
    "유체 처리량을 모델링합니다. 입력 유량과 정격 유량을 비교하며 압력·유체역학은 계산하지 않습니다.",
  fields: [
    field("flow", "유량", "L/min"),
    field("flowCapacity", "허용 유량", "L/min"),
    field("power", "소비 전력", "W"),
  ],
  pairs: [pair("flow", "flow", "flowCapacity", "유량 한도 초과")],
};
const client: Profile = {
  description:
    "사용자 접점입니다. 사용자 수는 기록용이고 응답 시간·월 비용은 입력 한도와 비교합니다.",
  fields: [
    field("users", "사용자 수", "명"),
    field("latency", "응답 시간", "ms"),
    field("latencyBudget", "목표 응답 시간", "ms"),
    field("cost", "예상 월 비용", "KRW/month"),
    field("budget", "월 예산", "KRW/month"),
  ],
  pairs: [
    pair("latency", "latency", "latencyBudget", "응답 시간 초과"),
    pair("budget", "cost", "budget", "예산 초과"),
  ],
};
const person: Profile = {
  description:
    "중립적인 사람/사용자 표현입니다. 인원·신장은 기록용이며 연령이나 외형으로 능력·생존 한계를 추정하지 않습니다.",
  fields: [field("count", "인원", "명"), field("height", "신장", "cm")],
  pairs: [],
};
const sun: Profile = {
  description:
    "태양의 복사 기준값은 NASA 관측 자료를 내장해 사용합니다. 대상의 실제 거리와 환경 조건은 별도입니다.",
  fields: [],
  pairs: [],
};
const sunDistance: Field = {
  key: "sunDistance",
  name: "실제 태양 중심 거리",
  unit: "AU",
  min: 0.05,
  max: 1000,
  optional: true,
};
person.fields.push(sunDistance);
equipment.fields.push(sunDistance);
energy.fields.push(sunDistance);
const space: Profile = {
  description:
    "천체의 참고 정보를 기록합니다. 중력·궤도·방사선·생존 가능성은 계산하지 않습니다.",
  fields: [field("mass", "질량", "kg"), field("radius", "반지름", "m")],
  pairs: [],
};
const heat: Profile = {
  description:
    "열원의 입력 자료입니다. 열 플럭스와 기준 거리는 기록만 하며 온도에서 열 노출을 임의 추정하지 않습니다.",
  fields: [
    field("flux", "열 플럭스", "W/m²"),
    field("referenceDistance", "기준 거리", "m"),
  ],
  pairs: [],
};
const visual: Profile = {
  description:
    "배치·설명용 자산입니다. 독립적인 물리 능력이나 계산 규칙은 없습니다.",
  fields: [],
  pairs: [],
};

export const profiles = {
  sun,
  throughput,
  storage,
  energy,
  equipment,
  flow,
  client,
  person,
  space,
  heat,
  visual,
};
export type ProfileName = keyof typeof profiles;

// id, Korean display name, category, behavior profile. No invented default ratings.
export const assetDefinitions = [
  ["cube", "큐브", "기본", "visual"],
  ["sphere", "구", "기본", "visual"],
  ["cylinder", "원기둥", "기본", "visual"],
  ["cone", "원뿔", "기본", "visual"],
  ["plane", "바닥", "기본", "visual"],
  ["label", "메모", "기본", "visual"],
  ["arrow", "화살표", "기본", "visual"],
  ["zone", "영역", "기본", "visual"],
  ["child", "어린이", "사람", "person"],
  ["teen", "청소년", "사람", "person"],
  ["adult", "성인", "사람", "person"],
  ["older", "고령자", "사람", "person"],
  ["sun", "태양", "우주", "sun"],
  ["planet", "행성", "우주", "space"],
  ["moon", "달", "우주", "space"],
  ["satellite", "위성", "우주", "equipment"],
  ["rocket", "로켓", "우주", "equipment"],
  ["spacecraft", "우주선", "우주", "equipment"],
  ["astronaut", "우주인", "우주", "person"],
  ["station", "우주 정거장", "우주", "equipment"],
  ["suit", "보호 수트", "우주", "equipment"],
  ["user", "사용자", "시스템", "person"],
  ["mobile", "모바일 앱", "시스템", "client"],
  ["web", "웹 앱", "시스템", "client"],
  ["browser", "브라우저", "시스템", "client"],
  ["api", "API", "시스템", "throughput"],
  ["server", "서버", "시스템", "throughput"],
  ["database", "데이터베이스", "시스템", "storage"],
  ["queue", "큐", "시스템", "throughput"],
  ["cloud", "클라우드", "시스템", "throughput"],
  ["auth", "인증", "시스템", "throughput"],
  ["sensor", "센서", "시스템", "equipment"],
  ["room", "방", "환경", "visual"],
  ["building", "건물", "환경", "visual"],
  ["vehicle", "차량", "환경", "equipment"],
  ["heat", "열원", "환경", "heat"],
  ["barrier", "차폐벽", "환경", "visual"],
  ["battery", "배터리", "에너지", "energy"],
  ["solar", "태양광 패널", "에너지", "energy"],
  ["generator", "발전기", "에너지", "energy"],
  ["wind", "풍력 발전기", "에너지", "energy"],
  ["robot", "로봇", "기계", "equipment"],
  ["drone", "드론", "기계", "equipment"],
  ["motor", "모터", "기계", "equipment"],
  ["pump", "펌프", "기계", "flow"],
  ["tank", "물탱크", "기계", "flow"],
  ["conveyor", "컨베이어", "기계", "equipment"],
  ["fan", "팬", "기계", "equipment"],
  ["light", "조명", "기계", "equipment"],
  ["camera", "카메라", "기계", "equipment"],
  ["router", "라우터", "시스템", "throughput"],
  ["firewall", "방화벽", "시스템", "throughput"],
  ["balancer", "로드 밸런서", "시스템", "throughput"],
  ["cache", "캐시", "시스템", "storage"],
  ["storage", "파일 저장소", "시스템", "storage"],
  ["payment", "결제 서비스", "시스템", "throughput"],
  ["email", "이메일 서비스", "시스템", "throughput"],
  ["notification", "알림 서비스", "시스템", "throughput"],
  ["llm", "AI 모델 서비스", "시스템", "throughput"],
  ["search", "검색 서비스", "시스템", "throughput"],
  ["monitor", "모니터링", "시스템", "throughput"],
  ["backup", "백업 저장소", "시스템", "storage"],
  ["scheduler", "작업 스케줄러", "시스템", "throughput"],
  ["gateway", "게이트웨이", "시스템", "throughput"],
] as const satisfies readonly (readonly [
  string,
  string,
  string,
  ProfileName,
])[];
export const catalog = assetDefinitions.map(
  ([id, name, category]) => [id, name, category] as const,
);
export function getProfile(asset: string): Profile {
  return profiles[
    assetDefinitions.find((a) => a[0] === asset)?.[3] ?? "visual"
  ];
}
export function fieldFor(
  asset: string,
  property: { key?: string; name: string },
): Field | undefined {
  const fields = getProfile(asset).fields;
  return property.key
    ? fields.find((f) => f.key === property.key)
    : fields.find((f) => f.name === property.name);
}
