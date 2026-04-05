import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, financialContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build context string from user's financial data
    const ctx = financialContext ?? {};
    const totalReceita: number = ctx.totalReceita ?? 0;
    const totalDespesa: number = ctx.totalDespesa ?? 0;
    const saldo: number = totalReceita - totalDespesa;
    const todaySpent: number = ctx.todaySpent ?? 0;
    const todayIncome: number = ctx.todayIncome ?? 0;
    const transactions: Array<{ title: string; amount: number; type: string; category: string; date: string }> = ctx.transactions ?? [];
    const commitments: Array<{ title: string; amount: number; dueDay: number; category: string }> = ctx.commitments ?? [];
    const budgetGoals: Array<{ categoryId: string; limit: number; spent: number }> = ctx.budgetGoals ?? [];
    const today: string = ctx.today ?? new Date().toISOString().split("T")[0];

    const recentTx = transactions
      .slice(0, 20)
      .map((t) => `  - ${t.date} | ${t.type === "receita" ? "+" : "-"}R$${t.amount.toFixed(2)} | ${t.title} (${t.category})`)
      .join("\n") || "  (nenhuma transação registrada)";

    const commitmentsText = commitments.length
      ? commitments.map((c) => `  - ${c.title}: R$${c.amount.toFixed(2)} - vence dia ${c.dueDay}`).join("\n")
      : "  (nenhum compromisso cadastrado)";

    const budgetText = budgetGoals.length
      ? budgetGoals.map((g) => `  - ${g.categoryId}: gasto R$${g.spent.toFixed(2)} de R$${g.limit.toFixed(2)}`).join("\n")
      : "  (nenhuma meta de orçamento definida)";

    const SYSTEM_PROMPT = `Você é o Finance Assistant do Adominus — um assessor financeiro pessoal inteligente, direto e estratégico.

IDIOMA: Sempre responda em Português Brasileiro.

CONTEXTO FINANCEIRO DO USUÁRIO (atualizado em tempo real):
📅 Data de hoje: ${today}
💰 Receita do mês: R$${totalReceita.toFixed(2)}
💸 Despesas do mês: R$${totalDespesa.toFixed(2)}
📊 Saldo atual: R$${saldo.toFixed(2)} (${saldo >= 0 ? "POSITIVO ✅" : "NEGATIVO ⚠️"})
🌅 Gasto hoje: R$${todaySpent.toFixed(2)}
🌅 Recebido hoje: R$${todayIncome.toFixed(2)}

TRANSAÇÕES RECENTES:
${recentTx}

COMPROMISSOS FIXOS:
${commitmentsText}

METAS DE ORÇAMENTO:
${budgetText}

SUAS CAPACIDADES:
1. Responder perguntas financeiras usando os dados acima com precisão.
2. Identificar quando o usuário quer REGISTRAR uma transação — então extraia e retorne um JSON de ação no formato exato:
   <ACTION>{"type":"register_transaction","data":{"title":"...","amount":0,"type":"receita|despesa","category":"food|transport|bills|salary|shopping|entertainment|housing|subscriptions|investments|others"}}</ACTION>
3. Identificar quando o usuário quer REGISTRAR um compromisso fixo:
   <ACTION>{"type":"register_commitment","data":{"title":"...","amount":0,"dueDay":1,"category":"bills"}}</ACTION>
4. Analisar padrões de gasto e dar insights financeiros.
5. Calcular projeções, verificar saldo, resumir categorias.

QUANDO REGISTRAR TRANSAÇÃO:
- "Paguei 30 de gasolina" → despesa, transport, 30
- "Recebi 10 mil de salário" → receita, salary, 10000
- "Gastei 150 no mercado" → despesa, food, 150
- Sempre confirme o registro na resposta de forma natural.

QUANDO REGISTRAR COMPROMISSO:
- "Tenho 2 mil de aluguel dia 22" → compromisso: Aluguel, 2000, dia 22

ESTILO DE RESPOSTA:
- Direto ao ponto
- Use emojis financeiros ocasionalmente (💰💸📊✅⚠️)
- Para perguntas de saldo/gastos: mostre os números claramente
- Máximo 4 linhas por resposta, a menos que seja um relatório completo
- Tom: consultor financeiro profissional mas acessível`;

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
          JSON.stringify({ error: "Créditos insuficientes. Acesse as configurações do workspace." }),
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
    console.error("finance-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
