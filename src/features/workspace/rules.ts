import { fieldFor, getProfile, type Field } from "./assets";
import type { Finding, Item, WorkspaceDocument } from "./model";

// Conversion factors to the profile's canonical units. GB/MB are decimal.
const units: Record<string, Record<string, number>> = {
  "req/s": { "req/s": 1, "req/min": 1 / 60 },
  ms: { ms: 1, s: 1000 },
  GB: { GB: 1, MB: 0.001, TB: 1000 },
  W: { W: 1, kW: 1000, mW: 0.001 },
  Wh: { Wh: 1, kWh: 1000 },
  kg: { kg: 1, g: 0.001 },
  m: { m: 1, cm: 0.01, km: 1000 },
  cm: { cm: 1, m: 100 },
  "L/min": { "L/min": 1, "L/s": 60 },
};
type Reading = { value?: number; error?: string; trace: string };
export function readField(item: Item, field: Field): Reading {
  const matches = item.properties.filter(
    (p) => fieldFor(item.asset, p)?.key === field.key,
  );
  if (matches.length > 1)
    return {
      error: `${field.name}: 같은 능력에 연결된 속성이 중복되었습니다.`,
      trace: "",
    };
  const p = matches[0];
  if (!p?.value.trim()) return { trace: `${field.name}: 미확인` };
  const text = p.value.trim();
  if (
    !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(text) ||
    !Number.isFinite(Number(text))
  )
    return { error: `${field.name}: 유한한 숫자를 입력하세요.`, trace: "" };
  const factor = p.unit === field.unit ? 1 : units[field.unit]?.[p.unit];
  if (factor === undefined)
    return {
      error: `${field.name}: ${p.unit || "단위 없음"} → ${field.unit} 변환은 지원하지 않습니다.`,
      trace: "",
    };
  const value = Number(text) * factor;
  if (
    !Number.isFinite(value) ||
    (field.min !== undefined && value < field.min) ||
    (field.max !== undefined && value > field.max)
  )
    return {
      error: `${field.name}: ${field.min ?? "제한 없음"} 이상${field.max === undefined ? "" : ` ${field.max} 이하`}의 ${field.unit} 값이 필요합니다.`,
      trace: "",
    };
  return {
    value,
    trace: `${field.name} ${p.value} ${p.unit}${factor === 1 ? "" : ` × ${factor} = ${value} ${field.unit}`}`,
  };
}
export function evaluateCapabilities(doc: WorkspaceDocument): Finding[] {
  const results: Finding[] = [];
  const readings = new Map<string, Map<string, Reading>>();
  for (const item of doc.items) {
    const profile = getProfile(item.asset);
    const values = new Map(
      profile.fields.map((field) => [field.key, readField(item, field)]),
    );
    readings.set(item.id, values);
    const absent = profile.fields.filter(
      (field) =>
        !field.optional &&
        !item.properties.some(
          (p) => fieldFor(item.asset, p)?.key === field.key,
        ),
    );
    if (absent.length)
      results.push({
        id: `${item.id}-required`,
        type: "가정",
        title: `${item.name}: 필수 능력 속성 없음`,
        detail: `${absent.map((f) => f.name).join(", ")} 속성을 복원해야 해당 검사를 수행할 수 있습니다. 객체 패널의 ‘능력 속성 보충’을 사용하세요.`,
        objects: [item.id],
      });
    for (const [key, value] of values)
      if (value.error)
        results.push({
          id: `${item.id}-${key === "demand" || key === "capacity" ? "invalid-rate" : `invalid-${key}`}`,
          type: "한계점",
          title: `${item.name}: 능력 입력 오류`,
          detail: value.error,
          objects: [item.id],
        });
    for (const pair of profile.pairs) {
      const a = values.get(pair.actual);
      const b = values.get(pair.limit);
      if (a?.value !== undefined && b?.value !== undefined && a.value > b.value)
        results.push({
          id: `${item.id}-${pair.id}`,
          type: "위험",
          title: `${item.name}: ${pair.title}`,
          detail: `규칙 ${pair.id}-v2: ${a.trace} > ${b.trace}. 정규화한 차이 ${Number((a.value - b.value).toPrecision(12))}. 사용자 입력의 단순 한도 비교이며 실제 작동·안전을 보증하지 않습니다. 값을 수정하고 재분석하세요.`,
          objects: [item.id],
        });
    }
  }
  for (const source of doc.items.filter((i) =>
    getProfile(i.asset).fields.some((f) => f.key === "outputPower"),
  )) {
    const ids = [
      ...new Set(
        doc.links
          .filter((l) => l.type === "전력 공급" && l.from === source.id)
          .map((l) => l.to),
      ),
    ];
    if (!ids.length) {
      results.push({
        id: `${source.id}-power-links`,
        type: "가정",
        title: `${source.name}: 전력 공급 대상 없음`,
        detail:
          "전력 공급 관계를 출발: 공급원 → 대상: 장비 순서로 연결하세요. 위치가 가깝다는 이유로 연결을 추정하지 않습니다.",
        objects: [source.id],
      });
      continue;
    }
    const output = readings.get(source.id)?.get("outputPower");
    const loads = ids.map((id) => readings.get(id)?.get("power"));
    const shared = ids.some(
      (id) =>
        new Set(
          doc.links
            .filter((l) => l.type === "전력 공급" && l.to === id)
            .map((l) => l.from),
        ).size > 1,
    );
    if (
      output?.value === undefined ||
      loads.some((p) => p?.value === undefined) ||
      shared
    ) {
      results.push({
        id: `${source.id}-power-missing`,
        type: "가정",
        title: `${source.name}: 전력 예산 계산 불가`,
        detail: shared
          ? "한 장비에 공급원이 여러 개입니다. 공급 분담/중복 전원 모델이 없어 합산하지 않습니다."
          : "공급원의 최대 출력 전력과 모든 연결 대상의 소비 전력을 유효한 W 또는 kW로 입력해야 합니다. 일부 값만으로 결론을 내리지 않습니다.",
        objects: [source.id, ...ids],
      });
      continue;
    }
    const total = loads.reduce((sum, load) => sum + (load?.value ?? 0), 0);
    if (total > output.value)
      results.push({
        id: `${source.id}-power`,
        type: "위험",
        title: `${source.name}: 전력 공급 한도 초과`,
        detail: `규칙 power-v1: 연결 대상 소비 전력 합계 ${total} W > 출력 한도 ${output.value} W. ${loads.map((p) => p?.trace).join(" + ")}. 모든 장비의 동시 정격 사용을 가정하며 손실·기동전류·배터리 사용 시간은 계산하지 않습니다.`,
        objects: [source.id, ...ids],
      });
  }
  const unmodeled = doc.links.filter(
    (l) => !["의존", "전력 공급"].includes(l.type),
  );
  if (unmodeled.length)
    results.push({
      id: "relation-scope",
      type: "한계점",
      title: "일부 관계는 시각적 연결만 반영됩니다",
      detail: `${[...new Set(unmodeled.map((l) => l.type))].join(", ")}: 연결 여부는 검사하지만 해당 관계의 물리·데이터 흐름 영향은 계산하지 않습니다. 보호 관계가 있다고 안전하다고 판단하지 않습니다.`,
      objects: [...new Set(unmodeled.flatMap((l) => [l.from, l.to]))],
    });
  // Detect cyclic dependencies once per traversal, without enumerating all paths.
  const graph = new Map(
    doc.items.map((i) => [
      i.id,
      doc.links
        .filter((l) => l.type === "의존" && l.from === i.id)
        .map((l) => l.to),
    ]),
  );
  const done = new Set<string>();
  const active = new Set<string>();
  const path: string[] = [];
  function visit(id: string) {
    if (active.has(id)) {
      const cycle = path.slice(path.indexOf(id));
      results.push({
        id: `cycle-${[...cycle].sort().join("-")}`,
        type: "위험",
        title: "순환 의존 관계",
        detail: `규칙 dependency-cycle-v1: ${[...cycle, id].map((x) => doc.items.find((i) => i.id === x)?.name ?? x).join(" → ")}. 시작 순서나 장애 복구가 서로 의존하는지 검토하세요. 순환이 반드시 오류라는 뜻은 아닙니다.`,
        objects: cycle,
      });
      return;
    }
    if (done.has(id)) return;
    active.add(id);
    path.push(id);
    for (const next of graph.get(id) ?? []) visit(next);
    path.pop();
    active.delete(id);
    done.add(id);
  }
  for (const id of graph.keys()) visit(id);
  return [...new Map(results.map((f) => [f.id, f])).values()];
}
