import { z } from "zod";
import { entityIdSchema } from "@/domain/shared/schema";
import { sceneSnapshotSchema } from "@/domain/scene/schema";

export const createProjectRequestSchema = z.object({
  workspaceId: entityIdSchema,
  name: z.string().min(1).max(200),
  mode: z.enum(["physical", "system", "hybrid"]),
  ideaText: z.string().max(20_000).default(""),
});

export const saveSceneRequestSchema = z.object({
  expectedVersion: z.string().min(1),
  idempotencyKey: z.uuid(),
  snapshot: sceneSnapshotSchema,
});

export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>;
export type SaveSceneRequest = z.infer<typeof saveSceneRequestSchema>;
