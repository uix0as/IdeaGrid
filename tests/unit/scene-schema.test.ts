import { describe, expect, it } from "vitest";
import {
  dimensionedValueSchema,
  sceneSnapshotSchema,
} from "@/domain/scene/schema";

const provenance = {
  sourceType: "human" as const,
  sourceId: "user-1",
  createdAt: "2026-09-01T00:00:00+00:00",
};

describe("dimensionedValueSchema", () => {
  it("unknown 값을 0으로 강제하지 않는다", () => {
    const value = dimensionedValueSchema.parse({
      confidence: "low",
      sourceIds: [],
      estimated: false,
    });

    expect(value.value).toBeUndefined();
  });

  it("뒤집힌 범위를 거부한다", () => {
    const result = dimensionedValueSchema.safeParse({
      min: 10,
      max: 2,
      confidence: "medium",
      sourceIds: [],
      estimated: true,
    });

    expect(result.success).toBe(false);
  });
});

describe("sceneSnapshotSchema", () => {
  it("장면에 없는 relation endpoint를 거부한다", () => {
    const result = sceneSnapshotSchema.safeParse({
      id: "snapshot-1",
      projectId: "project-1",
      sceneVersion: "1",
      mode: "physical",
      createdAt: "2026-09-01T00:00:00+00:00",
      objects: [
        {
          id: "object-1",
          assetDefinitionId: "cube",
          name: "큐브",
          transform: {
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
          },
          properties: {},
          provenance,
        },
      ],
      relations: [
        {
          id: "relation-1",
          sourceObjectId: "object-1",
          targetObjectId: "missing-object",
          type: "connected-to",
          directed: false,
          properties: {},
          evidenceIds: [],
          provenance,
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
