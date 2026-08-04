import React, { useState, useMemo, useEffect } from 'react';
import PageContainer from '../../../components/layout/PageContainer';
import Modal from '../../../components/ui/Modal';
import Drawer from '../../../components/ui/Drawer';
import LeadForm from '../components/LeadForm';
import LeadPipeline from '../components/LeadPipeline';
import FollowupForm from '../../followups/components/FollowupForm';
import {
  useGetLeadsQuery,
  useCreateLeadsMutation,
  useUpdateLeadsMutation,
  useDeleteLeadsMutation
} from '../services/leadsApi';
import { useCreateFollowupsMutation } from '../../followups/services/followupsApi';
import {
  Plus, Briefcase, IndianRupee, Calendar, TrendingUp,
  Search, SlidersHorizontal, Pencil, Trash2, Building2, PhoneCall,
  ChevronLeft, ChevronRight, X
} from 'lucide-react';
import { cn } from '../../../lib/cn';

/* ── Status & Stage Tones ───────────────────────────────── */
const STATUS_TONES = {
  'New Lead': 'brand',
  'Contacted': 'info',
  'Meeting Scheduled': 'warning',
  'Proposal Sent': 'info',
  'Negotiation': 'warning',
  'Closed Won': 'success',
  'Closed Lost': 'danger',
};

const STAGE_TONES = {
  'Prospecting': 'accent',
  'Qualification': 'brand',
  'Proposal': 'info',
  'Negotiation': 'warning',
  'Won': 'success',
  'Lost': 'danger',
};

const STAGE_BORDER = {
  'Prospecting': 'border-l-accent-400',
  'Qualification': 'border-l-brand-400',
  'Proposal': 'border-l-info-400',
  'Negotiation': 'border-l-warning-400',
  'Won': 'border-l-success-500',
  'Lost': 'border-l-danger-400',
};

const AVATAR_PALETTE = [
  'bg-success-100 text-success-600 dark:bg-success-900/30 dark:text-success-400',
  'bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400',
  'bg-info-100 text-info-600 dark:bg-info-900/30 dark:text-info-400',
  'bg-accent-100 text-accent-600 dark:bg-accent-900/30 dark:text-accent-400',
  'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400',
];
const avatarColor = (seed) => {
  const code = (seed || '?').charCodeAt(0) || 0;
  return AVATAR_PALETTE[code % AVATAR_PALETTE.length];
};

