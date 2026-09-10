import { NextResponse } from "next/server";
import { rateLimit, safeEqual } from "@/lib/rate-limit";
import { getServiceClient } from "@/lib/supabase/server";
import {
  validateCapturePayload,
  type CaptureResult,
  type CapturePayload,
} from "@/lib/integrations/extension";
import { domainFromUrl, guessDomain, parseJobUrl } from "@/lib/job-url";

/**
 * Capture endpoint for the browser extension.
 *
 * `POST /api/capture` with `Authorization: Bearer <APPLYOS_CAPTURE_TOKEN>` and a
 * `CapturePayload` body. Guarded by a shared secret and a rate limit, validated
 * server-side, and written straight to Postgres.
 *
 * Requires Supabase: a workspace stored in the browser's IndexedDB isn't
 * reachable from a server route, so the endpoint says so plainly rather than
 * pretending to succeed.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMIT = 30;
const WINDOW_MS = 60_000;

const fail = (status: number, error: string) =>
  NextResponse.json<CaptureResult>({ ok: false, error }, { status });

export async function POST(request: Request) {
  const token = process.env.APPLYOS_CAPTURE_TOKEN;
  if (!token) {
    return fail(501, "Capture is disabled. Set APPLYOS_CAPTURE_TOKEN to enable it.");
  }

  const header = request.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!presented || !safeEqual(presented, token)) {
    return fail(401, "Invalid or missing token");
  }

  // Keyed on the token so a leaked secret can't be used to hammer the database.
  const limit = rateLimit(`capture:${presented.slice(0, 12)}`, LIMIT, WINDOW_MS);
  if (!limit.allowed) {
    return NextResponse.json<CaptureResult>(
      { ok: false, error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } },
    );
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return fail(
      501,
      "Capture needs Supabase. A local IndexedDB workspace can't be written to from the server.",
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Body must be valid JSON");
  }

  const validated = validateCapturePayload(body);
  if (!validated.ok) return fail(400, validated.error);
  const payload = validated.value;

  try {
    const companyId = await findOrCreateCompany(supabase, payload);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const parsed = parseJobUrl(payload.url);
    const position = payload.position ?? parsed.position ?? "Untitled role";

    if (payload.target === "application") {
      const { error } = await supabase.from("applications").insert({
        id,
        created_at: now,
        updated_at: now,
        company_id: companyId,
        position,
        job_url: payload.url,
        location: payload.location ?? null,
        work_mode: payload.workMode ?? parsed.workMode ?? null,
        salary: payload.salary ?? { min: null, max: null, currency: "USD", period: "year" },
        applied_at: payload.alreadyApplied ? now.slice(0, 10) : null,
        deadline: payload.deadline ?? null,
        status: payload.alreadyApplied ? "applied" : "preparing",
        priority: "medium",
        source: payload.source ?? parsed.source ?? null,
        description: payload.description ?? null,
        notes: payload.notes ?? null,
        resume_id: payload.resumeId ?? null,
      });
      if (error) throw new Error(error.message);

      await supabase.from("activities").insert({
        id: crypto.randomUUID(),
        created_at: now,
        updated_at: now,
        type: "application_created",
        entity_type: "application",
        entity_id: id,
        title: `Captured ${position}`,
        meta: { via: "extension" },
        occurred_at: now,
      });

      return NextResponse.json<CaptureResult>({ ok: true, id, kind: "application" });
    }

    const { error } = await supabase.from("jobs").insert({
      id,
      created_at: now,
      updated_at: now,
      title: position,
      company_id: companyId,
      url: payload.url,
      salary: payload.salary ?? { min: null, max: null, currency: "USD", period: "year" },
      location: payload.location ?? null,
      work_mode: payload.workMode ?? parsed.workMode ?? null,
      description: payload.description ?? null,
      skills: payload.skills ?? [],
      deadline: payload.deadline ?? null,
      source: payload.source ?? parsed.source ?? null,
      saved_at: now,
      notes: payload.notes ?? null,
      status: "saved",
    });
    if (error) throw new Error(error.message);

    return NextResponse.json<CaptureResult>({ ok: true, id, kind: "job" });
  } catch (error) {
    return fail(500, error instanceof Error ? error.message : "Capture failed");
  }
}

/** Matches on normalised name so the extension doesn't create duplicates. */
async function findOrCreateCompany(
  supabase: NonNullable<ReturnType<typeof getServiceClient>>,
  payload: CapturePayload,
): Promise<string> {
  const parsed = parseJobUrl(payload.url);
  const name = (payload.company ?? parsed.company ?? "Unknown company").trim();

  const { data } = await supabase.from("companies").select("id, name").ilike("name", name).limit(1);
  if (data && data.length > 0) return data[0].id as string;

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const { error } = await supabase.from("companies").insert({
    id,
    created_at: now,
    updated_at: now,
    name,
    domain: domainFromUrl(payload.url) ?? guessDomain(name),
  });
  if (error) throw new Error(error.message);
  return id;
}

/** Lets the extension check its token and the server's contract version. */
export async function GET() {
  const enabled = Boolean(process.env.APPLYOS_CAPTURE_TOKEN) && Boolean(getServiceClient());
  return NextResponse.json({ ok: true, captureEnabled: enabled, version: 1 });
}
