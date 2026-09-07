import { z } from "zod";
import { entityIdSchema, provenanceSchema } from "@/domain/shared/schema";

export const dimensionedValueSchema = z
  .object({
    value: z.number().finite().optional(),
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
    unit: z.string().min(1).optional(),
    uncertainty: z.number().finite().nonnegative().optional(),
    confidence: z.enum(["low", "medium", "high"]),
    sourceIds: z.array(entityIdSchema),
    estimated: z.boolean(),
    note: z.string().max(2_000).optional(),
  })
  .superRefine((value, context) => {
    if (value.min !== undefined && value.max !== undefined && value.min > value.max) {
      context.addIssue({
        code: "custom",
        message: "min은 max보다 클 수 없습니다.",
        path: ["min"],
      });
    }
  });

const vector3Schema = z.tuple([z.number(), z.number(), z.number()]);

export const sceneObjectSchema = z.object({
  id: entityIdSchema,
  assetDefinitionId: entityIdSchema,
  name: z.string().min(1).max(200),
  transform: z.object({
    position: vector3Schema,
    rotation: vector3Schema,
    scale: vector3Schema,
  }),
  properties: z.record(
    z.string(),
    z.union([dimensionedValueSchema, z.string(), z.boolean()]),
  ),
  provenance: provenanceSchema,
});

export const relationTypeSchema = z.enum([
  "connected-to",
  "depends-on",
  "contains",
  "protects",
  "heats",
  "cools",
  "powers",
  "communicates-with",
  "data-flows-to",
  "moves-toward",
  "blocks",
  "supports",
  "custom",
]);

export const relationSchema = z.object({
  id: entityIdSchema,
  sourceObjectId: entityIdSchema,
  targetObjectId: entityIdSchema,
  type: relationTypeSchema,
  directed: z.boolean(),
  label: z.string().max(200).optional(),
  properties: z.record(z.string(), dimensionedValueSchema),
  evidenceIds: z.array(entityIdSchema),
  provenance: provenanceSchema,
});

export const sceneSnapshotSchema = z
  .object({
    id: entityIdSchema,
    projectId: entityIdSchema,
    sceneVersion: z.string().min(1),
    mode: z.enum(["physical", "system", "hybrid"]),
    objects: z.array(sceneObjectSchema),
    relations: z.array(relationSchema),
    createdAt: z.iso.datetime({ offset: true }),
  })
  .superRefine((scene, context) => {
    const objectIds = new Set(scene.objects.map((object) => object.id));
    const duplicateObjectIds = scene.objects
      .map((object) => object.id)
      .filter((id, index, ids) => ids.indexOf(id) !== index);

    if (duplicateObjectIds.length > 0) {
      context.addIssue({
        code: "custom",
        message: `중복 객체 ID: ${[...new Set(duplicateObjectIds)].join(", ")}`,
        path: ["objects"],
      });
    }

    scene.relations.forEach((relation, index) => {
      if (!objectIds.has(relation.sourceObjectId)) {
        context.addIssue({
          code: "custom",
          message: "sourceObjectId가 장면에 없습니다.",
          path: ["relations", index, "sourceObjectId"],
        });
      }
      if (!objectIds.has(relation.targetObjectId)) {
        context.addIssue({
          code: "custom",
          message: "targetObjectId가 장면에 없습니다.",
          path: ["relations", index, "targetObjectId"],
        });
      }
    });
  });

export type DimensionedValue = z.infer<typeof dimensionedValueSchema>;
export type SceneObject = z.infer<typeof sceneObjectSchema>;
export type Relation = z.infer<typeof relationSchema>;
export type SceneSnapshot = z.infer<typeof sceneSnapshotSchema>;
