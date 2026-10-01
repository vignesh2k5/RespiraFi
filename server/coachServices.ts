export type IntensityStatus = "NORMAL" | "MODERATE" | "HIGH";
export type FatigueState = "LOW" | "MEDIUM" | "HIGH";
export type BpmTrend = "FALLING" | "FLAT" | "RISING";

const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));

export type MlPrediction={
  intensity:number;
  predictedClass:IntensityStatus;
  fatigue:FatigueState;
  confidence:number;
  bpmTrend:BpmTrend;
  modelVersion:string;
  features:{bpm:number;speed:number;movement:number;duration:number;recentHighSessions:number;recentAlerts:number};
};

export function score(t:{bpm:number;speed:number;movement:number}){
  const bpm=clamp((t.bpm-55)/(185-55)*100,0,100);
  const speed=clamp(t.speed/14*100,0,100);
  const movement=clamp(t.movement/3*100,0,100);
  const intensity=Math.round(clamp(bpm*.55+speed*.3+movement*.15,0,100));
  return {intensity,status:intensity<=44?"NORMAL":intensity<=69?"MODERATE":"HIGH" as IntensityStatus};
}

export function plan(p:any,s:any){const mins=p.availableTime||30,goal=(p.goal||"General Fitness").toLowerCase(),preference=p.workoutPreference||"Balanced training",equipment=p.availableEquipment||"bodyweight or available equipment",frequency=p.trainingFrequency||"your usual schedule",cautious=s.alerts>1||s.highSessions>1;let objective="Build balanced conditioning with cardio, strength and mobility.",mainWorkout="3 rounds: 8 controlled squats, 8 incline push-ups, 10 alternating reverse lunges and 30s plank; finish with 8 min easy cardio.";if(goal.includes("endurance")){objective="Develop cardiovascular endurance through sustainable pacing and progressive duration.";mainWorkout=(mins>=45?"4":"3")+" rounds: "+(mins>=45?"8":"5")+" min steady aerobic effort, 2 min easy recovery, then 4 x 30s controlled pickups. Keep the effort conversational until the final round.";}else if(goal.includes("muscle")){objective="Prioritize resistance training, progressive overload, and recovery between muscle groups.";mainWorkout=`3–4 rounds using ${equipment}: squat 8–12, push-up or press 8–12, row 8–12, Romanian hinge 8–12 and split squat 8/side; rest 60–90s and leave 1–2 good reps in reserve.`;}return {title:cautious?"Steady Progress Reset":(p.goal||"General Fitness")+" · "+mins+"-minute "+preference,objective:cautious?"Build consistency without stacking high-intensity stress":objective,duration:mins+" minutes",warmup:"5 min: easy movement, joint circles and gradual pace increase.",mainWorkout,cooldown:"5 min gradually slower pace plus gentle stretching.",safety:`Stop or reduce pace if form or breathing deteriorates. This is not medical advice. This plan is designed around ${frequency}.`};}
export function recovery(s:any,status:string){const cautious=s.alerts>=2||s.highSessions>=2||status==="HIGH";return {title:cautious?"Recovery-first reset":"Balanced recovery plan",guidance:cautious?"Take a longer recovery break and resume only at a comfortable pace.":"Keep the next session easy enough to finish with controlled breathing.",rest:cautious?"Plan 24–48 hours between hard sessions.":"Take at least one easy day after demanding sessions.",mobility:"5–8 minutes of gentle mobility for hips, calves, shoulders and spine.",sleep:"Aim for a consistent 7–9 hour sleep window."};}
export function nutrition(p:any){const goal=(p.goal||"General Fitness").toLowerCase(),weight=Number(p.weight)||70,protein=Math.round(weight*(goal.includes("muscle")?1.6:goal.includes("endurance")?1.4:1.2)),calories=Math.round(weight*(goal.includes("muscle")?34:goal.includes("fat loss")?26:30)),diet=(p.dietaryPreference||"balanced").toLowerCase(),carbs=Math.round(calories*.45/4),fat=Math.round(calories*.3/9);return {protein:"Aim for roughly "+protein+" g protein/day from "+diet+" foods.",meal:"Build balanced meals around protein, produce, quality carbohydrates and healthy fats.",post:"Pair protein and carbohydrates after training, then rehydrate.",dailyPlan:["Breakfast: protein-rich oats or yogurt with fruit.","Lunch: "+(diet.includes("veget")?"lentils or tofu":"lean protein")+" with rice or potatoes and vegetables.","Pre-workout: fruit plus a light protein snack.","Post-workout: "+(goal.includes("endurance")?"carbohydrate-forward meal with protein":"protein-forward meal with carbohydrates")+" and fluids.","Dinner: vegetables, a protein source, and a satisfying carbohydrate portion."],estimate:{calories,protein,carbohydrates:carbs,fat},note:"Nutrition values are estimates, not medically precise targets."};}

