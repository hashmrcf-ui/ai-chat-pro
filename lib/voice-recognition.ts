'use client';

// Web Speech API types
export interface VoiceRecognitionConfig {
    lang?: string;
    continuous?: boolean;
    interimResults?: boolean;
}

export class VoiceRecognition {
    private recognition: SpeechRecognition | null = null;
    private isListening: boolean = false;

    constructor(config: VoiceRecognitionConfig = {}) {
        if (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.lang = config.lang || 'en-US';
            this.recognition.continuous = config.continuous ?? false;
            this.recognition.interimResults = config.interimResults ?? true;
        }
    }

    start(onResult: (text: string) => void, onError?: (error: any) => void) {
        if (!this.recognition) {
            console.warn('Speech recognition not supported in this browser.');
            onError?.(new Error('Speech recognition not supported'));
            return;
        }

        if (this.isListening) return;

        this.recognition.onresult = (event: SpeechRecognitionEvent) => {
            const text = Array.from(event.results)
                .map(result => result[0].transcript)
                .join('');
            onResult(text);
        };

        this.recognition.onerror = (event: any) => {
            onError?.(event);
            this.isListening = false;
        };

        this.recognition.onend = () => {
            this.isListening = false;
        };

        this.recognition.start();
        this.isListening = true;
    }

    stop() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
        }
    }

    isSupported(): boolean {
        return !!this.recognition;
    }
}

// Type definitions for global window object
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
    interface SpeechRecognitionEvent {
        results: SpeechRecognitionResultList;
    }
    interface SpeechRecognitionResultList {
        [index: number]: SpeechRecognitionResult;
        length: number;
        [Symbol.iterator](): IterableIterator<SpeechRecognitionResult>;
    }
    interface SpeechRecognitionResult {
        [index: number]: SpeechRecognitionAlternative;
        length: number;
        isFinal: boolean;
    }
    interface SpeechRecognitionAlternative {
        transcript: string;
        confidence: number;
    }
}
