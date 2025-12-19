# MediTranslate - Healthcare Translation App (Next.js + Cohere)

A real-time, multilingual translation application designed for seamless communication between healthcare providers and patients. Built with Next.js and Cohere AI.

![MediTranslate](https://img.shields.io/badge/MediTranslate-Healthcare%20Translation-blue)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![Cohere](https://img.shields.io/badge/Cohere-AI-purple)

## 🌟 Features

### Core Functionality
- **🎤 Voice-to-Text**: Robust speech recognition with multiple providers:
  - **Deepgram** (Primary) - Real-time streaming transcription
  - **AssemblyAI** (Fallback) - High-accuracy batch transcription
  - **Web Speech API** (Last resort) - Browser-native fallback
- **🌍 Real-Time Translation**: Instant translation powered by Cohere AI
- **🔊 Text-to-Speech**: Browser-based audio playback
- **📱 Mobile-First Design**: Responsive UI with glassmorphism

### Healthcare-Specific
- **🏥 Medical Terminology Support**: Enhanced accuracy for medical terms
- **🔒 Privacy-Focused**: No data persistence
- **⚡ Real-time Processing**: Instant translations

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- [Cohere API Key](https://dashboard.cohere.com/api-keys) (Free tier available!)
- [Deepgram API Key](https://console.deepgram.com/) (Free tier available!) - For real-time speech recognition
- [AssemblyAI API Key](https://www.assemblyai.com/app/) (Free tier available!) - For fallback speech recognition

### Installation

1. **Navigate to the project**:
   ```bash
   cd meditranslate-nextjs
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   # Edit .env.local and add your API keys
   COHERE_API_KEY=your_cohere_api_key_here
   DEEPGRAM_API_KEY=your_deepgram_api_key_here
   ASSEMBLYAI_API_KEY=your_assemblyai_api_key_here
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

5. **Open in browser**:
   ```
   http://localhost:3000
   ```

## 🔑 Getting a Cohere API Key

1. Go to [Cohere Dashboard](https://dashboard.cohere.com/)
2. Sign up or log in
3. Navigate to API Keys
4. Create a new key (free tier includes generous limits!)
5. Add it to your `.env.local` file

## 📖 Usage

### Voice Recording
1. Select your input language ("I speak")
2. Select target language ("Translate to")
3. Click the microphone button
4. Speak clearly
5. Translation appears in real-time

### Text Input
1. Type or paste text in the input box
2. Click "Translate" or press Enter
3. View translation with audio playback option

## 🛠️ Technology Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 15 (App Router) |
| UI | Tailwind CSS, Glassmorphism |
| Translation | Cohere AI (command-r-plus) |
| Speech-to-Text | Web Speech API |
| Text-to-Speech | Browser SpeechSynthesis |
| Language | TypeScript |

## 📁 Project Structure

```
meditranslate-nextjs/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── translate/
│   │   │       └── route.ts    # Cohere translation API
│   │   ├── globals.css         # Custom styles
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Main app component
│   └── types/
│       └── speech.d.ts         # Web Speech API types
├── .env.local                  # API keys (create this!)
├── package.json
└── README.md
```

## 🌐 Supported Languages

English, Spanish, French, German, Chinese, Hindi, Arabic, Portuguese, Russian, Japanese, Korean, Vietnamese

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/your-username/meditranslate.git
   git push -u origin main
   ```

2. **Deploy via Vercel Dashboard**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository
   - Add the following environment variables:

   | Variable | Description |
   |----------|-------------|
   | `COHERE_API_KEY` | Your Cohere API key for translation |
   | `DEEPGRAM_API_KEY` | Your Deepgram API key for speech recognition & TTS |
   | `ASSEMBLYAI_API_KEY` | (Optional) AssemblyAI key for fallback |

3. **Click Deploy!**

### Deploy via CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Build the project
npm run build

# Deploy
vercel

# For production deployment
vercel --prod
```

### Environment Variables on Vercel

After deployment, go to your project settings on Vercel:
1. Navigate to **Settings** → **Environment Variables**
2. Add each API key:
   - `COHERE_API_KEY` - Required for translation
   - `DEEPGRAM_API_KEY` - Required for speech recognition and TTS
   - `ASSEMBLYAI_API_KEY` - Optional fallback

## 📝 License

MIT License

---

Built with ❤️ for better healthcare communication
