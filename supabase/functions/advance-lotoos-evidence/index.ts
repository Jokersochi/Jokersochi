import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.111.0";

const ENGINE_RELEASE = "lotoos-forward-evidence-v3";
const HISTORY_LIMIT = 1000;
const STRATEGY_KEYS = ["adaptive20", "balanced20", "random"] as const;
const SNAKE = [0,1,2,3,4,4,3,2,1,0,0,1,2,3,4,4,3,2,1,0];

type Draw = {
  draw_number:number;
  draw_date:string;
  field1:number[];
  field2:number[];
  ticket_price_rub:number|null;
};

type Ticket = { field1:number[]; field2:number[] };
type StrategyVersion = { id:string; strategy_key:string; version:string; engine_commit_sha:string; config_hash:string };
type Failure = { code:string; message:string };

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const secretMap = Deno.env.get("SUPABASE_SECRET_KEYS");
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const secret = secretMap ? JSON.parse(secretMap)?.default : legacy;
  if (!url || !secret) throw new Error("Missing Supabase server credentials");
  return createClient(url, secret, { auth:{ persistSession:false, autoRefreshToken:false } });
}

async function verifySyncToken(s:any, token:string) {
  if (!token || token.length < 32) return false;
  const { data, error } = await s.rpc("verify_lotoos_sync_token", { p_token:token });
  if (error) throw new Error(`Token verification failed: ${error.message}`);
  return data === true;
}

function validField(field:unknown): field is number[] {
  return Array.isArray(field) && field.length === 4 && new Set(field.map(Number)).size === 4 &&
    field.every((n) => Number.isInteger(Number(n)) && Number(n) >= 1 && Number(n) <= 20);
}

function assertHistory(draws:Draw[]) {
  if (draws.length < 500) throw new Error("Need at least 500 verified draws for Adaptive20");
  for (let i=0;i<draws.length;i++) {
    const d=draws[i];
    if (!Number.isInteger(Number(d.draw_number)) || !validField(d.field1) || !validField(d.field2)) {
      throw new Error(`Invalid canonical draw #${String(d.draw_number)}`);
    }
    if (i>0 && Number(draws[i-1].draw_number)+1 !== Number(d.draw_number)) {
      throw new Error(`Canonical history gap between #${draws[i-1].draw_number} and #${d.draw_number}`);
    }
  }
}

async function sha256(value:unknown) {
  const bytes = new TextEncoder().encode(typeof value === "string" ? value : JSON.stringify(value));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((b)=>b.toString(16).padStart(2,"0")).join("");
}