export function predictMl(input:{bpm:number;speed:number;movement:number;duration:number;previousBpm?:number;recentHighSessions?:number;recentAlerts?:number;modelAvailable?:boolean}):MlPrediction{
  if(input.modelAvailable===false)return {intensity:0,predictedClass:"NORMAL",fatigue:"LOW",confidence:0,bpmTrend:"FLAT",modelVersion:"unavailable",features:{bpm:input.bpm||0,speed:input.speed||0,movement:input.movement||0,duration:input.duration||0,recentHighSessions:input.recentHighSessions||0,recentAlerts:input.recentAlerts||0}};
  const scored=score(input);
  const delta=(input.bpm||0)-(input.previousBpm||input.bpm||0);
  const bpmTrend=delta>3?"RISING":delta<-3?"FALLING":"FLAT" as BpmTrend;
  const prolonged=input.duration>=1800;
  const fatigueScore=(scored.intensity*.45)+(prolonged?22:input.duration>=900?10:0)+(bpmTrend==="RISING"?12:0)+((input.recentHighSessions||0)>=2?14:0)+((input.recentAlerts||0)>=2?12:0);
  const fatigue=fatigueScore>=70?"HIGH":fatigueScore>=42?"MEDIUM":"LOW" as FatigueState;
  const normalized=[clamp((input.bpm-55)/130,0,1),clamp(input.speed/14,0,1),clamp(input.movement/3,0,1)];
  const mean=normalized.reduce((a,b)=>a+b,0)/normalized.length;
  const agreement=1-(normalized.reduce((a,b)=>a+Math.abs(b-mean),0)/normalized.length);
  const confidence=Number(clamp(.56+agreement*.32+(bpmTrend!=="FLAT"?.05:0),.5,.94).toFixed(2));
  return {intensity:scored.intensity,predictedClass:scored.status,fatigue,confidence,bpmTrend,modelVersion:"respirafi-signal-model-v1",features:{bpm:input.bpm,speed:input.speed,movement:input.movement,duration:input.duration,recentHighSessions:input.recentHighSessions||0,recentAlerts:input.recentAlerts||0}};
}

export type CoachContext={
  userProfile:any; fitnessGoal:string; currentSession:any; liveSensorState:any; mlPrediction:MlPrediction;
  recentWorkoutHistory:any[]; trainingLoad:any; previousSessions:any[]; recoveryContext:any; alerts:any[]; conversationMemory:any[]; userPreferences:any;
};

