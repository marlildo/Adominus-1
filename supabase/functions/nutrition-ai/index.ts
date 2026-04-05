import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Shared tool definition for both text and vision analysis
const analyzeNutritionTool = {
  type: "function",
  function: {
    name: "analyze_nutrition",
    description: "Retorna a análise nutricional completa da refeição descrita ou fotografada.",
    parameters: {
      type: "object",
      properties: {
        meal_name: {
          type: "string",
          description: "Nome descritivo e resumido da refeição (máx 60 chars)",
        },
        calories: {
          type: "number",
          description: "Calorias totais estimadas em kcal",
        },
        protein: {
          type: "number",
          description: "Proteína total em gramas",
        },
        carbs: {
          type: "number",
          description: "Carboidratos totais em gramas",
        },
        fat: {
          type: "number",
          description: "Gorduras totais em gramas",
        },
        fiber: {
          type: "number",
          description: "Fibras em gramas (opcional)",
        },
        detected_items: {
          type: "array",
          items: { type: "string" },
          description: "Lista dos alimentos identificados na foto (apenas para análise de imagem)",
        },
        confidence: {
          type: "string",
          enum: ["high", "medium", "low"],
          description: "Nível de confiança na estimativa",
        },
        notes: {
          type: "string",
          description: "Observação curta sobre a análise",
        },
      },
      required: ["meal_name", "calories", "protein", "carbs", "fat", "confidence"],
      additionalProperties: false,
    },
  },
};

function handleRateLimitErrors(response: Response) {
  if (response.status === 429) {
    return new Response(
      JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  if (response.status === 402) {
    return new Response(
      JSON.stringify({ error: "Créditos insuficientes no Lovable AI." }),
      { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { description, imageBase64, mimeType } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // ── IMAGE (Vision) path ──────────────────────────────────────
    if (imageBase64 && mimeType) {
      const visionSystemPrompt = `Você é um nutricionista especialista em análise visual de refeições.
Analise a FOTO da refeição fornecida e identifique TODOS os alimentos visíveis no prato ou na cena.
Estime as porções com base no tamanho visual relativo dos alimentos na imagem.
Use tabelas nutricionais oficiais (TACO, USDA) como base para os cálculos.
Seja preciso: analise cores, texturas, formas e contexto visual para identificar cada item.
Se o prato contiver múltiplos alimentos, some todos os valores nutricionais.
Retorne todos os alimentos detectados, os macros completos e as calorias totais estimadas.
Sempre retorne valores em números inteiros ou com no máximo 1 casa decimal.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: visionSystemPrompt },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: `data:${mimeType};base64,${imageBase64}` },
                },
                {
                  type: "text",
                  text: "Analise esta foto de refeição. Identifique todos os alimentos visíveis, estime as porções e retorne a composição nutricional completa.",
                },
              ],
            },
          ],
          tools: [analyzeNutritionTool],
          tool_choice: { type: "function", function: { name: "analyze_nutrition" } },
        }),
      });

      const rateLimitError = handleRateLimitErrors(response);
      if (rateLimitError) return rateLimitError;

      if (!response.ok) {
        const txt = await response.text();
        console.error("AI gateway vision error:", response.status, txt);
        return new Response(JSON.stringify({ error: "Erro ao analisar imagem com IA" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) {
        return new Response(JSON.stringify({ error: "Resposta inválida da IA para imagem" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── TEXT path ────────────────────────────────────────────────
    if (!description || typeof description !== "string") {
      return new Response(JSON.stringify({ error: "description ou imageBase64+mimeType é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é um nutricionista especialista em composição nutricional de alimentos brasileiros e internacionais.
Analise a descrição de uma refeição fornecida pelo usuário e retorne os valores nutricionais estimados com precisão.
Use como base tabelas nutricionais oficiais (TACO, USDA).
Considere porções realistas e típicas para cada alimento mencionado.
Se o usuário não especificar a quantidade, assuma uma porção média/comum.
Sempre retorne valores em números inteiros ou com no máximo 1 casa decimal.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analise esta refeição e retorne a composição nutricional: "${description}"` },
        ],
        tools: [analyzeNutritionTool],
        tool_choice: { type: "function", function: { name: "analyze_nutrition" } },
      }),
    });

    const rateLimitError = handleRateLimitErrors(response);
    if (rateLimitError) return rateLimitError;

    if (!response.ok) {
      const txt = await response.text();
      console.error("AI gateway error:", response.status, txt);
      return new Response(JSON.stringify({ error: "Erro ao consultar IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(JSON.stringify({ error: "Resposta inválida da IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("nutrition-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
