export type IntensityStatus = "NORMAL" | "MODERATE" | "HIGH";
export type FatigueState = "LOW" | "MEDIUM" | "HIGH";
export type BpmTrend = "FALLING" | "FLAT" | "RISING";

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const lower = (value: unknown) => String(value || "").toLowerCase();

export type MlPrediction = {
  intensity: number; predictedClass: IntensityStatus; fatigue: FatigueState; confidence: number;
  bpmTrend: BpmTrend; modelVersion: string;
  features: { bpm: number; speed: number; movement: number; duration: number; recentHighSessions: number; recentAlerts: number };
};

export function score(t: { bpm: number; speed: number; movement: number }) {
  const bpm = clamp((t.bpm - 55) / 130 * 100, 0, 100);
  const speed = clamp(t.speed / 14 * 100, 0, 100);
  const movement = clamp(t.movement / 3 * 100, 0, 100);
  const intensity = Math.round(clamp(bpm * .55 + speed * .3 + movement * .15, 0, 100));
  return { intensity, status: (intensity <= 44 ? "NORMAL" : intensity <= 69 ? "MODERATE" : "HIGH") as IntensityStatus };
}

export function plan(p: any, s: any, options: { variant?: number; message?: string } = {}) {
  const mins = Number(p.availableTime) || 30;
  const goal = String(p.goal || "General Fitness");
  const goalKey = lower(goal);
  const equipment = p.availableEquipment || "bodyweight or available equipment";
  const frequency = p.trainingFrequency || "your usual schedule";
  const cautious = s.alerts > 1 || s.highSessions > 1;
  const variant = options.variant || 0;
  const message = lower(options.message);
  const shorter = /shorter|less time|quick|brief/.test(message);
  const replaceSquat = /replace (the )?(squats?|second|2nd)( exercise)?|no squat|without squat/.test(message);
  const duration = shorter ? Math.max(10, Math.min(mins, 20)) : Math.min(mins, cautious ? 25 : mins);
  let objective = "Build balanced conditioning with cardio, strength and mobility.";
  let mainWorkout = "3 rounds: 8 controlled squats, 8 incline push-ups, 10 alternating reverse lunges and 30s plank; finish with 8 min easy cardio.";
  if (goalKey.includes("endurance")) {
    objective = "Develop cardiovascular endurance through sustainable pacing and progressive duration.";
    mainWorkout = variant % 2 ? "6 x 2 min brisk effort with 90s easy recovery, then 10 min steady conversational cardio." : `${duration >= 45 ? 4 : 3} rounds: ${duration >= 45 ? 8 : 5} min steady aerobic effort, 2 min easy recovery, then 4 x 30s controlled pickups.`;
  } else if (goalKey.includes("muscle") || goalKey.includes("strength")) {
    objective = "Prioritize resistance training, progressive overload, and recovery between muscle groups.";
    mainWorkout = variant % 2 ? `3 rounds using ${equipment}: hip hinge 10, one-arm row 10/side, floor press or push-up 10, step-up 8/side; rest 60–90s.` : `3–4 rounds using ${equipment}: ${replaceSquat ? "step-ups 8/side" : "squat 8–12"}, push-up or press 8–12, row 8–12, Romanian hinge 8–12 and split squat 8/side; rest 60–90s.`;
  } else if (variant % 2) {
    mainWorkout = "8 min alternating brisk walk and easy jog, then 3 rounds of dead bug 10/side, glute bridge 12, incline push-up 8 and lateral lunge 8/side.";
  }
  return {
    title: cautious ? "Steady Progress Reset" : `${goal} · ${duration}-minute ${p.workoutPreference || "balanced"}`,
    objective: cautious ? "Build consistency without stacking high-intensity stress" : objective,
    duration: `${duration} minutes`, warmup: "5 min: easy movement, joint circles and gradual pace increase.", mainWorkout,
    cooldown: "5 min gradually slower pace plus gentle stretching.",
    safety: `Stop or reduce pace if form or breathing deteriorates. This is not medical advice. This plan is designed around ${frequency}.`,
  };
}