const STATUS_FILTERS = ['All', 'New Lead', 'Contacted', 'Meeting Scheduled', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost'];
const STAGE_FILTERS = ['All', 'Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost'];

const formatINR = (val) => {
  if (!val) return '₹0';
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const LeadsPage = () => {
  const { data: response, isLoading } = useGetLeadsQuery();
  const [createRecord, { isLoading: isCreating }] = useCreateLeadsMutation();
  const [updateRecord, { isLoading: isUpdating }] = useUpdateLeadsMutation();
  const [deleteRecord] = useDeleteLeadsMutation();
  const [createFollowup, { isLoading: isCreatingFollowup }] = useCreateFollowupsMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [isFollowupModalOpen, setIsFollowupModalOpen] = useState(false);
  const [followupTarget, setFollowupTarget] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);

  const [search, setSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState('All');
  const [activeStage, setActiveStage] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [showFilters, setShowFilters] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  const allRecords = useMemo(() => {
    const r = response?.data?.data ?? response?.data ?? response ?? [];
    return Array.isArray(r) ? r : [];
  }, [response]);

  const filtered = useMemo(() => {
    let rows = allRecords;
    if (activeStatus !== 'All') rows = rows.filter(r => r.leadStatus === activeStatus);
    if (activeStage !== 'All') rows = rows.filter(r => r.pipelineStage === activeStage);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.companyName?.toLowerCase().includes(q) ||
        r.contactPerson?.toLowerCase().includes(q) ||
        r.phone?.includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.industry?.toLowerCase().includes(q)
      );
    }
    if (dateFilter) {
      rows = rows.filter((r) => {
        const raw = r.meetingSchedule || r.createdAt || r.date;
        if (!raw) return false;
        const recordDate = new Date(raw).toISOString().slice(0, 10);
        return recordDate === dateFilter;
      });
    }
    return rows;
  }, [allRecords, activeStatus, activeStage, search, dateFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeStatus, activeStage, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage]);

  const total = allRecords.length;
  const totalRevenue = allRecords.reduce((sum, r) => sum + (Number(r.expectedRevenue) || 0), 0);
  const meetings = allRecords.filter(r => r.leadStatus === 'Meeting Scheduled' || r.meetingSchedule).length;
  const wonCount = allRecords.filter(r => r.leadStatus === 'Closed Won' || r.pipelineStage === 'Won').length;

  const handleOpenModal = (rec = null) => { setEditingRecord(rec); setIsModalOpen(true); };
  const handleCloseModal = () => { setEditingRecord(null); setIsModalOpen(false); };

  const handleSubmit = async (formData) => {
    try {
      if (editingRecord) await updateRecord({ id: editingRecord._id, ...formData }).unwrap();
      else await createRecord(formData).unwrap();
      handleCloseModal();
    } catch (e) { alert('Failed to save lead: ' + e.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this BD lead?')) return;
    try { await deleteRecord(id).unwrap(); } catch (e) {}
  };

  const openFollowup = (row) => {
    setFollowupTarget({ targetName: row.contactPerson || row.companyName, leadId: row._id });
    setIsFollowupModalOpen(true);
  };

  const handleFollowupSubmit = async (data) => {
    try {
      await createFollowup(data).unwrap();
      setIsFollowupModalOpen(false);
    } catch (e) { alert('Failed to create follow-up.'); }
  };

  const openPipeline = (row) => setSelectedLead(row);
  const closePipeline = () => setSelectedLead(null);

  const handleMoveNextStage = async (row, nextStage) => {
    if (!nextStage) return;
    try {
      await updateRecord({ id: row._id, pipelineStage: nextStage }).unwrap();
      setSelectedLead(prev => prev && prev._id === row._id ? { ...prev, pipelineStage: nextStage } : prev);
    } catch (e) { alert('Failed to update stage.'); }
  };

  const handleMarkLost = async (row) => {
    if (!window.confirm(`Mark ${row.companyName} as Lost?`)) return;
    try {
      await updateRecord({ id: row._id, pipelineStage: 'Lost', leadStatus: 'Closed Lost' }).unwrap();
      setSelectedLead(prev => prev && prev._id === row._id ? { ...prev, pipelineStage: 'Lost', leadStatus: 'Closed Lost' } : prev);
    } catch (e) { alert('Failed to mark as lost.'); }
  };

  const hasActiveFilters = search || activeStatus !== 'All' || activeStage !== 'All' || dateFilter;

  return (
    <PageContainer>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">BD Lead Management</h1>
          <p className="text-sm text-foreground-muted mt-0.5">
            {total} sales leads · {formatINR(totalRevenue)} total pipeline revenue
          </p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary flex items-center gap-2 px-5 self-start sm:self-auto shadow-sm">
          <Plus className="w-4 h-4" /> Add BD Lead
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Leads', value: total, icon: Briefcase, color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-900/10', bar: 'bg-brand-500' },
          { label: 'Pipeline Revenue', value: formatINR(totalRevenue), icon: IndianRupee, color: 'text-success-500', bg: 'bg-success-50 dark:bg-success-900/10', bar: 'bg-success-500' },
          { label: 'Meetings / Demos', value: meetings, icon: Calendar, color: 'text-warning-500', bg: 'bg-warning-50 dark:bg-warning-900/10', bar: 'bg-warning-500' },
          { label: 'Closed Won', value: wonCount, icon: TrendingUp, color: 'text-info-500', bg: 'bg-info-50 dark:bg-info-900/10', bar: 'bg-info-500' },
        ].map(({ label, value, icon: Icon, color, bg, bar }) => (
          <div key={label} className="relative bg-surface border border-border rounded-2xl p-4 pl-5 flex items-center gap-3 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
            <span className={cn('absolute left-0 top-0 bottom-0 w-1', bar)} />
            <div className={cn('p-2.5 rounded-lg', bg)}>
              <Icon className={cn('w-4 h-4', color)} />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-none">{value}</p>
              <p className="text-xs text-foreground-muted mt-1">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-border space-y-3.5">

          {/* Row 1: Search + Date filter + filter toggle (own row, fixed layout) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search company, contact, phone, email..."
                className="w-full h-10 pl-10 pr-4 text-sm bg-surface-secondary border border-border rounded-lg text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-10 px-3 text-sm bg-surface-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
              {dateFilter && (
                <button
                  onClick={() => setDateFilter('')}
                  className="flex items-center gap-1 text-xs font-medium text-foreground-muted hover:text-foreground px-2.5 h-10 rounded-lg border border-border hover:bg-surface-hover transition-colors shrink-0"
                  title="Clear date filter"
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowFilters(prev => !prev)}
                className={cn(
                  'h-10 w-10 flex items-center justify-center rounded-lg transition-colors shrink-0 border',
                  showFilters
                    ? 'text-brand-500 bg-brand-50 border-brand-200 dark:bg-brand-900/20 dark:border-brand-800'
                    : 'text-foreground-muted border-border hover:bg-surface-hover'
                )}
                title={showFilters ? 'Hide filters' : 'Show filters'}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Row 2: Status filter pills (own row, wraps freely) */}
          {showFilters && (
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted mr-1 shrink-0">Status:</span>
              {STATUS_FILTERS.map(status => (
                <button
                  key={status}
                  onClick={() => setActiveStatus(status)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150 hover:scale-105 active:scale-95',
                    activeStatus === status
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-surface border-border text-foreground-muted hover:border-brand-400'
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          )}

          {/* Row 3: Stage filter pills (own row, wraps freely) */}
          {showFilters && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted mr-1 shrink-0">Stage:</span>
              {STAGE_FILTERS.map(stage => (
                <button
                  key={stage}
                  onClick={() => setActiveStage(stage)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150 hover:scale-105 active:scale-95',
                    activeStage === stage
                      ? 'bg-surface-secondary text-foreground border-border font-bold'
                      : 'bg-surface border-transparent text-foreground-muted hover:text-foreground'
                  )}
                >
                  {stage}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-brand-50/60 dark:bg-brand-900/10">
              <tr>
                {['Company & Contact', 'Industry / Size', 'Revenue (₹)', 'Pipeline Stage', 'Lead Status', 'Meeting Date', 'Actions'].map((h, i) => (
                  <th key={h} className={cn(
                    'px-5 py-3.5 text-[11px] font-semibold text-foreground-muted uppercase tracking-wide border-b border-border',
                    i === 6 ? 'text-right' : 'text-left'
                  )}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse border-b border-border">
                    {[1, 2, 3, 4, 5, 6, 7].map(c => (
                      <td key={c} className="px-5 py-4"><div className="h-3 bg-surface-secondary rounded w-3/4" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-sm">
                    <div className="flex flex-col items-center gap-2 text-foreground-muted">
                      <div className="p-3 rounded-full bg-surface-secondary">
                        <Briefcase className="w-6 h-6 opacity-40" />
                      </div>
                      {hasActiveFilters
                        ? 'No leads match your search/filters.'
                        : 'No BD leads created yet. Click "Add BD Lead" to start!'}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, rowIndex) => (
                  <tr
                    key={row._id}
                    onClick={() => openPipeline(row)}
                    className={cn(
                      'hover:bg-brand-50/40 dark:hover:bg-brand-900/10 transition-colors group cursor-pointer border-l-4',
                      STAGE_BORDER[row.pipelineStage] || 'border-l-transparent',
                      rowIndex % 2 === 1 && 'bg-surface-secondary/40'
                    )}
                  >

                    {/* Company & Contact */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0', avatarColor(row.companyName))}>
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{row.companyName}</p>
                          <p className="text-xs text-foreground-muted mt-0.5">
                            {row.contactPerson} {row.designation ? `(${row.designation})` : ''} · {row.phone}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Industry / Size */}
                    <td className="px-5 py-4">
                      <p className="text-foreground">{row.industry || '—'}</p>
                      <p className="text-xs text-foreground-muted mt-0.5">{row.companySize ? `${row.companySize} employees` : ''}</p>
                    </td>

                    {/* Revenue */}
                    <td className="px-5 py-4">
                      <span className="font-bold text-success-600 dark:text-success-400">
                        {formatINR(row.expectedRevenue)}
                      </span>
                    </td>

                    {/* Pipeline Stage */}
                    <td className="px-5 py-4">
                      <span className="badge" data-tone={STAGE_TONES[row.pipelineStage] || 'accent'}>
                        {row.pipelineStage || 'Prospecting'}
                      </span>
                    </td>

                    {/* Lead Status */}
                    <td className="px-5 py-4">
                      <span className="badge" data-tone={STATUS_TONES[row.leadStatus] || 'brand'}>
                        {row.leadStatus || 'New Lead'}
                      </span>
                    </td>

                    {/* Meeting Date */}
                    <td className="px-5 py-4">
                      <p className="text-xs text-foreground">{fmtDate(row.meetingSchedule)}</p>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openFollowup(row)}
                          className="p-1.5 rounded-lg text-warning-500 hover:bg-warning-50 dark:hover:bg-warning-900/20 transition-colors"
                          title="Add Follow-up"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenModal(row)}
                          className="p-1.5 rounded-lg text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
                          title="Edit Lead"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(row._id)}
                          className="p-1.5 rounded-lg text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
                          title="Delete Lead"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Footer ── */}
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-border bg-surface-secondary flex items-center justify-between text-xs text-foreground-muted">
            <span>
              Showing {paginatedRows.length} of {filtered.length} {filtered.length !== total ? 'filtered ' : ''}leads
            </span>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  onClick={() => { setSearch(''); setActiveStatus('All'); setActiveStage('All'); setDateFilter(''); }}
                  className="text-brand-500 hover:underline mr-2"
                >
                  Clear filters
                </button>
              )}
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded-md border border-border text-foreground-muted hover:bg-brand-50 hover:text-brand-600 hover:border-brand-300 dark:hover:bg-brand-900/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-foreground-muted transition-colors"
                title="Previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="tabular-nums font-semibold text-brand-600 dark:text-brand-400">{currentPage} / {totalPages}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded-md border border-border text-foreground-muted hover:bg-brand-50 hover:text-brand-600 hover:border-brand-300 dark:hover:bg-brand-900/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-foreground-muted transition-colors"
                title="Next page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── CREATE / EDIT DRAWER ── */}
      <Drawer isOpen={isModalOpen} onClose={handleCloseModal} title={editingRecord ? 'Edit BD Lead' : 'Create BD Lead'} className="max-w-2xl">
        <LeadForm initialData={editingRecord} onSubmit={handleSubmit} onCancel={handleCloseModal} isLoading={isCreating || isUpdating} />
      </Drawer>

      {/* ── CREATE FOLLOW-UP DRAWER ── */}
      <Drawer isOpen={isFollowupModalOpen} onClose={() => { setIsFollowupModalOpen(false); setFollowupTarget(null); }} title="Create Follow-up" className="max-w-2xl">
        <FollowupForm
          initialData={followupTarget}
          onSubmit={handleFollowupSubmit}
          onCancel={() => { setIsFollowupModalOpen(false); setFollowupTarget(null); }}
          isLoading={isCreatingFollowup}
        />
      </Drawer>

      {/* ── LEAD PIPELINE PANEL ── */}
      {selectedLead && (
        <LeadPipeline
          lead={selectedLead}
          onClose={closePipeline}
          onMoveNextStage={handleMoveNextStage}
          onMarkLost={handleMarkLost}
        />
      )}

    </PageContainer>
  );
};

export default LeadsPage;