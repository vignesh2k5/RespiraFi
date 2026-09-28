import { describe, expect, it } from "vitest";
import { buildCoachContext, classifyIntent, decide, elapsedSeconds, idleTelemetry, meaningfulInsight, nutrition, plan, predictMl, recovery, renderCoachResponse, score } from "./routers";

describe("RespiraFi intensity engine", () => {
  it("starts from safe idle telemetry", () => {
    expect(idleTelemetry).toMatchObject({ bpm: 70, speed: 0, movement: 0, duration: 0, status: "NORMAL" });
    expect(score(idleTelemetry).status).toBe("NORMAL");
  });

  it("weights signals into normal, moderate, and high bands", () => {
    expect(score({ bpm: 60, speed: 0, movement: 0 }).status).toBe("NORMAL");
    expect(score({ bpm: 130, speed: 7, movement: 1.2 }).status).toBe("MODERATE");
    expect(score({ bpm: 185, speed: 14, movement: 3 }).status).toBe("HIGH");
  });
  it("clamps out-of-range normalized values safely", () => {
    const result = score({ bpm: 240, speed: 40, movement: 10 });
    expect(result.intensity).toBe(100);
    expect(result.status).toBe("HIGH");
  });
});

describe("RespiraFi workout clock", () => {
  it("excludes accumulated paused seconds from elapsed duration", () => {
    const now = Date.parse("2026-09-25T10:00:20.000Z");
    expect(elapsedSeconds({ workoutStartedAt: "2026-09-25T10:00:00.000Z", pausedSeconds: 5, workoutState: "ACTIVE" }, now)).toBe(15);
  });

  it("freezes at pausedAt while a workout is paused", () => {
    const now = Date.parse("2026-09-25T10:00:40.000Z");
    expect(elapsedSeconds({ workoutStartedAt: "2026-09-25T10:00:00.000Z", pausedAt: "2026-09-25T10:00:12.000Z", pausedSeconds: 2, workoutState: "PAUSED" }, now)).toBe(10);
  });
});

describe("RespiraFi coaching personalization", () => {
  it("regenerates materially different plans for current goals", () => {
    const history = { alerts: 0, highSessions: 0 };
    const endurance = plan({ goal: "Endurance", availableTime: 30, workoutPreference: "Cardio" }, history);
    const muscle = plan({ goal: "Muscle Building", availableTime: 30, workoutPreference: "Strength" }, history);
    const general = plan({ goal: "General Fitness", availableTime: 30, workoutPreference: "Balanced" }, history);
    expect(endurance.objective).toContain("cardiovascular endurance");
    expect(muscle.objective).toContain("resistance training");
    expect(general.objective).toContain("balanced conditioning");
    expect(new Set([endurance.mainWorkout, muscle.mainWorkout, general.mainWorkout]).size).toBe(3);
  });

  it("changes the workout plan for muscle building and conservative history", () => {
    const muscle = plan({ goal: "Muscle Building", availableTime: 35, workoutPreference: "Strength" }, { alerts: 0, highSessions: 0 });
    const cautious = plan({ goal: "General Fitness", availableTime: 30, workoutPreference: "Cardio" }, { alerts: 2, highSessions: 2 });
    expect(muscle.title).toContain("Muscle Building");
    expect(muscle.mainWorkout).toContain("squat");
    expect(cautious.title).toBe("Steady Progress Reset");
  });
  it("uses diet and goal in nutrition guidance", () => {
    const guidance = nutrition({ weight: 75, goal: "Muscle Building", activityLevel: "Moderate", dietaryPreference: "Vegetarian" });
    expect(guidance.protein).toContain("120 g");
    expect(guidance.protein).toContain("vegetarian");
  });
  it("becomes recovery-first after repeated alerts", () => {
    const guidance = recovery({ alerts: 3, highSessions: 1 }, "NORMAL");
    expect(guidance.title).toBe("Recovery-first reset");
    expect(guidance.rest).toContain("24–48");
  });
});

