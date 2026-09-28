/**
 * Murmur SoundScape Engine (Web Audio API)
 * Genera de forma procedural un paisaje sonoro inmersivo y relajante:
 * 1. "El Murmullo": Un susurro ambiental suave y cálido (ruido rosa filtrado y modulado)
 *    que evoca una biblioteca o el rumor difuso de una clase antes de comenzar.
 * 2. "Paso al Orden": Una transición armónica cristalina (acorde pentatónico etéreo)
 *    que resuelve el murmullo en silencio y claridad cuando se sintetizan los apuntes.
 */

class SoundScapeEngine {
  private ctx: AudioContext | null = null;
  private noiseGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private lfo: OscillatorNode | null = null;
  private isPlaying = false;

  private initContext() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtxClass();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  /**
   * Inicia el murmullo ambiental sutil y relajante.
   */
  public startMurmur(volume: number = 0.08) {
    if (this.isPlaying) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      // 1. Generar 3 segundos de ruido rosa en buffer (sonido orgánico y cálido)
      const bufferSize = this.ctx.sampleRate * 3;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;

      // 2. Filtro paso banda centrado en frecuencias de voz/susurro (400 - 800 Hz)
      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = "bandpass";
      this.filterNode.frequency.value = 520;
      this.filterNode.Q.value = 1.8;

      // 3. Modulación LFO lenta para imitar la respiración y el oleaje de voces lejanas
      this.lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      this.lfo.frequency.value = 0.15; // 0.15 Hz = ciclo de ~6.5 segundos
      lfoGain.gain.value = 180;
      this.lfo.connect(this.filterNode.frequency);
      this.lfo.start();

      // 4. Ganancia maestra del murmullo con desvanecimiento de entrada suave
      this.noiseGain = this.ctx.createGain();
      this.noiseGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      this.noiseGain.gain.exponentialRampToValueAtTime(volume, this.ctx.currentTime + 2.5);

      // Conexiones de nodos
      noiseSource.connect(this.filterNode);
      this.filterNode.connect(this.noiseGain);
      this.noiseGain.connect(this.ctx.destination);

      noiseSource.start();
      this.isPlaying = true;
    } catch (e) {
      console.warn("Fallo al iniciar el paisaje sonoro:", e);
    }
  }

  /**
   * Detiene suavemente el murmullo con fade-out.
   */
  public stopMurmur(fadeDuration: number = 1.5) {
    if (!this.isPlaying || !this.ctx || !this.noiseGain) return;
    try {
      this.noiseGain.gain.setValueAtTime(this.noiseGain.gain.value, this.ctx.currentTime);
      this.noiseGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + fadeDuration);
      setTimeout(() => {
        this.isPlaying = false;
      }, fadeDuration * 1000);
    } catch {
      this.isPlaying = false;
    }
  }

  /**
   * Momento clave: "Del Murmullo al Orden".
   * Hace un barrido del murmullo caótico hacia un acorde etéreo y cristalino
   * (Do Mayor 9 / Lidio) que transmite paz y resolución pedagógica.
   */
  public transitionToOrder() {
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // 1. Desvanecer el murmullo ambiental si estaba activo
    if (this.noiseGain) {
      this.noiseGain.gain.setValueAtTime(this.noiseGain.gain.value, now);
      this.noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    }

    // 2. Tocar campanas armónicas de orden (frecuencias en Hz: Do5, Sol5, Si5, Re6, Mi6)
    const frequencies = [523.25, 783.99, 987.77, 1174.66, 1318.51];

    frequencies.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      // Envolvente de volumen (ataque rápido y caída larga y serena)
      noteGain.gain.setValueAtTime(0.0001, now + idx * 0.08);
      noteGain.gain.linearRampToValueAtTime(0.05 / (idx + 1), now + idx * 0.08 + 0.04);
      noteGain.gain.exponentialRampToValueAtTime(0.00001, now + idx * 0.08 + 3.0);

      osc.connect(noteGain);
      noteGain.connect(this.ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 3.2);
    });
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const soundScape = new SoundScapeEngine();
