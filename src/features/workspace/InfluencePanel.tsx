"use client";
import { useState } from "react";
import { catalog } from "./assets";
import { AssetIcon } from "./AssetIcon";
import {
  recommendAssets,
  solarExposure,
  solarInfluences,
  solarReference,
} from "./influences";
import type { WorkspaceDocument } from "./model";

export function InfluencePanel({
  doc,
  add,
}: {
  doc: WorkspaceDocument;
  add: (asset: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const influences = solarInfluences(doc),
    recommendations = recommendAssets(doc);
  if (!influences.length && !recommendations.length) return null;
  return (
    <section className="workspace-influence" aria-label="영향과 다음 자산 추천">
      <button type="button" onClick={() => setOpen(!open)}>
        {open ? "영향·추천 접기" : "영향·추천 열기"} ({recommendations.length})
      </button>
      {open && (
        <>
          {!!influences.length && (
            <>
              <p>
                태양 → 대상: 빛의 전달 방향을 자동 표시합니다. 애니메이션은 개념
                표현이며 화면 거리는 실제 거리가 아닙니다.
              </p>
              <ul>
                {doc.items
                  .filter((i) => influences.some((f) => f.to === i.id))
                  .slice(0, 4)
                  .map((i) => {
                    const e = solarExposure(i);
                    return (
                      <li key={i.id}>
                        {i.name}:{" "}
                        {e.value === undefined
                          ? e.detail
                          : `${e.value.toFixed(1)} W/m² · 진공·차폐 없음 기준 (안전 판정 아님)`}
                      </li>
                    );
                  })}
              </ul>
              <details>
                <summary>내장 기준값·출처·계산 범위</summary>
                <p>
                  {solarReference.title}: {solarReference.irradiance} ±{" "}
                  {solarReference.uncertainty} W/m² @ 1 AU. 현재 실시간 값이
                  아닌 날짜가 명시된 기준 자료입니다.
                </p>
                <a href={solarReference.url} target="_blank" rel="noreferrer">
                  NASA 관측 자료
                </a>{" "}
                ·{" "}
                <a
                  href={solarReference.formulaUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  NASA/JPL 거리 역제곱 관계
                </a>
                <p>
                  계산: 기준값 / 실제 거리(AU)².
                  대기·흡수율·차폐·노출시간·사람의 체온/안전은 미계산. 새 자산은
                  능력을 보장하지 않습니다.
                </p>
              </details>
            </>
          )}
          <div className="workspace-recommendations">
            {recommendations.map((r) => (
              <button
                type="button"
                key={r.asset}
                onClick={() => add(r.asset)}
                title={r.reason}
              >
                <AssetIcon asset={r.asset} size={20} />
                <span>{catalog.find((c) => c[0] === r.asset)?.[1]} 추가</span>
                <small>{r.reason}</small>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