function mulberry32(seed:number) {
  let a=seed>>>0;
  return () => {
    a|=0; a=(a+0x6d2b79f5)|0;
    let t=Math.imul(a^(a>>>15),1|a);
    t=(t+Math.imul(t^(t>>>7),61|t))^t;
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}

async function seedFor(targetDraw:number, strategyKey:string) {
  const hex=await sha256(`${targetDraw}:${strategyKey}:${ENGINE_RELEASE}`);
  return parseInt(hex.slice(0,8),16)>>>0;
}

function fieldValues(draw:Draw, field:1|2) { return field===1 ? draw.field1 : draw.field2; }

function metricsFor(history:Draw[], field:1|2, lookback=500) {
  const list=history.slice(Math.max(0,history.length-lookback));
  const n=list.length;
  const counts=new Array(21).fill(0);
  const lastSeen=new Array(21).fill(-1);
  const gapSum=new Array(21).fill(0);
  const gapN=new Array(21).fill(0);
  list.forEach((draw,index)=>{
    for (const value of fieldValues(draw,field)) {
      counts[value]+=1;
      if (lastSeen[value]>=0) { gapSum[value]+=index-lastSeen[value]; gapN[value]+=1; }
      lastSeen[value]=index;
    }
  });
  const p=0.2;
  const sd=Math.sqrt(Math.max(1,n)*p*(1-p))||1;
  return Array.from({length:20},(_,idx)=>{
    const value=idx+1;
    const gap=lastSeen[value]>=0 ? n-1-lastSeen[value] : n;
    const meanGap=gapN[value]>0 ? gapSum[value]/gapN[value] : 5;
    const overdueRatio=meanGap>0 ? gap/meanGap : 0;
    const z=(counts[value]-n*p)/sd;
    return { value,count:counts[value],gap,meanGap,overdueRatio,z,hybridScore:z+overdueRatio };
  });
}

function adaptiveField(history:Draw[], field:1|2, offset:number) {
  const ranked=[...metricsFor(history,field,500)]
    .sort((a,b)=>b.hybridScore-a.hybridScore || b.count-a.count || a.value-b.value);
  const buckets=Array.from({length:5},()=>[] as number[]);
  ranked.forEach((m,index)=>buckets[SNAKE[(index+offset)%SNAKE.length]].push(m.value));
  if (buckets.some((b)=>b.length!==4)) throw new Error("Adaptive20 failed 5x4 coverage invariant");
  return buckets.map((b)=>b.sort((a,b)=>a-b));
}

function adaptiveTickets(history:Draw[]):Ticket[] {
  const a=adaptiveField(history,1,0);
  const b=adaptiveField(history,2,3);
  return a.map((field1,i)=>({field1,field2:b[i]}));
}

function permutation(shift=0, step=7) {
  return Array.from({length:20},(_,i)=>((shift+i*step)%20)+1);
}
function chunkFive(values:number[]) {
  return Array.from({length:5},(_,i)=>values.slice(i*4,i*4+4).sort((a,b)=>a-b));
}
function balancedTickets():Ticket[] {
  const a=chunkFive(permutation(0,7));
  const b=chunkFive(permutation(3,9));
  return a.map((field1,i)=>({field1,field2:b[i]}));
}

function pickRandom4(rnd:()=>number) {
  const pool=Array.from({length:20},(_,i)=>i+1);
  for (let i=pool.length-1;i>0;i--) {
    const j=Math.floor(rnd()*(i+1));
    [pool[i],pool[j]]=[pool[j],pool[i]];
  }
  return pool.slice(0,4).sort((a,b)=>a-b);
}
function randomTickets(seed:number):Ticket[] {
  return Array.from({length:5},(_,i)=>{
    const rnd=mulberry32((seed+Math.imul(i+1,0x9e3779b9))>>>0);
    return { field1:pickRandom4(rnd), field2:pickRandom4(rnd) };
  });
}

async function generate(strategyKey:string, history:Draw[], targetDraw:number):Promise<{tickets:Ticket[];seed:string}> {
  const seed=await seedFor(targetDraw,strategyKey);
  const tickets=strategyKey==="adaptive20" ? adaptiveTickets(history)
    : strategyKey==="balanced20" ? balancedTickets()
    : strategyKey==="random" ? randomTickets(seed)
    : (()=>{throw new Error(`Unknown production strategy ${strategyKey}`)})();
  for (const t of tickets) {
    if (!validField(t.field1) || !validField(t.field2)) throw new Error(`${strategyKey}: invalid ticket`);
  }
  if (tickets.length!==5) throw new Error(`${strategyKey}: expected exactly five tickets`);
  return { tickets, seed:String(seed) };
}

function countMatches(ticket:Ticket, draw:Draw) {
  const a=new Set(draw.field1), b=new Set(draw.field2);
  const field1=ticket.field1.filter((n)=>a.has(n)).length;
  const field2=ticket.field2.filter((n)=>b.has(n)).length;
  return {field1,field2,total:field1+field2};
}

function categoryForMatches(field1:number, field2:number) {
  const hi=Math.max(field1,field2), lo=Math.min(field1,field2);
  if (hi<2) return null;
  if (hi===4) return ({4:1,3:2,2:3,1:4,0:5} as Record<number,number>)[lo] ?? null;
  if (hi===3) return ({3:6,2:7,1:8,0:9} as Record<number,number>)[lo] ?? null;
  if (hi===2) return ({2:10,1:11,0:12} as Record<number,number>)[lo] ?? null;
  return null;
}

async function loadCanonicalHistory(s:any):Promise<Draw[]> {
  const { data, error } = await s.from("draws")
    .select("draw_number,draw_date,field1,field2,ticket_price_rub")
    .order("draw_number",{ascending:false})
    .limit(HISTORY_LIMIT);
  if (error) throw new Error(`draws read failed: ${error.message}`);
  const rows=[...(data||[])].reverse().map((r:any)=>({
    draw_number:Number(r.draw_number), draw_date:r.draw_date,
    field1:r.field1.map(Number), field2:r.field2.map(Number),
    ticket_price_rub:r.ticket_price_rub==null?null:Number(r.ticket_price_rub),
  }));
  assertHistory(rows);
  const { data:state, error:stateError } = await s.from("system_state").select("payload").eq("key","archive_status").maybeSingle();
  if (stateError) throw new Error(`archive_status read failed: ${stateError.message}`);
  const last=rows.at(-1)!.draw_number;
  if (state?.payload?.production_ready!==true || Number(state?.payload?.verified_through)!==last) {
    throw new Error(`Canonical archive not production-ready through #${last}`);
  }
  return rows;
}

async function loadStrategyVersions(s:any):Promise<Map<string,StrategyVersion>> {
  const { data, error } = await s.from("strategy_versions")
    .select("id,strategy_key,version,engine_commit_sha,config_hash,status")
    .in("strategy_key",[...STRATEGY_KEYS])
    .in("status",["active","baseline","experimental"])
    .order("created_at",{ascending:false});
  if (error) throw new Error(`strategy_versions read failed: ${error.message}`);
  const map=new Map<string,StrategyVersion>();
  for (const row of data||[]) if (!map.has(row.strategy_key)) map.set(row.strategy_key,row);
  for (const key of STRATEGY_KEYS) if (!map.has(key)) throw new Error(`Missing strategy_version for ${key}`);
  return map;
}

async function loadManifestForStrategy(s:any, strategyVersionId:string) {
  const { data, error } = await s.from("experiment_manifests")
    .select("*")
    .eq("strategy_version_id",strategyVersionId)
    .eq("status","preregistered")
    .order("preregistered_at",{ascending:false})
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`experiment manifest read failed: ${error.message}`);
  return data;
}

