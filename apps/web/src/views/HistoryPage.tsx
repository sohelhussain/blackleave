import React, { useState } from 'react';
import { ApplicationRecord } from '@applyflow/types';
import { ExternalLink, CheckCircle2, Clock, Calendar, FileText } from 'lucide-react';

interface HistoryPageProps {
  applications: ApplicationRecord[];
  onUpdateStatus: (id: string, newStatus: ApplicationRecord['status']) => Promise<void>;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ applications: initialApps, onUpdateStatus }) => {
  const [applications, setApplications] = useState<ApplicationRecord[]>(initialApps);

  async function handleStatusChange(id: string, status: ApplicationRecord['status']) {
    const updated = applications.map((a) => (a.id === id ? { ...a, status } : a));
    setApplications(updated);
    await onUpdateStatus(id, status);
  }

  const statusColors: Record<ApplicationRecord['status'], string> = {
    Draft: 'bg-slate-100 text-slate-700 border-slate-200',
    Reviewed: 'bg-amber-50 text-amber-800 border-amber-200',
    Applied: 'bg-blue-50 text-blue-800 border-blue-200',
    Interview: 'bg-purple-50 text-purple-800 border-purple-200',
    Offer: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    Rejected: 'bg-rose-50 text-rose-800 border-rose-200'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Application History</h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Track job applications assisted by blackLeave. Status is user-controlled; autofilling a form does not mark it as Applied.
          </p>
        </div>
        <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
          Total Tracked: <strong>{applications.length}</strong>
        </div>
      </div>

      {/* Applications Table / Cards */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-200">
          {applications.map((app) => (
            <div key={app.id} className="p-5 hover:bg-slate-50/70 transition-colors">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900">{app.company}</h3>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-700 font-medium text-sm">{app.role}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {app.date}
                    </span>
                    {app.resumeUsed && (
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        {app.resumeUsed}
                      </span>
                    )}
                    <span className="text-emerald-600 font-medium">
                      {app.fieldsFilled} fields filled
                    </span>
                    {app.aiAnswersCount > 0 && (
                      <span className="text-amber-600 font-medium">
                        {app.aiAnswersCount} AI answers
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                      Candidate Status
                    </span>
                    <select
                      value={app.status}
                      onChange={(e) => handleStatusChange(app.id, e.target.value as any)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border cursor-pointer ${
                        statusColors[app.status]
                      }`}
                    >
                      <option value="Draft">Draft</option>
                      <option value="Reviewed">Reviewed</option>
                      <option value="Applied">Applied</option>
                      <option value="Interview">Interview</option>
                      <option value="Offer">Offer</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>

                  <a
                    href={app.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                    title="Open Job Application Link"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {app.notes && (
                <div className="mt-2.5 p-2 bg-slate-50 rounded border border-slate-100 text-xs text-slate-600">
                  <strong>Notes:</strong> {app.notes}
                </div>
              )}
            </div>
          ))}

          {applications.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">
              No applications recorded yet. When you autofill job forms using the extension, they will appear here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
