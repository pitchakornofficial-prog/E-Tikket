// Scanner sensory feedback: Web Audio chime, Haptic vibration, and Torch controls

export function playBeep(type: "success" | "error" | "warning", isMuted: boolean = false) {
  if (isMuted || typeof window === "undefined") return;

  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "success") {
      // Pleasant rising chime
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
    } else {
      // Low dual warning buzzer
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.linearRampToValueAtTime(150, now + 0.28);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc.start(now);
      osc.stop(now + 0.32);
    }
  } catch {
    // Graceful fallback if autoplay restrictions or sound card unavailable
  }
}

export function triggerHaptic(type: "success" | "error" | "warning") {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;

  try {
    if (type === "success") {
      navigator.vibrate(120);
    } else {
      // Double pulse alert
      navigator.vibrate([140, 80, 240]);
    }
  } catch {
    // Ignore if vibration disallowed
  }
}

export function checkTorchCapability(stream: MediaStream | null): boolean {
  if (!stream) return false;
  const track = stream.getVideoTracks()[0];
  if (!track) return false;

  try {
    // Check if getCapabilities is available and supports torch
    const getCaps = (track as unknown as { getCapabilities?: () => { torch?: boolean } }).getCapabilities;
    if (typeof getCaps === "function") {
      const capabilities = getCaps.call(track);
      return Boolean(capabilities?.torch);
    }
  } catch {
    // Ignore
  }
  return false;
}

export async function setTorchEnabled(stream: MediaStream | null, enabled: boolean): Promise<boolean> {
  if (!stream) return false;
  const track = stream.getVideoTracks()[0];
  if (!track) return false;

  try {
    const applyConstraints = (
      track as unknown as {
        applyConstraints?: (constraints: { advanced?: Array<{ torch?: boolean }> }) => Promise<void>;
      }
    ).applyConstraints;

    if (typeof applyConstraints === "function") {
      await applyConstraints.call(track, {
        advanced: [{ torch: enabled }],
      });
      return true;
    }
  } catch {
    // Torch constraint unsupported or failed
  }
  return false;
}
