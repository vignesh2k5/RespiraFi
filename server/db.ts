import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { profiles, simulator, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
    }
  }
  return _db;
}

export async function upsertUser(user: typeof users.$inferInsert): Promise<void> {
  if (!user.openId) throw new Error("User openId is required");
  const db = await getDb();
  if (!db) return;
  const values = { ...user, lastSignedIn: user.lastSignedIn || new Date() };
  await db.insert(users).values(values).onDuplicateKeyUpdate({
    set: {
      name: user.name,
      email: user.email,
      loginMethod: user.loginMethod,
      lastSignedIn: values.lastSignedIn,
    },
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export const defaultProfile = {
  name: "Welcome to RespiraFi",
  age: 29,
  height: 175,
  weight: 72,
  gender: "Prefer not to say",
  fitnessLevel: "Intermediate",
  activityLevel: "Moderate",
  goal: "General Fitness",
  dietaryPreference: "Balanced",
  workoutPreference: "Cardio + Strength",
  availableTime: 30,
  onboardingState: "NEW_USER",
  onboardingStep: 1,
  onboardingCompleted: 0,
  onboardingCompletedAt: null,
  secondaryGoals: null,
  trainingFrequency: null,
  preferredWorkoutDuration: null,
  trainingEnvironment: null,
  availableEquipment: null,
  coachFocus: null,
  exercisePreferences: null,
  timezone: "UTC",
};

export const defaultSimulator = {
  id: 1,
  deviceId: "RESPIRAFI-ESP32-001",
  connected: 0,
  running: 0,
  mode: "REST",
  intensityTarget: 32,
  duration: 0,
  workoutState: "REST",
  workoutStartedAt: "",
  pausedAt: "",
  pausedSeconds: 0,
  led: 0,
  buzzer: 0,
  lastTelemetryId: null,
};

/** Ensure only the authenticated user's core rows exist. */
export async function ensureCoreRows(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  userId: number,
) {
  const profile = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (!profile.length) {
    await db.insert(profiles).values({ ...defaultProfile, userId });
  }

  const userSimulator = await db.select({ id: simulator.id }).from(simulator).where(eq(simulator.userId, userId)).limit(1);
  if (!userSimulator.length) {
    await db.insert(simulator).values({ ...defaultSimulator, id: userId, userId });
  }
}

export { ENV };