export function recovery(s: any, status: string) {
  const cautious = s.alerts >= 2 || s.highSessions >= 2 || status === "HIGH";
  return { title: cautious ? "Recovery-first reset" : "Balanced recovery plan", guidance: cautious ? "Take a longer recovery break and resume only at a comfortable pace." : "Keep the next session easy enough to finish with controlled breathing.", rest: cautious ? "Plan 24–48 hours between hard sessions." : "Take at least one easy day after demanding sessions.", mobility: "5–8 minutes of gentle mobility for hips, calves, shoulders and spine.", sleep: "Aim for a consistent 7–9 hour sleep window." };
}

type Meal = { label: string; food: string; calories: number; protein: number; carbs: number; fat: number };
function foodPreference(p: any, memory: any[] = []) {
  const text = memory.map(x => x.content).join(" ").toLowerCase();
  const stored = lower(p.exercisePreferences) + " " + lower(p.dietaryPreference);
  const dislike = [...(text.match(/(?:don't|do not|no longer) like ([a-z ]+)/g) || []), ...(text.match(/(?:avoid|can't eat|cannot eat) ([a-z ]+)/g) || [])].map(x => x.replace(/.*(?:like|avoid|eat) /, "").trim().split(/[,.!?]/)[0]).filter(Boolean);
  const southIndian = /south indian|idli|dosa|sambar|curd rice/.test(text + " " + stored);
  return { dislike, southIndian, vegetarian: /vegetarian|vegan|plant/.test(stored + " " + text), cheaper: /cheap|cheaper|budget|affordable/.test(stored + " " + text) };
}

function mealPlan(p: any, variant = 0, memory: any[] = []): { meals: Meal[]; estimate: any } {
  const weight = Number(p.weight) || 70, age = Number(p.age) || 30, height = Number(p.height) || 170;
  const sex = lower(p.gender); const bmr = 10 * weight + 6.25 * height - 5 * age + (sex.includes("male") ? 5 : -161);
  const activity = lower(p.activityLevel); const factor = activity.includes("high") ? 1.6 : activity.includes("low") ? 1.35 : 1.5;
  const goal = lower(p.goal); const adjustment = goal.includes("muscle") || goal.includes("strength") ? 250 : goal.includes("fat loss") || goal.includes("weight management") ? -350 : goal.includes("endurance") ? 150 : 0;
  const calories = clamp(Math.round(bmr * factor + adjustment), 1400, 4200);
  const protein = Math.round(weight * (goal.includes("muscle") || goal.includes("strength") ? 1.6 : goal.includes("endurance") ? 1.4 : 1.2));
  const carbs = Math.round(calories * (goal.includes("endurance") ? .5 : .45) / 4), fat = Math.round(calories * .3 / 9);
  const prefs = foodPreference(p, memory); const avoid = prefs.dislike.join(" ");
  const south = [
    { label: "BREAKFAST", food: "2 idli + 1 cup sambar + 2 eggs", calories: 430, protein: 24, carbs: 55, fat: 12 },
    { label: "LUNCH", food: "1.5 cups rice + 150 g chicken or tofu + poriyal", calories: 620, protein: 39, carbs: 72, fat: 16 },
    { label: "PRE-WORKOUT", food: "1 banana + 200 ml curd", calories: 210, protein: 9, carbs: 38, fat: 3 },
    { label: "POST-WORKOUT", food: "2 dosa + 1 cup sambar + 100 g paneer or chicken", calories: 520, protein: 30, carbs: 62, fat: 16 },
    { label: "DINNER", food: "1 cup curd rice + 1 cup dal + vegetables", calories: 480, protein: 22, carbs: 68, fat: 13 },
  ];
  const alternate = [
    { label: "BREAKFAST", food: "3-egg vegetable omelette + 2 slices whole-grain toast", calories: 430, protein: 28, carbs: 36, fat: 18 },
    { label: "LUNCH", food: "150 g grilled fish or tofu + 250 g potatoes + salad", calories: 610, protein: 38, carbs: 64, fat: 18 },
    { label: "PRE-WORKOUT", food: "2 rice cakes + 20 g peanut butter + 1 orange", calories: 250, protein: 8, carbs: 36, fat: 9 },
    { label: "POST-WORKOUT", food: "250 ml milk or soy milk + 30 g protein powder + 1 banana", calories: 360, protein: 31, carbs: 44, fat: 7 },
    { label: "DINNER", food: "150 g chicken or lentil bowl + 1 cup quinoa + roasted vegetables", calories: 540, protein: 36, carbs: 58, fat: 15 },
  ];
  const standard = [
    { label: "BREAKFAST", food: "200 g Greek yogurt + 40 g granola + berries", calories: 390, protein: 25, carbs: 48, fat: 11 },
    { label: "LUNCH", food: "150 g chicken or tofu wrap + side salad", calories: 560, protein: 36, carbs: 58, fat: 17 },
    { label: "PRE-WORKOUT", food: "1 banana + 150 g cottage cheese", calories: 220, protein: 18, carbs: 31, fat: 3 },
    { label: "POST-WORKOUT", food: "30 g protein shake + 1 whole-grain bagel", calories: 430, protein: 33, carbs: 58, fat: 8 },
    { label: "DINNER", food: "150 g salmon or beans + 1 cup rice + roasted vegetables", calories: 590, protein: 34, carbs: 66, fat: 19 },
  ];
  let meals = prefs.southIndian ? south : variant % 2 ? alternate : standard;
  if (prefs.vegetarian) meals = meals.map(m => ({ ...m, food: m.food.replace(/chicken|fish|eggs/gi, "tofu or paneer") }));
  if (avoid) meals = meals.map(m => ({ ...m, food: m.food.replace(/oats/gi, "rice or quinoa") }));
  if (prefs.cheaper) meals = meals.map(m => ({ ...m, food: m.food.replace(/salmon|fish/gi, "eggs or beans").replace(/protein powder/gi, "milk and peanut butter").replace(/greek yogurt/gi, "plain yogurt").replace(/quinoa/gi, "rice").replace(/berries/gi, "banana") , calories: Math.max(150, m.calories - 35) }));
  return { meals, estimate: { calories, protein, carbohydrates: carbs, fat } };
}

