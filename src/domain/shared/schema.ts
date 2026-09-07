import { z } from "zod";

export const entityIdSchema = z.string().min(1).max(128);
export const isoDateTimeSchema = z.iso.datetime({ offset: true });

export const localizedTextSchema = z.object({
  ko: z.string().min(1),
  en: z.string().min(1).optional(),
});

export const provenanceSchema = z.object({
  sourceType: z.enum(["human", "rule", "ai", "external", "seed"]),
  sourceId: z.string().min(1),
  createdAt: isoDateTimeSchema,
  humanOverrideOf: entityIdSchema.optional(),
});

export type Provenance = z.infer<typeof provenanceSchema>;