export function buildCoachContext(input:{profile:any;telemetry:any;simulator:any;workouts:any[];alerts:any[];conversations:any[];previousTelemetry?:any}):CoachContext{
  const p=input.profile||{},t=input.telemetry||{},sim=input.simulator||{workoutState:"REST",duration:0,mode:"REST"},ws=input.workouts||[],as=input.alerts||[];
  const bpm=Number(t.bpm??70),speed=Number(t.speed??0),movement=Number(t.movement??0),sessionDuration=Number(t.duration??sim.duration??0);
  const historyIntensity=ws.length?Math.round(ws.reduce((n,w)=>n+(w.averageIntensity||0),0)/ws.length):0;
  const recent=ws.filter(w=>Date.now()-new Date(w.endedAt).getTime()<7*86400000);
  const trainingLoad={sessionsLast7Days:recent.length,totalMinutes:Math.round(ws.reduce((n,w)=>n+(w.duration||0),0)/60),averageIntensity:historyIntensity,recentHighSessions:recent.filter(w=>(w.peakIntensity||0)>=70).length};
  const ml= predictMl({bpm,speed,movement,duration:sessionDuration,previousBpm:input.previousTelemetry?.bpm,recentHighSessions:trainingLoad.recentHighSessions,recentAlerts:as.length});
  return {userProfile:{name:p.name||"Athlete",age:p.age,height:p.height,weight:p.weight,gender:p.gender,fitnessLevel:p.fitnessLevel,activityLevel:p.activityLevel,dietaryPreference:p.dietaryPreference,workoutPreference:p.workoutPreference,availableTime:p.availableTime,onboardingCompleted:Boolean(p.onboardingCompleted)},fitnessGoal:p.goal||"General Fitness",currentSession:{state:sim.workoutState||"REST",duration:sessionDuration,bpm,speed,movement,exercise:sim.mode||"General session"},liveSensorState:{bpm,bpmTrend:ml.bpmTrend,speed,acceleration:movement},mlPrediction:ml,recentWorkoutHistory:ws.slice(0,10),trainingLoad,previousSessions:ws.slice(0,5),recoveryContext:{recentAlerts:as.length,needsRecovery:ml.fatigue!=="LOW"||trainingLoad.recentHighSessions>=2},alerts:as.slice(0,10),conversationMemory:input.conversations.slice(0,12),userPreferences:{goal:p.goal||"General Fitness",secondaryGoals:p.secondaryGoals||"",dietaryPreference:p.dietaryPreference||"Not specified",workoutPreference:p.workoutPreference||"Not specified",trainingFrequency:p.trainingFrequency||"Not specified",preferredWorkoutDuration:p.preferredWorkoutDuration||"Not specified",trainingEnvironment:p.trainingEnvironment||"Not specified",availableEquipment:p.availableEquipment||"Not specified",coachFocus:p.coachFocus||"All of these",exercisePreferences:p.exercisePreferences||"Not specified",availableTime:p.availableTime||30}};
}

