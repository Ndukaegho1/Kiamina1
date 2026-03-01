import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, RefreshCw, Search, Trash2, UploadCloud, Pencil } from 'lucide-react'
import {
  getMonthlyCashflowReport,
  getMonthlyProfitLossReport,
} from '../../../utils/accountingRecordsApi'

const toIsoDate = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const toMonthInputValue = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

const parseDateMs = (value = '') => {
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : NaN
}

const endOfDayMs = (value = '') => {
  if (!value) return NaN
  const parsed = Date.parse(`${value}T23:59:59.999`)
  return Number.isFinite(parsed) ? parsed : NaN
}

const currencyFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 2,
})

const formatAmount = (amount = 0, currency = 'NGN') => {
  const numeric = Number(amount)
  if (!Number.isFinite(numeric)) return '--'
  if (currency === 'NGN') {
    return currencyFormatter.format(numeric)
  }
  return `${numeric.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${currency}`
}

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'posted', label: 'Posted' },
  { value: 'archived', label: 'Archived' },
]

const transactionTypeOptions = [
  { value: 'unknown', label: 'Unknown' },
  { value: 'debit', label: 'Debit' },
  { value: 'credit', label: 'Credit' },
]

const statusBadgeClass = (status = '') => {
  const normalized = String(status || '').trim().toLowerCase()
  if (normalized === 'posted') return 'bg-success-bg text-success'
  if (normalized === 'archived') return 'bg-error-bg text-error'
  return 'bg-warning-bg text-warning'
}

const defaultFormState = {
  transactionDate: toIsoDate(new Date()),
  amount: '',
  currency: 'NGN',
  className: '',
  description: '',
  transactionType: 'unknown',
  status: 'draft',
  vendorName: '',
  customerName: '',
  paymentMethod: '',
  invoiceNumber: '',
  reference: '',
}

