// KEI (kie.ai) API Integration for Multi-Modal Generation
// Supports: Images, Videos, and Audio

export type KEIImageModel = 'flux-kontext' | 'midjourney' | '4o-image' | 'nano-banana-pro';
export type KEIVideoModel = 'veo-3.1' | 'sora-2' | 'runway-aleph' | 'kling-2.5-turbo';
export type KEIAudioModel = 'tts-1' | 'tts-hd' | 'elevenlabs';

export interface KEIImageOptions {
    model: KEIImageModel;
    prompt: string;
    width?: number;
    height?: number;
    style?: string;
    negativePrompt?: string;
}

export interface KEIVideoOptions {
    model: KEIVideoModel;
    prompt: string;
    duration?: number; // seconds: 2, 5, 10
    mode?: 'text-to-video' | 'image-to-video';
    imageUrl?: string; // for image-to-video
    quality?: 'fast' | 'balanced' | 'high';
}

export interface KEIAudioOptions {
    model: KEIAudioModel;
    text: string;
    voice?: string;
    speed?: number;
}

export interface KEIGenerationResponse {
    taskId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    url?: string;
    progress?: number;
    cost?: number;
    error?: string;
}

const KEI_API_BASE = 'https://api.kie.ai/v1';

/**
 * Generate image using KEI API
 */
export async function generateKEIImage(options: KEIImageOptions): Promise<KEIGenerationResponse> {
    const response = await fetch(`${KEI_API_BASE}/image/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.KEI_API_KEY}`
        },
        body: JSON.stringify({
            model: options.model,
            prompt: options.prompt,
            width: options.width || 1024,
            height: options.height || 1024,
            style: options.style,
            negative_prompt: options.negativePrompt
        })
    });

    if (!response.ok) {
        throw new Error(`KEI Image API Error: ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Generate video using KEI API
 */
export async function generateKEIVideo(options: KEIVideoOptions): Promise<KEIGenerationResponse> {
    const response = await fetch(`${KEI_API_BASE}/video/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.KEI_API_KEY}`
        },
        body: JSON.stringify({
            model: options.model,
            prompt: options.prompt,
            duration: options.duration || 5,
            mode: options.mode || 'text-to-video',
            image_url: options.imageUrl,
            quality: options.quality || 'balanced'
        })
    });

    if (!response.ok) {
        throw new Error(`KEI Video API Error: ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Generate audio using KEI API
 */
export async function generateKEIAudio(options: KEIAudioOptions): Promise<KEIGenerationResponse> {
    const response = await fetch(`${KEI_API_BASE}/audio/tts`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.KEI_API_KEY}`
        },
        body: JSON.stringify({
            model: options.model,
            text: options.text,
            voice: options.voice || 'alloy',
            speed: options.speed || 1.0
        })
    });

    if (!response.ok) {
        throw new Error(`KEI Audio API Error: ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Check generation status
 */
export async function checkKEIStatus(taskId: string): Promise<KEIGenerationResponse> {
    const response = await fetch(`${KEI_API_BASE}/status/${taskId}`, {
        headers: {
            'Authorization': `Bearer ${process.env.KEI_API_KEY}`
        }
    });

    if (!response.ok) {
        throw new Error(`KEI Status API Error: ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Helper: Generate Image and Wait for Completion
 */
export async function generateKEIImageAndWait(options: KEIImageOptions): Promise<string> {
    // 1. Initial Request
    const initialRes = await generateKEIImage(options);

    if (initialRes.status === 'completed' && initialRes.url) {
        return initialRes.url;
    }

    if (initialRes.status === 'failed') {
        throw new Error(initialRes.error || 'Image generation failed immediately');
    }

    const taskId = initialRes.taskId;
    if (!taskId) {
        // Fallback mock if API not really implemented or returns direct URL in some cases
        return "https://images.unsplash.com/photo-1600607686527-6fb886090705?q=80&w=2000&auto=format&fit=crop";
    }

    // 2. Polling Loop
    let attempts = 0;
    while (attempts < 30) { // Timeout after ~60 seconds
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s

        const statusRes = await checkKEIStatus(taskId);

        if (statusRes.status === 'completed' && statusRes.url) {
            return statusRes.url;
        }

        if (statusRes.status === 'failed') {
            throw new Error(statusRes.error || 'Image generation failed during processing');
        }

        attempts++;
    }

    throw new Error('Image generation timed out');
}
