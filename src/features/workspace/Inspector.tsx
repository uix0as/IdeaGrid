"use client";
import { useState } from "react";
import { Button, TextInput } from "@carbon/react";
import type { Item } from "./model";
import { createId } from "./id";
import { fieldFor, getProfile, profiles } from "./assets";
import { AssetIcon } from "./AssetIcon";
import { solarReference } from "./influences";

export function Inspector({
  item,
  update,
  remove,
  duplicate,
  hasSun = false,
}: {
  item: Item | undefined;
  update: (item: Item) => void;
  remove: () => void;
  duplicate: () => void;
  hasSun?: boolean;
}) {
  const [advanced, setAdvanced] = useState(false);
  if (!item) return <p>캔버스 또는 목록에서 객체를 선택하세요.</p>;
  const profile = getProfile(item.asset);
  const primary =
    profile === profiles.throughput
      ? ["demand", "capacity"]
      : profile === profiles.storage
        ? ["usedStorage", "storageCapacity"]
        : profile === profiles.energy
          ? ["outputPower"]
          : profile === profiles.equipment
            ? item.asset === "suit"
              ? ["temperature", "maxTemperature"]
              : ["power", "load", "loadCapacity"]
            : profile === profiles.flow
              ? ["flow", "flowCapacity"]
              : profile === profiles.client
                ? ["users", "latencyBudget"]
                : profile === profiles.person
                  ? ["count"]
                  : profile.fields
                      .filter((f) => !f.optional)
                      .slice(0, 2)
                      .map((f) => f.key);
  if (hasSun) primary.push("sunDistance");
  const missing = profile.fields.filter(
    (f) => !item.properties.some((p) => fieldFor(item.asset, p)?.key === f.key),
  );
  const visible = item.properties
    .map((prop, index) => ({ prop, index }))
    .filter(
      ({ prop }) =>
        advanced ||
        primary.includes(fieldFor(item.asset, prop)?.key ?? "") ||
        !fieldFor(item.asset, prop),
    );
  return (
    <div className="workspace-inspector">
      <div className="workspace-capability">
        <AssetIcon asset={item.asset} />
        <details>
          <summary>역할·분석 범위</summary>
          <p>{profile.description}</p>
        </details>
      </div>
      <TextInput
        id="object-name"
        labelText="객체 이름"
        value={item.name}
        onChange={(e) => {
          if (e.target.value) update({ ...item, name: e.target.value });
        }}
      />
      <h3>핵심 조건</h3>
      <p>나머지 값은 세부 속성에 있으며 분석에도 사용됩니다.</p>
      {item.asset === "sun" && (
        <details>
          <summary>내장 태양 기준값과 출처</summary>
          <p>
            {solarReference.title}: {solarReference.irradiance} ±{" "}
            {solarReference.uncertainty} W/m² @ 1 AU. 실시간 값이 아닙니다.
          </p>
          <a href={solarReference.url} target="_blank" rel="noreferrer">
            NASA 자료 확인
          </a>
        </details>
      )}
      {missing.length > 0 && (
        <Button
          kind="tertiary"
          size="sm"
          onClick={() =>
            update({
              ...item,
              properties: [
                ...item.properties,
                ...missing.map((f) => ({
                  id: createId(),
                  key: f.key,
                  name: f.name,
                  unit: f.unit,
                  value: "",
                  source: "",
                })),
              ],
            })
          }
        >
          능력 속성 보충
        </Button>
      )}
      <Button kind="ghost" size="sm" onClick={() => setAdvanced(!advanced)}>
        {advanced ? "세부 속성 접기" : "세부 속성·출처 보기"}
      </Button>
      {visible.map(({ prop, index }) => (
        <fieldset key={prop.id}>
          <legend>
            {prop.name} · {prop.unit || "단위 없음"}
          </legend>
          {advanced && (
            <p>
              {fieldFor(item.asset, prop)
                ? "능력 규칙 연결됨"
                : "사용자 기록용 · 계산 규칙 미연결"}
            </p>
          )}
          {(advanced
            ? (["name", "value", "unit", "source"] as const)
            : (["value"] as const)
          ).map((key) => (
            <label key={key}>
              {key === "value"
                ? prop.name
                : { name: "속성명", unit: "단위", source: "출처 / 측정 방법" }[
                    key
                  ]}
              <input
                value={prop[key]}
                onChange={(e) =>
                  update({
                    ...item,
                    properties: item.properties.map((p, j) =>
                      j === index
                        ? {
                            ...p,
                            key: fieldFor(item.asset, p)?.key ?? p.key,
                            [key]: e.target.value,
                          }
                        : p,
                    ),
                  })
                }
              />
            </label>
          ))}
          {advanced && (
            <Button
              size="sm"
              kind="ghost"
              onClick={() =>
                update({
                  ...item,
                  properties: item.properties.filter((_, j) => j !== index),
                })
              }
            >
              속성 삭제
            </Button>
          )}
        </fieldset>
      ))}
      {!visible.length && <p>이 자산에는 기본 입력 조건이 없습니다.</p>}
      <details>
        <summary>배치 세부값</summary>
        {(["x", "y", "elevation", "rotation", "scale"] as const).map((key) => (
          <label key={key}>
            {
              {
                x: "X 위치",
                y: "깊이 위치",
                elevation: "높이",
                rotation: "수직축 회전 (도)",
                scale: "균일 크기 배율",
              }[key]
            }
            <input
              type="number"
              step={key === "scale" ? 0.1 : 1}
              min={key === "scale" ? 0.2 : undefined}
              max={key === "scale" ? 4 : undefined}
              value={item[key]}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (
                  Number.isFinite(n) &&
                  (key !== "scale" || (n >= 0.2 && n <= 4))
                )
                  update({ ...item, [key]: n });
              }}
            />
          </label>
        ))}
      </details>
      {advanced && (
        <Button
          size="sm"
          kind="tertiary"
          onClick={() =>
            update({
              ...item,
              properties: [
                ...item.properties,
                {
                  id: createId(),
                  name: "새 속성",
                  value: "",
                  unit: "",
                  source: "",
                },
              ],
            })
          }
        >
          속성 추가
        </Button>
      )}
      <Button size="sm" kind="secondary" onClick={duplicate}>
        객체 복제
      </Button>
      <Button size="sm" kind="danger" onClick={remove}>
        객체 삭제
      </Button>
    </div>
  );
}
