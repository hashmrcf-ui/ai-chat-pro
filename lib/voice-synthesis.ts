'use client';

export class VoiceSynthesis {
    private synthesis: SpeechSynthesis | null = null;
    private voice: SpeechSynthesisVoice | null = null;

    constructor() {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            this.synthesis = window.speechSynthesis;
        }
    }

    speak(text: string, lang: string = 'en-US') {
        if (!this.synthesis) return;

        // Cancel any ongoing speech
        this.synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;

        // Select a voice that matches the language if possible
        const voices = this.synthesis.getVoices();
        const voice = voices.find(v => v.lang === lang) || voices[0];
        if (voice) {
            utterance.voice = voice;
        }

        this.synthesis.speak(utterance);
    }

    stop() {
        if (this.synthesis) {
            this.synthesis.cancel();
        }
    }

    isSupported(): boolean {
        return !!this.synthesis;
    }
}