export function nutrition(p: any, options: { variant?: number; memory?: any[] } = {}) {
  const goal = p.goal || "General Fitness", diet = p.dietaryPreference || "balanced", variant = options.variant || 0;
  const { meals, estimate } = mealPlan(p, variant, options.memory || []);
  const dailyPlan = meals.map(m => `${m.label}: ${m.food} — estimated ${m.calories} kcal, ${m.protein} g protein.`);
  return { protein: `Aim for roughly ${estimate.protein} g protein/day from ${lower(diet)} foods.`, meal: "Each meal below has a concrete portion and estimated macros.", post: "Pair the listed post-workout protein and carbohydrate serving with fluids.", dailyPlan, meals, estimate, note: `Daily values are estimates calculated from your stored age, height, weight, activity, goal, and preferences; they are not medically precise targets. Plan variation ${variant + 1}.` };
}

export function predictMl(input: { bpm: number; speed: number; movement: number; duration: number; previousBpm?: number; recentHighSessions?: number; recentAlerts?: number; modelAvailable?: boolean }): MlPrediction {
  if (input.modelAvailable === false) return { intensity: 0, predictedClass: "NORMAL", fatigue: "LOW", confidence: 0, bpmTrend: "FLAT", modelVersion: "unavailable", features: { bpm: input.bpm || 0, speed: input.speed || 0, movement: input.movement || 0, duration: input.duration || 0, recentHighSessions: input.recentHighSessions || 0, recentAlerts: input.recentAlerts || 0 } };
  const scored = score(input), delta = (input.bpm || 0) - (input.previousBpm || input.bpm || 0);
  const bpmTrend = (delta > 3 ? "RISING" : delta < -3 ? "FALLING" : "FLAT") as BpmTrend;
  const prolonged = input.duration >= 1800, fatigueScore = scored.intensity * .45 + (prolonged ? 22 : input.duration >= 900 ? 10 : 0) + (bpmTrend === "RISING" ? 12 : 0) + ((input.recentHighSessions || 0) >= 2 ? 14 : 0) + ((input.recentAlerts || 0) >= 2 ? 12 : 0);
  const fatigue = (fatigueScore >= 70 ? "HIGH" : fatigueScore >= 42 ? "MEDIUM" : "LOW") as FatigueState;
  const normalized = [clamp((input.bpm - 55) / 130, 0, 1), clamp(input.speed / 14, 0, 1), clamp(input.movement / 3, 0, 1)], mean = normalized.reduce((a, b) => a + b, 0) / normalized.length;
  const agreement = 1 - normalized.reduce((a, b) => a + Math.abs(b - mean), 0) / normalized.length;
  const confidence = Number(clamp(.56 + agreement * .32 + (bpmTrend !== "FLAT" ? .05 : 0), .5, .94).toFixed(2));
  return { intensity: scored.intensity, predictedClass: scored.status, fatigue, confidence, bpmTrend, modelVersion: "respirafi-signal-model-v1", features: { bpm: input.bpm, speed: input.speed, movement: input.movement, duration: input.duration, recentHighSessions: input.recentHighSessions || 0, recentAlerts: input.recentAlerts || 0 } };
}

