import { describe, expect, it } from "vitest";
import { createAnalysisRunRequestSchema } from "@/server/contracts/analysis-runs";
import { createProjectRequestSchema } from "@/server/contracts/projects";

describe("API contracts", () => {
  it("빈 프로젝트 이름을 거부한다", () => {
    const result = createProjectRequestSchema.safeParse({
      workspaceId: "workspace-1",
      name: "",
      mode: "system",
    });

    expect(result.success).toBe(false);
  });

  it("지원하지 않는 evidence provider를 거부한다", () => {
    const result = createAnalysisRunRequestSchema.safeParse({
      projectId: "project-1",
      sceneSnapshotId: "snapshot-1",
      mode: "rules-and-ai",
      requestedEvidenceProviders: ["invented-provider"],
    });

    expect(result.success).toBe(false);
  });
});
