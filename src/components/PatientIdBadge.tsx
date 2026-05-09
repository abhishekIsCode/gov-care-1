import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Patient } from '../types';
import { X, User } from 'lucide-react';
import { motion } from 'motion/react';

interface PatientIdBadgeProps {
  patient: Patient;
  onClose: () => void;
}

export default function PatientIdBadge({ patient, onClose }: PatientIdBadgeProps) {
  // Format the data to put in the QR code
  const qrData = JSON.stringify({
    healthId: patient.healthId,
    name: patient.name,
    age: patient.age,
    gender: patient.gender,
    medicalHistory: patient.medicalHistory,
    requestedTreatment: patient.requestedTreatment
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-white border-4 border-black brutalist-shadow relative overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <User size={150} />
        </div>

        <div className="flex items-center justify-between p-6 border-b-2 border-black bg-[#f2f2ee]">
          <div>
            <h2 className="font-serif italic text-2xl font-bold tracking-tight text-black leading-none">Identity Tag</h2>
            <p className="font-mono text-[9px] font-bold tracking-[0.2em] text-[#88887e] mt-1">SCANNABLE PASS</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black hover:text-white border-2 border-black transition-all bg-white brutalist-shadow-sm active:translate-x-0.5 active:translate-y-0.5">
            <X size={18} />
          </button>
        </div>

        <div className="p-8 flex flex-col items-center overflow-y-auto custom-scrollbar">
          <div className="p-4 bg-white border-4 border-black brutalist-shadow-sm mb-6">
            <QRCodeSVG value={qrData} size={200} level="M" includeMargin={false} />
          </div>

          <div className="w-full space-y-4">
            <div className="space-y-1 text-center">
              <h3 className="font-bold text-xl tracking-tight text-black">{patient.name}</h3>
              <p className="font-mono text-[10px] font-bold tracking-widest text-[#88887e] uppercase">{patient.healthId}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t-2 border-dashed border-[#cbcbb5] pt-4">
              <div>
                <p className="font-mono text-[8px] font-bold tracking-[0.2em] text-[#cbcbb5] uppercase">Biometrics</p>
                <p className="font-medium text-sm text-black">{patient.age}Y • {patient.gender}</p>
              </div>
              <div>
                <p className="font-mono text-[8px] font-bold tracking-[0.2em] text-[#cbcbb5] uppercase">Status</p>
                <p className="font-medium text-sm text-black">{patient.status}</p>
              </div>
            </div>

            <div className="border-t-2 border-dashed border-[#cbcbb5] pt-4 space-y-3">
              <div>
                <p className="font-mono text-[8px] font-bold tracking-[0.2em] text-[#cbcbb5] uppercase">Chronological History</p>
                <p className="font-serif italic text-xs text-[#66665e] mt-1">{patient.medicalHistory || 'None recorded'}</p>
              </div>
              
              <div>
                <p className="font-mono text-[8px] font-bold tracking-[0.2em] text-[#cbcbb5] uppercase">Treatment Vector</p>
                <p className="font-serif italic text-xs text-[#66665e] mt-1">{patient.requestedTreatment || 'General Checkup'}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
