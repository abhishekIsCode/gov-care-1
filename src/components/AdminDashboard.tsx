import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Doctor, Patient, OperationType } from '../types';
import { handleFirestoreError } from '../lib/utils';
import { Users, User, Stethoscope, Search, Scan, Plus, Loader2, ChevronRight, Activity, ArrowLeft, ClipboardList, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AIVisionScanner from './AIVisionScanner';
import PatientEnrollment from './PatientEnrollment';

interface PatientCardProps {
  key?: React.Key;
  patient: Patient;
  doctors: Doctor[];
}

function PatientRow({ patient, doctors }: PatientCardProps) {
  const doctor = doctors.find(d => d.id === patient.doctorId);
  
  return (
    <div className="grid grid-cols-4 px-8 py-6 border-b border-[#f2f2ee] hover:bg-[#fafafa] transition-colors group">
      <div className="flex flex-col">
        <span className="font-bold text-sm tracking-tight text-black flex items-center gap-2">
          {patient.name}
        </span>
        <span className="font-mono text-[9px] text-[#88887e] mt-1 uppercase tracking-widest">{patient.healthId}</span>
      </div>
      <div className="flex items-center">
        <span className="text-xs font-medium text-[#66665e] italic font-serif leading-none">{patient.requestedTreatment || 'General Checkup'}</span>
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

  useEffect(() => {
    const unsubDoctors = onSnapshot(collection(db, 'doctors'), (snapshot) => {
      const docList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Doctor));
      setDoctors(docList);
      
      // Auto-seed if empty
      if (snapshot.empty && !isLoading) {
        const seed = async () => {
          const sampleDoctors = [
            { name: "DR. SARAH CHEN", specialty: "CARDIOLOGY", email: "sarah.chen@healink.sys" },
            { name: "DR. JAMES WILSON", specialty: "NEUROLOGY", email: "james.wilson@healink.sys" },
            { name: "DR. ELENA RODRIGUEZ", specialty: "PEDIATRICS", email: "elena.r@healink.sys" },
            { name: "DR. MICHAEL PARK", specialty: "ONCOLOGY", email: "m.park@healink.sys" },
          ];
          for (const d of sampleDoctors) {
            await addDoc(collection(db, 'doctors'), d);
          }
        };
        seed();
      }
    });
    const unsubPatients = onSnapshot(collection(db, 'patients'), (snapshot) => {
      setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)));
      setIsLoading(false);
    });
    return () => { unsubDoctors(); unsubPatients(); };
  }, [isLoading]);

  const stats = [
    { label: 'Active Admissions', value: patients.filter(p => p.status === 'Admitted').length, icon: Activity },
    { label: 'Pending Triage', value: patients.filter(p => !p.doctorId || p.status === 'Pending').length, icon: Clock },
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
          <h1 className="font-serif italic text-4xl font-bold tracking-tighter text-black">HealLink.</h1>
          <p className="font-mono text-[9px] tracking-[0.3em] font-bold text-[#b5b5ad] mt-2 italic">SYSTEM V1.0.4</p>
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
                <div className="grid grid-cols-4 bg-white border-b border-[#cbcbb5] px-8 py-4">
                  {['PATIENT.IDENTITY', 'REQUESTED.TREATMENT', 'ASSIGNED.SPECIALIST', 'SYSTEM.STATUS'].map((label) => (
                    <span key={label} className="font-serif italic text-[10px] text-[#cbcbb5] tracking-[0.1em]">{label}</span>
                  ))}
                </div>

                <div className="min-h-[400px] flex flex-col bg-white">
                  {patients.length > 0 ? (
                    patients
                      .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.healthId.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((patient) => (
                        <PatientRow key={patient.id} patient={patient} doctors={doctors} />
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
                <p className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#88887e] mt-2">TOTAL ARCHIVE: {patients.length} RECORDS</p>
              </div>

              <div className="bg-white border-2 border-black brutalist-shadow overflow-hidden">
                <div className="grid grid-cols-4 bg-white border-b border-[#cbcbb5] px-8 py-4">
                  {['PATIENT.IDENTITY', 'REQUESTED.TREATMENT', 'ASSIGNED.SPECIALIST', 'SYSTEM.STATUS'].map((label) => (
                    <span key={label} className="font-serif italic text-[10px] text-[#cbcbb5] tracking-[0.1em]">{label}</span>
                  ))}
                </div>
                <div className="flex flex-col">
                  {patients.map((patient) => (
                    <PatientRow key={patient.id} patient={patient} doctors={doctors} />
                  ))}
                  {patients.length === 0 && (
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
      </AnimatePresence>
    </div>
  );
}