async function lockNextRuns(s:any, history:Draw[], versions:Map<string,StrategyVersion>) {
  const last=history.at(-1)!.draw_number;
  const targetDraw=last+1;
  const datasetHash=await sha256(history.map((d)=>[d.draw_number,d.field1,d.field2]));
  const locked:any[]=[];
  for (const strategyKey of STRATEGY_KEYS) {
    const version=versions.get(strategyKey)!;
    const generated=await generate(strategyKey,history,targetDraw);
    const ticketRows=[];
    for (let i=0;i<generated.tickets.length;i++) {
      const ticket=generated.tickets[i];
      ticketRows.push({
        ticket_index:i+1,
        field1:ticket.field1,
        field2:ticket.field2,
        ticket_hash:await sha256(ticket),
      });
    }
    const ticketsHash=await sha256(ticketRows.map((t)=>[t.ticket_index,t.ticket_hash]));
    const manifest=strategyKey==="adaptive20" ? await loadManifestForStrategy(s,version.id) : null;
    const run={
      target_draw:targetDraw,
      strategy_version_id:version.id,
      experiment_manifest_id:manifest?.id ?? null,
      training_cutoff:last,
      source_verified_through:last,
      dataset_hash:datasetHash,
      engine_commit_sha:version.engine_commit_sha,
      seed:generated.seed,
      config_hash:version.config_hash,
      tickets_hash:ticketsHash,
      locked_at:new Date().toISOString(),
      provenance:"native_supabase",
      provenance_verified:true,
      metadata:{ engine_release:ENGINE_RELEASE, history_rows:history.length, generation:"pre_draw" },
    };
    const { data:lockRows, error:lockError } = await s.rpc("lotoos_lock_forward_run", {
      p_run:run,
      p_tickets:ticketRows,
    });
    if (lockError) throw new Error(`atomic forward lock failed for ${strategyKey}: ${lockError.message}`);
    const lock=Array.isArray(lockRows) ? lockRows[0] : lockRows;
    if (!lock?.run_id) throw new Error(`atomic forward lock returned no run id for ${strategyKey}`);
    if (lock.created === true) locked.push({strategyKey,targetDraw,runId:lock.run_id,ticketsHash});
  }
  return {targetDraw,locked};
}

