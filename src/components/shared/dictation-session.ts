type Result = { isFinal: boolean; 0: { transcript: string } };
export type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<Result> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  onaudiostart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onnomatch: (() => void) | null;
  start: () => void; stop: () => void; abort: () => void;
};

export type DictationPhase = "starting" | "listening" | "recognizing" | "stopping";

/** Keep interim text and allow stop() to deliver the browser's pending final result. */
export function createDictationSession(service: Recognition, initial: string, callbacks: {
  change: (text: string) => void; end: () => void; error: (code: string) => void;
  phase?: (phase: DictationPhase) => void;
}) {
  let finished = false;
  let stopping = false;
  let hasText = false;
  let audioStarted = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const detach = () => {
    service.onresult = null; service.onerror = null; service.onend = null;
    service.onaudiostart = null; service.onspeechstart = null; service.onnomatch = null;
  };
  const abort = () => { try { service.abort(); } catch { /* Already ended. */ } };
  const noTextError = () => audioStarted ? "no-result" : "microphone-timeout";
  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    detach();
    callbacks.end();
  };
  const deadline = (milliseconds: number) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!hasText) callbacks.error(noTextError());
      finish();
      abort();
    }, milliseconds);
  };
  service.lang = "es-EC";
  service.continuous = true;
  service.interimResults = true;
  service.onaudiostart = () => {
    if (finished || stopping) return;
    audioStarted = true;
    callbacks.phase?.("listening");
    deadline(20000);
  };
  service.onspeechstart = () => {
    if (!finished && !stopping) callbacks.phase?.("recognizing");
  };
  service.onnomatch = () => {
    if (finished) return;
    callbacks.error("no-speech");
    finish();
    abort();
  };
  service.onresult = event => {
    if (finished) return;
    // Rebuild from the session's result list to replace interim revisions without duplication.
    const segments: string[] = [];
    for (let i = 0; i < event.results.length; i++) segments.push(event.results[i][0].transcript.trim());
    const speech = segments.filter(Boolean).join(" ");
    if (speech) {
      hasText = true;
      // Do not extend the bounded stop deadline when a late result arrives.
      if (!stopping) clearTimeout(timer);
      callbacks.change(initial + (initial && !/\s$/.test(initial) ? " " : "") + speech);
    }
  };
  service.onerror = event => {
    if (finished) return;
    if (event.error !== "aborted") callbacks.error(event.error);
    finish();
    abort();
  };
  service.onend = () => {
    if (finished) return;
    if (!hasText) callbacks.error(noTextError());
    finish();
  };
  return {
    start() {
      if (finished) return;
      callbacks.phase?.("starting");
      deadline(20000);
      try { service.start(); }
      catch { callbacks.error("start-failed"); finish(); abort(); }
    },
    stop() {
      if (finished || stopping) return;
      stopping = true;
      callbacks.phase?.("stopping");
      // Keep handlers alive for final-only browsers, but never leave the form locked.
      deadline(4000);
      try { service.stop(); }
      catch { if (!hasText) callbacks.error(noTextError()); finish(); abort(); }
    },
    dispose() {
      finished = true;
      clearTimeout(timer);
      detach();
      abort();
    },
  };
}
