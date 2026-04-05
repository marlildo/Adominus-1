import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const body = await req.json();
    const { action } = body;

    // ── OCR: extract text from image ────────────────────────────────────────
    if (action === "ocr") {
      const { imageBase64 } = body;
      if (!imageBase64) throw new Error("imageBase64 é obrigatório para OCR");

      // Strip data URL prefix if present
      const base64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
      const mimeType = imageBase64.startsWith("data:image/png") ? "image/png" : "image/jpeg";

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: `data:${mimeType};base64,${base64Data}` },
                },
                {
                  type: "text",
                  text: `Extraia TODO o texto desta imagem de página de livro com máxima fidelidade.
Mantenha a estrutura original: parágrafos, quebras de linha, pontuação.
Retorne APENAS o texto extraído, sem comentários adicionais.`,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error("OCR error:", response.status, err);
        throw new Error("Erro ao processar imagem com IA");
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content ?? "";
      return new Response(JSON.stringify({ text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Analyze: generate summary, explanation, ideas, suggestions ──────────
    if (action === "analyze") {
      const { text } = body;
      if (!text) throw new Error("text é obrigatório para análise");

      const systemPrompt = `Você é um assistente de leitura inteligente dentro do app Adominus.
Analise o texto fornecido e responda SEMPRE em português brasileiro.
Retorne um JSON válido com exatamente esta estrutura:
{
  "resumo": "resumo conciso do conteúdo em 2-3 frases",
  "explicacao": "explicação simples e clara do conteúdo para qualquer pessoa entender",
  "ideias": ["ideia principal 1", "ideia principal 2", "ideia principal 3", "ideia principal 4"],
  "sugestoes": ["sugestão de aprendizado 1", "sugestão de aprendizado 2", "sugestão de aprendizado 3"]
}
Retorne APENAS o JSON, sem markdown, sem blocos de código, sem texto adicional.`;

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
            { role: "user", content: `Analise este texto:\n\n${text.slice(0, 8000)}` },
          ],
        }),
      });

      if (!response.ok) {
        if (response.status === 429)
          return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        if (response.status === 402)
          return new Response(JSON.stringify({ error: "Créditos insuficientes no workspace Lovable AI." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        throw new Error("Erro no gateway de IA");
      }

      const data = await response.json();
      let content = data.choices?.[0]?.message?.content ?? "{}";
      // Strip markdown code fences if present
      content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

      let result;
      try {
        result = JSON.parse(content);
      } catch {
        result = {
          resumo: content.slice(0, 300),
          explicacao: "Não foi possível estruturar a explicação.",
          ideias: [],
          sugestoes: [],
        };
      }

      return new Response(JSON.stringify({ result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Study: detailed analysis for study mode ──────────────────────────────
    if (action === "study") {
      const { text } = body;
      if (!text) throw new Error("text é obrigatório para o Modo Estudo");

      const systemPrompt = `Você é um professor e tutor inteligente dentro do app Adominus.
Analise o texto e crie um material de estudo completo em português brasileiro.
Retorne um JSON válido com exatamente esta estrutura:
{
  "resumo_detalhado": "resumo detalhado do conteúdo em 4-6 frases completas",
  "explicacao_simplificada": "explicação simplificada como se fosse para um aluno do ensino médio",
  "pontos_importantes": ["ponto 1", "ponto 2", "ponto 3", "ponto 4", "ponto 5"],
  "perguntas": ["Pergunta de estudo 1?", "Pergunta de estudo 2?", "Pergunta de estudo 3?", "Pergunta de estudo 4?"]
}
Retorne APENAS o JSON, sem markdown, sem blocos de código, sem texto adicional.`;

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
            { role: "user", content: `Crie material de estudo para este texto:\n\n${text.slice(0, 8000)}` },
          ],
        }),
      });

      if (!response.ok) {
        if (response.status === 429)
          return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        if (response.status === 402)
          return new Response(JSON.stringify({ error: "Créditos insuficientes no workspace Lovable AI." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        throw new Error("Erro no gateway de IA");
      }

      const data = await response.json();
      let content = data.choices?.[0]?.message?.content ?? "{}";
      content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

      let result;
      try {
        result = JSON.parse(content);
      } catch {
        result = {
          resumo_detalhado: content.slice(0, 400),
          explicacao_simplificada: "Não foi possível estruturar a explicação.",
          pontos_importantes: [],
          perguntas: [],
        };
      }

      return new Response(JSON.stringify({ result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Ação desconhecida: ${action}`);
  } catch (e) {
    console.error("leitor-ia error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
