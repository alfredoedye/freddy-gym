/**
 * Barrel export del módulo de IA.
 */

export { generateTrainingPlan, type GeneratePlanInput } from './generate-plan';
export { savePlanToDatabase, type SavedPlan } from './save-plan';
export { callLLM, parseJSONResponse } from './client';
export {
  GeneratedPlanSchema,
  GeneratePlanRequestSchema,
  validateExerciseIds,
  type GeneratedPlan,
  type GeneratePlanRequest,
} from './schemas';
