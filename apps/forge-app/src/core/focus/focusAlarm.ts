/**
 * Focus Mode Alarm & Chime Audio Synthesizer
 * Synthesizes high-clarity bell chimes and alarm fanfares using Web Audio API.
 * Operates without external audio files and triggers when the focus countdown completes.
 */

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!sharedAudioContext || sharedAudioContext.state === "closed") {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    sharedAudioContext = new AudioCtx();
  }
  if (sharedAudioContext.state === "suspended") {
    sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
}

interface NoteSpec {
  freq: number;
  duration: number; // in seconds
  gain: number;
}

/**
 * Synthesizes a single bell tone with harmonic overtones and smooth exponential decay.
 */
function playChimeNote(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  volume = 0.35
) {
  // Fundamental oscillator (sine)
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();

  // Harmonic overtone (2nd harmonic / sparkle)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();

  osc1.type = "sine";
  osc1.frequency.setValueAtTime(freq, startTime);

  osc2.type = "triangle";
  osc2.frequency.setValueAtTime(freq * 2.02, startTime); // slight detune for metallic bell warmth

  // Fundamental gain envelope: crisp attack, natural bell decay
  gain1.gain.setValueAtTime(0, startTime);
  gain1.gain.linearRampToValueAtTime(volume, startTime + 0.015);
  gain1.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  // Overtone gain envelope: fast sparkle decay
  gain2.gain.setValueAtTime(0, startTime);
  gain2.gain.linearRampToValueAtTime(volume * 0.3, startTime + 0.01);
  gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.5);

  osc1.connect(gain1);
  gain1.connect(ctx.destination);

  osc2.connect(gain2);
  gain2.connect(ctx.destination);

  osc1.start(startTime);
  osc2.start(startTime);

  osc1.stop(startTime + duration + 0.05);
  osc2.stop(startTime + duration + 0.05);
}

/**
 * Plays the triumphant focus session completion alarm (4-tone fanfare, repeated 2 times).
 */
export async function playFocusAlarmSound(type: "focus_complete" | "break_complete" = "focus_complete"): Promise<void> {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime + 0.05;

    if (type === "focus_complete") {
      // Fanfare: C5 (523Hz), E5 (659Hz), G5 (784Hz), C6 (1046Hz)
      const fanfare: NoteSpec[] = [
        { freq: 523.25, duration: 0.18, gain: 0.35 },
        { freq: 659.25, duration: 0.18, gain: 0.38 },
        { freq: 783.99, duration: 0.22, gain: 0.42 },
        { freq: 1046.50, duration: 0.75, gain: 0.48 },
      ];

      // Play sequence twice
      for (let round = 0; round < 2; round++) {
        const roundStart = now + round * 1.35;
        let noteTime = roundStart;

        for (const note of fanfare) {
          playChimeNote(ctx, note.freq, noteTime, note.duration, note.gain);
          noteTime += 0.2;
        }
      }
    } else {
      // Break complete: gentle reminder bell: G5 (784Hz), E5 (659Hz), C5 (523Hz)
      const breakChimes: NoteSpec[] = [
        { freq: 783.99, duration: 0.25, gain: 0.32 },
        { freq: 659.25, duration: 0.25, gain: 0.32 },
        { freq: 523.25, duration: 0.65, gain: 0.36 },
      ];

      for (let round = 0; round < 2; round++) {
        const roundStart = now + round * 1.2;
        let noteTime = roundStart;

        for (const note of breakChimes) {
          playChimeNote(ctx, note.freq, noteTime, note.duration, note.gain);
          noteTime += 0.25;
        }
      }
    }
  } catch (err) {
    console.warn("Focus alarm sound could not play:", err);
  }
}

/**
 * Preview / test the alarm sound immediately
 */
export function testFocusAlarmSound(): void {
  playFocusAlarmSound("focus_complete");
}