function RecordModal({
  title = 'Add Record',
  categoryId = 'expenses',
  value = defaultFormState,
  onChange,
  onCancel,
  onSubmit,
  submitting = false,
}) {
  const isSales = categoryId === 'sales'
  const isExpenses = categoryId === 'expenses'
  const isBank = categoryId === 'bank-statements'

  return (
    <div className="fixed inset-0 z-[240] bg-black/35 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="w-full max-w-2xl bg-white border border-border rounded-xl shadow-card p-6" onClick={(event) => event.stopPropagation()}>
        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-text-muted">Transaction Date</label>
            <input
              type="date"
              value={value.transactionDate}
              onChange={(event) => onChange({ ...value, transactionDate: event.target.value })}
              className="w-full h-10 px-3 border border-border rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted">Amount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={value.amount}
              onChange={(event) => onChange({ ...value, amount: event.target.value })}
              className="w-full h-10 px-3 border border-border rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted">Currency</label>
            <input
              value={value.currency}
              onChange={(event) => onChange({ ...value, currency: event.target.value.toUpperCase() })}
              className="w-full h-10 px-3 border border-border rounded-md text-sm"
              maxLength={3}
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted">Class</label>
            <input
              value={value.className}
              onChange={(event) => onChange({ ...value, className: event.target.value })}
              className="w-full h-10 px-3 border border-border rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted">Transaction Type</label>
            <select
              value={value.transactionType}
              onChange={(event) => onChange({ ...value, transactionType: event.target.value })}
              className="w-full h-10 px-3 border border-border rounded-md text-sm"
            >
              {transactionTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted">Status</label>
            <select
              value={value.status}
              onChange={(event) => onChange({ ...value, status: event.target.value })}
              className="w-full h-10 px-3 border border-border rounded-md text-sm"
            >
              {statusOptions.filter((option) => option.value).map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-text-muted">Description</label>
            <textarea
              value={value.description}
              onChange={(event) => onChange({ ...value, description: event.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-border rounded-md text-sm resize-none"
            />
          </div>
          {(isExpenses || isBank) && (
            <div>
              <label className="block text-xs text-text-muted">{isBank ? 'Narrative/Payee' : 'Vendor'}</label>
              <input
                value={value.vendorName}
                onChange={(event) => onChange({ ...value, vendorName: event.target.value })}
                className="w-full h-10 px-3 border border-border rounded-md text-sm"
              />
            </div>
          )}
          {isSales && (
            <div>
              <label className="block text-xs text-text-muted">Customer</label>
              <input
                value={value.customerName}
                onChange={(event) => onChange({ ...value, customerName: event.target.value })}
                className="w-full h-10 px-3 border border-border rounded-md text-sm"
              />
            </div>
          )}
          <div>
            <label className="block text-xs text-text-muted">Payment Method</label>
            <input
              value={value.paymentMethod}
              onChange={(event) => onChange({ ...value, paymentMethod: event.target.value })}
              className="w-full h-10 px-3 border border-border rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted">{isSales ? 'Invoice Number' : 'Reference'}</label>
            <input
              value={isSales ? value.invoiceNumber : value.reference}
              onChange={(event) => onChange(isSales
                ? { ...value, invoiceNumber: event.target.value }
                : { ...value, reference: event.target.value })}
              className="w-full h-10 px-3 border border-border rounded-md text-sm"
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="h-9 px-4 border border-border rounded-md text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="h-9 px-4 bg-primary text-white rounded-md text-sm disabled:opacity-60"
          >
            {submitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AccountingRecordsPage({
  categoryId = 'expenses',
  title = 'Expenses',
  records = [],
  isLoading = false,
  onRefresh,
  onCreateRecord,
  onUpdateRecord,
  onDeleteRecord,
  onBulkImport,
  showToast,
}) {
  const fileInputRef = useRef(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [formState, setFormState] = useState(defaultFormState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [reportMonth, setReportMonth] = useState(toMonthInputValue(new Date()))
  const [reports, setReports] = useState({
    loading: false,
    error: '',
    profitLoss: null,
    cashflow: null,
  })

  const filteredRecords = useMemo(() => {
    const query = String(searchTerm || '').trim().toLowerCase()
    const fromMs = parseDateMs(dateFrom)
    const toMs = endOfDayMs(dateTo)
    return (Array.isArray(records) ? records : [])
      .filter((record) => {
        const text = [
          record.description,
          record.className,
          record.reference,
          record.invoiceNumber,
          record.vendorName,
          record.customerName,
          record.paymentMethod,
        ]
          .map((value) => String(value || '').toLowerCase())
          .join(' ')
        if (query && !text.includes(query)) return false
        if (statusFilter && String(record.recordStatus || '').toLowerCase() !== statusFilter) return false
        const dateMs = parseDateMs(record.transactionDateIso || record.transactionDate || record.date)
        if (dateFrom && Number.isFinite(fromMs) && (!Number.isFinite(dateMs) || dateMs < fromMs)) return false
        if (dateTo && Number.isFinite(toMs) && (!Number.isFinite(dateMs) || dateMs > toMs)) return false
        return true
      })
      .sort((left, right) => parseDateMs(right.transactionDateIso || right.date) - parseDateMs(left.transactionDateIso || left.date))
  }, [records, searchTerm, statusFilter, dateFrom, dateTo])

  useEffect(() => {
    const [yearText, monthText] = String(reportMonth || '').split('-')
    const year = Number(yearText)
    const month = Number(monthText)
    if (!Number.isInteger(year) || !Number.isInteger(month)) {
      return
    }

    let cancelled = false
    const load = async () => {
      setReports((previous) => ({ ...previous, loading: true, error: '' }))
      try {
        const [profitLoss, cashflow] = await Promise.all([
          getMonthlyProfitLossReport({ category: categoryId, year, month }),
          getMonthlyCashflowReport({ category: categoryId, year, month }),
        ])
        if (cancelled) return
        setReports({
          loading: false,
          error: '',
          profitLoss,
          cashflow,
        })
      } catch (error) {
        if (cancelled) return
        setReports({
          loading: false,
          error: String(error?.message || 'Unable to load monthly reports.'),
          profitLoss: null,
          cashflow: null,
        })
      }
    }
    void load()

    return () => {
      cancelled = true
    }
  }, [categoryId, reportMonth])

  const openCreateModal = () => {
    setEditingRecord(null)
    setFormState(defaultFormState)
    setIsModalOpen(true)
  }

  const openEditModal = (record) => {
    setEditingRecord(record)
    setFormState({
      transactionDate: toIsoDate(record.transactionDateIso || record.transactionDate || record.date || new Date()),
      amount: String(record.amount ?? ''),
      currency: record.currency || 'NGN',
      className: record.className || '',
      description: record.description || '',
      transactionType: record.transactionType || 'unknown',
      status: record.recordStatus || 'draft',
      vendorName: record.vendorName || '',
      customerName: record.customerName || '',
      paymentMethod: record.paymentMethod || '',
      invoiceNumber: record.invoiceNumber || '',
      reference: record.reference || '',
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingRecord(null)
  }

  const handleSaveRecord = async () => {
    if (!formState.transactionDate || !formState.amount) {
      showToast?.('error', 'Transaction date and amount are required.')
      return
    }

    const payload = {
      category: categoryId,
      className: formState.className,
      amount: Number(formState.amount),
      currency: formState.currency || 'NGN',
      transactionType: formState.transactionType || 'unknown',
      transactionDate: formState.transactionDate,
      description: formState.description,
      vendorName: formState.vendorName,
      customerName: formState.customerName,
      paymentMethod: formState.paymentMethod,
      invoiceNumber: formState.invoiceNumber,
      reference: formState.reference,
      status: formState.status || 'draft',
    }

    setIsSubmitting(true)
    try {
      if (editingRecord?.recordId) {
        await onUpdateRecord?.(editingRecord.recordId, payload)
        showToast?.('success', 'Record updated successfully.')
      } else {
        await onCreateRecord?.(payload)
        showToast?.('success', 'Record created successfully.')
      }
      closeModal()
    } catch (error) {
      showToast?.('error', String(error?.message || 'Unable to save record.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteRecord = async (record) => {
    if (!record?.recordId) return
    if (!confirm('Delete this record?')) return
    try {
      await onDeleteRecord?.(record.recordId)
      showToast?.('success', 'Record deleted.')
    } catch (error) {
      showToast?.('error', String(error?.message || 'Unable to delete record.'))
    }
  }

  const handleImportFile = async (event) => {
    const file = event.target?.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const result = await onBulkImport?.(file)
      const importedCount = Number(result?.importedCount || 0)
      const skippedCount = Number(result?.skippedCount || 0)
      const summary = skippedCount > 0
        ? `Imported ${importedCount} row(s), skipped ${skippedCount}.`
        : `Imported ${importedCount} row(s).`
      showToast?.('success', summary)
    } catch (error) {
      showToast?.('error', String(error?.message || 'Unable to import records.'))
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => fileInputRef.current?.click()} className="h-10 px-4 border border-border rounded-md text-sm text-text-primary hover:bg-background inline-flex items-center gap-2">
            <UploadCloud className="w-4 h-4" />
            Import CSV/XLSX
          </button>
          <button onClick={() => onRefresh?.()} className="h-10 px-4 border border-border rounded-md text-sm text-text-primary hover:bg-background inline-flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button onClick={openCreateModal} className="h-10 px-4 bg-primary text-white rounded-md text-sm inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Record
          </button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept=".csv,.xls,.xlsx" className="hidden" onChange={handleImportFile} />

      <div className="bg-white rounded-lg border border-border shadow-card p-4 mb-4">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search records..."
              className="w-full h-10 pl-10 pr-3 border border-border rounded-md text-sm"
            />
          </div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 px-3 border border-border rounded-md text-sm">
            {statusOptions.map((option) => (
              <option key={option.value || 'all'} value={option.value}>{option.label}</option>
            ))}
          </select>
          <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="h-10 px-3 border border-border rounded-md text-sm" />
          <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="h-10 px-3 border border-border rounded-md text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-lg border border-border shadow-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-text-muted">Monthly Reports</p>
            <input
              type="month"
              value={reportMonth}
              onChange={(event) => setReportMonth(event.target.value)}
              className="h-8 px-2 border border-border rounded-md text-xs"
            />
          </div>
          <p className="text-xs text-text-muted mt-2">
            {reports.loading ? 'Loading report summary...' : (reports.error || 'Using selected month range.')}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-border shadow-card p-4">
          <p className="text-xs uppercase tracking-wide text-text-muted">Profit/Loss</p>
          <p className="text-lg font-semibold text-text-primary mt-1">
            {formatAmount(reports.profitLoss?.totals?.netProfit || 0, 'NGN')}
          </p>
          <p className="text-xs text-text-muted mt-1">
            Income {formatAmount(reports.profitLoss?.totals?.income || 0, 'NGN')} | Expenses {formatAmount(reports.profitLoss?.totals?.expenses || 0, 'NGN')}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-border shadow-card p-4">
          <p className="text-xs uppercase tracking-wide text-text-muted">Cashflow</p>
          <p className="text-lg font-semibold text-text-primary mt-1">
            {formatAmount(reports.cashflow?.totals?.netCashflow || 0, 'NGN')}
          </p>
          <p className="text-xs text-text-muted mt-1">
            Inflow {formatAmount(reports.cashflow?.totals?.inflow || 0, 'NGN')} | Outflow {formatAmount(reports.cashflow?.totals?.outflow || 0, 'NGN')}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F9FAFB]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Counterparty</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Reference</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-text-muted">Loading records...</td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-text-muted">No records found.</td>
                </tr>
              ) : filteredRecords.map((record) => (
                <tr key={record.recordId} className="border-b border-border-light hover:bg-[#F9FAFB]">
                  <td className="px-4 py-3.5 text-sm text-text-secondary">{toIsoDate(record.transactionDateIso || record.transactionDate || record.date)}</td>
                  <td className="px-4 py-3.5 text-sm text-text-primary">
                    <div className="font-medium">{record.description || '--'}</div>
                    {record.className && <div className="text-xs text-text-muted">{record.className}</div>}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-text-secondary">{record.vendorName || record.customerName || '--'}</td>
                  <td className="px-4 py-3.5 text-sm text-text-secondary">{record.reference || record.invoiceNumber || '--'}</td>
                  <td className="px-4 py-3.5 text-sm text-text-primary">{formatAmount(record.amount, record.currency)}</td>
                  <td className="px-4 py-3.5 text-sm text-text-secondary capitalize">{record.transactionType || 'unknown'}</td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex h-6 px-2.5 items-center rounded text-xs font-medium ${statusBadgeClass(record.recordStatus)}`}>
                      {record.recordStatus || 'draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEditModal(record)} className="w-8 h-8 border border-border rounded-md text-text-secondary hover:border-primary hover:text-primary inline-flex items-center justify-center" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteRecord(record)} className="w-8 h-8 border border-border rounded-md text-text-secondary hover:border-error hover:text-error inline-flex items-center justify-center" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <RecordModal
          title={editingRecord ? 'Edit Record' : 'Add Record'}
          categoryId={categoryId}
          value={formState}
          onChange={setFormState}
          onCancel={closeModal}
          onSubmit={handleSaveRecord}
          submitting={isSubmitting}
        />
      )}
    </div>
  )
}

export default AccountingRecordsPage
