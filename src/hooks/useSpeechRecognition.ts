'use client';

/// <reference path="../types/speech.d.ts" />

import { useCallback, useRef, useState } from 'react';

interface UseSpeechRecognitionOptions {
    language: string;
    onTranscript: (text: string, isFinal: boolean) => void;
    onError: (error: string) => void;
}

interface UseSpeechRecognitionReturn {
    isRecording: boolean;
    isConnecting: boolean;
    provider: 'deepgram' | 'assemblyai' | 'webspeech' | null;
    startRecording: () => Promise<void>;
    stopRecording: () => void;
}

export function useSpeechRecognition({
    language,
    onTranscript,
    onError,
}: UseSpeechRecognitionOptions): UseSpeechRecognitionReturn {
    const [isRecording, setIsRecording] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [provider, setProvider] = useState<'deepgram' | 'assemblyai' | 'webspeech' | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const socketRef = useRef<WebSocket | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Map language codes to Deepgram language codes
    const getDeepgramLanguage = (lang: string): string => {
        const languageMap: Record<string, string> = {
            'en': 'en-US',
            'es': 'es',
            'fr': 'fr',
            'de': 'de',
            'zh': 'zh-CN',
            'hi': 'hi',
            'ar': 'ar',
            'pt': 'pt-BR',
            'ru': 'ru',
            'ja': 'ja',
            'ko': 'ko',
            'vi': 'vi',
        };
        return languageMap[lang] || 'en-US';
    };

    // Start Deepgram real-time transcription with medical model
    const startDeepgram = useCallback(async (stream: MediaStream): Promise<boolean> => {
        try {
            // Get Deepgram credentials and medical-optimized URL from our API
            const configResponse = await fetch('/api/speech/deepgram');
            if (!configResponse.ok) {
                console.warn('Deepgram not configured, trying fallback...');
                return false;
            }

            const { wsUrl, apiKey, model } = await configResponse.json();
            if (!apiKey) {
                console.warn('Deepgram API key not available');
                return false;
            }

            console.log('Using Deepgram model:', model || 'nova-2');
            const dgLanguage = getDeepgramLanguage(language);

            // Create WebSocket connection to Deepgram
            // Note: We don't specify sample_rate - Deepgram will auto-detect from audio
            const socket = new WebSocket(
                `${wsUrl}&language=${dgLanguage}&interim_results=true&encoding=linear16&vad_events=true&utterance_end_ms=1000`,
                ['token', apiKey]
            );

            return new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    console.warn('Deepgram connection timeout');
                    socket.close();
                    resolve(false);
                }, 5000);

                socket.onopen = () => {
                    clearTimeout(timeout);
                    console.log('Deepgram connected - ready to listen');
                    socketRef.current = socket;
                    setProvider('deepgram');

                    // Create AudioContext - use default sample rate (matches microphone)
                    const audioContext = new AudioContext();
                    const actualSampleRate = audioContext.sampleRate;
                    console.log('Audio sample rate:', actualSampleRate);

                    const source = audioContext.createMediaStreamSource(stream);

                    // Use smaller buffer for more responsive transcription
                    const processor = audioContext.createScriptProcessor(2048, 1, 1);

                    source.connect(processor);
                    processor.connect(audioContext.destination);

                    let audioDetected = false;

                    processor.onaudioprocess = (e) => {
                        if (socket.readyState === WebSocket.OPEN) {
                            const inputData = e.inputBuffer.getChannelData(0);

                            // Check audio level (for debugging)
                            let maxLevel = 0;
                            for (let i = 0; i < inputData.length; i++) {
                                const absValue = Math.abs(inputData[i]);
                                if (absValue > maxLevel) maxLevel = absValue;
                            }

                            // Log when audio is detected (only once)
                            if (maxLevel > 0.01 && !audioDetected) {
                                console.log('Audio detected - recording speech');
                                audioDetected = true;
                            }

                            // Convert to 16-bit PCM
                            const pcmData = new Int16Array(inputData.length);
                            for (let i = 0; i < inputData.length; i++) {
                                pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
                            }
                            socket.send(pcmData.buffer);
                        }
                    };

                    resolve(true);
                };

                socket.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);

                        // Handle speech started event
                        if (data.type === 'SpeechStarted') {
                            console.log('Speech detected - listening...');
                            return;
                        }

                        // Handle utterance end (user stopped speaking)
                        if (data.type === 'UtteranceEnd') {
                            console.log('Utterance ended - processing final transcript');
                            return;
                        }

                        // Handle transcription results
                        if (data.channel?.alternatives?.[0]?.transcript) {
                            const transcript = data.channel.alternatives[0].transcript;
                            const isFinal = data.is_final || false;
                            const confidence = data.channel.alternatives[0].confidence || 0;

                            if (transcript.trim()) {
                                console.log(`Transcript (${isFinal ? 'final' : 'interim'}, ${Math.round(confidence * 100)}%):`, transcript);
                                onTranscript(transcript, isFinal);
                            }
                        }
                    } catch (err) {
                        console.error('Error parsing Deepgram message:', err);
                    }
                };

                socket.onerror = (error) => {
                    clearTimeout(timeout);
                    console.error('Deepgram WebSocket error:', error);
                    resolve(false);
                };

                socket.onclose = () => {
                    console.log('Deepgram connection closed');
                };
            });
        } catch (error) {
            console.error('Deepgram setup error:', error);
            return false;
        }
    }, [language, onTranscript]);

    // Fallback: Record audio and send to AssemblyAI for transcription
    const startAssemblyAI = useCallback(async (stream: MediaStream): Promise<boolean> => {
        try {
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
            });

            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            setProvider('assemblyai');

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            // Transcribe every 3 seconds for near-real-time experience
            const transcribeInterval = setInterval(async () => {
                if (audioChunksRef.current.length > 0) {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

                    // Only transcribe if we have enough audio (at least 1 second worth)
                    if (audioBlob.size > 10000) {
                        const formData = new FormData();
                        formData.append('audio', audioBlob);
                        formData.append('language', language);

                        try {
                            const response = await fetch('/api/speech/assemblyai', {
                                method: 'POST',
                                body: formData,
                            });

                            if (response.ok) {
                                const result = await response.json();
                                if (result.transcript) {
                                    onTranscript(result.transcript, true);
                                    audioChunksRef.current = []; // Clear after successful transcription
                                }
                            }
                        } catch (err) {
                            console.error('AssemblyAI transcription error:', err);
                        }
                    }
                }
            }, 3000);

            mediaRecorder.onstop = () => {
                clearInterval(transcribeInterval);
            };

            mediaRecorder.start(1000); // Collect data every second
            return true;
        } catch (error) {
            console.error('AssemblyAI setup error:', error);
            return false;
        }
    }, [language, onTranscript]);

    // Last fallback: Web Speech API
    const startWebSpeech = useCallback(async (): Promise<boolean> => {
        if (typeof window === 'undefined') return false;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return false;

        try {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = language;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            recognition.onresult = (event: any) => {
                let interim = '';
                let final = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        final += transcript;
                    } else {
                        interim += transcript;
                    }
                }

                if (interim) onTranscript(interim, false);
                if (final) onTranscript(final, true);
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            recognition.onerror = (event: any) => {
                if (event.error !== 'no-speech' && event.error !== 'aborted') {
                    console.error('Web Speech API error:', event.error);
                    onError(`Speech error: ${event.error}`);
                }
            };

            recognition.start();
            setProvider('webspeech');
            return true;
        } catch (error) {
            console.error('Web Speech API setup error:', error);
            return false;
        }
    }, [language, onTranscript, onError]);

    const startRecording = useCallback(async () => {
        setIsConnecting(true);

        try {
            // Request microphone access with optimized audio settings for speech
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true, // Helps with quiet or loud speakers
                    sampleRate: { ideal: 16000, min: 8000 },
                    channelCount: 1, // Mono for speech
                }
            });
            streamRef.current = stream;
            console.log('Microphone access granted');

            // Try Deepgram first (real-time streaming)
            let success = await startDeepgram(stream);

            if (!success) {
                console.log('Deepgram failed, trying AssemblyAI...');
                success = await startAssemblyAI(stream);
            }

            if (!success) {
                console.log('AssemblyAI failed, trying Web Speech API...');
                success = await startWebSpeech();

                if (success) {
                    // Web Speech doesn't need the stream, stop it
                    stream.getTracks().forEach(track => track.stop());
                }
            }

            if (!success) {
                stream.getTracks().forEach(track => track.stop());
                onError('All speech recognition services unavailable. Please use text input.');
                return;
            }

            setIsRecording(true);
        } catch (error) {
            console.error('Failed to start recording:', error);
            onError('Microphone access denied');
        } finally {
            setIsConnecting(false);
        }
    }, [startDeepgram, startAssemblyAI, startWebSpeech, onError]);

    const stopRecording = useCallback(() => {
        // Stop WebSocket
        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }

        // Stop MediaRecorder
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current = null;
        }

        // Stop media stream
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        setIsRecording(false);
        setProvider(null);
    }, []);

    return {
        isRecording,
        isConnecting,
        provider,
        startRecording,
        stopRecording,
    };
}
