import { getProfile, profiles } from "./assets";
import type { Finding, Item, WorkspaceDocument } from "./model";

export const solarReference = {
  irradiance: 1361.6,
  uncertainty: 0.3,
  unit: "W/m²",
  distance: "1 AU",
  title: "NASA TSIS-1 · 2019년 태양 활동 극소기 기준",
  url: "https://earth.gsfc.nasa.gov/climate/projects/solar-irradiance/science",
  formulaUrl:
    "https://www.jpl.nasa.gov/edu/resources/lesson-plan/calculating-solar-power-in-space/",
  checkedAt: "2026-09-07",
  version: "solar-tsis1-2019-v1",
};
export function isSolarTarget(item: Item) {
  return (
    getProfile(item.asset) === profiles.person ||
    getProfile(item.asset) === profiles.equipment ||
    item.asset === "solar"
  );
}
export function solarInfluences(doc: WorkspaceDocument) {
  return doc.items
    .filter((i) => i.asset === "sun")
    .flatMap((sun) =>
      doc.items
        .filter(isSolarTarget)
        .map((target) => ({ from: sun.id, to: target.id })),
    );
}
export function solarExposure(target: Item): {
  value?: number;
  detail: string;
} {
  const matches = target.properties.filter((p) => p.key === "sunDistance");
  if (matches.length > 1)
    return { detail: "태양 거리 속성이 중복되어 계산하지 않습니다." };
  const p = matches[0];
  if (!p?.value.trim())
    return { detail: "실제 태양 중심 거리 미입력 · 방향만 시각화" };
  const d = Number(p.value);
  if (
    !/^[+]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(p.value.trim()) ||
    p.unit !== "AU" ||
    !Number.isFinite(d) ||
    d < 0.05 ||
    d > 1000
  )
    return {
      detail:
        "거리 모델 범위는 0.05~1000 AU입니다. 이 범위를 벗어나면 계산하지 않습니다.",
    };
  return {
    value: solarReference.irradiance / (d * d),
    detail: `${solarReference.irradiance} / ${d}² W/m² · 진공·수직 입사·차폐 없음 기준`,
  };
}
export function solarFindings(doc: WorkspaceDocument): Finding[] {
  if (!doc.items.some((i) => i.asset === "sun")) return [];
  return doc.items.filter(isSolarTarget).map((target) => {
    const exposure = solarExposure(target);
    return {
      id: `${target.id}-solar`,
      type: exposure.value === undefined ? "가정" : "한계점",
      title: `${target.name}: ${exposure.value === undefined ? "태양 영향 조건 확인" : `기준 입사 복사조도 ${exposure.value.toFixed(1)} W/m²`}`,
      detail: `${exposure.detail}. 출처: ${solarReference.title}, 1 AU에서 ${solarReference.irradiance} ± ${solarReference.uncertainty} W/m². ${solarReference.url} . 배치는 축척이 아니며, 대기·차폐·흡수율·노출시간·체온·화상·생존·장비 안전 여부는 계산하지 않습니다. 여러 태양 아이콘도 하나의 실제 태양에 대한 기준 조건으로 해석하며 광량을 합산하지 않습니다.`,
      objects: [
        target.id,
        ...doc.items.filter((i) => i.asset === "sun").map((i) => i.id),
      ],
    };
  });
}
export type Recommendation = { asset: string; reason: string };
export function recommendAssets(doc: WorkspaceDocument): Recommendation[] {
  const has = (asset: string) => doc.items.some((i) => i.asset === asset);
  const choices: Recommendation[] = [];
  if (
    has("sun") &&
    doc.items.some((i) => getProfile(i.asset) === profiles.person)
  )
    choices.push(
      {
        asset: "barrier",
        reason:
          "차폐 조건을 검토할 구조물. 추가만으로 보호 효과를 인정하지 않습니다.",
      },
      {
        asset: "suit",
        reason:
          "보호 장비의 실제 사양을 검토하세요. 성능은 제조사·모델마다 다릅니다.",
      },
      {
        asset: "sensor",
        reason: "입사량·환경 조건을 측정할 센서를 검토하세요.",
      },
      {
        asset: "spacecraft",
        reason: "우주 환경 아이디어라면 거주·차폐 공간이 필요한지 검토하세요.",
      },
    );
  if (has("sun"))
    choices.push({
      asset: "solar",
      reason:
        "태양 에너지를 전력으로 사용하는 대안을 검토하세요. 변환 효율은 별도 입력이 필요합니다.",
    });
  if (doc.items.some((i) => getProfile(i.asset) === profiles.equipment))
    choices.push({
      asset: "battery",
      reason: "장비의 소비 전력에 맞는 전력 공급원을 검토하세요.",
    });
  if (has("api") || has("web"))
    choices.push(
      { asset: "auth", reason: "사용자 접근에 인증이 필요한지 검토하세요." },
      { asset: "database", reason: "저장할 데이터와 용량을 검토하세요." },
      { asset: "monitor", reason: "장애를 알아차릴 관찰 경로를 검토하세요." },
    );
  if (has("database"))
    choices.push({
      asset: "backup",
      reason: "데이터 복구 요구사항을 검토하세요.",
    });
  return [
    ...new Map(
      choices.filter((c) => !has(c.asset)).map((c) => [c.asset, c]),
    ).values(),
  ].slice(0, 6);
}
