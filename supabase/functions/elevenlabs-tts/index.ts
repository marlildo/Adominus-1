import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY não configurada");

    const { action, text, voiceId, speed } = await req.json();

    // ── List voices ────────────────────────────────────────────────────────
    if (action === "list_voices") {
      const response = await fetch("https://api.elevenlabs.io/v1/voices", {
        headers: { "xi-api-key": ELEVENLABS_API_KEY },
      });
      if (!response.ok) throw new Error(`ElevenLabs API error: ${response.status}`);
      const data = await response.json();
      return new Response(JSON.stringify({ voices: data.voices }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── TTS generation ─────────────────────────────────────────────────────
    if (action === "tts") {
      if (!text) throw new Error("text é obrigatório");
      const vId = voiceId || "CwhRBWXzGAHq8TQ4Fs17"; // Roger (default)
      const ttsSpeed = Math.min(1.2, Math.max(0.7, speed ?? 1.0));

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${vId}?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: text.slice(0, 5000),
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.0,
              use_speaker_boost: true,
              speed: ttsSpeed,
            },
          }),
        }
      );

      if (!response.ok) {
        const err = await response.text();
        console.error("ElevenLabs TTS error:", response.status, err);
        if (response.status === 401) throw new Error("API key inválida");
        if (response.status === 422) throw new Error("Texto inválido ou muito longo");
        throw new Error(`Erro ElevenLabs: ${response.status}`);
      }

      const audioBuffer = await response.arrayBuffer();
      return new Response(audioBuffer, {
        headers: { ...corsHeaders, "Content-Type": "audio/mpeg" },
      });
    }

    throw new Error(`Ação desconhecida: ${action}`);
  } catch (e) {
    console.error("elevenlabs-tts error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
