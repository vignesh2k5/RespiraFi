import { describe, expect, it } from "vitest";
import { buildCoachContext, classifyIntent, decide, elapsedSeconds, extractConversationPreferences, idleTelemetry, meaningfulInsight, nutrition, onboardingCompletionRequirements, onboardingStateFor, pauseGuard, plan, predictMl, recovery, renderCoachResponse, score } from "./routers";

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

  it("treats a stale pause request after reset or stop as an idle no-op", () => {
    expect(pauseGuard({ running: 0, workoutState: "REST" })).toEqual({ status: "ALREADY_IDLE", workoutState: "REST", duration: 0 });
    expect(pauseGuard({ running: 0, workoutState: "COMPLETED" })?.status).toBe("ALREADY_IDLE");
    expect(pauseGuard({ running: 1, workoutState: "ACTIVE" })).toBeNull();
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
    expect(guidance.dailyPlan).toHaveLength(5);
    expect(guidance.estimate.calories).toBeGreaterThan(0);
    expect(guidance.note).toContain("estimates");
  });
  it("creates a meaningfully different alternative diet plan", () => {
    const profile = { age: 30, height: 175, weight: 75, gender: "Prefer not to say", goal: "Muscle Building", activityLevel: "Moderate", dietaryPreference: "Balanced" };
    const context = buildCoachContext({ profile, telemetry: {}, simulator: {}, workouts: [], alerts: [], conversations: [{ role: "assistant", content: "Breakfast: oats with yogurt. Estimated 400 kcal." }] });
    const first = renderCoachResponse("nutrition", context, decide(context), "Give me a diet plan");
    const alternative = renderCoachResponse("nutrition", context, decide(context), "Any other diet plan?");
    expect(alternative).toContain("different diet plan");
    expect(alternative).not.toBe(first);
    expect(alternative).toContain("omelette");
  });
  it("remembers food dislikes and South Indian preference from conversation", () => {
    const preferences = extractConversationPreferences([{ role: "user", content: "I don't like oats. Make it South Indian." }]);
    expect(preferences.dislikes).toContain("oats");
    expect(preferences.southIndian).toBe(true);
    const context = buildCoachContext({ profile: { goal: "General Fitness", weight: 70, dietaryPreference: "Balanced" }, telemetry: {}, simulator: {}, workouts: [], alerts: [], conversations: [{ role: "user", content: "I don't like oats. Make it South Indian." }] });
    const response = renderCoachResponse("nutrition", context, decide(context), "Give me another one");
    expect(response).toContain("idli");
    expect(response.toLowerCase()).not.toContain("oats");
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
  it("separates greetings from analytics and handles everything as multi-intent", () => {
    const context = buildCoachContext({ profile: { name: "Alex", goal: "Endurance", availableTime: 30, weight: 72, dietaryPreference: "Balanced" }, telemetry: { bpm: 70 }, simulator: { workoutState: "REST" }, workouts: [], alerts: [], conversations: [] });
    const decision = decide(context);
    expect(classifyIntent("chat", "Hello")).toBe("greeting");
    expect(classifyIntent("chat", "Everything please")).toBe("everything");
    const greeting = renderCoachResponse("greeting", context, decision, "Hello");
    expect(greeting).toContain("Want to work on today’s workout");
    expect(greeting).not.toContain("BPM");
    const everything = renderCoachResponse("everything", context, decision, "Everything please");
    expect(everything).toContain("TODAY’S WORKOUT");
    expect(everything).toContain("NUTRITION");
    expect(everything).toContain("RECOVERY");
    expect(everything).toContain("PROGRESS");
    expect(everything).not.toBe(greeting);
  });
  it("resolves implied tomorrow and multi-topic requests", () => {
    expect(classifyIntent("chat", "What about tomorrow?")).toBe("plan");
    expect(classifyIntent("chat", "Workout and diet")).toBe("multi");
    expect(classifyIntent("chat", "Tell me how I am doing and what I should do today")).toBe("multi");
  });
  it("recognizes alternative and workout modification intent", () => {
    expect(classifyIntent("chat", "Any other diet plan?")).toBe("nutrition");
    expect(classifyIntent("chat", "Make it shorter")).toBe("plan");
    expect(classifyIntent("chat", "Replace squats")).toBe("plan");
    const context = buildCoachContext({ profile: { goal: "Muscle Building", availableTime: 30, availableEquipment: "Dumbbells" }, telemetry: {}, simulator: {}, workouts: [], alerts: [], conversations: [{ role: "assistant", content: "Here is a squat workout." }] });
    const modified = renderCoachResponse("plan", context, decide(context), "Replace squats");
    expect(modified).toContain("step-ups");
  });
  it("resolves a tomorrow follow-up instead of blindly repeating the prior session", () => {
    const context = buildCoachContext({ profile: { name: "Alex", goal: "General Fitness", availableTime: 30, availableEquipment: "Dumbbells" }, telemetry: {}, simulator: { workoutState: "REST" }, workouts: [], alerts: [], conversations: [{ role: "assistant", content: "TODAY'S SESSION: squats, push-ups, rows." }] });
    const response = renderCoachResponse("plan", context, decide(context), "Okay for tomorrow?");
    expect(response).toContain("TOMORROW’S SESSION");
    expect(response).toContain("not automatically repeating");
    expect(response).toContain("moving this session to tomorrow is reasonable");
  });
  it("formats workouts readably and modifies the requested exercise", () => {
    const context = buildCoachContext({ profile: { goal: "Muscle Building", availableTime: 30, availableEquipment: "Dumbbells" }, telemetry: {}, simulator: { workoutState: "REST" }, workouts: [], alerts: [], conversations: [] });
    const response = renderCoachResponse("plan", context, decide(context), "Replace the second exercise");
    expect(response).toContain("TODAY’S SESSION");
    expect(response).toContain("Warm-up");
    expect(response).toContain("1. Main circuit");
    expect(response).toContain("step-ups");
    expect(response).toContain("Cooldown");
  });
  it("creates a lower-cost diet variant from a follow-up rather than repeating Plan A", () => {
    const context = buildCoachContext({ profile: { goal: "Endurance", weight: 70, dietaryPreference: "Balanced" }, telemetry: {}, simulator: {}, workouts: [], alerts: [], conversations: [{ role: "assistant", content: "BREAKFAST: Greek yogurt and berries. LUNCH: salmon and quinoa." }] });
    const response = renderCoachResponse("nutrition", context, decide(context), "Make it cheaper");
    expect(response).toContain("different diet plan");
    expect(response).toContain("eggs or beans");
    expect(response).toContain("rice");
  });

  it("makes medium-fatigue and long-session decisions more conservative", () => {
    const context = buildCoachContext({ profile, telemetry: { bpm: 145, speed: 7, movement: 1.2, duration: 1800 }, simulator: sim, workouts: [], alerts: [], conversations: [], previousTelemetry: { bpm: 140 } });
    const decision = decide(context);
    expect(context.mlPrediction.fatigue).toBe("MEDIUM");
    expect(decision.reasons).toContain("the session is already longer than 30 minutes");
    expect(decision.workoutRecommendation).toContain("avoid adding intensity");
  });
});

