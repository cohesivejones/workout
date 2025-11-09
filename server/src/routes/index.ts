import { Router } from "express";
import auth from "./auth.routes";
import exercises from "./exercises.routes";
import workouts from "./workouts.routes";
import painScores from "./pain-scores.routes";
import sleepScores from "./sleep-scores.routes";
import diagnostics from "./diagnostics.routes";
import dashboard from "./dashboard.routes";
import timeline from "./timeline.routes";
import activity from "./activity.routes";
import dataSource from "../data-source";
import logger from "../logger";

const router = Router();

router.use("/auth", auth);
router.use("/exercises", exercises);
router.use("/workouts", workouts);
router.use("/pain-scores", painScores);
router.use("/sleep-scores", sleepScores);
router.use("/diagnostics", diagnostics);
router.use("/dashboard", dashboard);
router.use("/timeline", timeline);
router.use("/activity", activity);

// Test-only routes
if (process.env.NODE_ENV === "test") {
  const testRouter = Router();
  testRouter.delete("/clear-test-data", async (_req, res) => {
    try {
      const testUserEmail = "test@foo.com";
      await dataSource.query(
        'DELETE FROM workout_exercises WHERE workout_id IN (SELECT id FROM workouts WHERE "userId" = (SELECT id FROM users WHERE email = $1))',
        [testUserEmail]
      );
      await dataSource.query(
        'DELETE FROM workouts WHERE "userId" = (SELECT id FROM users WHERE email = $1)',
        [testUserEmail]
      );
      await dataSource.query(
        'DELETE FROM pain_scores WHERE "userId" = (SELECT id FROM users WHERE email = $1)',
        [testUserEmail]
      );
      await dataSource.query(
        'DELETE FROM sleep_scores WHERE "userId" = (SELECT id FROM users WHERE email = $1)',
        [testUserEmail]
      );
      logger.info("Test data cleared");
      res.json({ success: true, message: "All test data cleared" });
    } catch (error) {
      logger.error("Failed to clear test data", { error });
      res.status(500).json({ error: "Failed to clear test data" });
    }
  });
  router.use("/test", testRouter);
  logger.info("Test routes enabled (NODE_ENV=test)");
}

export default router;