export function decide(ctx:CoachContext){
  const ml=ctx.mlPrediction, load=ctx.trainingLoad, active=["WARMUP","ACTIVE","PAUSED"].includes(ctx.currentSession.state);
  const reasons:string[]=[];
  if(ml.predictedClass==="HIGH")reasons.push(`intensity is ${ml.intensity}/100`);
  if(ml.bpmTrend==="RISING")reasons.push("BPM is trending upward");
  if(ml.fatigue!=="LOW")reasons.push(`${ml.fatigue.toLowerCase()} fatigue signal`);
  if(ctx.currentSession.duration>=1800)reasons.push("the session is already longer than 30 minutes");
  if(load.recentHighSessions>=2)reasons.push("recent training load includes repeated high-intensity sessions");
  const warningLevel=ml.predictedClass==="HIGH"&&ml.fatigue!=="LOW"?"HIGH":ml.predictedClass==="HIGH"||ml.fatigue==="HIGH"||(ml.fatigue==="MEDIUM"&&(ctx.currentSession.duration>=1800||load.recentHighSessions>=1))?"ELEVATED":"LOW";
  const workoutRecommendation=warningLevel==="HIGH"?"reduce intensity, recover, and reassess before continuing":warningLevel==="ELEVATED"?"keep effort controlled and avoid adding intensity":active?"continue at a controlled pace and progress gradually":"start a goal-aligned session when ready";
  return {currentTrainingState:active?"ACTIVE":"REST",exertionState:ml.predictedClass,fatigueState:ml.fatigue,recoveryState:ctx.recoveryContext.needsRecovery?"RECOVERY_NEEDED":"READY",progressionState:load.recentHighSessions>=2?"CONSOLIDATE":"BUILD_GRADUALLY",workoutRecommendation,intensityRecommendation:warningLevel==="HIGH"?"Reduce pace now":"Stay within a sustainable effort",exerciseRecommendation:ctx.fitnessGoal.toLowerCase().includes("muscle")?"Use controlled resistance and leave reps in reserve":"Use sustainable aerobic work with simple strength movements",nutritionRecommendation:ctx.fitnessGoal.toLowerCase().includes("endurance")?"Prioritize carbohydrates around longer sessions and steady protein":"Build meals around protein, produce, quality carbohydrates, and fluids",recoveryRecommendation:ctx.recoveryContext.needsRecovery?"Take an easier day and allow 24–48 hours after hard work":"Use a short cooldown and normal recovery routine",warningLevel,confidence:ml.confidence,currentBpmTrend:ml.bpmTrend,reasons,suggestedActions:warningLevel==="HIGH"?["Reduce intensity","Take a recovery break","Stop and seek professional help if concerning symptoms appear"]:["Keep breathing controlled","Monitor the next few minutes","Progress only if effort remains comfortable"],mlModel:ml.modelVersion};
}

export function classifyIntent(kind:string,message:string){const q=(message||kind||"").toLowerCase();if(kind!=="chat")return kind; if(/\bwhy\b|how come/.test(q))return "why";if(/deadlift|squat|bench|press|row|can i|can you|also|too\b/.test(q))return "plan";if(/workout|train|session|exercise/.test(q))return "plan";if(/eat|food|diet|nutrition|protein/.test(q))return "nutrition";if(/recover|rest|tired|sleep/.test(q))return "recovery";if(/progress|improving|last workout|history/.test(q))return "progress";if(/status|bpm|intensity|safe|alert|data/.test(q))return "status";return "chat";}

