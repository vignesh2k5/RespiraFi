import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { profiles, simulator, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
export async function getDb() { if (!_db && process.env.DATABASE_URL) { try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); } } return _db; }
export async function upsertUser(user: typeof users.$inferInsert): Promise<void> { if (!user.openId) throw new Error("User openId is required"); const db=await getDb(); if(!db) return; const values={...user,lastSignedIn:user.lastSignedIn||new Date()}; await db.insert(users).values(values).onDuplicateKeyUpdate({set:{name:user.name,email:user.email,loginMethod:user.loginMethod,lastSignedIn:values.lastSignedIn}}); }
export async function getUserByOpenId(openId: string) { const db=await getDb(); if(!db) return undefined; const result=await db.select().from(users).where(eq(users.openId,openId)).limit(1); return result[0]; }
export const defaultProfile={name:"Alex Morgan",age:29,height:175,weight:72,gender:"Prefer not to say",fitnessLevel:"Intermediate",activityLevel:"Moderate",goal:"General Fitness",dietaryPreference:"Balanced",workoutPreference:"Cardio + Strength",availableTime:30};
export const defaultSimulator={id:1,deviceId:"RESPIRAFI-ESP32-001",connected:0,running:0,mode:"REST",intensityTarget:32,duration:0,workoutState:"REST",workoutStartedAt:"",led:0,buzzer:0,lastTelemetryId:null};
export async function ensureCoreRows(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) { const p=await db.select().from(profiles).limit(1); if(!p.length) await db.insert(profiles).values(defaultProfile); const s=await db.select().from(simulator).where(eq(simulator.id,1)).limit(1); if(!s.length) await db.insert(simulator).values(defaultSimulator); }
export { ENV };
