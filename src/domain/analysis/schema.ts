import { z } from "zod";
import { entityIdSchema, provenanceSchema } from "@/domain/shared/schema";

export const analysisStageSchema = z.enum([
  "snapshot",
  "validation",
  "rules",
  "assumptions",
  "evidence",
  "similar-work",
  "synthesis",
  "critique",
  "normalization",
  "mapping",
]);

export const findingSchema = z.object({
  id: entityIdSchema,
  type: z.enum([
    "limitation",
    "improvement",
    "risk",
    "assumption",
    "opportunity",
    "conflict",
  ]),
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(2_000),
  severity: z.enum(["info", "low", "medium", "high", "critical"]),
  confidence: z.number().min(0).max(1),
  affectedObjectIds: z.array(entityIdSchema),
  affectedRelationIds: z.array(entityIdSchema),
  evidenceIds: z.array(entityIdSchema),
  ruleIds: z.array(entityIdSchema),
  inputTrace: z.array(
    z.object({
      key: z.string().min(1),
      value: z.unknown(),
      source: z.string().min(1),
    }),
  ),
  missingData: z.array(z.string().min(1)),
  explanation: z.string().min(1),
  recommendations: z.array(
    z.object({
      id: entityIdSchema,
      summary: z.string().min(1),
      effort: z.enum(["low", "medium", "high"]),
      expectedImpact: z.enum(["low", "medium", "high"]),
    }),
  ),
  status: z.enum(["open", "accepted", "resolved", "dismissed"]),
  provenance: provenanceSchema,
});

export type Finding = z.infer<typeof findingSchema>;
export type AnalysisStage = z.infer<typeof analysisStageSchema>;
