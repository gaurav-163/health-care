import { NextRequest, NextResponse } from 'next/server';
import { CohereClient } from 'cohere-ai';

const cohere = new CohereClient({
    token: process.env.COHERE_API_KEY || '',
});

// Supported languages
const SUPPORTED_LANGUAGES: Record<string, string> = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
    zh: 'Chinese',
    ja: 'Japanese',
    ko: 'Korean',
    ar: 'Arabic',
    hi: 'Hindi',
    ru: 'Russian',
    vi: 'Vietnamese',
    th: 'Thai',
    tr: 'Turkish',
    nl: 'Dutch',
    pl: 'Polish',
    uk: 'Ukrainian',
};

// Comprehensive medical terminology for context-aware translation
const MEDICAL_CONTEXT = `
VITAL SIGNS & MEASUREMENTS:
blood pressure, heart rate, pulse, temperature, oxygen saturation (SpO2), respiratory rate, BMI, weight, height

COMMON CONDITIONS & DISEASES:
diabetes (Type 1, Type 2), hypertension, asthma, COPD, pneumonia, bronchitis, arthritis, osteoporosis,
migraine, epilepsy, Parkinson's disease, Alzheimer's disease, dementia, cancer, tumor (benign/malignant),
anemia, thyroid disorders (hypothyroidism/hyperthyroidism), high cholesterol, heart disease, stroke,
COVID-19, influenza, hepatitis, kidney disease, liver disease, ulcers, GERD, IBS

SYMPTOMS:
nausea, vomiting, diarrhea, constipation, fever, chills, fatigue, dizziness, vertigo,
shortness of breath (dyspnea), chest pain, palpitations, swelling (edema), rash, itching (pruritus),
headache, abdominal pain, back pain, joint pain, muscle pain (myalgia), numbness, tingling (paresthesia),
blurred vision, hearing loss, weight loss, weight gain, loss of appetite, insomnia

MEDICATIONS (Common):
aspirin, ibuprofen, acetaminophen (paracetamol), metformin, lisinopril, atorvastatin, omeprazole,
levothyroxine, amlodipine, metoprolol, losartan, gabapentin, hydrochlorothiazide,
sertraline, escitalopram, fluoxetine, alprazolam, lorazepam, prednisone, amoxicillin,
azithromycin, ciprofloxacin, insulin, warfarin, heparin, morphine, oxycodone, tramadol

PROCEDURES & TESTS:
MRI, CT scan, X-ray, ultrasound, ECG/EKG, echocardiogram, colonoscopy, endoscopy,
biopsy, blood test, CBC (complete blood count), hemoglobin, A1C, creatinine, BUN,
liver function test (LFT), urinalysis, mammogram, PET scan, angiogram, cardiac catheterization,
dialysis, chemotherapy, radiation therapy, surgery, transplant, transfusion

ANATOMY:
heart, lungs, liver, kidneys, pancreas, spleen, gallbladder, stomach, intestines (small/large),
colon, brain, spine, vertebrae, arteries, veins, thyroid, adrenal glands, prostate, uterus, ovaries

MEDICAL INSTRUCTIONS:
dosage, milligrams (mg), twice daily (BID), three times daily (TID), four times daily (QID),
before meals (AC), after meals (PC), at bedtime (HS), as needed (PRN), with food, empty stomach
`;


export async function POST(request: NextRequest) {
    try {
        const { text, sourceLang, targetLang } = await request.json();

        if (!text || !sourceLang || !targetLang) {
            return NextResponse.json(
                { error: 'Missing required fields: text, sourceLang, targetLang' },
                { status: 400 }
            );
        }

        if (!process.env.COHERE_API_KEY) {
            return NextResponse.json(
                { error: 'COHERE_API_KEY not configured' },
                { status: 500 }
            );
        }

        const sourceLanguage = SUPPORTED_LANGUAGES[sourceLang] || sourceLang;
        const targetLanguage = SUPPORTED_LANGUAGES[targetLang] || targetLang;

        // If same language, return original text
        if (sourceLang === targetLang) {
            return NextResponse.json({ translation: text });
        }

        const systemPrompt = `You are a professional medical interpreter specializing in healthcare communication.
Your task is to translate spoken text from ${sourceLanguage} to ${targetLanguage} with extreme accuracy.

CRITICAL GUIDELINES:
1. Maintain medical terminology accuracy - do NOT simplify medical terms
2. Preserve the exact meaning, especially for dosages, frequencies, and medical instructions
3. If a medical term doesn't have a direct translation, provide the original term in parentheses
4. Maintain the speaker's tone (professional, caring, urgent, etc.)
5. Preserve numbers, measurements, and units exactly as stated
6. For drug names, keep the original name and add the translated generic name if applicable
7. Handle sensitive health information with appropriate professional language

${MEDICAL_CONTEXT}

IMPORTANT: Only output the translation, nothing else. No explanations, no notes, just the translated text.`;

        const response = await cohere.chat({
            model: 'command-a-03-2025',
            message: `Translate the following text from ${sourceLanguage} to ${targetLanguage}:\n\n"${text}"`,
            preamble: systemPrompt,
            temperature: 0.1,
        });

        const translation = response.text?.trim() || '';

        // Remove quotes if the model wrapped the response
        const cleanTranslation = translation.replace(/^["']|["']$/g, '');

        return NextResponse.json({ translation: cleanTranslation });
    } catch (error) {
        console.error('Translation error:', error);

        const errorMessage = error instanceof Error ? error.message : 'Translation failed';

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({
        status: 'ok',
        languages: SUPPORTED_LANGUAGES,
    });
}