async function settleReadyRuns(s:any) {
  // SQL anti-join selects only unsettled runs and appends results transactionally.
  // The legacy query repeatedly selected the oldest 500 runs and stalled permanently.
  const { data, error } = await s.rpc("lotoos_settle_pending_batch", { p_limit: 400 });
  if (error) throw new Error(`SQL settlement batch failed: ${error.message}`);
  return Number(data ?? 0);
}

function mean(values:number[]) { return values.reduce((a,b)=>a+b,0)/Math.max(1,values.length); }

function bootstrapCI(values:number[], resamples:number, seed:number) {
  if (!values.length) return {low:null,high:null};
  const rnd=mulberry32(seed);
  const means=new Array(resamples);
  for (let b=0;b<resamples;b++) {
    let sum=0;
    for (let i=0;i<values.length;i++) sum+=values[Math.floor(rnd()*values.length)];
    means[b]=sum/values.length;
  }
  means.sort((a,b)=>a-b);
  const low=means[Math.floor(0.025*(resamples-1))];
  const high=means[Math.floor(0.975*(resamples-1))];
  return {low,high};
}

function signFlipPValue(values:number[], resamples:number, seed:number) {
  if (!values.length) return null;
  const observed=Math.abs(mean(values));
  const rnd=mulberry32(seed);
  let extreme=0;
  for (let b=0;b<resamples;b++) {
    let sum=0;
    for (const v of values) sum+=(rnd()<0.5?-v:v);
    if (Math.abs(sum/values.length)>=observed) extreme++;
  }
  return (extreme+1)/(resamples+1);
}

async function evaluatePreregistered(s:any, versions:Map<string,StrategyVersion>) {
  const adaptive=versions.get("adaptive20")!;
  const random=versions.get("random")!;
  const manifest=await loadManifestForStrategy(s,adaptive.id);
  if (!manifest) return {status:"no_preregistered_manifest"};

  // Read only verified pre-draw pairs from PostgreSQL. Post-draw locks and
  // reconstructed/backfilled portfolio records never count toward promotion.
  const deltas:number[]=[];
  const usedDraws:number[]=[];
  const pageSize=500;
  for (let offset=0; offset<25000; offset+=pageSize) {
    const {data, error}=await s.rpc("lotoos_forward_paired_samples", {
      p_experiment_key:manifest.experiment_key,
    }).range(offset,offset+pageSize-1);
    if (error) throw new Error(`paired forward evidence read failed: ${error.message}`);
    const rows=Array.isArray(data)?data:[];
    for (const row of rows) {
      const av=Number(row.candidate_best),rv=Number(row.baseline_best);
      if (!Number.isInteger(av)||!Number.isInteger(rv)) continue;
      deltas.push(av-rv);
      usedDraws.push(Number(row.target_draw));
    }
    if (rows.length<pageSize) break;
    if (offset+pageSize>=25000) throw new Error("Forward evidence exceeds 25k rows; explicit pagination extension required");
  }
  const n=deltas.length;
  const min=Number(manifest.min_forward_draws);
  if (n<min) {
    await updateEvidenceState(s,manifest,n,mean(deltas),null,null,null,"insufficient_forward",false);
    return {status:"insufficient_forward",forwardDraws:n,required:min};
  }
  const seed=parseInt((await sha256(`${manifest.id}:${usedDraws.at(-1)}:${n}`)).slice(0,8),16)>>>0;
  const resamples=Math.max(1000,Number(manifest.bootstrap_resamples)||10000);
  const ci=bootstrapCI(deltas,resamples,seed);
  const p=signFlipPValue(deltas,resamples,seed^0x9e3779b9);
  const q=p; // One preregistered primary hypothesis today; BH q equals p. Multi-manifest BH is applied before any future promotion.
  const delta=mean(deltas);
  const promoted=n>=min && ci.low!=null && ci.low>0 && q!=null && q<Number(manifest.alpha);
  const gate=promoted ? "promoted" : (ci.high!=null && ci.high<0 ? "negative" : "no_signal");
  const lastDraw=usedDraws.at(-1)!;
  const {data:prior,error:priorError}=await s.from("evidence_runs")
    .select("id,evaluation_end_draw").eq("experiment_manifest_id",manifest.id)
    .order("calculated_at",{ascending:false}).limit(1).maybeSingle();
  if (priorError) throw new Error(`evidence prior read failed: ${priorError.message}`);
  if (!prior || Number(prior.evaluation_end_draw)!==lastDraw) {
    const {error}=await s.from("evidence_runs").insert({
      experiment_manifest_id:manifest.id,
      strategy_version_id:adaptive.id,
      evaluation_start_draw:usedDraws[0],
      evaluation_end_draw:lastDraw,
      forward_draws:n,
      paired_delta_mean:delta,
      bootstrap_ci_low:ci.low,
      bootstrap_ci_high:ci.high,
      p_value:p,
      q_value:q,
      gate_status:gate,
      promoted,
      dataset_hash:await sha256(usedDraws),
      engine_commit_sha:adaptive.engine_commit_sha,
      metrics:{
        comparator_strategy_version_id:random.id,
        primary_metric:"best_total_matches_per_5_ticket_portfolio",
        bootstrap_resamples:resamples,
        p_value_method:"paired_sign_flip_monte_carlo",
        multiple_testing_method:"BH",
        hypotheses_in_family:1,
      },
    });
    if (error) throw new Error(`evidence insert failed: ${error.message}`);
  }
  await updateEvidenceState(s,manifest,n,delta,ci.low,ci.high,q,gate,promoted);
  return {status:gate,forwardDraws:n,delta,ci,q,promoted};
}

