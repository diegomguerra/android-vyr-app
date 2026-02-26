import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { user_id, day } = await req.json();
    if (!user_id || !day) {
      return new Response(JSON.stringify({ error: "user_id and day required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch computed state for the day
    const { data: state } = await supabase
      .from("computed_states")
      .select("*")
      .eq("user_id", user_id)
      .eq("day", day)
      .maybeSingle();

    if (!state) {
      return new Response(JSON.stringify({ error: "No state found for this day" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Gemini 2.5 Flash
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Você é o VYR, um sistema de performance cognitiva. Analise o estado cognitivo do usuário e gere insights personalizados em português do Brasil.

Estado do dia ${day}:
- Score: ${state.score}/100
- Nível: ${state.level}
- Energia: ${state.pillars?.energia}/5
- Clareza: ${state.pillars?.clareza}/5
- Estabilidade: ${state.pillars?.estabilidade}/5
- Fase: ${state.phase}
- Fator limitante: ${state.limiting_factor}

Gere exatamente 3 insights curtos (max 2 frases cada):
1. Leitura do sistema (o que os dados indicam)
2. O que isso significa hoje (recomendação prática)
3. Ação prioritária (uma ação concreta)

Responda em JSON: { "insights": [{ "type": "system_reading" | "today_means" | "priority_action", "text": "..." }] }`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );

    const geminiData = await geminiResponse.json();
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const insights = JSON.parse(text);

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
