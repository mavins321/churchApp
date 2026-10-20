import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { Member } from '../../types';
import { Church, ShieldCheck, Download, Share2 } from 'lucide-react';

interface DigitalCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
}

export const DigitalCardModal: React.FC<DigitalCardModalProps> = ({
  isOpen,
  onClose,
  member,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (isOpen && canvasRef.current && member) {
      QRCode.toCanvas(
        canvasRef.current,
        JSON.stringify({
          memberId: member.id,
          num: member.membershipNumber,
          name: member.fullName,
          dept: member.departmentName
        }),
        {
          width: 140,
          margin: 1,
          color: {
            dark: '#064e3b',
            light: '#ffffff'
          }
        },
        (error) => {
          if (error) console.error('QR code generation error:', error);
        }
      );
    }
  }, [isOpen, member]);

  if (!member) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Digital Membership Card" maxWidth="sm">
      <div className="flex flex-col items-center">
        {/* Card Canvas Container */}
        <div className="w-full bg-gradient-to-br from-emerald-800 via-emerald-900 to-slate-950 text-white rounded-3xl p-6 shadow-2xl relative overflow-hidden border border-emerald-700/50">
          {/* Subtle watermark / glow */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Card Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Church className="w-4 h-4 text-emerald-300" />
              </div>
              <div>
                <h4 className="text-xs font-black tracking-widest uppercase text-emerald-300">FAITHTRACK</h4>
                <p className="text-[9px] text-emerald-100/70 uppercase">FaithTrack Cathedral</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Verified Member
            </span>
          </div>

          {/* Member Details & Photo */}
          <div className="flex items-center gap-4 mb-6">
            <div className="ring-2 ring-emerald-400/40 rounded-full p-0.5 bg-white/10">
              <Avatar name={member.fullName} photoUrl={member.photoUrl} size="lg" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-extrabold text-white tracking-tight truncate">
                {member.fullName}
              </h3>
              <p className="text-xs text-emerald-300 font-medium truncate">
                {member.departmentName || 'General Assembly'}
              </p>
              <p className="text-[11px] text-slate-300 mt-0.5 truncate">
                {member.groupName || 'Fellowship Member'}
              </p>
            </div>
          </div>

          {/* QR Code and Member Number */}
          <div className="bg-white rounded-2xl p-4 flex items-center justify-between gap-3 text-slate-900 shadow-inner">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Membership ID
              </span>
              <span className="text-sm sm:text-base font-mono font-black text-slate-900 tracking-tight">
                {member.membershipNumber}
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold block mt-1">
                Joined: {member.membershipDate || '2026'}
              </span>
            </div>
            <div className="shrink-0 bg-white p-1 rounded-xl shadow-xs">
              <canvas ref={canvasRef} className="w-[84px] h-[84px]" />
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-400 text-center mt-4">
          Show this card at the church entrance or scan your QR at any church check-in desk.
        </p>

        <div className="w-full mt-5">
          <Button onClick={onClose} variant="primary" className="w-full">
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};
