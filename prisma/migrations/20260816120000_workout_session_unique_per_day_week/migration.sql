-- Dedupe: antes de crear el índice único, conservar una sola sesión por
-- (userId, planDayId, weekNumber) — la que tiene más sets registrados
-- (empate: la más reciente). Las demás son duplicados creados por el bug
-- de doble-carga de la página de entrenamiento; sus sets (si los hubiera)
-- se eliminan en cascada.
WITH ranked AS (
  SELECT s.id,
         ROW_NUMBER() OVER (
           PARTITION BY s."userId", s."planDayId", s."weekNumber"
           ORDER BY (SELECT COUNT(*) FROM "WorkoutSet" st WHERE st."sessionId" = s.id) DESC,
                    s."startedAt" DESC
         ) AS rn
  FROM "WorkoutSession" s
  WHERE s."planDayId" IS NOT NULL
    AND s."weekNumber" IS NOT NULL
)
DELETE FROM "WorkoutSession"
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutSession_userId_planDayId_weekNumber_key" ON "WorkoutSession"("userId", "planDayId", "weekNumber");