export type CoachContext = { userProfile: any; fitnessGoal: string; currentSession: any; liveSensorState: any; mlPrediction: MlPrediction; recentWorkoutHistory: any[]; trainingLoad: any; previousSessions: any[]; recoveryContext: any; alerts: any[]; conversationMemory: any[]; userPreferences: any };

export function extractConversationPreferences(memory: any[]) {
  const text = memory.filter(x => x.role === "user").map(x => x.content).join(" ");
  const dislikes = [...(text.match(/(?:don't|do not) like ([a-z ]+)/gi) || []), ...(text.match(/(?:avoid|can't eat|cannot eat) ([a-z ]+)/gi) || [])].map(x => x.replace(/.*(?:like|avoid|eat) /i, "").trim().split(/[,.!?]/)[0]).filter(Boolean);
  return { dislikes, southIndian: /south indian|idli|dosa|sambar/i.test(text), cheaper: /cheap|cheaper|budget|affordable/i.test(text), onlyDumbbells: /only dumbbells|just dumbbells/i.test(text), shorterWorkouts: /don't like long|shorter workouts|short workout/i.test(text) };
}

export function buildCoachContext(input: { profile: any; telemetry: any; simulator: any; workouts: any[]; alerts: any[]; conversations: any[]; previousTelemetry?: any }): CoachContext {
  const p = input.profile || {}, t = input.telemetry || {}, sim = input.simulator || { workoutState: "REST", duration: 0, mode: "REST" }, ws = input.workouts || [], as = input.alerts || [], memory = input.conversations || [];
  const bpm = Number(t.bpm ?? 70), speed = Number(t.speed ?? 0), movement = Number(t.movement ?? 0), sessionDuration = Number(t.duration ?? sim.duration ?? 0);
  const historyIntensity = ws.length ? Math.round(ws.reduce((n, w) => n + (w.averageIntensity || 0), 0) / ws.length) : 0;
  const recent = ws.filter(w => Date.now() - new Date(w.endedAt).getTime() < 7 * 86400000);
  const trainingLoad = { sessionsLast7Days: recent.length, totalMinutes: Math.round(ws.reduce((n, w) => n + (w.duration || 0), 0) / 60), averageIntensity: historyIntensity, recentHighSessions: recent.filter(w => (w.peakIntensity || 0) >= 70).length };
  const ml = predictMl({ bpm, speed, movement, duration: sessionDuration, previousBpm: input.previousTelemetry?.bpm, recentHighSessions: trainingLoad.recentHighSessions, recentAlerts: as.length });
  const memoryPrefs = extractConversationPreferences(memory);
  return { userProfile: { name: p.name || "Athlete", age: p.age, height: p.height, weight: p.weight, gender: p.gender, fitnessLevel: p.fitnessLevel, activityLevel: p.activityLevel, dietaryPreference: p.dietaryPreference, workoutPreference: p.workoutPreference, availableTime: p.availableTime, onboardingCompleted: Boolean(p.onboardingCompleted) }, fitnessGoal: p.goal || "General Fitness", currentSession: { state: sim.workoutState || "REST", duration: sessionDuration, bpm, speed, movement, exercise: sim.mode || "General session" }, liveSensorState: { bpm, bpmTrend: ml.bpmTrend, speed, acceleration: movement }, mlPrediction: ml, recentWorkoutHistory: ws.slice(0, 10), trainingLoad, previousSessions: ws.slice(0, 5), recoveryContext: { recentAlerts: as.length, needsRecovery: ml.fatigue !== "LOW" || trainingLoad.recentHighSessions >= 2 }, alerts: as.slice(0, 10), conversationMemory: memory.slice(0, 12), userPreferences: { goal: p.goal || "General Fitness", secondaryGoals: p.secondaryGoals || "", dietaryPreference: p.dietaryPreference || "Not specified", workoutPreference: p.workoutPreference || "Not specified", trainingFrequency: p.trainingFrequency || "Not specified", preferredWorkoutDuration: p.preferredWorkoutDuration || "Not specified", trainingEnvironment: p.trainingEnvironment || "Not specified", availableEquipment: p.availableEquipment || "Not specified", coachFocus: p.coachFocus || "All of these", exercisePreferences: p.exercisePreferences || "Not specified", availableTime: p.availableTime || 30, ...memoryPrefs } };
}

export function decide(ctx: CoachContext) {
  const ml = ctx.mlPrediction, load = ctx.trainingLoad, active = ["WARMUP", "ACTIVE", "PAUSED"].includes(ctx.currentSession.state), reasons: string[] = [];
  if (ml.predictedClass === "HIGH") reasons.push(`intensity is ${ml.intensity}/100`); if (ml.bpmTrend === "RISING") reasons.push("BPM is trending upward"); if (ml.fatigue !== "LOW") reasons.push(`${ml.fatigue.toLowerCase()} fatigue signal`); if (ctx.currentSession.duration >= 1800) reasons.push("the session is already longer than 30 minutes"); if (load.recentHighSessions >= 2) reasons.push("recent training load includes repeated high-intensity sessions");
  const warningLevel = ml.predictedClass === "HIGH" && ml.fatigue !== "LOW" ? "HIGH" : ml.predictedClass === "HIGH" || ml.fatigue === "HIGH" || (ml.fatigue === "MEDIUM" && (ctx.currentSession.duration >= 1800 || load.recentHighSessions >= 1)) ? "ELEVATED" : "LOW";
  return { currentTrainingState: active ? "ACTIVE" : "REST", exertionState: ml.predictedClass, fatigueState: ml.fatigue, recoveryState: ctx.recoveryContext.needsRecovery ? "RECOVERY_NEEDED" : "READY", progressionState: load.recentHighSessions >= 2 ? "CONSOLIDATE" : "BUILD_GRADUALLY", workoutRecommendation: warningLevel === "HIGH" ? "reduce intensity, recover, and reassess before continuing" : warningLevel === "ELEVATED" ? "keep effort controlled and avoid adding intensity" : active ? "continue at a controlled pace and progress gradually" : "start a goal-aligned session when ready", intensityRecommendation: warningLevel === "HIGH" ? "Reduce pace now" : "Stay within a sustainable effort", exerciseRecommendation: ctx.fitnessGoal.toLowerCase().includes("muscle") ? "Use controlled resistance and leave reps in reserve" : "Use sustainable aerobic work with simple strength movements", nutritionRecommendation: ctx.fitnessGoal.toLowerCase().includes("endurance") ? "Prioritize carbohydrates around longer sessions and steady protein" : "Build meals around protein, produce, quality carbohydrates, and fluids", recoveryRecommendation: ctx.recoveryContext.needsRecovery ? "Take an easier day and allow 24–48 hours after hard work" : "Use a short cooldown and normal recovery routine", warningLevel, confidence: ml.confidence, currentBpmTrend: ml.bpmTrend, reasons, suggestedActions: warningLevel === "HIGH" ? ["Reduce intensity", "Take a recovery break", "Stop and seek professional help if concerning symptoms appear"] : ["Keep breathing controlled", "Monitor the next few minutes", "Progress only if effort remains comfortable"], mlModel: ml.modelVersion };
}

export function classifyIntent(kind: string, message: string) {
  const q = lower(message || kind);
  if (kind !== "chat") return kind;
  if (/^(hello|hi|hey|good morning|good afternoon|good evening|what's up|whats up)[!. ]*$/.test(q.trim())) return "greeting";
  if (/\b(everything|everything please|all of them|all areas)\b/.test(q)) return "everything";
  if (/\btomorrow\b|\bcan i do (it|that)\b|\bthat one\b/.test(q)) return "plan";
  const asksWorkout = /workout|train|exercise|session|what should i do today|what i should do today|today's workout|todays workout/.test(q), asksNutrition = /diet|eat|food|nutrition|protein/.test(q), asksProgress = /progress|how am i doing|how i am doing|improving|history/.test(q), asksRecovery = /recover|recovery|rest|fatigue/.test(q);
  if ([asksWorkout, asksNutrition, asksProgress, asksRecovery].filter(Boolean).length >= 2) return "multi";
  if (/any other|another|different|don't like|do not like|change it|anything else|make it cheaper|make it south indian|replace |shorter/.test(q)) return /diet|eat|food|nutrition|oats|south indian/.test(q) ? "nutrition" : "plan";
  if (/\bwhy\b|how come/.test(q)) return "why";
  if (/eat|food|diet|nutrition|protein|oats|south indian/.test(q)) return "nutrition";
  if (/deadlift|squat|bench|press|row|workout|train|session|exercise|can i/.test(q)) return "plan";
  if (/recover|rest|tired|sleep/.test(q)) return "recovery";
  if (/progress|improving|last workout|history/.test(q)) return "progress";
  if (/status|bpm|intensity|safe|alert|data/.test(q)) return "status";
  return "chat";
}

function isAlternative(message: string, memory: any[]) { const q = lower(message); return /any other|another|different|anything else|don't like|do not like|change it|give me another|make it cheaper|make it south indian/.test(q); }
function previousRecommendation(memory: any[], kind: string) { return memory.find(x => x.role === "assistant" && (kind === "nutrition" ? /breakfast|calories|kcal|protein/.test(lower(x.content)) : /minute|round|workout|squat|push-up/.test(lower(x.content)))); }
function formatWorkout(w: any, title: string) { return `${title}\n\nWarm-up — ${w.warmup.replace(/^5 min:\s*/i, "5 min: ")}\n\n1. Main circuit\n   ${w.mainWorkout}\n   Rest between rounds: 60–90 seconds\n\nCooldown — ${w.cooldown.replace(/^5 min:\s*/i, "5 min: ")}`; }

function multiAreaResponse(ctx: CoachContext, decision: any, message: string) {
  const workout = plan({ ...ctx.userProfile, goal: ctx.fitnessGoal, availableEquipment: ctx.userPreferences.availableEquipment, trainingFrequency: ctx.userPreferences.trainingFrequency }, { alerts: ctx.recoveryContext.recentAlerts, highSessions: ctx.trainingLoad.recentHighSessions }, { message });
  const n = nutrition({ ...ctx.userProfile, goal: ctx.fitnessGoal, dietaryPreference: ctx.userPreferences.dietaryPreference }, { memory: ctx.conversationMemory });
  const r = recovery({ alerts: ctx.recoveryContext.recentAlerts, highSessions: ctx.trainingLoad.recentHighSessions }, ctx.mlPrediction.predictedClass);
  const progress = ctx.recentWorkoutHistory.length ? `You have ${ctx.recentWorkoutHistory.length} stored session${ctx.recentWorkoutHistory.length === 1 ? "" : "s"}, averaging ${ctx.trainingLoad.averageIntensity}/100 across ${ctx.trainingLoad.totalMinutes} minutes. Next, ${decision.progressionState === "CONSOLIDATE" ? "consolidate consistency before adding load" : "build gradually while tracking recovery"}.` : "There is not enough stored workout history for a meaningful trend yet; after a few sessions I can compare consistency, intensity, duration, and recovery.";
  return `Absolutely — let’s cover the main areas for your ${ctx.fitnessGoal.toLowerCase()} goal.\n\nTODAY’S WORKOUT\n${workout.duration}: ${workout.mainWorkout}\n\nNUTRITION\n${n.dailyPlan[0]} ${n.dailyPlan[1]} ${n.dailyPlan[3]} Daily estimate: ${n.estimate.calories} kcal and ${n.estimate.protein} g protein (estimates, not medical targets).\n\nRECOVERY\n${r.guidance} ${r.rest} ${decision.recoveryState === "RECOVERY_NEEDED" ? "Your current fatigue/load makes recovery the priority before adding intensity." : "A normal cooldown and consistent sleep routine are reasonable."}\n\nPROGRESS\n${progress}\n\nBased on your current signals, I’d prioritize ${decision.warningLevel === "HIGH" ? "recovery before training" : "the workout above at a controlled pace, then reassess how you feel"}.`;
}

export function renderCoachResponse(intent: string, ctx: CoachContext, decision: any, message: string) {
  const ml = ctx.mlPrediction, p = ctx.userProfile, goal = ctx.fitnessGoal, memory = ctx.conversationMemory || [], variant = isAlternative(message, memory) ? 1 : 0;
  if (intent === "greeting") return `Hey${p.name && p.name !== "Athlete" ? ` ${p.name}` : ""}! I’m ready to help. Want to work on today’s workout, nutrition, recovery, or your progress?`;
  if (intent === "everything" || intent === "multi") return multiAreaResponse(ctx, decision, message);
  if (intent === "why") { const prior = memory.find(x => x.role === "assistant"); return `Because ${decision.reasons.length ? decision.reasons.join(", ") : "your saved profile and current session context"}. ${prior ? "That follows the recommendation we were discussing, while keeping your " + goal + " goal in view." : "I’m combining your live signals, stored history, and goal rather than relying on one number."}`; }
  if (intent === "plan") { const w = plan({ ...p, goal, availableEquipment: ctx.userPreferences.availableEquipment, trainingFrequency: ctx.userPreferences.trainingFrequency }, { alerts: ctx.recoveryContext.recentAlerts, highSessions: ctx.trainingLoad.recentHighSessions }, { variant, message }); const tomorrow = /\btomorrow\b/i.test(message); if (tomorrow) { const completedUnknown = !ctx.recentWorkoutHistory.some((x: any) => new Date(x.endedAt).toDateString() === new Date().toDateString()); const next = decision.recoveryState === "RECOVERY_NEEDED" || ctx.trainingLoad.recentHighSessions >= 2 ? "make tomorrow a recovery or light-mobility day" : "not automatically repeating the exact same session; use a lighter or different movement emphasis"; return `For tomorrow, I’d ${next} based on your current ${decision.fatigueState.toLowerCase()} fatigue and recent training load. ${completedUnknown ? "I can’t confirm that today’s session was completed, so if you have not trained yet, moving this session to tomorrow is reasonable; if you already completed it, choose the lighter option instead." : "Your stored history shows a recent completed session, so I would not stack the same workload without recovery."} ${formatWorkout(w, "TOMORROW’S SESSION")}`; } return `${variant ? "Here is a genuinely different option: " : "Here is a personalized session: "}${formatWorkout(w, "TODAY’S SESSION")}\n\nWHY I CHOSE THIS\n- ${w.objective}\n- ${decision.reasons.length ? decision.reasons.join("\n- ") : "It matches your goal, available time, and current readiness."}\n\n${decision.warningLevel !== "LOW" ? `Because the current model sees ${decision.fatigueState.toLowerCase()} fatigue, keep it lighter today. ` : ""}${w.safety}`; }
  if (intent === "nutrition") { const n = nutrition({ ...p, goal, dietaryPreference: ctx.userPreferences.dietaryPreference, exercisePreferences: `${p.exercisePreferences || ""} ${ctx.userPreferences.dislikes?.join(" ") || ""}` }, { variant, memory: [...memory, { role: "user", content: message }] }); const prior = previousRecommendation(memory, "nutrition"); const tomorrow = /\btomorrow\b/i.test(message); return `${tomorrow ? "For tomorrow, here is a fresh plan that preserves your goal and preferences" : variant && prior ? "Here is a different diet plan, not a rewording of the previous one" : "Here is a structured diet plan"} for your ${goal} goal (${p.weight || "stored"} kg, ${p.age || "stored"}-year profile, ${lower(p.activityLevel || "unspecified")} activity, ${lower(ctx.userPreferences.dietaryPreference)} preference): ${n.dailyPlan.join(" ")} DAILY TOTAL ESTIMATE: ${n.estimate.calories} kcal, ${n.estimate.protein} g protein, ${n.estimate.carbohydrates} g carbs, ${n.estimate.fat} g fat. ${n.note}`; }
  if (intent === "progress") return ctx.recentWorkoutHistory.length ? `From ${ctx.recentWorkoutHistory.length} stored session${ctx.recentWorkoutHistory.length === 1 ? "" : "s"}, your average intensity is ${ctx.trainingLoad.averageIntensity}/100 across ${ctx.trainingLoad.totalMinutes} minutes, with ${ctx.trainingLoad.recentHighSessions} high-intensity session${ctx.trainingLoad.recentHighSessions === 1 ? "" : "s"}. Your next progression is to ${decision.progressionState === "CONSOLIDATE" ? "consolidate consistency before adding load" : "build gradually while tracking recovery"}.` : "There is not enough stored workout history to judge progress yet. Complete a few sessions and I’ll compare frequency, duration, intensity, and recovery patterns.";
  if (intent === "status" || intent === "safety") { if (intent === "status" && p.onboardingCompleted && !ctx.recentWorkoutHistory.length && !ctx.conversationMemory.length) return `Hey ${p.name || "there"} — your ${goal.toLowerCase()} profile is ready. You’re training at ${ctx.userPreferences.trainingFrequency || "your preferred frequency"} with ${ctx.userPreferences.availableEquipment || "your available equipment"}. I can plan today’s session, track progress, explain live data, or adapt your routine. Current signal: ${ml.intensity}/100 (${ml.predictedClass}) with ${ml.fatigue.toLowerCase()} fatigue.`; return `You’re at ${ml.intensity}/100 (${ml.predictedClass}) with ${ml.fatigue.toLowerCase()} fatigue and a ${ml.bpmTrend.toLowerCase()} BPM trend. The model confidence is ${Math.round(ml.confidence * 100)}% from the available sensor agreement. ${decision.workoutRecommendation}.`; }
  if (intent === "recovery") return `${decision.recoveryRecommendation}. Your current signal is ${ml.predictedClass} intensity with ${ml.fatigue.toLowerCase()} fatigue, so ${decision.recoveryState === "RECOVERY_NEEDED" ? "make today lighter and reassess before hard training" : "a normal cooldown and sleep routine are reasonable"}. If you have chest pain, fainting, severe breathlessness, or other concerning symptoms, stop and seek professional medical evaluation.`;
  return `I’m with you. With a ${goal} goal, ${p.availableTime}-minute preference, ${ml.predictedClass.toLowerCase()} current intensity, and ${ml.fatigue.toLowerCase()} fatigue signal, I’d ${decision.workoutRecommendation}. What would you like to optimize next: today’s workout, recovery, nutrition, or your recent progress?`;
}

export function meaningfulInsight(previous: any, current: any, decision: any) { if (!previous) return null; if (previous.status !== current.status) return `Your intensity moved from ${previous.status.toLowerCase()} to ${current.status.toLowerCase()}. ${decision.intensityRecommendation}.`; if (previous.fatigue !== decision.fatigueState) return `Your fatigue signal changed to ${decision.fatigueState.toLowerCase()}. I’d ${decision.workoutRecommendation}.`; if (previous.bpmTrend !== decision.currentBpmTrend && decision.fatigueState !== "LOW") return `Your live trend deserves attention: BPM is ${decision.reasons.includes("BPM is trending upward") ? "rising" : "changing"} while fatigue is ${decision.fatigueState.toLowerCase()}.`; return null; }