describe("RespiraFi AI decision layer", () => {
  const profile = { name: "Test Athlete", age: 30, height: 175, weight: 72, gender: "Prefer not to say", fitnessLevel: "Intermediate", activityLevel: "Moderate", goal: "Endurance", dietaryPreference: "Balanced", workoutPreference: "Cardio", availableTime: 30 };
  const sim = { workoutState: "ACTIVE", duration: 2100, mode: "ACTIVE" };

  it("uses multiple live signals to escalate fatigue and recommend recovery", () => {
    const ml = predictMl({ bpm: 165, previousBpm: 150, speed: 11, movement: 2.5, duration: 2100, recentHighSessions: 2, recentAlerts: 2 });
    expect(ml.predictedClass).toBe("HIGH");
    expect(ml.bpmTrend).toBe("RISING");
    expect(ml.fatigue).toBe("HIGH");
    const context = buildCoachContext({ profile, telemetry: { bpm: 165, speed: 11, movement: 2.5, duration: 2100 }, simulator: sim, workouts: [{ endedAt: new Date(), duration: 1800, averageIntensity: 72, peakIntensity: 86 }], alerts: [{ createdAt: new Date() }, { createdAt: new Date() }], conversations: [], previousTelemetry: { bpm: 150 } });
    const decision = decide(context);
    expect(decision.warningLevel).toBe("HIGH");
    expect(decision.workoutRecommendation).toContain("reduce intensity");
    expect(decision.suggestedActions.length).toBeGreaterThan(1);
  });

  it("supports low fatigue normal continuation and measured progression", () => {
    const context = buildCoachContext({ profile, telemetry: { bpm: 95, speed: 3, movement: .4, duration: 300 }, simulator: { workoutState: "ACTIVE", duration: 300, mode: "WARMUP" }, workouts: [], alerts: [], conversations: [], previousTelemetry: { bpm: 94 } });
    const decision = decide(context);
    expect(context.mlPrediction.fatigue).toBe("LOW");
    expect(decision.warningLevel).toBe("LOW");
    expect(decision.workoutRecommendation).toContain("continue");
  });

  it("renders natural status, progress, nutrition, and follow-up explanations from context", () => {
    const context = buildCoachContext({ profile, telemetry: { bpm: 148, speed: 8, movement: 1.5, duration: 1200 }, simulator: { workoutState: "ACTIVE", duration: 1200, mode: "ACTIVE" }, workouts: [{ endedAt: new Date(), duration: 1200, averageIntensity: 55, peakIntensity: 68 }], alerts: [], conversations: [{ role: "assistant", content: "Keep the effort controlled." }], previousTelemetry: { bpm: 140 } });
    const decision = decide(context);
    expect(renderCoachResponse("status", context, decision, "")).toContain("BPM trend");
    expect(renderCoachResponse("progress", context, decision, "")).toContain("stored session");
    expect(renderCoachResponse("nutrition", context, decision, "")).toContain("Endurance");
    expect(renderCoachResponse("why", context, decision, "why?")).toContain("Because");
  });

  it("states when progress history is unavailable instead of inventing statistics", () => {
    const context = buildCoachContext({ profile, telemetry: { bpm: 70, speed: 0, movement: 0, duration: 0 }, simulator: { workoutState: "REST", duration: 0, mode: "REST" }, workouts: [], alerts: [], conversations: [] });
    const decision = decide(context);
    expect(renderCoachResponse("progress", context, decision, "progress")).toContain("not enough stored workout history");
  });

  it("handles missing profile and sensor fields with transparent defaults", () => {
    const context = buildCoachContext({ profile: {}, telemetry: {}, simulator: {}, workouts: [], alerts: [], conversations: [] });
    const decision = decide(context);
    expect(context.fitnessGoal).toBe("General Fitness");
    expect(context.mlPrediction.confidence).toBeGreaterThan(0);
    expect(renderCoachResponse("nutrition", context, decision, "eat")).toContain("General Fitness");
  });

  it("exposes an explicit safe result when the model service is unavailable", () => {
    const prediction = predictMl({ bpm: 148, speed: 8, movement: 1, duration: 900, modelAvailable: false });
    expect(prediction.modelVersion).toBe("unavailable");
    expect(prediction.confidence).toBe(0);
    expect(prediction.predictedClass).toBe("NORMAL");
  });

  it("understands conversational exercise follow-ups and keeps trend insights event-based", () => {
    expect(classifyIntent("chat", "Can I do deadlifts too?")).toBe("plan");
    expect(classifyIntent("chat", "Why should I reduce intensity?")).toBe("why");
    const insight = meaningfulInsight({ status: "MODERATE", fatigue: "MEDIUM", bpmTrend: "FLAT" }, { status: "HIGH" }, { intensityRecommendation: "Reduce pace now", fatigueState: "HIGH", currentBpmTrend: "RISING", workoutRecommendation: "reduce intensity, recover, and reassess before continuing", reasons: ["BPM is trending upward"] });
    expect(insight).toContain("moved from moderate to high");
  });

  it("makes medium-fatigue and long-session decisions more conservative", () => {
    const context = buildCoachContext({ profile, telemetry: { bpm: 145, speed: 7, movement: 1.2, duration: 1800 }, simulator: sim, workouts: [], alerts: [], conversations: [], previousTelemetry: { bpm: 140 } });
    const decision = decide(context);
    expect(context.mlPrediction.fatigue).toBe("MEDIUM");
    expect(decision.reasons).toContain("the session is already longer than 30 minutes");
    expect(decision.workoutRecommendation).toContain("avoid adding intensity");
  });
});