async function updateEvidenceState(s:any, manifest:any, n:number, delta:number|null, low:number|null, high:number|null, q:number|null, gate:string, promoted:boolean) {
  const payload={
    experiment_key:manifest.experiment_key,
    preregistered_at:manifest.preregistered_at,
    forward_draws:n,
    min_forward_draws:Number(manifest.min_forward_draws),
    paired_delta_mean:delta,
    bootstrap_ci95:low==null||high==null?null:[low,high],
    q_value:q,
    alpha:Number(manifest.alpha),
    gate_status:gate,
    promoted,
    methodology:{
      comparison:"paired forward-only vs deterministic Random with identical ticket count",
      ci:manifest.ci_method,
      multiple_testing:manifest.multiple_testing_method,
      no_backfill:true,
    },
    checked_at:new Date().toISOString(),
  };
  const {error}=await s.from("system_state").upsert({key:"forward_evidence_status",payload,updated_at:new Date().toISOString()},{onConflict:"key"});
  if (error) throw new Error(`forward_evidence_status update failed: ${error.message}`);
}

Deno.serve(async (req:Request)=>{
  const s=adminClient();
  const token=req.headers.get("x-lotoos-sync-token")||"";
  if (!await verifySyncToken(s,token)) return Response.json({error:"unauthorized"},{status:401});
  try {
    const history=await loadCanonicalHistory(s);
    const versions=await loadStrategyVersions(s);
    const settled=await settleReadyRuns(s);
    const lock=await lockNextRuns(s,history,versions);
    const evidence=await evaluatePreregistered(s,versions);
    return Response.json({ok:true,engine:ENGINE_RELEASE,canonicalThrough:history.at(-1)!.draw_number,settled,...lock,evidence});
  } catch (error) {
    const message=error instanceof Error?error.message:String(error);
    const failure:Failure={code:"EVIDENCE_PIPELINE_BLOCKED",message:message.slice(0,500)};
    await s.from("system_state").upsert({
      key:"forward_evidence_status",
      payload:{gate_status:"blocked",promoted:false,failure,checked_at:new Date().toISOString()},
      updated_at:new Date().toISOString(),
    },{onConflict:"key"}).catch(()=>undefined);
    return Response.json({ok:false,error:message,code:failure.code},{status:500});
  }
});
