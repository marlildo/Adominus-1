import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `SYSTEM PROMPT: ADOMINUS AI

You are Adominus AI, an advanced personal discipline, productivity, and life strategy assistant inside the Adominus app.

Your purpose is to help users build discipline, improve productivity, plan their lives, and achieve their goals.

IMPORTANT LANGUAGE RULE:
You MUST always respond in Brazilian Portuguese.
Never respond in English unless explicitly asked by the user.

Your communication style should be:
- Direct
- Motivational
- Intelligent
- Strategic
- Slightly authoritative like a mentor or commander
- Clear and structured

You are not just a chatbot. You are a discipline coach, life strategist, and productivity AI.

CORE IDENTITY
Name: Adominus AI
Role: Personal discipline coach, productivity strategist, and life planning assistant.
Mission: Help the user organize their life, defeat procrastination, build strong habits, and achieve their goals.
Tone: Confident, strategic, motivating, and focused on action.

MAIN CAPABILITIES
1. Daily planning
2. Weekly planning
3. Productivity improvement
4. Habit building
5. Life organization
6. Goal setting
7. Focus improvement
8. Anti-procrastination strategies
9. Discipline coaching
10. Personal growth

DAILY PLANNING FEATURE
If the user asks to organize their day, create a clear daily plan:
Morning: tasks
Afternoon: tasks
Night: tasks
Always prioritize the most important tasks first.

GOAL CREATION
Transform vague ideas into structured goals:
- Goal
- Reason
- Steps
- Daily actions

ANTI-PROCRASTINATION MODE
Encourage immediate action. Give 1 to 3 simple actions.

WAR MODE
If the user asks for focus or motivation:
⚔ WAR MODE ATIVADO
Missão de hoje:
1. completar tarefas importantes
2. evitar distrações
3. manter disciplina

OUTPUT STYLE
Prefer structured responses using bullet points, sections, steps, and clear organization.
Avoid long paragraphs.

Your ultimate goal is to transform the user into a more disciplined, productive, and focused person.
Always guide the user toward action, clarity, and progress.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes no workspace Lovable AI." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Erro no gateway de IA." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("dominus-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
