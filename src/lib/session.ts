// Client-side helpers for "join with code" remote group sessions.
// Uses the anon Supabase client; tables have permissive RLS because the
// anonymous group flow has no user identity by design.
import { supabase } from "@/integrations/supabase/client";
import type { MemberPrefs } from "./recommend";

function makeCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I confusion
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export type SessionRow = {
  id: string;
  code: string;
  theme: string;
  city: string | null;
  state: string | null;
  expected_size: number;
};

export async function createSession(opts: {
  theme: string; city?: string; state?: string; expectedSize: number;
}): Promise<SessionRow> {
  // Try a few codes in case of collision.
  for (let i = 0; i < 5; i++) {
    const code = makeCode();
    const { data, error } = await supabase
      .from("group_sessions")
      .insert({
        code,
        theme: opts.theme,
        city: opts.city ?? null,
        state: opts.state ?? null,
        expected_size: opts.expectedSize,
      })
      .select("id, code, theme, city, state, expected_size")
      .single();
    if (!error && data) return data as SessionRow;
  }
  throw new Error("Could not create session — please retry");
}

export async function getSessionByCode(code: string): Promise<SessionRow | null> {
  const { data, error } = await supabase
    .from("group_sessions")
    .select("id, code, theme, city, state, expected_size")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (error) return null;
  return (data as SessionRow | null) ?? null;
}

export async function submitToSession(sessionId: string, prefs: MemberPrefs): Promise<void> {
  const { error } = await supabase.from("group_submissions").insert({
    session_id: sessionId,
    cuisines: prefs.cuisines,
    budget_max: prefs.budgetMax,
    allergies: prefs.allergies,
  });
  if (error) throw error;
}

export async function listSubmissions(sessionId: string): Promise<MemberPrefs[]> {
  const { data, error } = await supabase
    .from("group_submissions")
    .select("cuisines, budget_max, allergies")
    .eq("session_id", sessionId);
  if (error || !data) return [];
  return (data as Array<{ cuisines: string[]; budget_max: number; allergies: string[] }>).map((d) => ({
    cuisines: d.cuisines ?? [],
    budgetMax: d.budget_max,
    allergies: d.allergies ?? [],
  }));
}

export async function deleteSession(sessionId: string): Promise<void> {
  await supabase.from("group_sessions").delete().eq("id", sessionId);
}
