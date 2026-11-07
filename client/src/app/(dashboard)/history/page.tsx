'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api, downloadFile } from '@/lib/api';
import { VerdictBadge } from '@/components/VerdictBadge';
import { ClaimBreakdown } from '@/components/ClaimBreakdown';
import {
  History,
  Filter,
  Search,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  AlertTriangle,
  Download,
} from 'lucide-react';

interface CheckItem {
  _id: string;
  question: string;
  answer: string;
  overallVerdict: string;
  reliabilityScore: number;
  totalClaims: number;
  supportedCount: number;
  contradictedCount: number;
  unverifiableCount: number;
  claims: any[];
  checkedBy: string;
  createdAt: string;
}

export default function HistoryPage() {
  const { workspace } = useAuth();
  const [checks, setChecks] = useState<CheckItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [verdictFilter, setVerdictFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedCheck, setSelectedCheck] = useState<CheckItem | null>(null);
  const [exporting, setExporting] = useState<'csv' | 'json' | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportTruncatedRows, setExportTruncatedRows] = useState<number | null>(null);

  const handleExport = async (format: 'csv' | 'json') => {
    if (!workspace || exporting) return;
    try {
      setExporting(format);
      setExportError(null);
      setExportTruncatedRows(null);
      const queryParams = new URLSearchParams({ format });
      if (verdictFilter !== 'ALL') {
        queryParams.append('verdict', verdictFilter);
      }
      const result = await downloadFile(
        `/v1/workspaces/${workspace.id}/checks/export?${queryParams.toString()}`,
        `trustlayer-checks.${format}`
      );
      if (result.truncated) {
        setExportTruncatedRows(result.rowCount ?? 10000);
      }
    } catch (err: any) {
      setExportError(err.message || 'Export failed. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  const fetchHistory = async () => {
    if (!workspace) return;
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: '15',
      });
      if (verdictFilter !== 'ALL') {
        queryParams.append('verdict', verdictFilter);
      }

      const res = await api.get<{
        items: CheckItem[];
        total: number;
        page: number;
        totalPages: number;
      }>(`/v1/workspaces/${workspace.id}/checks?${queryParams.toString()}`);

      setChecks(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch checks history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [workspace?.id, verdictFilter, page]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Verification History
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Audit log of all AI prompts verified against your workspace documents with source evidence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Verdict Filter Buttons */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
            {['ALL', 'SUPPORTED', 'CONTRADICTED', 'UNVERIFIABLE'].map((v) => (
              <button
                key={v}
                onClick={() => {
                  setVerdictFilter(v);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  verdictFilter === v
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Export Buttons */}
          {(['csv', 'json'] as const).map((format) => (
            <button
              key={format}
              onClick={() => handleExport(format)}
              disabled={!workspace || exporting !== null}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting === format ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{exporting === format ? 'Exporting...' : `Export ${format.toUpperCase()}`}</span>
            </button>
          ))}
        </div>
      </div>

      {exportError && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Export failed: {exportError}</span>
          </div>
          <button
            onClick={() => setExportError(null)}
            aria-label="Dismiss export error"
            className="p-1 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {exportTruncatedRows !== null && (
        <div
          role="status"
          className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Export was capped at the newest {exportTruncatedRows.toLocaleString()} checks. Older checks
              matching this filter were not included.
            </span>
          </div>
          <button
            onClick={() => setExportTruncatedRows(null)}
            aria-label="Dismiss export warning"
            className="p-1 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* History Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-xs text-slate-400 mt-3 font-medium">Loading history logs...</p>
          </div>
        ) : checks.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <History className="w-10 h-10 text-slate-600 mb-3" />
            <h4 className="text-sm font-bold text-white">No checks found</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              {verdictFilter !== 'ALL'
                ? `No checks with verdict "${verdictFilter}" in this workspace.`
                : 'Start verifying questions in the Verify AI tab or via API.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-5">Question</th>
                  <th className="py-3.5 px-4">Verdict</th>
                  <th className="py-3.5 px-4">Score</th>
                  <th className="py-3.5 px-4">Claims</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {checks.map((chk) => (
                  <tr key={chk._id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3.5 px-5 max-w-md">
                      <div className="font-semibold text-white truncate">{chk.question}</div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">{chk.answer}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <VerdictBadge verdict={chk.overallVerdict} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                      {Math.round(chk.reliabilityScore)}%
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      <span className="font-medium text-white">{chk.totalClaims}</span> claims
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                      {new Date(chk.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedCheck(chk)}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors border border-indigo-500/20"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing page <strong className="text-white">{page}</strong> of{' '}
              <strong className="text-white">{totalPages}</strong> ({total} total checks)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inspection Modal */}
      {selectedCheck && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-3xl border border-slate-800 shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">
                  Check Inspection Details
                </span>
                <h3 className="text-lg font-bold text-white mt-1">
                  {selectedCheck.question}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCheck(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Full AI Answer Evaluated:
              </span>
              <p className="text-sm text-slate-200 leading-relaxed italic">
                "{selectedCheck.answer}"
              </p>
            </div>

            <ClaimBreakdown
              claims={selectedCheck.claims}
              overallVerdict={selectedCheck.overallVerdict}
              reliabilityScore={selectedCheck.reliabilityScore}
              question={selectedCheck.question}
              answer={selectedCheck.answer}
              checkId={selectedCheck._id}
            />

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedCheck(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
