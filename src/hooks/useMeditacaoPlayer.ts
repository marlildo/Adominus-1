import { useState, useRef, useCallback, useEffect } from "react";

export type PlayerState = "idle" | "loading" | "playing" | "paused" | "error";

interface PlayerItem {
  id: string;
  text: string;
  voiceId?: string;
}

export function useMeditacaoPlayer() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [state, setState] = useState<PlayerState>("idle");
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [playingTitle, setPlayingTitle] = useState<string>("");

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const estimatedDurationRef = useRef<number>(0);

  // Estimate duration based on text length (avg ~130 words/min at 0.82 speed)
  const estimateDuration = (text: string) => {
    const words = text.split(/\s+/).length;
    return Math.ceil((words / 130) * 60 / 0.82);
  };

  const cleanup = useCallback(() => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setProgress(0);
    setDuration(0);
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const startProgressTracker = useCallback((totalSeconds: number) => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    startTimeRef.current = Date.now();
    estimatedDurationRef.current = totalSeconds;
    setDuration(totalSeconds);

    progressIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const frac = Math.min(elapsed / totalSeconds, 1);
      setProgress(frac);
      if (frac >= 1 && progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }, 250);
  }, []);

  const getBestPortugueseVoice = (): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices();
    // Priority: pt-BR > pt > any Portuguese
    return (
      voices.find(v => v.lang === "pt-BR") ||
      voices.find(v => v.lang.startsWith("pt")) ||
      voices.find(v => v.lang.startsWith("es")) || // Spanish as fallback
      null
    );
  };

  const play = useCallback(async (item: PlayerItem & { title: string }, _voiceId?: string) => {
    if (!window.speechSynthesis) {
      setState("error");
      setErrorMsg("Síntese de voz não suportada neste navegador");
      return;
    }

    // Toggle pause/resume
    if (playingId === item.id) {
      if (state === "playing") {
        window.speechSynthesis.pause();
        setState("paused");
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      } else if (state === "paused") {
        window.speechSynthesis.resume();
        setState("playing");
        // Resume progress tracker
        const remaining = estimatedDurationRef.current * (1 - progress);
        const resumeStart = Date.now();
        const progressAtResume = progress;
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = setInterval(() => {
          const elapsed = (Date.now() - resumeStart) / 1000;
          const frac = Math.min(progressAtResume + elapsed / estimatedDurationRef.current, 1);
          setProgress(frac);
          if (frac >= 1 && progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        }, 250);
      }
      return;
    }

    // Stop current
    cleanup();
    setErrorMsg(null);
    setPlayingId(item.id);
    setPlayingTitle(item.title);
    setState("loading");

    try {
      // Wait for voices to load if not ready
      let voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) {
        await new Promise<void>(resolve => {
          const handler = () => { resolve(); window.speechSynthesis.removeEventListener("voiceschanged", handler); };
          window.speechSynthesis.addEventListener("voiceschanged", handler);
          setTimeout(resolve, 1500); // fallback timeout
        });
        voices = window.speechSynthesis.getVoices();
      }

      const utterance = new SpeechSynthesisUtterance(item.text);
      utterance.rate = 0.82;
      utterance.pitch = 0.95;
      utterance.volume = volume;
      utterance.lang = "pt-BR";

      const voice = getBestPortugueseVoice();
      if (voice) utterance.voice = voice;

      const estDuration = estimateDuration(item.text);

      utterance.onstart = () => {
        setState("playing");
        startProgressTracker(estDuration);
      };

      utterance.onend = () => {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        setState("idle");
        setPlayingId(null);
        setPlayingTitle("");
        setProgress(0);
        setDuration(0);
      };

      utterance.onerror = (e) => {
        if (e.error === "interrupted" || e.error === "canceled") return;
        console.error("[Meditacao TTS]", e);
        setState("error");
        setErrorMsg("Erro ao reproduzir áudio");
        setPlayingId(null);
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
      setState("loading");
    } catch (e) {
      console.error("[Meditacao TTS]", e);
      setState("error");
      setErrorMsg(e instanceof Error ? e.message : "Erro desconhecido");
      setPlayingId(null);
    }
  }, [playingId, state, volume, progress, cleanup, startProgressTracker]);

  const stop = useCallback(() => {
    cleanup();
    setState("idle");
    setPlayingId(null);
    setPlayingTitle("");
    setErrorMsg(null);
  }, [cleanup]);

  const seekTo = useCallback((_fraction: number) => {
    // Web Speech API doesn't support seeking — no-op
  }, []);

  const changeVolume = useCallback((v: number) => {
    setVolume(v);
    if (utteranceRef.current) utteranceRef.current.volume = v;
  }, []);

  return { playingId, state, progress, duration, volume, errorMsg, playingTitle, play, stop, seekTo, changeVolume };
}
