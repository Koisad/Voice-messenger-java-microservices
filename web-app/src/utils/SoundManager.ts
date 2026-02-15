class SoundManager {
    private audioContext: AudioContext | null = null;
    private oscillators: OscillatorNode[] = [];
    private gainNodes: GainNode[] = [];

    private getAudioContext(): AudioContext {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return this.audioContext;
    }

    private stop() {
        this.oscillators.forEach(osc => {
            try {
                osc.stop();
                osc.disconnect();
            } catch (e) {
                // Ignore errors if already stopped
            }
        });
        this.oscillators = [];
        this.gainNodes.forEach(gain => {
            try {
                gain.disconnect();
            } catch (e) { }
        });
        this.gainNodes = [];
    }

    public playRinging() {
        this.stop();
        const ctx = this.getAudioContext();

        // Modern digital ringtone: repeating pleasant pattern
        // Pattern: High-Mid-High-Silence
        const t = ctx.currentTime;
        const gain = ctx.createGain();
        gain.connect(ctx.destination);

        // Loop the ringtone every 3 seconds
        const loopDuration = 3.0;

        // Create a custom oscillator for a softer tone
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.connect(gain);

        // Schedule values for the first 10 cycles (30 seconds ring time)
        for (let i = 0; i < 10; i++) {
            const start = t + (i * loopDuration);

            // Note 1: 880Hz (A5) for 0.1s
            osc.frequency.setValueAtTime(880, start);
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.1, start + 0.02);
            gain.gain.setValueAtTime(0.1, start + 0.08);
            gain.gain.linearRampToValueAtTime(0, start + 0.1);

            // Note 2: 698.46Hz (F5) for 0.1s
            osc.frequency.setValueAtTime(698.46, start + 0.15);
            gain.gain.setValueAtTime(0, start + 0.15);
            gain.gain.linearRampToValueAtTime(0.1, start + 0.17);
            gain.gain.setValueAtTime(0.1, start + 0.23);
            gain.gain.linearRampToValueAtTime(0, start + 0.25);

            // Note 3: 880Hz (A5) for 0.1s
            osc.frequency.setValueAtTime(880, start + 0.3);
            gain.gain.setValueAtTime(0, start + 0.3);
            gain.gain.linearRampToValueAtTime(0.1, start + 0.32);
            gain.gain.setValueAtTime(0.1, start + 0.38);
            gain.gain.linearRampToValueAtTime(0, start + 0.4);

            // Longer silence (2.6s) handled by loop duration
        }

        osc.start(t);
        osc.stop(t + 30); // Stop automatically after 30s

        this.oscillators.push(osc);
        this.gainNodes.push(gain);
    }

    public playDialTone() {
        this.stop();
        const ctx = this.getAudioContext();

        // Standard US Dial Tone: 350Hz + 440Hz
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.frequency.setValueAtTime(350, ctx.currentTime);
        osc2.frequency.setValueAtTime(440, ctx.currentTime);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        // Soft, continuous tone
        gain.gain.setValueAtTime(0.05, ctx.currentTime);

        osc1.start();
        osc2.start();

        this.oscillators.push(osc1, osc2);
        this.gainNodes.push(gain);
    }

    public playEndCall() {
        this.stop();
        const ctx = this.getAudioContext();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Descending tone: 400Hz -> 300Hz
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.3);

        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(ctx.destination);

        // Quick fade out
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

        osc.start();
        osc.stop(ctx.currentTime + 0.3);

        this.oscillators.push(osc);
        this.gainNodes.push(gain);
    }

    public stopAll() {
        this.stop();
    }
}

export const soundManager = new SoundManager();
