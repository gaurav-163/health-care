import { NextRequest, NextResponse } from 'next/server';

// Language to Deepgram voice mapping
const VOICE_MAP: Record<string, string> = {
    'en': 'aura-asteria-en',
    'es': 'aura-stella-en', // Deepgram doesn't have native Spanish, using English voice
    'fr': 'aura-stella-en',
    'de': 'aura-stella-en',
    'zh': 'aura-stella-en',
    'hi': 'aura-stella-en',
    'ar': 'aura-stella-en',
    'pt': 'aura-stella-en',
    'ru': 'aura-stella-en',
    'ja': 'aura-stella-en',
    'ko': 'aura-stella-en',
    'vi': 'aura-stella-en',
};

export async function POST(request: NextRequest) {
    try {
        const apiKey = process.env.DEEPGRAM_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: 'DEEPGRAM_API_KEY not configured' },
                { status: 500 }
            );
        }

        const { text, language } = await request.json();

        if (!text) {
            return NextResponse.json(
                { error: 'Text is required' },
                { status: 400 }
            );
        }

        // Select voice based on language (defaulting to English voice)
        const voice = VOICE_MAP[language] || 'aura-asteria-en';

        // Call Deepgram TTS API
        const response = await fetch(
            `https://api.deepgram.com/v1/speak?model=${voice}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Deepgram TTS error:', errorText);
            throw new Error(`Deepgram TTS failed: ${response.status}`);
        }

        // Get the audio data as ArrayBuffer
        const audioBuffer = await response.arrayBuffer();

        // Return audio as mp3
        return new NextResponse(audioBuffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': audioBuffer.byteLength.toString(),
            },
        });
    } catch (error) {
        console.error('TTS error:', error);
        const message = error instanceof Error ? error.message : 'TTS failed';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
