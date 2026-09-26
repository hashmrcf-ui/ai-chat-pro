// A soft, generative ambient pad built with the Web Audio API — no audio files.
// Luxury sites almost always offer sound; this keeps it weightless and opt-in.
export class AmbientDrone {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sources: OscillatorNode[] = [];

  private build() {
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 750;
    filter.Q.value = 0.7;
    filter.connect(master);
    master.connect(ctx.destination);

    // A-major colour: A2, E3, A3 (slightly detuned for width), C#4.
    const voices: Array<[number, OscillatorType, number]> = [
      [110, 'sine', 0.22],
      [164.81, 'triangle', 0.1],
      [220.6, 'sine', 0.12],
      [277.18, 'sine', 0.05],
    ];
    for (const [freq, type, level] of voices) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.value = level;
      osc.connect(gain).connect(filter);
      osc.start();
      this.sources.push(osc);
    }

    // Slow breathing on the filter so the pad never sounds static.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 320;
    lfo.connect(lfoDepth).connect(filter.frequency);
    lfo.start();
    this.sources.push(lfo);

    this.ctx = ctx;
    this.master = master;
  }

  async start() {
    if (!this.ctx) this.build();
    const { ctx, master } = this;
    if (!ctx || !master) return;
    await ctx.resume();
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0.06, ctx.currentTime, 0.9);
  }

  stop() {
    const { ctx, master } = this;
    if (!ctx || !master) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.35);
  }

  dispose() {
    this.sources.forEach((s) => s.stop());
    this.sources = [];
    this.ctx?.close();
    this.ctx = null;
    this.master = null;
  }
}