export function renderCoachResponse(intent:string,ctx:CoachContext,decision:any,message:string){
  const ml=ctx.mlPrediction,p=ctx.userProfile,goal=ctx.fitnessGoal;
  if(intent==="why"){
    const prior=ctx.conversationMemory.find(x=>x.role==="assistant");
    return `Because ${decision.reasons.length?decision.reasons.join(", "):"your saved profile and current session context"}. ${prior?"That follows the recommendation we were discussing, while keeping your "+goal+" goal in view.":"I’m combining your live signals, stored history, and goal rather than relying on one number."}`;
  }
  if(intent==="plan"){
    const cautious=decision.warningLevel!=="LOW"; const minutes=Math.min(Number(p.availableTime)||30,cautious?25:Number(p.availableTime)||30); const main=goal.toLowerCase().includes("endurance")?"3 rounds of 5 minutes steady effort plus 2 minutes easy recovery":goal.toLowerCase().includes("muscle")?"3 controlled rounds of squat, push, row, hinge, and split-squat patterns": "3 rounds of squats, incline push-ups, reverse lunges, plank, then easy cardio";
    return `Here’s a ${minutes}-minute ${goal} session shaped by your ${p.fitnessLevel||"current"} level and recent load. ${cautious?"Because the current model sees "+decision.fatigueState.toLowerCase()+" fatigue and "+decision.warningLevel.toLowerCase()+" warning, keep it lighter today. ":""}Warm up 5 minutes, then ${main}. Keep 1–2 good reps in reserve, finish with a 5-minute cooldown, and stop if symptoms feel concerning.`;
  }
  if(intent==="nutrition"){const n=nutrition({goal,weight:p.weight,dietaryPreference:p.dietaryPreference});return `For your ${goal} goal, ${p.weight??"available"} kg profile, ${(p.activityLevel||"unspecified").toLowerCase()} activity, and ${(p.dietaryPreference||"unspecified").toLowerCase()} preference: ${n.dailyPlan.join(" ")} Estimated day: ${n.estimate.calories} kcal, ${n.estimate.protein} g protein, ${n.estimate.carbohydrates} g carbohydrates, and ${n.estimate.fat} g fat. ${n.note}`;}
  if(intent==="progress")return ctx.recentWorkoutHistory.length?`From ${ctx.recentWorkoutHistory.length} stored session${ctx.recentWorkoutHistory.length===1?"":"s"}, your average intensity is ${ctx.trainingLoad.averageIntensity}/100 across ${ctx.trainingLoad.totalMinutes} minutes, with ${ctx.trainingLoad.recentHighSessions} high-intensity session${ctx.trainingLoad.recentHighSessions===1?"":"s"}. Your next progression is to ${decision.progressionState==="CONSOLIDATE"?"consolidate consistency before adding load":"build gradually while tracking recovery"}.`:`There is not enough stored workout history to judge progress yet. Complete a few sessions and I’ll compare frequency, duration, intensity, and recovery patterns.`;
  if(intent==="status"||intent==="safety")if(intent==="status"&&ctx.userProfile.onboardingCompleted&&!ctx.recentWorkoutHistory.length&&ctx.conversationMemory.length===0)return `Hey ${ctx.userProfile.name||"there"} — your ${goal.toLowerCase()} profile is ready. You’re training at ${ctx.userPreferences.trainingFrequency||"your preferred frequency"} with ${ctx.userPreferences.availableEquipment||"your available equipment"}. I can plan today’s session, track progress, explain live data, or adapt your routine. Current signal: ${ml.intensity}/100 (${ml.predictedClass}) with ${ml.fatigue.toLowerCase()} fatigue.`;
  if(intent==="status"||intent==="safety")return `You’re at ${ml.intensity}/100 (${ml.predictedClass}) with ${ml.fatigue.toLowerCase()} fatigue and a ${ml.bpmTrend.toLowerCase()} BPM trend. The model confidence is ${Math.round(ml.confidence*100)}% from the available sensor agreement. ${decision.workoutRecommendation}.`;
  if(intent==="recovery")return `${decision.recoveryRecommendation}. Your current signal is ${ml.predictedClass} intensity with ${ml.fatigue.toLowerCase()} fatigue, so ${decision.recoveryState==="RECOVERY_NEEDED"?"make today lighter and reassess before hard training":"a normal cooldown and sleep routine are reasonable"}. If you have chest pain, fainting, severe breathlessness, or other concerning symptoms, stop and seek professional medical evaluation.`;
  return `I’m with you. With a ${goal} goal, ${p.availableTime}-minute preference, ${ml.predictedClass.toLowerCase()} current intensity, and ${ml.fatigue.toLowerCase()} fatigue signal, I’d ${decision.workoutRecommendation}. What would you like to optimize next: today’s workout, recovery, nutrition, or your recent progress?`;
}

export function meaningfulInsight(previous:any,current:any,decision:any){
  if(!previous)return null;
  if(previous.status!==current.status)return `Your intensity moved from ${previous.status.toLowerCase()} to ${current.status.toLowerCase()}. ${decision.intensityRecommendation}.`;
  if(previous.fatigue!==decision.fatigueState)return `Your fatigue signal changed to ${decision.fatigueState.toLowerCase()}. I’d ${decision.workoutRecommendation}.`;
  if(previous.bpmTrend!==decision.currentBpmTrend&&decision.fatigueState!=="LOW")return `Your live trend deserves attention: BPM is ${decision.reasons.includes("BPM is trending upward")?"rising":"changing"} while fatigue is ${decision.fatigueState.toLowerCase()}.`;
  return null;
}
