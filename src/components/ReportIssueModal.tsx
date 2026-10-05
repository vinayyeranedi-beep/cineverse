import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  X,
  Send,
  CheckCircle2,
  Clock,
  MessageSquare,
  Phone,
  Film,
  Hash,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { IssueType, Ticket, TicketStatus } from '../types';
import { storeService } from '../services/store';

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  screen: string;
  row: string;
  seat: string;
  defaultOrderId?: string;
  initialIssueType?: IssueType;
}

const ISSUE_TYPES: IssueType[] = [
  'Wrong seat',
  'QR not working',
  'Order delayed',
  'Wrong or missing item',
  'Payment problem',
  'Other',
];

export const ReportIssueModal: React.FC<ReportIssueModalProps> = ({
  isOpen,
  onClose,
  screen,
  row,
  seat,
  defaultOrderId = '',
  initialIssueType,
}) => {
  const cleanSeatNum = seat.replace(/^[A-Za-z]+/, '') || seat;
  const cleanSeatLabel = `${row.toUpperCase()}${cleanSeatNum}`;

  const [issueType, setIssueType] = useState<IssueType>(initialIssueType || 'Wrong seat');
  const [description, setDescription] = useState('');
  const [orderId, setOrderId] = useState(defaultOrderId);
  const [contact, setContact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submittedTicket, setSubmittedTicket] = useState<Ticket | null>(null);

  // Sync default order ID and initial issue type when modal opens
  useEffect(() => {
    if (isOpen) {
      if (defaultOrderId) setOrderId(defaultOrderId);
      if (initialIssueType) setIssueType(initialIssueType);
      setErrorMessage('');
    }
  }, [isOpen, defaultOrderId, initialIssueType]);

  // Subscribe to live updates for the submitted ticket
  useEffect(() => {
    if (!submittedTicket) return;
    const unsub = storeService.subscribeTickets((tickets) => {
      const updated = tickets.find(
        (t) => t.id === submittedTicket.id || t.ticketId === submittedTicket.ticketId
      );
      if (updated) {
        setSubmittedTicket(updated);
      }
    });
    return () => unsub();
  }, [submittedTicket?.id, submittedTicket?.ticketId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const ticket = await storeService.createTicket({
        screen,
        row: row.toUpperCase(),
        seat: cleanSeatNum,
        issueType,
        description: description.trim() || undefined,
        orderId: orderId.trim() || undefined,
        contact: contact.trim() || undefined,
      });

      setSubmittedTicket(ticket);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit ticket. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmittedTicket(null);
    setDescription('');
    setContact('');
    setErrorMessage('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm animate-fade-in p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-issue-title"
    >
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={handleResetAndClose} aria-hidden="true" />

      {/* Card: Bottom sheet on mobile, centered modal on desktop */}
      <div className="relative w-full sm:max-w-lg bg-[#0B0B0F] border border-[#D4AF37]/50 rounded-t-3xl sm:rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden z-10 flex flex-col max-h-[92vh] text-white animate-slide-up">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 bg-[#15151C] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#E50914]/15 border border-[#E50914]/40 flex items-center justify-center text-[#E50914]">
              <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 id="report-issue-title" className="font-display font-black text-lg text-white">
                {submittedTicket ? 'Ticket Status' : 'Report an Issue'}
              </h2>
              <p className="text-xs text-[#A1A1AA]">
                Cinema staff will be notified immediately at the counter
              </p>
            </div>
          </div>

          <button
            onClick={handleResetAndClose}
            aria-label="Close"
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 min-h-[40px] min-w-[40px] flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Seat Banner - Locked & Attached Automatically */}
        <div className="px-4 py-2.5 bg-black/60 border-b border-zinc-800/80 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 text-zinc-300">
            <Film className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>
              Auditorium Location:{' '}
              <strong className="text-[#D4AF37] font-mono">
                Screen {screen} • Seat {cleanSeatLabel}
              </strong>
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider font-semibold">
            Auto-Attached
          </span>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-[#E50914]/15 border border-[#E50914]/50 text-white text-xs leading-relaxed flex items-start gap-2.5 animate-shake">
              <AlertTriangle className="w-4 h-4 text-[#E50914] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[#E50914]">Notice</p>
                <p className="text-zinc-200 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {submittedTicket ? (
            /* Live Ticket Status View */
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-2xl bg-[#15151C] border border-[#D4AF37]/40 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <span className="text-xs text-zinc-400 block">Ticket Reference</span>
                  <span className="font-mono font-black text-xl text-[#D4AF37] tracking-wider">
                    #{submittedTicket.ticketId}
                  </span>
                </div>
                <p className="text-xs text-zinc-300">
                  Your ticket has been sent to the kitchen and floor runners.
                </p>
              </div>

              {/* Status Pill */}
              <div className="p-3.5 rounded-xl bg-[#15151C] border border-zinc-800 flex items-center justify-between text-xs">
                <span className="text-zinc-400">Current Status:</span>
                <span
                  className={`px-3 py-1 rounded-full font-bold uppercase tracking-wider text-[11px] ${
                    submittedTicket.status === 'open'
                      ? 'bg-[#E50914]/20 text-[#E50914] border border-[#E50914]/50'
                      : submittedTicket.status === 'in_progress'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                  }`}
                >
                  {submittedTicket.status === 'open' && 'Open'}
                  {submittedTicket.status === 'in_progress' && 'In Progress'}
                  {submittedTicket.status === 'resolved' && 'Resolved'}
                </span>
              </div>

              {/* Ticket Details */}
              <div className="p-3.5 rounded-xl bg-[#15151C] border border-zinc-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Issue:</span>
                  <span className="font-semibold text-white">{submittedTicket.issueType}</span>
                </div>
                {submittedTicket.orderId && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Linked Order:</span>
                    <span className="font-mono text-[#D4AF37]">#{submittedTicket.orderId}</span>
                  </div>
                )}
                {submittedTicket.description && (
                  <div className="pt-2 border-t border-zinc-800">
                    <span className="text-zinc-400 block mb-1">Your Note:</span>
                    <p className="text-zinc-200 italic bg-black/40 p-2.5 rounded-lg border border-zinc-800/80">
                      "{submittedTicket.description}"
                    </p>
                  </div>
                )}
              </div>

              {/* Staff Reply Section */}
              {submittedTicket.staffReply ? (
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs space-y-1.5 animate-pulse-subtle">
                  <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Staff Response:</span>
                  </div>
                  <p className="text-white leading-relaxed font-medium">
                    {submittedTicket.staffReply}
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[#D4AF37] animate-spin" />
                  <span>Awaiting cinema staff response...</span>
                </div>
              )}

              <button
                onClick={handleResetAndClose}
                className="w-full py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-colors min-h-[44px]"
              >
                Done
              </button>
            </div>
          ) : (
            /* Ticket Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Issue Type Dropdown */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Issue Type <span className="text-[#E50914]">*</span>
                </label>
                <div className="relative">
                  <select
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value as IssueType)}
                    className="w-full bg-[#15151C] border border-zinc-700 rounded-xl px-3.5 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37] appearance-none cursor-pointer"
                  >
                    {ISSUE_TYPES.map((type) => (
                      <option key={type} value={type} className="bg-[#15151C] text-white">
                        {type}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Description Box (Optional) */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Description <span className="text-zinc-500 font-normal normal-case">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what's wrong so our staff can assist immediately..."
                  className="w-full bg-[#15151C] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37] resize-none"
                />
              </div>

              {/* Order ID (Optional, Auto-filled if present) */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>
                    Order ID <span className="text-zinc-500 font-normal normal-case">(optional)</span>
                  </span>
                  {orderId && (
                    <span className="text-[10px] text-[#D4AF37] font-mono">Linked</span>
                  )}
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="e.g. SS-9041"
                    className="w-full bg-[#15151C] border border-zinc-700 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {/* Contact Number (Optional) */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Contact Number{' '}
                  <span className="text-zinc-500 font-normal normal-case">(optional)</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="Phone number for staff to reach you"
                    className="w-full bg-[#15151C] border border-zinc-700 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#E50914] hover:bg-[#c80812] disabled:opacity-50 text-white font-display font-black text-sm tracking-wide shadow-lg shadow-[#E50914]/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] min-h-[48px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting Ticket...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 stroke-[2.2]" />
                      <span>Submit Ticket for Seat {cleanSeatLabel}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
