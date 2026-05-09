import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Doctor, Patient, OperationType } from '../types';
import { handleFirestoreError } from '../lib/utils';
import { Users, User, Stethoscope, Search, Scan, Plus, Loader2, ChevronRight, Activity, ArrowLeft, ClipboardList, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AIVisionScanner from './AIVisionScanner';
import PatientEnrollment from './PatientEnrollment';
import PatientIdBadge from './PatientIdBadge';

interface PatientCardProps {
  key?: React.Key;
  patient: Patient;
  doctors: Doctor[];
  onClick?: () => void;
}

function PatientRow({ patient, doctors, onClick }: PatientCardProps) {
  const doctor = doctors.find(d => d.id === patient.doctorId);
  
  return (
    <div 
      onClick={onClick}
      className={`grid grid-cols-5 px-8 py-6 border-b border-[#f2f2ee] hover:bg-[#fafafa] transition-colors group gap-4 ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center">
        <span className="font-mono text-[10px] text-[#88887e] font-bold uppercase tracking-widest bg-[#f2f2ee] px-2 py-1 rounded">{patient.healthId}</span>
      </div>
      <div className="flex items-center">
        <span className="font-bold text-sm tracking-tight text-black truncate">
          {patient.name}
        </span>
      </div>
      <div className="flex items-center pr-4">
        <span className="text-xs font-medium text-[#66665e] italic font-serif leading-tight line-clamp-2">{patient.requestedTreatment || 'General Checkup'}</span>
      </div>
      <div className="flex items-center">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-black uppercase tracking-tight font-mono">
            {doctor ? doctor.name : 'AWAITING ALLOCATION'}
          </span>
          {doctor && (
            <span className="font-mono text-[8px] text-[#88887e] mt-0.5 uppercase tracking-widest font-bold opacity-60">
              {doctor.specialty}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${patient.status === 'Admitted' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          <span className="font-mono text-[9px] font-bold tracking-widest text-[#66665e] uppercase">{patient.status}</span>
        </div>
        <ChevronRight size={14} className="text-[#cbcbb5] group-hover:text-black transition-colors" />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedId, setScannedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTab, setCurrentTab] = useState<'monitor' | 'admit' | 'patients'>('monitor');
  const [manualHealthId, setManualHealthId] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const uniquePatients = React.useMemo(() => {
    return Array.from(new Map(patients.map(p => [p.healthId, p])).values());
  }, [patients]);
  
  const displayPatients = uniquePatients.slice(0, 3);

  useEffect(() => {
    const unsubDoctors = onSnapshot(collection(db, 'doctors'), (snapshot) => {
      const docList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Doctor));
      setDoctors(docList);
    });
    const unsubPatients = onSnapshot(collection(db, 'patients'), (snapshot) => {
      const patList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));
      const uniquePatients = Array.from(new Map(patList.map(p => [p.healthId, p])).values());
      setPatients(uniquePatients);
      setIsLoading(false);
    });
    return () => { unsubDoctors(); unsubPatients(); };
  }, []);

  // Auto-seeding logic
  useEffect(() => {
    if (!isLoading && doctors.length === 0) {
      const seedDoctors = async () => {
        const sampleDoctors = [
          { name: "DR. SARAH CHEN", specialty: "CARDIOLOGY", email: "sarah.chen@govcare.sys" },
          { name: "DR. JAMES WILSON", specialty: "NEUROLOGY", email: "james.wilson@govcare.sys" },
          { name: "DR. ELENA RODRIGUEZ", specialty: "PEDIATRICS", email: "elena.r@govcare.sys" },
          { name: "DR. MICHAEL PARK", specialty: "ONCOLOGY", email: "m.park@govcare.sys" },
        ];
        for (const d of sampleDoctors) {
          await addDoc(collection(db, 'doctors'), d);
        }
      };
      seedDoctors();
    }
  }, [isLoading, doctors.length]);

  useEffect(() => {
    const syncPatients = async () => {
      const samplePatients = [
        { 
          healthId: "HID-12345", 
          name: "Abhishek Sharma", 
          age: 24, 
          gender: "Male", 
          requestedTreatment: "Comprehensive annual wellness examination. Patient is requesting a consultation regarding an updated allergy management plan, including potential testing for specific respiratory allergens and prescription-strength antihistamine or nasal corticosteroid recommendations.", 
          medicalHistory: "Patient has no history of chronic, severe illnesses. Exhibits mild seasonal allergic rhinitis, specifically sensitive to spring pollen, resulting in nasal congestion, sneezing, and ocular pruritus. No history of asthma, diabetes, or hypertension. Previous surgical history is nil. Current medications: over-the-counter antihistamines as needed during spring.",
          doctorId: doctors[0]?.id, 
          status: "Admitted", 
          enrolledAt: new Date().toISOString() 
        },
        { 
          healthId: "HID-67890", 
          name: "Meera Reddy", 
          age: 52, 
          gender: "Female", 
          requestedTreatment: "Detailed orthopedic consultation for intractable knee pain. Seeking evaluation for potential intra-articular corticosteroid injections or consideration for physical therapy referrals, alongside medication management review.", 
          medicalHistory: "Bilateral knee osteoarthritis, diagnosed 5 years ago, progressively worsening. Essential hypertension well-controlled for 10 years. Borderline hyperlipidemia managed through diet. Previous surgeries: Cholecystectomy (2012). Current medications: Lisinopril 10mg QD, Ibuprofen 400mg PRN for joint pain, Glucosamine Chondroitin supplements.",
          doctorId: doctors[1]?.id, 
          status: "Admitted", 
          enrolledAt: new Date().toISOString() 
        },
        { 
          healthId: "HID-VJ221", 
          name: "Vikram Joshi", 
          age: 36, 
          gender: "Male", 
          requestedTreatment: "Comprehensive executive health evaluation including standard laboratory panels (CBC, CMP, Lipid panel). Requesting an updated vision screening post-LASIK and a brief consultation on ergonomic practices and stress-related tension headache management.", 
          medicalHistory: "Generally healthy male with no known chronic medical conditions such as diabetes, hypertension, or cardiac issues. Underwent bilateral LASIK refractive eye surgery in 2019 without complications. Reports occasional work-related stress and subsequent tension headaches. No historical surgeries other than LASIK. Non-smoker.",
          doctorId: doctors[3]?.id, 
          status: "Pending", 
          enrolledAt: new Date().toISOString() 
        }
        ];

      // Update existing patients or add if missing
      for (const p of samplePatients) {
        const existing = patients.find(ep => ep.healthId === p.healthId);
        if (existing) {
          // If name doesn't match our updated comprehensive data, update the doc
          if (existing.name !== p.name || existing.medicalHistory !== p.medicalHistory) {
            try {
              const { setDoc, doc } = await import('firebase/firestore');
              await setDoc(doc(db, 'patients', existing.id), {
                ...existing, // keep any other fields
                ...p, // overwrite with p which has all required fields
              });
            } catch (err) {
              handleFirestoreError(err, OperationType.UPDATE, 'patients');
            }
          }
        } else if (doctors.length >= 4) {
          try {
             const { addDoc, collection } = await import('firebase/firestore');
             await addDoc(collection(db, 'patients'), p);
          } catch (err) {
             handleFirestoreError(err, OperationType.CREATE, 'patients');
          }
        }
      }
    };
    
    if (!isLoading && doctors.length >= 4) {
      syncPatients();
    }
  }, [isLoading, patients, doctors]);

  const stats = [
    { label: 'Active Admissions', value: displayPatients.filter(p => p.status === 'Admitted').length, icon: Activity },
    { label: 'Pending Triage', value: displayPatients.filter(p => !p.doctorId || p.status === 'Pending').length, icon: Clock },
    { label: 'Available Doctors', value: doctors.length, icon: User },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#e5e5e0]">
        <div className="flex flex-col items-center gap-4">
          <Activity className="w-12 h-12 text-black animate-spin" />
          <p className="text-black font-mono font-bold tracking-[0.3em] uppercase text-[9px] animate-pulse">Initializing System Node...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#e5e5e0] overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-[#dfdfd9] border-r border-[#cbcbb5] flex flex-col relative z-20">
        <div className="p-10 mb-8">
          <div className="flex items-center gap-3">
            <Activity className="text-[#2dd4bf]" size={38} strokeWidth={2.5} />
            <h1 className="font-serif text-4xl font-medium tracking-tight text-[#333333] leading-none" style={{ fontFamily: 'Georgia, serif' }}>GovCare</h1>
          </div>
          <p className="font-mono text-[10px] tracking-[0.4em] font-medium text-[#a3a3a3] mt-2">123456</p>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {[
            { id: 'monitor', label: 'MONITOR', icon: Activity },
            { id: 'admit', label: 'ADMIT PATIENT', icon: Plus },
            { id: 'patients', label: 'REGISTERED PATIENTS', icon: Users },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id as any)}
              className={`w-full flex items-center gap-4 px-6 py-4 transition-all duration-200 group relative border border-transparent ${
                currentTab === item.id 
                ? 'bg-[#1a1a1a] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]' 
                : 'text-[#88887e] hover:bg-[#d5d5cd] hover:text-[#1a1a1a]'
              }`}
            >
              <item.icon size={16} className={currentTab === item.id ? 'text-white' : 'text-[#b5b5ad] group-hover:text-[#1a1a1a]'} />
              <span className="font-mono text-[10px] font-bold tracking-[0.2em]">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-8">
          <button className="flex items-center gap-3 font-mono text-[9px] font-bold tracking-[0.2em] text-[#b5b5ad] hover:text-[#1a1a1a] transition-colors">
            <ArrowLeft size={14} />
            <span>SYSTEM LOGOUT</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header/Stats Section */}
        {!scannedId && currentTab !== 'admit' && (
          <header className="p-12 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {stats.map((stat, idx) => (
                <div key={idx} className="bg-white border-2 border-black p-8 brutalist-shadow relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-6">
                    <stat.icon size={18} className="text-[#cbcbb5]" />
                    <span className="font-mono text-[8px] font-bold tracking-[0.3em] text-[#cbcbb5]">METRIC.LIVE</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-6xl font-bold tracking-tight text-black leading-none">{stat.value}</p>
                    <p className="font-serif italic text-lg text-[#88887e] mt-2">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </header>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-12 pb-12 custom-scrollbar">
          {scannedId ? (
            <div className="max-w-2xl mx-auto pt-12">
               <PatientEnrollment 
                scannedId={scannedId} 
                onCancel={() => setScannedId(null)} 
                onSuccess={() => {
                  setScannedId(null);
                  setCurrentTab('patients');
                }} 
              />
            </div>
          ) : currentTab === 'admit' ? (
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="max-w-4xl mx-auto pt-24"
            >
              <div className="flex justify-between items-end mb-16">
                <div>
                  <h1 className="font-serif italic text-6xl font-bold text-black tracking-tight mb-2">Patient Enrollment.</h1>
                  <p className="font-mono text-[10px] font-bold tracking-[0.4em] text-[#88887e]">REGISTRY ACCESS PROTOCOL V3</p>
                </div>
              </div>

              <div className="flex gap-4 mb-12">
                <button 
                  onClick={() => setIsScannerOpen(true)}
                  className="flex items-center gap-3 px-8 py-5 border-2 border-black bg-white hover:bg-[#f2f2ee] transition-all font-mono text-[10px] font-bold tracking-[0.2em] brutalist-shadow-sm"
                >
                  <Scan size={16} />
                  QUICK SCAN
                </button>
                <div className="relative">
                  <div className="absolute inset-0 bg-[#ff4d00]" />
                  <button 
                    onClick={() => setCurrentTab('admit')}
                    className="relative flex items-center gap-3 px-10 py-5 bg-black text-white hover:bg-zinc-800 transition-all font-mono text-[10px] font-bold tracking-[0.2em] -translate-x-1 -translate-y-1"
                  >
                    <span className="text-[#88887e]">#</span> MANUAL ENTRY
                  </button>
                </div>
              </div>

              <div className="h-px bg-[#cbcbb5] w-full max-w-2xl mb-12" />

              <div className="space-y-4 mb-16">
                <p className="font-serif italic text-xl text-[#88887e]">Health ID / Social Identifier</p>
                <input 
                  type="text"
                  value={manualHealthId}
                  onChange={(e) => setManualHealthId(e.target.value.toUpperCase())}
                  placeholder="HID-XXXXX"
                  className="w-full bg-transparent border-none font-mono text-7xl font-bold tracking-tight outline-none placeholder:text-[#cbcbb5] text-black"
                />
                <div className="h-1 bg-black w-full" />
              </div>

                <div className="flex gap-2 flex-wrap mb-16">
                  {['John Doe (HID-12345)', 'Jane Smith (HID-67890)', 'Arthur Vance (HID-VJ221)', 'Sarah Connor (HID-SC1984)'].map((tag, i) => (
                    <button 
                      key={i} 
                      onClick={() => {
                        const id = tag.match(/\(([^)]+)\)/)?.[1];
                        if (id) {
                          setManualHealthId(id);
                        }
                      }}
                      className="px-4 py-2 border border-[#cbcbb5] font-mono text-[9px] text-[#88887e] bg-[#dfdfd9]/30 hover:bg-[#cbcbb5]/20 hover:text-black transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>

              <div className="relative inline-block w-full">
                <div className="absolute inset-0 bg-[#ff4d00] translate-x-2 translate-y-2" />
                <button 
                  onClick={() => {
                    if (manualHealthId) {
                      setScannedId(manualHealthId);
                    }
                  }}
                  disabled={!manualHealthId || manualHealthId.length < 5}
                  className="relative w-full py-8 bg-[#1a1a1a] text-white font-mono text-sm font-bold tracking-[0.4em] hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    AUTHENTICATE IDENTITY <motion.span animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>→</motion.span>
                  </span>
                  <motion.div 
                    initial={false}
                    className="absolute inset-0 bg-[#ff4d00] opacity-0 group-hover:opacity-10 transition-opacity"
                  />
                </button>
              </div>
            </motion.div>
          ) : currentTab === 'monitor' ? (
            <>
              <div className="mb-8 border-b border-[#cbcbb5] pb-4 flex justify-between items-end">
                <h2 className="font-serif italic text-4xl text-black">Active Monitoring</h2>
                <div className="flex items-center gap-6">
                   <div className="relative">
                    <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-[#cbcbb5]" size={14} />
                    <input 
                      type="text" 
                      placeholder="SEARCH LOG"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-transparent border-none pl-6 font-mono text-[9px] font-bold tracking-[0.2em] outline-none text-black placeholder:text-[#cbcbb5] w-32 focus:w-48 transition-all"
                    />
                  </div>
                  <p className="font-mono text-[8px] font-bold tracking-[0.2em] text-[#cbcbb5]">SORT: LATEST FIRST</p>
                </div>
              </div>

              <div className="bg-white border-2 border-black brutalist-shadow overflow-hidden">
                <div className="grid grid-cols-5 gap-4 bg-white border-b border-[#cbcbb5] px-8 py-4">
                  {['HEALTH.ID', 'PATIENT.NAME', 'REQUESTED.TREATMENT', 'ASSIGNED.SPECIALIST', 'SYSTEM.STATUS'].map((label) => (
                    <span key={label} className="font-serif italic text-[10px] text-[#cbcbb5] tracking-[0.1em]">{label}</span>
                  ))}
                </div>

                <div className="min-h-[400px] flex flex-col bg-white">
                  {displayPatients.length > 0 ? (
                    displayPatients
                      .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.healthId.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((patient) => (
                        <PatientRow key={patient.id} patient={patient} doctors={doctors} onClick={() => setSelectedPatient(patient)} />
                      ))
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center py-40 opacity-30 italic font-serif text-3xl text-[#cbcbb5] px-8 text-center bg-white">
                      <p>No active admissions found in log.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="space-y-8"
            >
              <div className="mb-8 border-b border-[#cbcbb5] pb-4">
                <h2 className="font-serif italic text-4xl text-black">Registered Patients</h2>
                <p className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#88887e] mt-2">TOTAL ARCHIVE: {displayPatients.length} RECORDS</p>
              </div>

              <div className="bg-white border-2 border-black brutalist-shadow overflow-hidden">
                <div className="grid grid-cols-5 gap-4 bg-white border-b border-[#cbcbb5] px-8 py-4">
                  {['HEALTH.ID', 'PATIENT.NAME', 'REQUESTED.TREATMENT', 'ASSIGNED.SPECIALIST', 'SYSTEM.STATUS'].map((label) => (
                    <span key={label} className="font-serif italic text-[10px] text-[#cbcbb5] tracking-[0.1em]">{label}</span>
                  ))}
                </div>
                <div className="flex flex-col">
                  {displayPatients.map((patient) => (
                    <PatientRow key={patient.id} patient={patient} doctors={doctors} onClick={() => setSelectedPatient(patient)} />
                  ))}
                  {displayPatients.length === 0 && (
                    <div className="py-20 text-center italic font-serif text-2xl text-[#cbcbb5]">Archive empty.</div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {isScannerOpen && (
          <AIVisionScanner 
            onIdScanned={(id) => {
              setScannedId(id);
              setIsScannerOpen(false);
            }} 
            onClose={() => setIsScannerOpen(false)} 
          />
        )}
        
        {selectedPatient && (
          <PatientIdBadge
            patient={selectedPatient}
            onClose={() => setSelectedPatient(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

