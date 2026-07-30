import React from 'react';
import { CheckCircle2, Clock, XCircle, AlertCircle, User, Shield, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TimelineStep {
  id: string;
  stepName: string;
  status: 'COMPLETED' | 'PENDING' | 'REJECTED' | 'SKIPPED' | string;
  actorName?: string | null;
  actorRole?: string | null;
  comment?: string | null;
  actionAt?: string | null;
  createdAt?: string;
}

interface TimelineApprovalProps {
  timelines: TimelineStep[];
  currentStatus: string;
}

export default function TimelineApproval({ timelines, currentStatus }: TimelineApprovalProps) {
  if (!timelines || timelines.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Belum ada catatan timeline untuk pengajuan ini.
      </div>
    );
  }

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case 'REJECTED':
        return <XCircle className="h-5 w-5 text-rose-500" />;
      case 'PENDING':
        return <Clock className="h-5 w-5 text-amber-500 animate-pulse" />;
      case 'SKIPPED':
        return <AlertCircle className="h-5 w-5 text-slate-400" />;
      default:
        return <Clock className="h-5 w-5 text-slate-400" />;
    }
  };

  const getStepBadgeClass = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'REJECTED':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'PENDING':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      default:
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
      {timelines.map((item, index) => {
        const isCompleted = item.status === 'COMPLETED';
        const isPending = item.status === 'PENDING';
        const isRejected = item.status === 'REJECTED';

        return (
          <div key={item.id || index} className="relative group">
            {/* Timeline Dot Icon */}
            <div className="absolute -left-[31px] top-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-white dark:bg-slate-900 ring-4 ring-slate-100 dark:ring-slate-950 shadow-sm transition-transform duration-200 group-hover:scale-110">
              {getStepIcon(item.status)}
            </div>

            {/* Timeline Content Box */}
            <div
              className={cn(
                'rounded-2xl border p-4 transition-all duration-200 shadow-sm',
                isCompleted
                  ? 'border-emerald-200/80 bg-emerald-50/30 dark:border-emerald-900/50 dark:bg-emerald-950/10'
                  : isPending
                  ? 'border-amber-200/80 bg-amber-50/30 dark:border-amber-900/50 dark:bg-amber-950/10 ring-1 ring-amber-400/20'
                  : isRejected
                  ? 'border-rose-200/80 bg-rose-50/30 dark:border-rose-900/50 dark:bg-rose-950/10'
                  : 'border-slate-200/80 bg-white/70 dark:border-slate-800 dark:bg-slate-900/40'
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {item.stepName}
                  </h4>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-semibold',
                      getStepBadgeClass(item.status)
                    )}
                  >
                    {item.status === 'COMPLETED'
                      ? 'Selesai'
                      : item.status === 'PENDING'
                      ? 'Menunggu'
                      : item.status === 'REJECTED'
                      ? 'Ditolak'
                      : 'Dilewati'}
                  </span>
                </div>

                {item.actionAt && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {formatDate(item.actionAt)}
                  </span>
                )}
              </div>

              {/* Actor & Role Info */}
              {item.actorName && (
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  {item.actorRole === 'SYSTEM' ? (
                    <Sparkles className="h-3.5 w-3.5 text-[#C89B6D]" />
                  ) : item.actorRole === 'Staff' || item.actorRole === 'Administrator' ? (
                    <Shield className="h-3.5 w-3.5 text-indigo-500" />
                  ) : (
                    <User className="h-3.5 w-3.5 text-slate-400" />
                  )}
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {item.actorName}
                  </span>
                  {item.actorRole && item.actorRole !== 'SYSTEM' && (
                    <span className="text-[10px] rounded bg-slate-100 px-1.5 py-0.5 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {item.actorRole}
                    </span>
                  )}
                </div>
              )}

              {/* Comment / Note */}
              {item.comment && (
                <div className="mt-2 rounded-xl bg-white/80 p-2.5 text-xs italic text-slate-700 border border-slate-100 dark:bg-slate-900/60 dark:border-slate-800/80 dark:text-slate-300">
                  "{item.comment}"
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
