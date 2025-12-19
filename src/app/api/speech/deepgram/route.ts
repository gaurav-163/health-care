import { NextRequest, NextResponse } from 'next/server';

// Medical terminology for keyword boosting - includes related phrases and contextual combinations
const MEDICAL_KEYWORDS = [
    // Vital signs with related terms
    'blood pressure', 'high blood pressure', 'low blood pressure', 'systolic', 'diastolic', 'mmHg',
    'heart rate', 'pulse rate', 'beats per minute', 'BPM', 'irregular heartbeat', 'rapid pulse',
    'temperature', 'fever', 'low grade fever', 'high fever', 'Fahrenheit', 'Celsius',
    'oxygen saturation', 'SpO2', 'oxygen level', 'respiratory rate', 'breathing rate',
    'BMI', 'body mass index', 'weight', 'height', 'overweight', 'underweight', 'obese',

    // Conditions with severity modifiers
    'diabetes', 'Type 1 diabetes', 'Type 2 diabetes', 'diabetic', 'blood sugar', 'glucose level',
    'hypertension', 'hypertensive', 'high blood pressure', 'pre-hypertension',
    'asthma', 'asthmatic', 'asthma attack', 'inhaler', 'nebulizer',
    'COPD', 'chronic obstructive pulmonary disease', 'emphysema', 'chronic bronchitis',
    'pneumonia', 'bronchitis', 'upper respiratory infection', 'chest infection',
    'arthritis', 'rheumatoid arthritis', 'osteoarthritis', 'joint inflammation',
    'cancer', 'tumor', 'malignant', 'benign', 'metastasis', 'remission', 'oncology',
    'anemia', 'iron deficiency', 'hemoglobin level', 'red blood cells',
    'thyroid', 'hypothyroidism', 'hyperthyroidism', 'thyroid level', 'TSH',
    'cholesterol', 'high cholesterol', 'LDL', 'HDL', 'triglycerides',
    'stroke', 'heart attack', 'cardiac arrest', 'coronary artery disease',

    // Symptoms with descriptors
    'pain', 'sharp pain', 'dull pain', 'throbbing pain', 'radiating pain', 'chronic pain', 'severe pain', 'mild pain',
    'nausea', 'vomiting', 'feeling nauseous', 'throwing up', 'morning sickness',
    'diarrhea', 'constipation', 'irregular bowel', 'loose stool', 'bloody stool',
    'fever', 'chills', 'night sweats', 'cold sweats', 'hot flashes',
    'fatigue', 'tiredness', 'exhaustion', 'weakness', 'lack of energy',
    'dizziness', 'vertigo', 'lightheaded', 'feeling faint', 'loss of balance',
    'shortness of breath', 'difficulty breathing', 'breathlessness', 'wheezing', 'labored breathing',
    'chest pain', 'chest tightness', 'pressure in chest', 'angina',
    'headache', 'migraine', 'tension headache', 'cluster headache', 'throbbing headache',
    'abdominal pain', 'stomach pain', 'belly ache', 'cramping', 'bloating',
    'back pain', 'lower back pain', 'upper back pain', 'sciatica', 'herniated disc',
    'joint pain', 'swollen joint', 'stiff joint', 'muscle pain', 'muscle ache',
    'numbness', 'tingling', 'pins and needles', 'loss of sensation',
    'swelling', 'edema', 'fluid retention', 'inflammation',
    'rash', 'skin rash', 'hives', 'itching', 'itchy skin', 'allergic reaction',
    'cough', 'dry cough', 'wet cough', 'productive cough', 'coughing up blood',
    'sore throat', 'strep throat', 'difficulty swallowing', 'hoarse voice',

    // Common medications
    'aspirin', 'ibuprofen', 'Advil', 'Motrin', 'acetaminophen', 'Tylenol', 'paracetamol',
    'metformin', 'lisinopril', 'atorvastatin', 'Lipitor', 'omeprazole', 'Prilosec',
    'levothyroxine', 'Synthroid', 'amlodipine', 'Norvasc', 'metoprolol', 'Lopressor',
    'losartan', 'Cozaar', 'gabapentin', 'Neurontin', 'hydrochlorothiazide', 'HCTZ',
    'sertraline', 'Zoloft', 'escitalopram', 'Lexapro', 'fluoxetine', 'Prozac',
    'prednisone', 'prednisolone', 'amoxicillin', 'azithromycin', 'Z-pack', 'Zithromax',
    'ciprofloxacin', 'Cipro', 'insulin', 'Lantus', 'Humalog', 'warfarin', 'Coumadin',
    'morphine', 'oxycodone', 'OxyContin', 'hydrocodone', 'Vicodin', 'tramadol',

    // Dosage instructions and frequency
    'milligrams', 'mg', 'micrograms', 'mcg', 'milliliters', 'ml', 'tablet', 'capsule', 'pill',
    'once daily', 'twice daily', 'three times daily', 'four times daily',
    'once a day', 'twice a day', 'three times a day', 'every 4 hours', 'every 6 hours', 'every 8 hours', 'every 12 hours',
    'before meals', 'after meals', 'with food', 'on empty stomach', 'at bedtime', 'in the morning',
    'as needed', 'PRN', 'take with water', 'do not crush', 'chewable',

    // Procedures and tests
    'MRI', 'CT scan', 'CAT scan', 'X-ray', 'ultrasound', 'sonogram',
    'ECG', 'EKG', 'electrocardiogram', 'echocardiogram', 'stress test', 'treadmill test',
    'colonoscopy', 'endoscopy', 'biopsy', 'blood test', 'blood work', 'lab work',
    'CBC', 'complete blood count', 'hemoglobin', 'hematocrit', 'platelet count',
    'A1C', 'HbA1c', 'fasting glucose', 'glucose tolerance test',
    'creatinine', 'BUN', 'kidney function', 'liver function', 'LFT',
    'urinalysis', 'urine test', 'stool sample', 'culture', 'sensitivity',
    'mammogram', 'Pap smear', 'PSA', 'prostate exam',
    'PET scan', 'angiogram', 'catheterization', 'cardiac catheterization',
    'dialysis', 'hemodialysis', 'peritoneal dialysis',
    'chemotherapy', 'radiation therapy', 'immunotherapy', 'surgery', 'operation',
    'transplant', 'organ transplant', 'transfusion', 'blood transfusion',

    // Anatomy and body parts
    'heart', 'lungs', 'liver', 'kidneys', 'pancreas', 'spleen', 'gallbladder',
    'stomach', 'small intestine', 'large intestine', 'colon', 'rectum',
    'brain', 'spine', 'spinal cord', 'vertebrae', 'cervical', 'thoracic', 'lumbar',
    'arteries', 'veins', 'blood vessels', 'capillaries', 'aorta',
    'thyroid gland', 'adrenal glands', 'pituitary gland',
    'prostate', 'uterus', 'ovaries', 'cervix', 'bladder', 'urethra',

    // Medical terms and phrases
    'diagnosis', 'prognosis', 'treatment plan', 'follow up', 'referral',
    'chronic', 'acute', 'severe', 'mild', 'moderate', 'stable', 'critical',
    'symptom', 'symptoms', 'syndrome', 'condition', 'disorder', 'disease',
    'inflammation', 'infection', 'bacterial infection', 'viral infection', 'fungal infection',
    'prescription', 'refill', 'over the counter', 'OTC', 'generic', 'brand name',
    'allergic', 'allergy', 'allergies', 'allergic to', 'drug allergy', 'food allergy',
    'side effect', 'adverse reaction', 'contraindication', 'drug interaction',
    'immunization', 'vaccination', 'vaccine', 'booster', 'flu shot',
    'antibiotic', 'antiviral', 'antifungal', 'anti-inflammatory',
    'anesthesia', 'local anesthesia', 'general anesthesia', 'sedation',

    // Family and medical history phrases
    'family history', 'medical history', 'previous surgery', 'past medical history',
    'currently taking', 'allergic to', 'history of', 'diagnosed with',
    'runs in the family', 'hereditary', 'genetic',

    // Common conversation phrases
    'how are you feeling', 'where does it hurt', 'how long have you had',
    'when did it start', 'does it hurt when', 'any allergies', 'any medications',
    'scale of 1 to 10', 'rate your pain', 'better or worse', 'come back if',
];


