import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Doctor, OperationType } from '../types';
import { handleFirestoreError } from '../lib/utils';
import { Check, ClipboardList, UserPlus, ArrowLeft, Loader2, ChevronRight, Sparkles, ShieldCheck, Stethoscope } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { assignDoctorWithAI } from '../services/aiService';

interface PatientEnrollmentProps {
  scannedId: string;
  onCancel: () => void;
  onSuccess: () => void;
}

type Step = 'info' | 'otp' | 'success';

export default function PatientEnrollment({ scannedId, onCancel, onSuccess }: PatientEnrollmentProps) {
  const [step, setStep] = useState<Step>('info');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiAssigning, setIsAiAssigning] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Male' as const,
    medicalHistory: '',
    requestedTreatment: '',
    doctorId: '',
    otp: ''
  });

  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpError, setOtpError] = useState(false);
  const [actualScannedId, setActualScannedId] = useState(scannedId);

  // Mock database for simple QR numbers
  const MOCK_PATIENT_DATABASE: Record<string, any> = {
    "HID-12345": {
      name: "Abhishek Sharma",
      age: "24",
      gender: "Male",
      medicalHistory: "Patient has no history of chronic, severe illnesses. Exhibits mild seasonal allergic rhinitis, specifically sensitive to spring pollen, resulting in nasal congestion, sneezing, and ocular pruritus. No history of asthma, diabetes, or hypertension. Previous surgical history is nil. Current medications: over-the-counter antihistamines as needed during spring.",
      requestedTreatment: "Comprehensive annual wellness examination. Patient is requesting a consultation regarding an updated allergy management plan, including potential testing for specific respiratory allergens and prescription-strength antihistamine or nasal corticosteroid recommendations."
    },
    "12345": {
      name: "Abhishek Sharma",
      age: "24",
      gender: "Male",
      medicalHistory: "Patient has no history of chronic, severe illnesses. Exhibits mild seasonal allergic rhinitis, specifically sensitive to spring pollen, resulting in nasal congestion, sneezing, and ocular pruritus. No history of asthma, diabetes, or hypertension. Previous surgical history is nil. Current medications: over-the-counter antihistamines as needed during spring.",
      requestedTreatment: "Comprehensive annual wellness examination. Patient is requesting a consultation regarding an updated allergy management plan, including potential testing for specific respiratory allergens and prescription-strength antihistamine or nasal corticosteroid recommendations."
    },
    "91123456789012": {
      name: "Rajesh Kumar",
      age: "45",
      gender: "Male",
      medicalHistory: "Diagnosed with Type 2 Diabetes Mellitus in 2020. Essential hypertension diagnosed in 2021. Patient experienced a left radial fracture in 2018, treated with open reduction and internal fixation (ORIF), fully healed with no residual deficit. Family history significant for cardiovascular disease (father). Current medications: Metformin 500mg BID, Amlodipine 5mg QD.",
      requestedTreatment: "Quarterly follow-up for glycemic control and adjustment of diabetic medication based on recent HbA1c results. Routine blood pressure check and cardiovascular risk assessment."
    },
    "98765": {
      name: "Aisha Khan",
      age: "29",
      gender: "Female",
      medicalHistory: "Diagnosed with bronchial asthma in childhood, currently categorized as mild persistent. Has a history of an uncomplicated appendectomy in 2015. No known drug allergies. Family history includes maternal hypothyroidism. Current medications: Albuterol sulfate inhaler (PRN), Fluticasone propionate (daily).",
      requestedTreatment: "Patient reports recent episodes of shortness of breath and wheezing, particularly during exercise. Requesting a pulmonary review, potential spirometry testing, and a medication refill for rescue inhaler."
    },
    "HID-67890": {
      name: "Meera Reddy",
      age: "52",
      gender: "Female",
      medicalHistory: "Bilateral knee osteoarthritis, diagnosed 5 years ago, progressively worsening. Essential hypertension well-controlled for 10 years. Borderline hyperlipidemia managed through diet. Previous surgeries: Cholecystectomy (2012). Current medications: Lisinopril 10mg QD, Ibuprofen 400mg PRN for joint pain, Glucosamine Chondroitin supplements.",
      requestedTreatment: "Detailed orthopedic consultation for intractable knee pain. Seeking evaluation for potential intra-articular corticosteroid injections or consideration for physical therapy referrals, alongside medication management review."
    },
    "HID-VJ221": {
      name: "Vikram Joshi",
      age: "36",
      gender: "Male",
      medicalHistory: "Generally healthy male with no known chronic medical conditions such as diabetes, hypertension, or cardiac issues. Underwent bilateral LASIK refractive eye surgery in 2019 without complications. Reports occasional work-related stress and subsequent tension headaches. No historical surgeries other than LASIK. Non-smoker.",
      requestedTreatment: "Comprehensive executive health evaluation including standard laboratory panels (CBC, CMP, Lipid panel). Requesting an updated vision screening post-LASIK and a brief consultation on ergonomic practices and stress-related tension headache management."
    },
    "HID-SC1984": {
      name: "Sarah Chen",
      age: "42",
      gender: "Female",
      medicalHistory: "Chronic migraine with aura, onset in early 20s, averaging 2-3 episodes per month. History of diet-controlled gestational diabetes mellitus (GDM) during pregnancy in 2014, resolved post-partum. No history of seizures or other neurological conditions. Current medications: Sumatriptan 50mg PRN at onset of migraine, Daily multivitamin.",
      requestedTreatment: "Specialist neurology consultation regarding an observed increase in the frequency and intensity of migraine episodes over the last two months. Patient is seeking an evaluation for prophylactic medication options and to rule out secondary causes of headaches."
    },
    "HID-MK808": {
      name: "Marcus King",
      age: "61",
      gender: "Male",
      medicalHistory: "History of coronary artery disease, stable angina, and hypercholesterolemia. Underwent angioplasty with stent placement in 2020. Current medications include Atorvastatin 40mg, Aspirin 81mg, and Metoprolol 50mg. No known drug allergies.",
      requestedTreatment: "Routine cardiology follow-up, EKG, and medication adjustment."
    },
    "HID-LP942": {
      name: "Laura Palmer",
      age: "27",
      gender: "Female",
      medicalHistory: "Asthma diagnosed at age 6, well-controlled with inhaled corticosteroids. History of eczema and mild iron-deficiency anemia. Appendectomy at age 12. Current medications: Symbicort inhaler, Ferrous sulfate supplements.",
      requestedTreatment: "General wellness check, complete blood count (CBC) to monitor anemia, and asthma action plan review."
    },
    "HID-RV001": {
      name: "Ravi Verma",
      age: "48",
      gender: "Male",
      medicalHistory: "Type 2 Diabetes Mellitus diagnosed 5 years ago, moderately controlled. Presents with peripheral neuropathy in lower extremities. Former smoker (quit 10 years ago). Current medications: Metformin 1000mg, Gabapentin 300mg.",
      requestedTreatment: "Endocrinology consultation for diabetes management and podiatry referral for peripheral neuropathy symptoms."
    },
    "HID-NK334": {
      name: "Naomi Kim",
      age: "35",
      gender: "Female",
      medicalHistory: "History of polycystic ovary syndrome (PCOS) and hypothyroidism. Currently trying to conceive. Current medications: Levothyroxine 75mcg, Prenatal vitamins.",
      requestedTreatment: "Obstetrics/Gynecology appointment for preconception counseling, thyroid panel, and ultrasound."
    }
  };

  useEffect(() => {
    try {
      let textToParse = scannedId.trim();
      if (textToParse.includes('```json')) {
        textToParse = textToParse.replace(/```json/g, '').replace(/```/g, '').trim();
      } else if (textToParse.includes('```')) {
        textToParse = textToParse.replace(/```/g, '').trim();
      }
      
      const firstBrace = textToParse.indexOf('{');
      const lastBrace = textToParse.lastIndexOf('}');
      const isLikelyJson = firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace;
      
      if (isLikelyJson) {
        try {
          const jsonString = textToParse.substring(firstBrace, lastBrace + 1);
          const data = JSON.parse(jsonString);
          if (data.healthId) setActualScannedId(data.healthId);
          else if (data.id) setActualScannedId(data.id);
          
          setFormData(prev => {
            let calculatedAge = prev.age;
            if (data.age) {
              calculatedAge = data.age.toString();
            } else if (data.dob) {
              const birthYear = new Date(data.dob).getFullYear();
              if (birthYear && !isNaN(birthYear)) {
                calculatedAge = (new Date().getFullYear() - birthYear).toString();
              }
            }
            
            // Normalize gender to match options ("Male", "Female", "Other")
            let normalizedGender = data.gender || data.sex || prev.gender;
            if (normalizedGender && typeof normalizedGender === 'string') {
               const l = normalizedGender.toLowerCase();
               if (l === 'male') normalizedGender = 'Male';
               else if (l === 'female') normalizedGender = 'Female';
               else if (l === 'other') normalizedGender = 'Other';
            }
            
            return {
              ...prev,
              name: data.name || data.patientName || prev.name,
              age: calculatedAge,
              gender: normalizedGender as any,
              medicalHistory: data.medicalHistory || data.history || data.chronologicalHistory || prev.medicalHistory,
              requestedTreatment: data.requestedTreatment || data.treatment || data.treatmentVector || prev.requestedTreatment,
            };
          });
        } catch (err) {
           console.error("JSON Parse failed for scannedId:", err);
           setActualScannedId(textToParse);
        }
      } else {
        // Not JSON - check if it matches our mock database
        const lookupIdNumeric = textToParse.replace(/[^0-9]/g, ''); // Extract only numbers
        const lookupIdAlphaNumeric = textToParse.replace(/[^a-zA-Z0-9\-]/g, ''); 
        
        let dbMatch = null;
        let matchedId = textToParse;

        if (MOCK_PATIENT_DATABASE[lookupIdAlphaNumeric]) {
          dbMatch = MOCK_PATIENT_DATABASE[lookupIdAlphaNumeric];
          matchedId = lookupIdAlphaNumeric;
        } else if (MOCK_PATIENT_DATABASE[lookupIdNumeric]) {
           dbMatch = MOCK_PATIENT_DATABASE[lookupIdNumeric];
           matchedId = lookupIdNumeric;
        }

        if (dbMatch) {
          setActualScannedId(matchedId);
          setFormData(prev => ({
            ...prev,
            name: dbMatch.name,
            age: dbMatch.age,
            gender: dbMatch.gender,
            medicalHistory: dbMatch.medicalHistory,
            requestedTreatment: dbMatch.requestedTreatment,
          }));
        } else {
          setActualScannedId(textToParse);
        }
      }
    } catch(e) {
      setActualScannedId(scannedId);
    }
  }, [scannedId]);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'doctors'));
        const docList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Doctor));
        setDoctors(docList);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'doctors');
      } finally {
        setIsLoadingDoctors(false);
      }
    };
    fetchDoctors();
  }, []);

  const handleAiAssign = async () => {
    if (!formData.medicalHistory || !formData.requestedTreatment) {
      alert("Please provide medical history and requested treatment for AI analysis.");
      return;
    }

    setIsAiAssigning(true);
    setAiReasoning(null);
    try {
      const result = await assignDoctorWithAI(
        formData.medicalHistory,
        formData.requestedTreatment,
        doctors
      );
      setFormData(prev => ({ ...prev, doctorId: result.doctorId }));
      setAiReasoning(result.reasoning);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiAssigning(false);
    }
  };

  const handleProceedToOtp = () => {
    if (!formData.doctorId || !formData.name || !formData.age) return;
    
    // Simulate sending OTP to user
    const newOtp = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(newOtp);
    setStep('otp');
    
    // In a real app, this would trigger an SMS/Email to the patient
    console.log(`[SIMULATED SMS] Your OTP for hospital admission is: ${newOtp}`);
  };

  const handleVerifyOtp = async () => {
    if (formData.otp === generatedOtp) {
      setOtpError(false);
      setIsSubmitting(true);
      try {
        await addDoc(collection(db, 'patients'), {
          healthId: actualScannedId,
          name: formData.name,
          age: parseInt(formData.age),
          gender: formData.gender,
          medicalHistory: formData.medicalHistory,
          requestedTreatment: formData.requestedTreatment,
          doctorId: formData.doctorId,
          status: 'Admitted',
          enrolledAt: new Date().toISOString()
        });
        setStep('success');
        setTimeout(onSuccess, 2000);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'patients');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setOtpError(true);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-3xl mx-auto p-12 bg-white border-4 border-black brutalist-shadow relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-10 opacity-[0.05] text-black pointer-events-none">
        <UserPlus size={200} />
      </div>

      <AnimatePresence mode="wait">
        {step === 'info' && (
          <motion.div
            key="info"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-10"
          >
            <div className="flex items-center gap-6 relative z-10">
              <button onClick={onCancel} className="p-4 bg-[#f2f2ee] hover:bg-black hover:text-white border-2 border-black transition-all brutalist-shadow-sm">
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-4xl font-serif italic font-bold text-zinc-900 tracking-tight leading-none">Admission Log</h1>
                <p className="font-mono text-[10px] font-bold text-[#88887e] mt-2 tracking-[0.2em]">IDENTITY: <span className="text-black">{actualScannedId}</span></p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-[#88887e]">NOMENCLATURE</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-6 py-4 bg-[#f2f2ee] border-2 border-black focus:bg-white outline-none transition-all text-black font-bold text-sm brutalist-shadow-sm"
                  placeholder="FULL LEGAL NAME"
                />
              </div>

              <div className="space-y-3">
                <label className="font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-[#88887e]">BIOMETRICS</label>
                <div className="flex gap-4">
                  <input
                    type="number"
                    value={formData.age}
                    onChange={e => setFormData({ ...formData, age: e.target.value })}
                    className="w-24 px-6 py-4 bg-[#f2f2ee] border-2 border-black focus:bg-white outline-none transition-all text-black font-bold text-sm brutalist-shadow-sm"
                    placeholder="AGE"
                  />
                  <select
                    value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                    className="flex-1 px-6 py-4 bg-[#f2f2ee] border-2 border-black focus:bg-white outline-none transition-all text-black font-bold text-sm brutalist-shadow-sm"
                  >
                    <option value="Male">MALE</option>
                    <option value="Female">FEMALE</option>
                    <option value="Other">OTHER</option>
                  </select>
                </div>
              </div>

              <div className="md:col-span-2 space-y-3">
                <label className="font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-[#88887e]">CHRONOLOGICAL HISTORY</label>
                <textarea
                  value={formData.medicalHistory}
                  onChange={e => setFormData({ ...formData, medicalHistory: e.target.value })}
                  className="w-full h-28 px-6 py-4 bg-[#f2f2ee] border-2 border-black focus:bg-white outline-none transition-all text-black font-medium text-sm brutalist-shadow-sm resize-none italic font-serif"
                  placeholder="KNOWN ALLERGIES, PAST SURGERIES..."
                />
              </div>

              <div className="md:col-span-2 space-y-3">
                <label className="font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-[#88887e]">TREATMENT VECTOR</label>
                <textarea
                  value={formData.requestedTreatment}
                  onChange={e => setFormData({ ...formData, requestedTreatment: e.target.value })}
                  className="w-full h-24 px-6 py-4 bg-[#f2f2ee] border-2 border-black focus:bg-white outline-none transition-all text-black font-medium text-sm brutalist-shadow-sm resize-none italic font-serif"
                  placeholder="PRIMARY REASON FOR VISIT..."
                />
              </div>

              <div className="md:col-span-2 p-8 bg-[#dfdfd9] border-2 border-black brutalist-shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Stethoscope size={18} className="text-black" />
                    <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-black">VECTOR ALLOCATION</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAiAssign}
                    disabled={isAiAssigning || !formData.medicalHistory}
                    className="flex items-center gap-3 px-6 py-3 bg-black text-white font-mono text-[9px] font-bold tracking-[0.2em] hover:bg-zinc-800 transition-all brutalist-shadow-sm disabled:opacity-50"
                  >
                    {isAiAssigning ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    ENGAGE AI MATCH
                  </button>
                </div>

                {aiReasoning && (
                  <motion.p 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="text-xs text-black bg-white p-4 border border-black leading-relaxed italic font-serif brutalist-shadow-sm"
                  >
                    "{aiReasoning}"
                  </motion.p>
                )}

                <div className="relative">
                  <select
                    value={formData.doctorId}
                    onChange={e => setFormData({ ...formData, doctorId: e.target.value })}
                    className="w-full px-6 py-4 bg-white border-2 border-black focus:bg-[#fafafa] outline-none transition-all appearance-none text-black font-bold text-sm tracking-tight cursor-pointer brutalist-shadow-sm"
                  >
                    <option value="" className="text-[#88887e]">MANUAL ALLOCATION</option>
                    {doctors.map(doctor => (
                      <option key={doctor.id} value={doctor.id}>{doctor.name.toUpperCase()} — {doctor.specialty.toUpperCase()}</option>
                    ))}
                  </select>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-black">
                    <ChevronRight size={18} className="rotate-90" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-6 pt-6">
              <button
                onClick={onCancel}
                className="flex-1 py-5 bg-white border-2 border-black text-[#88887e] font-mono font-bold tracking-[0.3em] text-[10px] hover:bg-[#f2f2ee] transition-all brutalist-shadow-sm"
              >
                ABORT
              </button>
              <button
                onClick={handleProceedToOtp}
                disabled={!formData.doctorId || !formData.name || !formData.medicalHistory}
                className="flex-[2] py-5 bg-black text-white font-mono font-bold tracking-[0.3em] text-[10px] hover:bg-zinc-800 transition-all brutalist-shadow disabled:opacity-30"
              >
                REQUEST AUTHORIZATION
              </button>
            </div>
          </motion.div>
        )}

        {step === 'otp' && (
          <motion.div
            key="otp"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center space-y-10 py-10"
          >
            <div className="w-24 h-24 bg-black text-white brutalist-shadow flex items-center justify-center mx-auto">
              <ShieldCheck size={48} />
            </div>
            
            <div className="space-y-4">
              <h2 className="text-3xl font-serif italic font-bold text-black tracking-tight leading-none uppercase">Sequence Validation</h2>
              <p className="font-serif italic text-[#66665e] max-w-sm mx-auto text-lg leading-snug">
                Standard security protocol requires 4-digit temporal verification from subject.
              </p>
              <div className="mt-6 px-6 py-3 bg-[#dfdfd9] text-black font-mono text-[9px] font-bold tracking-[0.3em] border border-black/10 inline-block uppercase italic">
                Sequence: {generatedOtp}
              </div>
            </div>

            <div className="max-w-xs mx-auto space-y-8">
              <input
                type="text"
                maxLength={4}
                value={formData.otp}
                onChange={e => setFormData({ ...formData, otp: e.target.value })}
                className={`w-full text-center text-5xl tracking-[1em] font-bold py-8 bg-[#f2f2ee] border-4 focus:outline-none transition-all ${
                  otpError ? 'border-rose-400 brutalist-shadow' : 'border-black brutalist-shadow-sm focus:bg-white'
                }`}
                placeholder="0000"
              />
              {otpError && <p className="font-mono text-[9px] font-bold text-rose-500 tracking-[0.2em] uppercase">INVALID SEQUENCE DETECTED</p>}
              
              <div className="space-y-4">
                <button
                  onClick={handleVerifyOtp}
                  disabled={formData.otp.length < 4 || isSubmitting}
                  className="w-full py-5 bg-black text-white font-mono font-bold tracking-[0.3em] text-[10px] hover:bg-zinc-800 transition-all brutalist-shadow disabled:opacity-30 flex items-center justify-center gap-3"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <span>EXECUTE ADMISSION</span>}
                </button>
                
                <button
                  onClick={() => setStep('info')}
                  className="font-mono text-[9px] font-bold text-[#88887e] hover:text-black tracking-[0.2em] transition-all uppercase"
                >
                  Return to Data Input
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-24 text-center space-y-8"
          >
            <div className="w-28 h-28 bg-emerald-500 text-white brutalist-shadow flex items-center justify-center mx-auto">
              <Check size={56} strokeWidth={3} />
            </div>
            <div>
              <h2 className="text-4xl font-serif italic font-bold text-zinc-900 tracking-tight leading-none uppercase">Registry Updated</h2>
              <p className="font-serif italic text-xl text-[#66665e] mt-4">Biometric sync complete. Patient admitted to roster.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

