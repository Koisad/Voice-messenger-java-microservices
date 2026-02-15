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

        // Standard phone ring: 440Hz + 480Hz modulated
        // We'll mimic a digital ring: simple modulation
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.frequency.setValueAtTime(440, ctx.currentTime);
        osc2.frequency.setValueAtTime(480, ctx.currentTime);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        // Ring pattern: 2s ON, 4s OFF (European style usually) or 2s ON, 3s OFF
        // American: 2s ON, 4s OFF
        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0, now);

        for (let i = 0; i < 10; i++) { // Repeat 10 times
            const start = now + i * 5; // 5 seconds cycle
            gain.gain.setValueAtTime(0.1, start);
            gain.gain.setValueAtTime(0.1, start + 2);
            gain.gain.setValueAtTime(0, start + 2.1);
        }

        osc1.start();
        osc2.start();

        this.oscillators.push(osc1, osc2);
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

        // Europe often uses 425Hz continuous
        // Let's use the dual tone, it's distinctive
        gain.gain.setValueAtTime(0.1, ctx.currentTime); // Lower volume

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

        osc.frequency.setValueAtTime(480, ctx.currentTime);
        osc.type = 'square';

        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;

        // Three quick beeps
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.setValueAtTime(0, now + 0.2);
        gain.gain.setValueAtTime(0.1, now + 0.4);
        gain.gain.setValueAtTime(0, now + 0.6);
        gain.gain.setValueAtTime(0.1, now + 0.8);
        gain.gain.setValueAtTime(0, now + 1.0);

        osc.start();
        osc.stop(now + 1.2);

        this.oscillators.push(osc);
        this.gainNodes.push(gain);
    }

    public stopAll() {
        this.stop();
    }
}

export const soundManager = new SoundManager();
