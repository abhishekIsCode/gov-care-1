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
          healthId: scannedId,
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
                <p className="font-mono text-[10px] font-bold text-[#88887e] mt-2 tracking-[0.2em]">IDENTITY: <span className="text-black">{scannedId}</span></p>
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