// Get Deepgram temporary API key for client-side WebSocket connection
export async function GET(request: NextRequest) {
    try {
        const apiKey = process.env.DEEPGRAM_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: 'DEEPGRAM_API_KEY not configured' },
                { status: 500 }
            );
        }

        // Use simpler configuration for broader compatibility
        // nova-2-medical may not be available on all plans, so use nova-2
        const params = new URLSearchParams({
            model: 'nova-2',
            smart_format: 'true',
            punctuate: 'true',
        });

        // Add a smaller subset of critical medical keywords (to avoid URL length issues)
        const criticalKeywords = [
            'blood pressure', 'heart rate', 'diabetes', 'hypertension',
            'medication', 'prescription', 'dosage', 'milligrams',
            'MRI', 'CT scan', 'surgery', 'diagnosis'
        ];
        criticalKeywords.forEach(keyword => {
            params.append('keywords', keyword);
        });

        // Return the WebSocket URL
        return NextResponse.json({
            wsUrl: `wss://api.deepgram.com/v1/listen?${params.toString()}`,
            apiKey: apiKey,
            model: 'nova-2',
        });
    } catch (error) {
        console.error('Deepgram config error:', error);
        return NextResponse.json(
            { error: 'Failed to get Deepgram configuration' },
            { status: 500 }
        );
    }
}

// Transcribe audio file using Deepgram (fallback for WebSocket issues)
export async function POST(request: NextRequest) {
    try {
        const apiKey = process.env.DEEPGRAM_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: 'DEEPGRAM_API_KEY not configured' },
                { status: 500 }
            );
        }

        const formData = await request.formData();
        const audioFile = formData.get('audio') as File;
        const language = formData.get('language') as string || 'en';

        if (!audioFile) {
            return NextResponse.json(
                { error: 'No audio file provided' },
                { status: 400 }
            );
        }

        const audioBuffer = await audioFile.arrayBuffer();

        // Use simpler configuration for broader compatibility
        const params = new URLSearchParams({
            model: 'nova-2',
            language: language,
            smart_format: 'true',
            punctuate: 'true',
        });

        // Add critical medical keywords
        const criticalKeywords = [
            'blood pressure', 'heart rate', 'diabetes', 'hypertension',
            'medication', 'prescription', 'dosage', 'milligrams'
        ];
        criticalKeywords.forEach(keyword => {
            params.append('keywords', keyword);
        });

        // Send to Deepgram pre-recorded API with medical settings
        const response = await fetch(
            `https://api.deepgram.com/v1/listen?${params.toString()}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${apiKey}`,
                    'Content-Type': audioFile.type || 'audio/webm',
                },
                body: audioBuffer,
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Deepgram API error:', errorText);
            throw new Error(`Deepgram API error: ${response.status}`);
        }

        const result = await response.json();
        const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';

        return NextResponse.json({
            transcript,
            confidence: result.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0,
            provider: 'deepgram'
        });
    } catch (error) {
        console.error('Deepgram transcription error:', error);
        const message = error instanceof Error ? error.message : 'Transcription failed';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
