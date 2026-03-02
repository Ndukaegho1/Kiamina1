import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  CalendarDays,
  MousePointerClick,
  RefreshCw,
  TrendingUp,
  UploadCloud,
  Users,
} from 'lucide-react'
import { apiFetch } from '../../../utils/apiClient'

const INSIGHT_CATEGORY_OPTIONS = [
  'Payroll Governance',
  'SME Accounting Controls',
  'Nonprofit Reporting',
  'Tax Compliance',
  'Financial Strategy',
  'Cloud Accounting',
  'Regulatory Updates',
  'Cross-Border Advisory',
]

const STATUS_OPTIONS = ['draft', 'published', 'archived']
const VISIBILITY_OPTIONS = ['public', 'internal']

const INITIAL_FORM_STATE = {
  title: '',
  category: INSIGHT_CATEGORY_OPTIONS[0],
  author: 'Kiamina Advisory Team',
  readTimeMinutes: 6,
  coverImageUrl: '',
  excerpt: '',
  content: '',
  status: 'draft',
  visibility: 'public',
}

const EMAIL_FALLBACK = 'admin@kiamina.local'

const toIsoDateLabel = (value = '') => {
  const parsed = Date.parse(value || '')
  if (!Number.isFinite(parsed)) return '--'
  return new Date(parsed).toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

const safeReadErrorMessage = async (response) => {
  try {
    const payload = await response.json()
    return String(payload?.message || '').trim()
  } catch {
    return ''
  }
}

const validateInsightPayload = (form = INITIAL_FORM_STATE) => {
  const errors = {}
  if (String(form.title || '').trim().length < 6) {
    errors.title = 'Title must be at least 6 characters.'
  }
  if (!String(form.category || '').trim()) {
    errors.category = 'Select an insight category.'
  }
  if (String(form.author || '').trim().length < 2) {
    errors.author = 'Author name is required.'
  }
  const readTime = Number(form.readTimeMinutes)
  if (!Number.isFinite(readTime) || readTime < 1 || readTime > 60) {
    errors.readTimeMinutes = 'Read time must be between 1 and 60 minutes.'
  }
  if (String(form.excerpt || '').trim().length < 20) {
    errors.excerpt = 'Excerpt should be at least 20 characters.'
  }
  if (String(form.content || '').trim().length < 80) {
    errors.content = 'Content should be at least 80 characters.'
  }
  const cover = String(form.coverImageUrl || '').trim()
  if (cover && !/^https?:\/\//i.test(cover)) {
    errors.coverImageUrl = 'Cover image must be a valid http(s) URL.'
  }
  if (!STATUS_OPTIONS.includes(String(form.status || '').trim().toLowerCase())) {
    errors.status = 'Select a valid status.'
  }
  if (!VISIBILITY_OPTIONS.includes(String(form.visibility || '').trim().toLowerCase())) {
    errors.visibility = 'Select a valid visibility.'
  }
  return errors
}

function AdminInsightsPage({
  showToast,
  onAdminActionLog,
  currentAdminAccount,
}) {
  const [form, setForm] = useState(INITIAL_FORM_STATE)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingArticles, setIsLoadingArticles] = useState(false)
  const [articles, setArticles] = useState([])
  const [loadError, setLoadError] = useState('')
  const [analyticsDays, setAnalyticsDays] = useState(30)
  const [analyticsSummary, setAnalyticsSummary] = useState(null)
  const [analyticsError, setAnalyticsError] = useState('')
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false)

  const normalizedAdminEmail = String(currentAdminAccount?.email || EMAIL_FALLBACK).trim().toLowerCase()

  const refreshArticles = async () => {
    setIsLoadingArticles(true)
    setLoadError('')
    try {
      const response = await apiFetch('/notifications/insights/articles?limit=100')
      if (!response.ok) {
        const responseMessage = await safeReadErrorMessage(response)
        setLoadError(responseMessage || 'Unable to load insights from backend.')
        return
      }
      const payload = await response.json().catch(() => [])
      const rows = Array.isArray(payload) ? payload : (Array.isArray(payload?.items) ? payload.items : [])
      setArticles(rows)
    } catch {
      setLoadError('Unable to load insights from backend.')
    } finally {
      setIsLoadingArticles(false)
    }
  }

  const refreshAnalytics = async (days = analyticsDays) => {
    setIsLoadingAnalytics(true)
    setAnalyticsError('')
    try {
      const response = await apiFetch(`/notifications/insights/analytics/summary?days=${encodeURIComponent(days)}&top=8`)
      if (!response.ok) {
        const responseMessage = await safeReadErrorMessage(response)
        setAnalyticsError(responseMessage || 'Unable to load website analytics.')
        return
      }
      const payload = await response.json().catch(() => null)
      setAnalyticsSummary(payload || null)
    } catch {
      setAnalyticsError('Unable to load website analytics.')
    } finally {
      setIsLoadingAnalytics(false)
    }
  }

  useEffect(() => {
    void refreshArticles()
  }, [])
  useEffect(() => {
    void refreshAnalytics(analyticsDays)
  }, [analyticsDays])

  const orderedArticles = useMemo(() => (
    [...articles].sort((left, right) => (
      (Date.parse(right.updatedAt || right.publishedAt || right.createdAt || '') || 0)
      - (Date.parse(left.updatedAt || left.publishedAt || left.createdAt || '') || 0)
    ))
  ), [articles])
  const analyticsTotals = analyticsSummary?.totals || {
    uniqueVisitors: 0,
    interactions: 0,
    totalEvents: 0,
  }
  const engagementRate = analyticsTotals.uniqueVisitors > 0
    ? Math.round((analyticsTotals.interactions / analyticsTotals.uniqueVisitors) * 100)
    : 0
  const trendRows = useMemo(() => {
    const source = Array.isArray(analyticsSummary?.timeline) ? analyticsSummary.timeline : []
    return source.slice(-14)
  }, [analyticsSummary?.timeline])
  const trendMax = useMemo(() => {
    const maxCount = trendRows.reduce((max, row) => (
      Math.max(max, Number(row?.visits || 0), Number(row?.interactions || 0))
    ), 0)
    return maxCount > 0 ? maxCount : 1
  }, [trendRows])
  const topInteractionTargets = Array.isArray(analyticsSummary?.topInteractionTargets)
    ? analyticsSummary.topInteractionTargets
    : []
  const topServiceInteractions = Array.isArray(analyticsSummary?.topServiceInteractions)
    ? analyticsSummary.topServiceInteractions
    : []
  const pageBreakdown = Array.isArray(analyticsSummary?.pageBreakdown)
    ? analyticsSummary.pageBreakdown
    : []

  const clearError = (fieldName) => {
    setErrors((prev) => {
      if (!prev[fieldName]) return prev
      const next = { ...prev }
      delete next[fieldName]
      return next
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validateInsightPayload(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      showToast?.('error', 'Please fix the highlighted fields.')
      return
    }

    const payload = {
      title: form.title.trim(),
      category: form.category.trim().toLowerCase(),
      author: form.author.trim(),
      readTimeMinutes: Number(form.readTimeMinutes),
      coverImageUrl: form.coverImageUrl.trim(),
      excerpt: form.excerpt.trim(),
      content: form.content.trim(),
      status: form.status.trim().toLowerCase(),
      visibility: form.visibility.trim().toLowerCase(),
    }

    setIsSubmitting(true)
    try {
      const response = await apiFetch('/notifications/insights/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const responseMessage = await safeReadErrorMessage(response)
        showToast?.('error', responseMessage || 'Unable to publish insight.')
        return
      }
      const savedArticle = await response.json().catch(() => null)
      showToast?.('success', 'Insight article saved.')
      onAdminActionLog?.({
        action: 'Published insight article',
        affectedUser: normalizedAdminEmail,
        details: `Insight: ${savedArticle?.title || payload.title}`,
      })
      setForm(INITIAL_FORM_STATE)
      setErrors({})
      await refreshArticles()
    } catch {
      showToast?.('error', 'Unable to publish insight.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg shadow-card border border-border-light p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Insights Publishing</h1>
            <p className="text-sm text-text-secondary mt-2">
              Upload thought-leadership articles to the backend insights collection for the public website.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void refreshArticles()
              void refreshAnalytics(analyticsDays)
            }}
            className="h-10 px-4 rounded-md border border-border text-sm font-medium text-text-primary hover:bg-background inline-flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${(isLoadingArticles || isLoadingAnalytics) ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-card border border-border-light p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-text-primary">Website Interaction Analytics</h2>
          <label className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary">
            Time Window
            <select
              value={analyticsDays}
              onChange={(event) => setAnalyticsDays(Number(event.target.value))}
              className="h-9 rounded-md border border-border px-3 text-sm text-text-primary bg-white"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </label>
        </div>

        {analyticsError && <p className="text-sm text-error">{analyticsError}</p>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <article className="rounded-lg border border-border-light bg-background/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Unique Visitors</p>
            <p className="mt-2 text-2xl font-semibold text-text-primary inline-flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              {Number(analyticsTotals.uniqueVisitors || 0).toLocaleString('en-US')}
            </p>
          </article>
          <article className="rounded-lg border border-border-light bg-background/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Interactions</p>
            <p className="mt-2 text-2xl font-semibold text-text-primary inline-flex items-center gap-2">
              <MousePointerClick className="w-5 h-5 text-primary" />
              {Number(analyticsTotals.interactions || 0).toLocaleString('en-US')}
            </p>
          </article>
          <article className="rounded-lg border border-border-light bg-background/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Engagement Rate</p>
            <p className="mt-2 text-2xl font-semibold text-text-primary inline-flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              {engagementRate}%
            </p>
          </article>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4">
          <article className="rounded-lg border border-border-light p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-text-primary inline-flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Visits vs Interactions Trend (14 data points)
              </h3>
              {isLoadingAnalytics && <span className="text-xs text-text-muted">Loading...</span>}
            </div>
            <div className="mt-4 overflow-x-auto">
              <div className="min-w-[520px]">
                <div className="grid grid-cols-14 gap-2 h-44 items-end">
                  {trendRows.map((row) => {
                    const visits = Number(row?.visits || 0)
                    const interactions = Number(row?.interactions || 0)
                    const visitHeight = Math.max(4, Math.round((visits / trendMax) * 100))
                    const interactionHeight = Math.max(4, Math.round((interactions / trendMax) * 100))
                    return (
                      <div key={`trend-${row?.date}`} className="flex flex-col items-center gap-1">
                        <div className="h-32 w-full flex items-end justify-center gap-1">
                          <span
                            className="w-2 rounded-t bg-[#153585]/35"
                            style={{ height: `${visitHeight}%` }}
                            title={`Visits: ${visits}`}
                          />
                          <span
                            className="w-2 rounded-t bg-[#153585]"
                            style={{ height: `${interactionHeight}%` }}
                            title={`Interactions: ${interactions}`}
                          />
                        </div>
                        <span className="text-[10px] text-text-muted">{String(row?.date || '').slice(5)}</span>
                      </div>
                    )
                  })}
                </div>
                {trendRows.length === 0 && (
                  <p className="text-sm text-text-muted">No trend data yet.</p>
                )}
              </div>
            </div>
          </article>

          <article className="rounded-lg border border-border-light p-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Top Clicked Targets</h3>
              <div className="mt-3 space-y-2">
                {topInteractionTargets.slice(0, 6).map((row, index) => {
                  const value = Number(row?.count || 0)
                  const maxValue = Number(topInteractionTargets?.[0]?.count || 1)
                  const ratio = maxValue > 0 ? Math.round((value / maxValue) * 100) : 0
                  return (
                    <div key={`target-${row?.key || index}`}>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-text-primary font-medium truncate">{row?.key || 'Unknown target'}</span>
                        <span className="text-text-muted">{value}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-border-light">
                        <div className="h-1.5 rounded-full bg-primary" style={{ width: `${ratio}%` }} />
                      </div>
                    </div>
                  )
                })}
                {topInteractionTargets.length === 0 && (
                  <p className="text-xs text-text-muted">No interaction targets tracked yet.</p>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Most Engaged Services</h3>
              <div className="mt-3 space-y-2">
                {topServiceInteractions.slice(0, 5).map((row, index) => (
                  <div key={`service-${row?.service || index}`} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-text-primary font-medium truncate">{row?.service || 'Unknown service'}</span>
                    <span className="text-text-muted">{Number(row?.count || 0)}</span>
                  </div>
                ))}
                {topServiceInteractions.length === 0 && (
                  <p className="text-xs text-text-muted">No service interaction data yet.</p>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Top Pages by Activity</h3>
              <div className="mt-3 space-y-2">
                {pageBreakdown.slice(0, 5).map((row, index) => (
                  <div key={`page-${row?.page || index}`} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-text-primary font-medium capitalize">{row?.page || 'unknown'}</span>
                    <span className="text-text-muted">
                      {Number(row?.visits || 0)} visits / {Number(row?.interactions || 0)} interactions
                    </span>
                  </div>
                ))}
                {pageBreakdown.length === 0 && (
                  <p className="text-xs text-text-muted">No page breakdown yet.</p>
                )}
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-card border border-border-light p-5">
        <h2 className="text-lg font-semibold text-text-primary">Create Insight Article</h2>
        <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="text-sm font-medium text-text-secondary">
            Title
            <input
              value={form.title}
              onChange={(event) => {
                clearError('title')
                setForm((prev) => ({ ...prev, title: event.target.value }))
              }}
              className={`mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 ${
                errors.title ? 'border-error focus:ring-error/20' : 'border-border focus:ring-primary/20 focus:border-primary'
              }`}
              required
            />
            {errors.title && <p className="mt-1 text-xs text-error">{errors.title}</p>}
          </label>

          <label className="text-sm font-medium text-text-secondary">
            Category
            <select
              value={form.category}
              onChange={(event) => {
                clearError('category')
                setForm((prev) => ({ ...prev, category: event.target.value }))
              }}
              className={`mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 ${
                errors.category ? 'border-error focus:ring-error/20' : 'border-border focus:ring-primary/20 focus:border-primary'
              }`}
              required
            >
              {INSIGHT_CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {errors.category && <p className="mt-1 text-xs text-error">{errors.category}</p>}
          </label>

          <label className="text-sm font-medium text-text-secondary">
            Author
            <input
              value={form.author}
              onChange={(event) => {
                clearError('author')
                setForm((prev) => ({ ...prev, author: event.target.value }))
              }}
              className={`mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 ${
                errors.author ? 'border-error focus:ring-error/20' : 'border-border focus:ring-primary/20 focus:border-primary'
              }`}
              required
            />
            {errors.author && <p className="mt-1 text-xs text-error">{errors.author}</p>}
          </label>

          <label className="text-sm font-medium text-text-secondary">
            Read Time (Minutes)
            <input
              type="number"
              min="1"
              max="60"
              value={form.readTimeMinutes}
              onChange={(event) => {
                clearError('readTimeMinutes')
                setForm((prev) => ({ ...prev, readTimeMinutes: event.target.value }))
              }}
              className={`mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 ${
                errors.readTimeMinutes ? 'border-error focus:ring-error/20' : 'border-border focus:ring-primary/20 focus:border-primary'
              }`}
              required
            />
            {errors.readTimeMinutes && <p className="mt-1 text-xs text-error">{errors.readTimeMinutes}</p>}
          </label>

          <label className="text-sm font-medium text-text-secondary md:col-span-2">
            Cover Image URL
            <input
              value={form.coverImageUrl}
              onChange={(event) => {
                clearError('coverImageUrl')
                setForm((prev) => ({ ...prev, coverImageUrl: event.target.value }))
              }}
              className={`mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 ${
                errors.coverImageUrl ? 'border-error focus:ring-error/20' : 'border-border focus:ring-primary/20 focus:border-primary'
              }`}
              placeholder="https://images.unsplash.com/..."
            />
            {errors.coverImageUrl && <p className="mt-1 text-xs text-error">{errors.coverImageUrl}</p>}
          </label>

          <label className="text-sm font-medium text-text-secondary md:col-span-2">
            Excerpt
            <textarea
              value={form.excerpt}
              onChange={(event) => {
                clearError('excerpt')
                setForm((prev) => ({ ...prev, excerpt: event.target.value }))
              }}
              className={`mt-1 min-h-[80px] w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 ${
                errors.excerpt ? 'border-error focus:ring-error/20' : 'border-border focus:ring-primary/20 focus:border-primary'
              }`}
              required
            />
            {errors.excerpt && <p className="mt-1 text-xs text-error">{errors.excerpt}</p>}
          </label>

          <label className="text-sm font-medium text-text-secondary md:col-span-2">
            Full Content
            <textarea
              value={form.content}
              onChange={(event) => {
                clearError('content')
                setForm((prev) => ({ ...prev, content: event.target.value }))
              }}
              className={`mt-1 min-h-[180px] w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 ${
                errors.content ? 'border-error focus:ring-error/20' : 'border-border focus:ring-primary/20 focus:border-primary'
              }`}
              required
            />
            {errors.content && <p className="mt-1 text-xs text-error">{errors.content}</p>}
          </label>

          <label className="text-sm font-medium text-text-secondary">
            Status
            <select
              value={form.status}
              onChange={(event) => {
                clearError('status')
                setForm((prev) => ({ ...prev, status: event.target.value }))
              }}
              className={`mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 ${
                errors.status ? 'border-error focus:ring-error/20' : 'border-border focus:ring-primary/20 focus:border-primary'
              }`}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {errors.status && <p className="mt-1 text-xs text-error">{errors.status}</p>}
          </label>

          <label className="text-sm font-medium text-text-secondary">
            Visibility
            <select
              value={form.visibility}
              onChange={(event) => {
                clearError('visibility')
                setForm((prev) => ({ ...prev, visibility: event.target.value }))
              }}
              className={`mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 ${
                errors.visibility ? 'border-error focus:ring-error/20' : 'border-border focus:ring-primary/20 focus:border-primary'
              }`}
            >
              {VISIBILITY_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {errors.visibility && <p className="mt-1 text-xs text-error">{errors.visibility}</p>}
          </label>

          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11 px-5 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary-light disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              {isSubmitting ? 'Publishing...' : 'Publish Insight'}
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white rounded-lg shadow-card border border-border-light p-5">
        <h2 className="text-lg font-semibold text-text-primary">Published and Draft Insights</h2>
        {loadError && <p className="mt-3 text-sm text-error">{loadError}</p>}
        <div className="mt-4 space-y-3">
          {orderedArticles.map((article) => (
            <article key={article.articleId || article.slug} className="rounded-lg border border-border-light p-4 bg-background/60">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-text-primary">{article.title || 'Untitled Insight'}</h3>
                <span className="inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-semibold bg-primary-tint text-primary">
                  {String(article.status || 'draft').toUpperCase()}
                </span>
              </div>
              <p className="mt-1 text-xs text-text-secondary">
                {article.category || 'General'} | {article.author || 'Kiamina Advisory Team'} | {Number(article.readTimeMinutes) || 6} min read
              </p>
              <p className="mt-2 text-xs text-text-muted inline-flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" />
                Updated {toIsoDateLabel(article.updatedAt || article.publishedAt || article.createdAt)}
              </p>
            </article>
          ))}
          {orderedArticles.length === 0 && !isLoadingArticles && (
            <p className="text-sm text-text-muted">No insight articles found in the backend yet.</p>
          )}
          {isLoadingArticles && (
            <p className="text-sm text-text-muted">Loading insights...</p>
          )}
        </div>
      </section>
    </div>
  )
}

export default AdminInsightsPage
