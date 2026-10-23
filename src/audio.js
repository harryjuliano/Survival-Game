// Original synthesized ambience: no external recording or autoplay.
export function createAudio(button) {
  let enabled = false,
    context,
    bus,
    waveGain,
    windGain,
    lastChirp = 0;
  function init() {
    context = new (window.AudioContext || window.webkitAudioContext)();
    bus = context.createGain();
    bus.gain.value = 0;
    bus.connect(context.destination);
    const length = context.sampleRate * 8,
      buffer = context.createBuffer(1, length, context.sampleRate),
      data = buffer.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < length; i++) {
      brown = (brown + Math.random() * 0.04 - 0.02) / 1.02;
      data[i] = brown * 6;
    }
    function noise(freq) {
      const s = context.createBufferSource();
      s.buffer = buffer;
      s.loop = true;
      const f = context.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = freq;
      const g = context.createGain();
      s.connect(f);
      f.connect(g);
      g.connect(bus);
      s.start();
      return g;
    }
    waveGain = noise(650);
    windGain = noise(2000);
    windGain.gain.value = 0.04;
  }
  button.onclick = async () => {
    try {
      if (!context) init();
      enabled = !enabled;
      if (enabled) await context.resume();
      bus.gain.setTargetAtTime(enabled ? 0.3 : 0, context.currentTime, 0.25);
      button.textContent = enabled ? "♫ Suara: aktif" : "♫ Suara: mati";
    } catch (e) {
      button.textContent = "Audio tidak tersedia";
      console.warn(e);
    }
  };
  document.addEventListener("visibilitychange", () => {
    if (!context) return;
    if (document.hidden) context.suspend();
    else if (enabled) context.resume();
  });
  return {
    update(t, active, room, player) {
      if (!context || context.state !== "running") return;
      const near = player
        ? Math.min(
            1,
            Math.hypot(player.position.x + 22, player.position.z) / 55,
          )
        : 0.3;
      const gain =
        enabled && active ? (room >= 0 ? 0.11 : 0.23 + 0.35 * near) : 0;
      bus.gain.setTargetAtTime(gain, context.currentTime, 0.35);
      waveGain.gain.setTargetAtTime(
        0.15 + Math.pow(0.5 + 0.5 * Math.sin(t * 0.46), 2) * 0.6,
        context.currentTime,
        0.2,
      );
      if (enabled && active && room < 0 && t - lastChirp > 10) {
        lastChirp = t;
        const osc = context.createOscillator(),
          g = context.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(1700, context.currentTime);
        osc.frequency.exponentialRampToValueAtTime(
          2600,
          context.currentTime + 0.12,
        );
        g.gain.setValueAtTime(0, context.currentTime);
        g.gain.linearRampToValueAtTime(0.014, context.currentTime + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.25);
        osc.connect(g);
        g.connect(bus);
        osc.start();
        osc.stop(context.currentTime + 0.26);
        osc.onended = () => {
          osc.disconnect();
          g.disconnect();
        };
      }
    },
  };
}
