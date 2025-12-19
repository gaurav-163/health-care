'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

// Types
interface Language {
  code: string;
  name: string;
  flag: string;
}

interface ToastProps {
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

// Supported languages
const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
];

export default function Home() {
  // State
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('es');
  const [originalText, setOriginalText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [textInput, setTextInput] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [toast, setToast] = useState<ToastProps | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [interimText, setInterimText] = useState('');
  const [speechUnavailable, setSpeechUnavailable] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);

  // Refs
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Show toast notification
  const showToast = useCallback((message: string, type: ToastProps['type'] = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Speak text using Deepgram TTS API (more reliable than browser Speech Synthesis)
  const speakText = useCallback(async (text: string, lang: string) => {
    if (!text) {
      console.log('No text to speak');
      return;
    }

    console.log('Speaking:', text, 'in language:', lang);
    setIsSpeaking(true);

    try {
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      // Call our Deepgram TTS API
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: lang }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'TTS request failed');
      }

      // Get audio blob and create URL
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Create and play audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        console.log('Speech ended');
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      await audio.play();
      console.log('Speech started');
    } catch (error) {
      console.error('TTS error:', error);
      setIsSpeaking(false);

      // Fallback to browser Speech Synthesis if Deepgram fails
      if ('speechSynthesis' in window) {
        console.log('Falling back to browser Speech Synthesis');
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 0.9;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      } else {
        showToast('Unable to play audio', 'error');
      }
    }
  }, [showToast]);

  // Translate text using Cohere API
  const translateText = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setIsTranslating(true);

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          sourceLang,
          targetLang,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Translation failed');
      }

      setTranslatedText(data.translation);

      // Automatically speak the translation if autoSpeak is enabled
      if (autoSpeak && data.translation) {
        // Small delay to ensure UI updates first
        setTimeout(() => {
          speakText(data.translation, targetLang);
        }, 100);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Translation failed';
      showToast(message, 'error');
    } finally {
      setIsTranslating(false);
    }
  }, [sourceLang, targetLang, showToast, autoSpeak, speakText]);

  // Handle transcript from speech recognition
  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      setOriginalText((prev) => (prev ? prev + ' ' + text : text));
      setInterimText('');
      translateText(text);
    } else {
      setInterimText(text);
    }
  }, [translateText]);

  // Handle speech recognition error
  const handleSpeechError = useCallback((error: string) => {
    setSpeechUnavailable(true);
    showToast(error, 'error');
  }, [showToast]);

  // Use the new speech recognition hook with Deepgram/AssemblyAI
  const {
    isRecording,
    isConnecting,
    provider,
    startRecording,
    stopRecording,
  } = useSpeechRecognition({
    language: sourceLang,
    onTranscript: handleTranscript,
    onError: handleSpeechError,
  });

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      setRecordingTime(0);
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecording]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Toggle recording
  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
      setInterimText('');
    } else {
      setSpeechUnavailable(false);
      await startRecording();
    }
  };

  // Handle text input translation
  const handleTextTranslate = () => {
    if (textInput.trim()) {
      setOriginalText(textInput);
      translateText(textInput);
      setTextInput('');
    }
  };

  // Swap languages
  const swapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    const temp = originalText;
    setOriginalText(translatedText);
    setTranslatedText(temp);
  };

  // Clear transcripts
  const clearTranscripts = () => {
    setOriginalText('');
    setTranslatedText('');
    setInterimText('');
  };

  // Speak translation
  const speakTranslation = () => {
    speakText(translatedText, targetLang);
  };

  // Stop speaking
  const stopSpeaking = () => {
    // Stop Deepgram audio playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    // Also stop browser speech synthesis (fallback)
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // Format recording time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // Get language name
  const getLangName = (code: string) => {
    return LANGUAGES.find((l) => l.code === code)?.name || code;
  };

  // Get provider display name
  const getProviderName = (p: string | null) => {
    switch (p) {
      case 'deepgram': return 'Deepgram';
      case 'assemblyai': return 'AssemblyAI';
      case 'webspeech': return 'Web Speech';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="blob w-72 h-72 bg-blue-500/10 top-20 left-10"></div>
        <div className="blob w-96 h-96 bg-teal-500/10 bottom-20 right-10"></div>
        <div className="blob w-[600px] h-[600px] bg-purple-500/5 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="glass sticky top-0 z-50 px-4 py-3 sm:px-6 sm:py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center glow-blue">
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold gradient-text">MediTranslate</h1>
                <p className="text-xs sm:text-sm text-gray-400 hidden sm:block">Healthcare Translation</p>
              </div>
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-2">
              {provider && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-light">
                  <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></div>
                  <span className="text-xs font-medium text-teal-300">{getProviderName(provider)}</span>
                </div>
              )}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-light">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-xs font-medium text-gray-300">Cohere AI</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Language Selection */}
            <div className="glass rounded-2xl p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Source Language */}
                <div className="flex-1 w-full">
                  <label className="block text-sm font-medium text-gray-400 mb-2">I speak</label>
                  <select
                    value={sourceLang}
                    onChange={(e) => setSourceLang(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none smooth-transition appearance-none cursor-pointer"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Swap Button */}
                <button
                  onClick={swapLanguages}
                  className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-teal-500 flex items-center justify-center smooth-transition hover:scale-110 hover:shadow-lg hover:shadow-blue-500/25 mt-6 sm:mt-0"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </button>

                {/* Target Language */}
                <div className="flex-1 w-full">
                  <label className="block text-sm font-medium text-gray-400 mb-2">Translate to</label>
                  <select
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none smooth-transition appearance-none cursor-pointer"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Transcripts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Original */}
              <div className="glass rounded-2xl p-5 sm:p-6 glow-blue">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <h2 className="font-semibold text-gray-200">Original</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                      {getLangName(sourceLang)}
                    </span>
                  </div>
                  <button
                    onClick={clearTranscripts}
                    className="p-2 rounded-lg hover:bg-slate-700/50 smooth-transition"
                    title="Clear"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <div className="transcript-container text-lg text-gray-100 leading-relaxed">
                  {originalText || interimText ? (
                    <>
                      <p>{originalText}</p>
                      {interimText && <p className="text-gray-400 italic">{interimText}</p>}
                    </>
                  ) : (
                    <p className="text-gray-500 italic">Your speech will appear here...</p>
                  )}
                </div>
              </div>

              {/* Translation */}
              <div className={`glass rounded-2xl p-5 sm:p-6 ${isSpeaking ? 'glow-teal ring-2 ring-teal-500/50' : 'glow-teal'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${isSpeaking ? 'bg-teal-400 animate-pulse' : 'bg-teal-500'}`}></div>
                    <h2 className="font-semibold text-gray-200">Translation</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300">
                      {getLangName(targetLang)}
                    </span>
                    {isSpeaking && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/30 text-teal-200 animate-pulse">
                        🔊 Speaking...
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isTranslating && (
                      <div className="audio-wave h-6 flex items-center">
                        <span></span><span></span><span></span><span></span><span></span>
                      </div>
                    )}
                    {/* Auto-speak toggle */}
                    <button
                      onClick={() => setAutoSpeak(!autoSpeak)}
                      className={`p-2 rounded-lg smooth-transition ${autoSpeak ? 'bg-teal-500/20 text-teal-300' : 'hover:bg-slate-700/50 text-gray-500'}`}
                      title={autoSpeak ? 'Auto-speak enabled' : 'Auto-speak disabled'}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {autoSpeak ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zm7.414-9.414L17.586 10M10 10l10 10" />
                        )}
                      </svg>
                    </button>
                    {/* Play/Stop button */}
                    {isSpeaking ? (
                      <button
                        onClick={stopSpeaking}
                        className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 smooth-transition"
                        title="Stop speaking"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <rect x="6" y="6" width="12" height="12" rx="2" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        onClick={speakTranslation}
                        disabled={!translatedText}
                        className="p-2 rounded-lg hover:bg-slate-700/50 smooth-transition disabled:opacity-50"
                        title="Speak Translation"
                      >
                        <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                <div className="transcript-container text-lg text-gray-100 leading-relaxed">
                  {translatedText ? (
                    <p>{translatedText}</p>
                  ) : (
                    <p className="text-gray-500 italic">Translation will appear here...</p>
                  )}
                </div>
              </div>
            </div>

            {/* Speech Unavailable Notice */}
            {speechUnavailable && (
              <div className="glass rounded-2xl p-4 border border-amber-500/30 bg-amber-500/5">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-amber-300 font-medium">Voice input unavailable</p>
                    <p className="text-amber-200/70 text-sm">Please use text input below to translate your message</p>
                  </div>
                  <button
                    onClick={() => setSpeechUnavailable(false)}
                    className="p-2 rounded-lg hover:bg-amber-500/10 smooth-transition"
                    title="Dismiss"
                  >
                    <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Text Input */}
            <div className={`glass rounded-2xl p-5 sm:p-6 smooth-transition ${speechUnavailable ? 'ring-2 ring-teal-500/50 glow-teal' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-400">
                  {speechUnavailable ? '✨ Type your message here' : 'Or type your message'}
                </label>
                {speechUnavailable && (
                  <span className="text-xs px-2 py-1 rounded-full bg-teal-500/20 text-teal-300 animate-pulse">
                    Recommended
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleTextTranslate();
                    }
                  }}
                  rows={2}
                  placeholder="Type or paste text to translate..."
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none smooth-transition resize-none"
                  autoFocus={speechUnavailable}
                />
                <button
                  onClick={handleTextTranslate}
                  disabled={isTranslating || !textInput.trim()}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium smooth-transition hover:shadow-lg hover:shadow-blue-500/25 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                >
                  Translate
                </button>
              </div>
            </div>

            {/* Recording Controls */}
            <div className="glass rounded-2xl p-6 sm:p-8">
              <div className="flex flex-col items-center gap-6">
                {/* Record Button */}
                <button
                  onClick={toggleRecording}
                  disabled={isConnecting}
                  className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center smooth-transition hover:scale-110 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:opacity-70 disabled:hover:scale-100 ${isRecording
                    ? 'bg-gradient-to-br from-red-600 to-red-500 hover:shadow-red-500/30'
                    : 'bg-gradient-to-br from-blue-600 to-teal-500 hover:shadow-blue-500/30'
                    }`}
                >
                  {isRecording && (
                    <div className="absolute inset-0">
                      <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping"></div>
                      <div className="absolute inset-2 rounded-full bg-red-500/20 animate-ping" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  )}

                  {isConnecting ? (
                    <svg className="w-10 h-10 sm:w-12 sm:h-12 text-white relative z-10 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : isRecording ? (
                    <svg className="w-10 h-10 sm:w-12 sm:h-12 text-white relative z-10" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  ) : (
                    <svg className="w-10 h-10 sm:w-12 sm:h-12 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  )}
                </button>

                {/* Status */}
                <div className="text-center">
                  <p className="text-lg font-medium text-gray-300">
                    {isConnecting ? 'Connecting...' : isRecording ? 'Listening...' : 'Tap to start recording'}
                  </p>
                  {isRecording && (
                    <p className="text-sm text-gray-500 mt-1">{formatTime(recordingTime)}</p>
                  )}
                  {provider && isRecording && (
                    <p className="text-xs text-teal-400 mt-1">via {getProviderName(provider)}</p>
                  )}
                </div>

                {/* Quick Tips */}
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  <span className="px-3 py-1 rounded-full text-xs bg-slate-800/50 text-gray-400">🏥 Medical terms supported</span>
                  <span className="px-3 py-1 rounded-full text-xs bg-slate-800/50 text-gray-400">🔒 Privacy-focused</span>
                  <span className="px-3 py-1 rounded-full text-xs bg-slate-800/50 text-gray-400">⚡ Real-time</span>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="glass mt-auto px-4 py-4 text-center">
          <p className="text-sm text-gray-500">
            Built with ❤️ using Cohere AI |
            <span className="text-gray-400"> Healthcare Translation Made Simple</span>
          </p>
        </footer>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl shadow-lg z-50 flex items-center gap-3 max-w-md text-sm font-medium animate-fade-in ${toast.type === 'error' ? 'bg-red-500/90 text-white' :
            toast.type === 'warning' ? 'bg-yellow-500/90 text-gray-900' :
              toast.type === 'success' ? 'bg-green-500/90 text-white' :
                'bg-slate-700/90 text-white'
            }`}
        >
          <span className="text-lg">
            {toast.type === 'error' ? '❌' : toast.type === 'warning' ? '⚠️' : toast.type === 'success' ? '✅' : 'ℹ️'}
          </span>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100">✕</button>
        </div>
      )}
    </div>
  );
}
