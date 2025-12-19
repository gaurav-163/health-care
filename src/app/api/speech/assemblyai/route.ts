import { NextRequest, NextResponse } from 'next/server';
import { AssemblyAI } from 'assemblyai';

// Medical terminology for word boosting - includes related phrases and contextual combinations
const MEDICAL_WORD_BOOST = [
    // Vital signs with related terms
    'blood pressure', 'high blood pressure', 'low blood pressure', 'systolic', 'diastolic',
    'heart rate', 'pulse rate', 'beats per minute', 'irregular heartbeat',
    'temperature', 'fever', 'high fever', 'oxygen saturation', 'SpO2',

    // Conditions with severity modifiers
    'diabetes', 'Type 1 diabetes', 'Type 2 diabetes', 'blood sugar', 'glucose level',
    'hypertension', 'high blood pressure', 'asthma', 'asthma attack', 'inhaler',
    'COPD', 'emphysema', 'pneumonia', 'bronchitis', 'chest infection',
    'arthritis', 'rheumatoid arthritis', 'osteoarthritis', 'joint inflammation',
    'cancer', 'tumor', 'malignant', 'benign', 'metastasis', 'oncology',
    'anemia', 'iron deficiency', 'thyroid', 'hypothyroidism', 'hyperthyroidism',
    'cholesterol', 'high cholesterol', 'LDL', 'HDL', 'triglycerides',
    'stroke', 'heart attack', 'cardiac arrest',

    // Symptoms with descriptors
    'pain', 'sharp pain', 'dull pain', 'chronic pain', 'severe pain', 'mild pain',
    'nausea', 'vomiting', 'diarrhea', 'constipation', 'bloating',
    'fever', 'chills', 'night sweats', 'fatigue', 'weakness',
    'dizziness', 'vertigo', 'lightheaded', 'shortness of breath', 'difficulty breathing',
    'chest pain', 'chest tightness', 'headache', 'migraine',
    'abdominal pain', 'stomach pain', 'back pain', 'lower back pain',
    'joint pain', 'muscle pain', 'numbness', 'tingling',
    'swelling', 'edema', 'rash', 'itching', 'allergic reaction',
    'cough', 'dry cough', 'sore throat',

    // Common medications with brand names
    'aspirin', 'ibuprofen', 'Advil', 'acetaminophen', 'Tylenol',
    'metformin', 'lisinopril', 'atorvastatin', 'Lipitor', 'omeprazole',
    'levothyroxine', 'amlodipine', 'metoprolol', 'losartan', 'gabapentin',
    'sertraline', 'Zoloft', 'prednisone', 'amoxicillin', 'azithromycin', 'Z-pack',
    'insulin', 'warfarin', 'Coumadin', 'morphine', 'oxycodone',

    // Dosage and frequency
    'milligrams', 'mg', 'tablet', 'capsule', 'once daily', 'twice daily',
    'three times daily', 'every 4 hours', 'every 6 hours',
    'before meals', 'after meals', 'with food', 'at bedtime', 'as needed',

    // Procedures/Tests
    'MRI', 'CT scan', 'X-ray', 'ultrasound', 'ECG', 'EKG', 'echocardiogram',
    'colonoscopy', 'endoscopy', 'biopsy', 'blood test', 'blood work',
    'CBC', 'hemoglobin', 'A1C', 'creatinine', 'liver function',
    'urinalysis', 'mammogram', 'chemotherapy', 'radiation', 'surgery', 'dialysis',

    // Anatomy
    'heart', 'lungs', 'liver', 'kidneys', 'pancreas', 'spleen', 'gallbladder',
    'brain', 'spine', 'arteries', 'veins',

    // Medical terms and phrases
    'diagnosis', 'prognosis', 'treatment plan', 'follow up',
    'chronic', 'acute', 'severe', 'mild', 'moderate',
    'inflammation', 'infection', 'bacterial infection', 'viral infection',
    'prescription', 'refill', 'allergic to', 'allergy', 'side effect',
    'antibiotic', 'vaccination', 'vaccine', 'anesthesia',

    // History phrases
    'family history', 'medical history', 'currently taking', 'diagnosed with',

    // Conversation phrases
    'how are you feeling', 'where does it hurt', 'scale of 1 to 10',
];

// Transcribe audio using AssemblyAI with medical word boosting (fallback option)
export async function POST(request: NextRequest) {
    try {
        const apiKey = process.env.ASSEMBLYAI_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: 'ASSEMBLYAI_API_KEY not configured' },
                { status: 500 }
            );
        }

        const client = new AssemblyAI({ apiKey });

        const formData = await request.formData();
        const audioFile = formData.get('audio') as File;
        const language = formData.get('language') as string || 'en';

        if (!audioFile) {
            return NextResponse.json(
                { error: 'No audio file provided' },
                { status: 400 }
            );
        }

        // Convert File to Buffer
        const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

        // Upload and transcribe with AssemblyAI using medical word boosting
        const transcript = await client.transcripts.transcribe({
            audio: audioBuffer,
            language_code: language,
            speech_model: 'best',
            word_boost: MEDICAL_WORD_BOOST,
            boost_param: 'high', // High boost for medical terms
        });

        if (transcript.status === 'error') {
            throw new Error(transcript.error || 'Transcription failed');
        }

        return NextResponse.json({
            transcript: transcript.text || '',
            confidence: transcript.confidence || 0,
            provider: 'assemblyai-medical'
        });
    } catch (error) {
        console.error('AssemblyAI transcription error:', error);
        const message = error instanceof Error ? error.message : 'Transcription failed';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
