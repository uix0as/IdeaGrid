import { z } from "zod";
import { entityIdSchema } from "@/domain/shared/schema";

export const createAnalysisRunRequestSchema = z.object({
  projectId: entityIdSchema,
  sceneSnapshotId: entityIdSchema,
  scenarioId: entityIdSchema.optional(),
  mode: z.enum(["rules-only", "rules-and-ai"]),
  requestedEvidenceProviders: z.array(
    z.enum(["semantic-scholar", "crossref", "github"]),
  ),
});

export const analysisRunEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("stage-started"),
    runId: entityIdSchema,
    stage: z.string().min(1),
  }),
  z.object({
    type: z.literal("stage-completed"),
    runId: entityIdSchema,
    stage: z.string().min(1),
  }),
  z.object({
    type: z.literal("stage-failed"),
    runId: entityIdSchema,
    stage: z.string().min(1),
    retryable: z.boolean(),
    publicMessage: z.string().min(1),
  }),
  z.object({
    type: z.literal("run-completed"),
    runId: entityIdSchema,
    findingCount: z.number().int().nonnegative(),
  }),
]);

export type CreateAnalysisRunRequest = z.infer<
  typeof createAnalysisRunRequestSchema
>;
export type AnalysisRunEvent = z.infer<typeof analysisRunEventSchema>;