describe("RespiraFi onboarding", () => {
  it("models new, resumable, and completed states without exposing a generic profile", () => {
    expect(onboardingStateFor(1)).toBe("NEW_USER");
    expect(onboardingStateFor(3)).toBe("ONBOARDING_IN_PROGRESS");
    expect(onboardingStateFor(6, true)).toBe("ONBOARDING_COMPLETED");
  });

  it("validates required completion fields on the server boundary", () => {
    expect(onboardingCompletionRequirements({ name: "Welcome to RespiraFi", age: 12, height: 80, weight: 10, goal: "Unknown", fitnessLevel: "Unknown" })).toEqual(["name", "age", "height", "weight", "goal", "fitnessLevel"]);
    expect(onboardingCompletionRequirements({ name: "Alex Morgan", age: 30, height: 175, weight: 72, goal: "Endurance", fitnessLevel: "Intermediate" })).toEqual([]);
  });

  it("uses onboarding equipment and frequency in the first workout plan", () => {
    const planForDumbbells=plan({ goal: "Muscle Building", availableTime: 30, workoutPreference: "Strength", availableEquipment: "Dumbbells", trainingFrequency: "3–4 days/week" }, { alerts: 0, highSessions: 0 });
    expect(planForDumbbells.mainWorkout).toContain("Dumbbells");
    expect(planForDumbbells.safety).toContain("3–4 days/week");
  });

  it("generates a first Coach response from actual onboarding preferences without inventing history", () => {
    const context=buildCoachContext({ profile: { name: "Alex Morgan", goal: "Muscle Building", fitnessLevel: "Beginner", trainingFrequency: "2–3 days/week", availableEquipment: "Dumbbells", onboardingCompleted: 1, availableTime: 30 }, telemetry: { bpm: 70, speed: 0, movement: 0, duration: 0 }, simulator: { workoutState: "REST", duration: 0, mode: "REST" }, workouts: [], alerts: [], conversations: [] });
    const text=renderCoachResponse("status", context, decide(context), "");
    expect(text).toContain("Alex Morgan");
    expect(text).toContain("muscle building");
    expect(text).toContain("Dumbbells");
    expect(renderCoachResponse("progress", context, decide(context), "")).toContain("not enough stored workout history");
  });
});
