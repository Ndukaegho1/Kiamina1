import { useState, useEffect, useRef } from 'react'
import {
  LayoutDashboard,
  DollarSign,
  TrendingUp,
  Building2,
  Upload,
  Settings,
  LogOut,
  Search,
  Bell,
  ChevronDown,
  Plus,
  Eye,
  X,
  FileUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  FileText,
  FileSpreadsheet,
  File,
  ChevronRight,
  User,
  Shield,
  CheckCircle,
  AlertCircle,
  Loader2,
  UploadCloud,
  MapPin,
  Building,
  Lock,
  MessageCircle,
  XCircle,
  HelpCircle,
  Pin,
} from 'lucide-react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
)
function StatusBadge({ status }) {
  const styles = {
    'Approved': 'bg-success-bg text-success',
    'Pending': 'bg-warning-bg text-warning',
    'Pending Review': 'bg-warning-bg text-warning',
    'Rejected': 'bg-error-bg text-error',
    'Needs Clarification': 'bg-warning-bg text-warning',
    'Info Requested': 'bg-info-bg text-primary',
  }
  
  return (
    <span className={`inline-flex items-center h-6 px-2.5 rounded text-xs font-medium ${styles[status] || styles['Pending']}`}>
      {status}
    </span>
  )
}

// Category Tag Component
function CategoryTag({ category }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded text-xs bg-background text-text-secondary">
      {category}
    </span>
  )
}

// File Type Icon Component
function FileTypeIcon({ type }) {
  const styles = {
    'PDF': 'bg-error-bg text-error',
    'XLSX': 'bg-success-bg text-success',
    'DOCX': 'bg-info-bg text-primary',
    'CSV': 'bg-warning-bg text-warning',
  }
  
  return (
    <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-semibold ${styles[type] || styles['PDF']}`}>
      {type.substring(0, 3)}
    </div>
  )
}

// Empty state component for lists
function EmptyState({ title = 'No records', description = 'There are no items to display.', cta }) {
  return (
    <div className="py-8 text-center">
      <div className="mx-auto w-36 h-36 bg-background rounded-md flex items-center justify-center mb-4">
        <UploadCloud className="w-10 h-10 text-text-muted" />
      </div>
      <div className="text-sm font-semibold text-text-primary">{title}</div>
      <div className="text-xs text-text-muted mt-1">{description}</div>
      {cta && (<div className="mt-3">{cta}</div>)}
    </div>
  )
}

function ErrorBanner({ message, onRetry }) {
  if (!message) return null
  return (
    <div className="bg-error-bg border border-error text-error rounded-md px-4 py-3 mb-4 flex items-center justify-between">
      <div className="text-sm">{message}</div>
      {onRetry && (<button onClick={onRetry} className="text-sm underline">Retry</button>)}
    </div>
  )
}

// Sidebar Component
function Sidebar({ activePage, setActivePage, companyLogo, companyName, onLogout }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'expenses', label: 'Expenses', icon: DollarSign },
    { id: 'sales', label: 'Sales', icon: TrendingUp },
    { id: 'bank-statements', label: 'Bank Statements', icon: Building2 },
  ]

  const footerNavItems = [
    { id: 'upload-history', label: 'Upload History', icon: Upload },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <aside className="w-64 bg-white border-r border-border fixed left-0 top-0 h-screen flex flex-col z-50">
      {/* Logo */}
      <div className="p-4 border-b border-border-light">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-md flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="font-semibold text-text-primary">Kiamina</div>
            <div className="text-[11px] text-text-muted uppercase tracking-wide">Accounting Services</div>
          </div>
        </div>
      </div>

      {/* Client Info */}
      <div className="p-4 border-b border-border-light">
        <div className="flex items-center gap-3">
          {companyLogo && (
            <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
              <img src={companyLogo} alt="Company Logo" className="w-full h-full object-contain" />
            </div>
          )}
          <div className="text-sm font-medium text-text-primary">{companyName || 'Acme Corporation'}</div>
        </div>
        <button className="flex items-center gap-2 w-full px-3 py-2 bg-background rounded-md text-sm text-text-secondary hover:bg-border-light transition-colors mt-2">
          <span>NG</span>
          <span>Nigeria</span>
          <ChevronDown className="w-4 h-4 ml-auto" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePage(item.id)}
            className={("w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all " + (activePage === item.id ? 'bg-primary-tint text-primary border-l-[3px] border-primary' : 'text-text-secondary hover:bg-background hover:text-text-primary border-l-[3px] border-transparent'))}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Divider */}
      <div className="px-4 py-2">
        <div className="border-t border-border-light"></div>
      </div>

      {/* Footer Navigation */}
      <div className="pb-3">
        {footerNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePage(item.id)}
            className={("w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all " + (activePage === item.id ? 'bg-primary-tint text-primary border-l-[3px] border-primary' : 'text-text-secondary hover:bg-background hover:text-text-primary border-l-[3px] border-transparent'))}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
      </div>

      {/* Logout */}
      <div className="py-3 border-t border-border-light">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-text-secondary hover:bg-background hover:text-text-primary transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </aside>
  )
}

// TopBar Component
function TopBar({
  profilePhoto,
  clientFirstName,
  notifications = [],
  onNotificationClick,
  onMarkAllRead,
  isImpersonationMode = false,
  roleLabel = 'Client',
  forceClientIcon = false,
}) {
  const displayName = clientFirstName?.trim() || 'Client'
  const fallbackInitial = displayName.charAt(0).toUpperCase() || 'C'
  const [showNotifications, setShowNotifications] = useState(false)
  const notificationRef = useRef(null)
  const unreadCount = notifications.filter(n => !n.read).length

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNotificationClick = (notification) => {
    if (onNotificationClick) {
      onNotificationClick(notification)
    }
    setShowNotifications(false)
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'comment': return <MessageCircle className="w-4 h-4 text-primary" />
      case 'approved': return <CheckCircle className="w-4 h-4 text-success" />
      case 'rejected': return <XCircle className="w-4 h-4 text-error" />
      case 'info': return <HelpCircle className="w-4 h-4 text-warning" />
      case 'critical': return <AlertCircle className="w-4 h-4 text-error" />
      default: return <Bell className="w-4 h-4 text-text-muted" />
    }
  }

  const getPriorityStyle = (priority) => {
    if (priority === 'critical') {
      return 'border-l-4 border-error'
    }
    if (priority === 'important') {
      return 'border-l-4 border-warning'
    }
    return ''
  }

  return (
    <header className="h-14 bg-white border-b border-border flex items-center justify-between px-6 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder={isImpersonationMode ? 'Search client data (admin view)...' : 'Search transactions, documents...'}
            className="w-full h-9 pl-10 pr-4 bg-background border border-border rounded-md text-sm focus:outline-none focus:border-primary focus:bg-white transition-colors"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="relative" ref={notificationRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-background transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-4 h-4 bg-error rounded-full border-2 border-white text-[10px] text-white flex items-center justify-center">{unreadCount}</span>
            )}
          </button>
          
          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-white border border-border rounded-lg shadow-card z-50">
              <div className="p-3 border-b border-border-light flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={onMarkAllRead}
                    className="text-xs text-primary hover:underline"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-text-muted text-sm">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  notifications.map(notification => (
                    <div 
                      key={notification.id} 
                      className={`p-3 border-b border-border-light hover:bg-background cursor-pointer ${!notification.read ? 'bg-primary-tint' : ''} ${getPriorityStyle(notification.priority)}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-primary">{notification.message}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-3 h-3 text-text-muted" />
                            <span className="text-xs text-text-muted">{notification.timestamp}</span>
                            {notification.priority === 'critical' && (
                              <span className="inline-flex items-center gap-1 text-xs text-error font-medium">
                                <Pin className="w-3 h-3" /> Critical
                              </span>
                            )}
                          </div>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2"></div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3 pl-3 border-l border-border">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-semibold overflow-hidden">
            {forceClientIcon ? (
              <User className="w-4 h-4" />
            ) : profilePhoto ? (
              <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              fallbackInitial
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-text-primary">{displayName}</span>
            <span className="text-[11px] text-text-muted">{roleLabel || 'Client'}</span>
          </div>
        </div>
      </div>
    </header>
  )
}

// Dashboard Overview Page
function DashboardPage({ onAddDocument, setActivePage, profilePhoto, clientFirstName, verificationPending, records = [] }) {
  const displayName = clientFirstName?.trim() || 'Client'
  // derive counts from records
  const approvedCount = records.filter(r => r.status === 'Approved').length
  const pendingCount = records.filter(r => r.status === 'Pending' || r.status === 'Pending Review').length
  const rejectedCount = records.filter(r => r.status === 'Rejected').length
  const needsClarificationCount = records.filter(r => r.status === 'Needs Clarification' || r.status === 'Info Requested').length

  // Compliance Status - determines overall health from document statuses
  let complianceStatus = 'compliant'
  if (rejectedCount > 0) complianceStatus = 'rejected'
  else if (needsClarificationCount > 0 || pendingCount > 0 || verificationPending) complianceStatus = 'pending'

  const getComplianceWidget = () => {
    const styles = {
      compliant: { bg: 'bg-success-bg', border: 'border-success', text: 'text-success', icon: CheckCircle, label: 'Fully Compliant' },
      pending: { bg: 'bg-warning-bg', border: 'border-warning', text: 'text-warning', icon: AlertCircle, label: 'Action Required' },
      rejected: { bg: 'bg-error-bg', border: 'border-error', text: 'text-error', icon: XCircle, label: 'Verification Pending' },
    }
    const style = styles[complianceStatus]
    return (
      <div className={`rounded-lg border-2 ${style.border} ${style.bg} p-4`}>
        <div className="flex items-center gap-3">
          <style.icon className={`w-6 h-6 ${style.text}`} />
          <div>
            <p className={`text-sm font-semibold ${style.text}`}>{style.label}</p>
            <p className="text-xs text-text-secondary">
              {complianceStatus === 'compliant'
                ? 'All documents and verification are up to date'
                : complianceStatus === 'pending'
                  ? `${pendingCount + needsClarificationCount} document(s) require attention` 
                  : `${rejectedCount} document(s) were rejected. Please resubmit.`}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Activity Timeline - recent activities (derived from records)

  const getActivityIcon = (type) => {
    switch (type) {
      case 'upload': return 'bg-primary-tint text-primary'
      case 'approval': return 'bg-success-bg text-success'
      case 'rejection': return 'bg-warning-bg text-warning'
      case 'verification': return 'bg-info-bg text-primary'
      default: return 'bg-background text-text-muted'
    }
  }

  // derive recent activities from records (newest first)
  const derivedActivities = (records || []).slice().reverse().slice(0, 8).map((r, idx) => {
    let type = 'upload'
    let message = `You uploaded ${r.filename}`
    if (r.status === 'Approved') { type = 'approval'; message = `Admin approved ${r.filename}` }
    if (r.status === 'Rejected') { type = 'rejection'; message = `Admin rejected ${r.filename}` }
    if (r.status === 'Needs Clarification' || r.status === 'Info Requested') { type = 'rejection'; message = `Admin requested more info for ${r.filename}` }
    if (r.versions && r.versions.length > 0) { message = `You updated ${r.filename}` }
    return { id: `${r.id}-${idx}`, type, message, timestamp: r.date || 'Just now', icon: type === 'approval' ? CheckCircle : type === 'rejection' ? AlertCircle : Upload }
  })

  // Notifications state (persisted locally)
  const [notifications, setNotifications] = useState(() => {
    try {
      const raw = localStorage.getItem('client_notifications')
      return raw ? JSON.parse(raw) : []
    } catch (e) { return [] }
  })

  const saveNotifications = (items) => {
    setNotifications(items)
    try { localStorage.setItem('client_notifications', JSON.stringify(items)) } catch (e) {}
  }

  // track previous records to detect changes
  const prevRecordsRef = useRef(records)
  useEffect(() => {
    const prev = prevRecordsRef.current || []
    const prevMap = new Map(prev.map(r => [r.id, r]))
    const newNotifs = []
    records.forEach(r => {
      const p = prevMap.get(r.id)
      if (!p) {
        // new upload
        newNotifs.push({ id: `n-${r.id}-${Date.now()}`, type: 'upload', message: `You uploaded ${r.filename}`, timestamp: r.date || new Date().toLocaleString(), read: false, priority: 'info', linkPage: r.category === 'Sales' ? 'sales' : r.category === 'Bank Statement' ? 'bank-statements' : 'expenses', recordId: r.id })
      } else if (p.status !== r.status) {
        if (r.status === 'Approved') newNotifs.push({ id: `n-${r.id}-${Date.now()}`, type: 'approved', message: `Admin approved ${r.filename}`, timestamp: r.date || new Date().toLocaleString(), read: false, priority: 'approved', linkPage: p.category === 'Sales' ? 'sales' : p.category === 'Bank Statement' ? 'bank-statements' : 'expenses', recordId: r.id })
        if (r.status === 'Rejected') newNotifs.push({ id: `n-${r.id}-${Date.now()}`, type: 'rejected', message: `Admin rejected ${r.filename}`, timestamp: r.date || new Date().toLocaleString(), read: false, priority: 'critical', linkPage: p.category === 'Sales' ? 'sales' : p.category === 'Bank Statement' ? 'bank-statements' : 'expenses', recordId: r.id })
        if (r.status === 'Needs Clarification' || r.status === 'Info Requested') newNotifs.push({ id: `n-${r.id}-${Date.now()}`, type: 'info', message: `Admin requested info for ${r.filename}`, timestamp: r.date || new Date().toLocaleString(), read: false, priority: 'important', linkPage: p.category === 'Sales' ? 'sales' : p.category === 'Bank Statement' ? 'bank-statements' : 'expenses', recordId: r.id })
      }
    })
    if (newNotifs.length > 0) {
      const merged = [...newNotifs, ...notifications].slice(0, 100)
      saveNotifications(merged)
    }
    prevRecordsRef.current = records
  }, [records])

  const unreadCount = notifications.filter(n => !n.read).length

  const handleNotificationClick = (n) => {
    // mark read and navigate to relevant page + open record viewer
    const updated = notifications.map(x => x.id === n.id ? { ...x, read: true } : x)
    saveNotifications(updated)
    if (setActivePage && n.linkPage) setActivePage(n.linkPage)
  }

  const markAllRead = () => {
    const updated = notifications.map(x => ({ ...x, read: true }))
    saveNotifications(updated)
  }

  const [showNotif, setShowNotif] = useState(false)
  const notifRef = useRef(null)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
          font: { size: 12 }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 } }
      },
      y: {
        grid: { color: '#F0F1F2' },
        ticks: {
          font: { size: 11 },
          callback: (value) => '\u20A6' + (value / 1000000).toFixed(0) + 'M'
        }
      }
    }
  }

  const financialData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Income',
        data: [85000000, 92000000, 78000000, 110000000, 95000000, 128750000],
        borderColor: '#0D7D4D',
        backgroundColor: 'transparent',
        tension: 0.3,
        pointRadius: 3,
      },
      {
        label: 'Expenses',
        data: [32000000, 38000000, 42000000, 35000000, 41000000, 45230000],
        borderColor: '#C92A2A',
        backgroundColor: 'transparent',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: '#C92A2A'
      }
    ]
  }

  const activityData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      { 
        label: 'Documents',
        data: [52, 68, 45, 72, 58, 85],
        backgroundColor: '#153585',
        borderRadius: 2
      }
    ]
  }

  const stats = [
    { label: 'Total Expenses', value: records.filter(r => r.category === 'Expense').length.toString(), icon: DollarSign, color: 'bg-error-bg text-error', trend: 'Documents uploaded', up: true },
    { label: 'Total Sales', value: records.filter(r => r.category === 'Sales').length.toString(), icon: TrendingUp, color: 'bg-success-bg text-success', trend: 'Documents uploaded', up: true },
    { label: 'Bank Statements', value: records.filter(r => r.category === 'Bank Statement' || r.category === 'Bank').length.toString(), icon: Building2, color: 'bg-info-bg text-primary', trend: 'Documents uploaded', up: true },
    { label: 'Pending Review', value: pendingCount.toString(), icon: Clock, color: 'bg-warning-bg text-warning', trend: 'Awaiting review', up: false },
    { label: 'Approved Documents', value: approvedCount.toString(), icon: CheckCircle, color: 'bg-success-bg text-success', trend: 'Documents approved', up: true },
    { label: 'Rejected Documents', value: rejectedCount.toString(), icon: X, color: 'bg-error-bg text-error', trend: 'Documents rejected', up: false },
  ]

  const recentExpenses = [
    { id: 1, vendor: 'Shell Petroleum', category: 'Fuel', amount: '\u20A6245,000', date: 'Feb 24' },
    { id: 2, vendor: 'Amazon Web Services', category: 'Software', amount: '\u20A6890,000', date: 'Feb 23' },
    { id: 3, vendor: 'Lagos Electric', category: 'Utilities', amount: '\u20A6156,500', date: 'Feb 22' },
  ]

  const recentSales = [
    { id: 1, customer: 'Tech Solutions Ltd', invoice: 'INV-2026-0042', amount: '\u20A62,500,000', date: 'Feb 24' },
    { id: 2, customer: 'Global Ventures', invoice: 'INV-2026-0041', amount: '\u20A6890,000', date: 'Feb 23' },
    { id: 3, customer: 'Alpha Industries', invoice: 'INV-2026-0040', amount: '\u20A65,750,000', date: 'Feb 22' },
  ]

  const recentUploads = [
    { id: 1, filename: 'Expense_Report_Feb2026.pdf', type: 'PDF', category: 'Expense', date: 'Feb 24, 2026', status: 'Pending' },
    { id: 2, filename: 'Sales_Data_Jan2026.xlsx', type: 'XLSX', category: 'Sales', date: 'Feb 23, 2026', status: 'Approved' },
    { id: 3, filename: 'Bank_Statement_GTB_Feb2026.pdf', type: 'PDF', category: 'Bank Statement', date: 'Feb 22, 2026', status: 'Needs Clarification' },
  ]

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Dashboard Overview</h1>
            {verificationPending && (
              <div className="mt-1 inline-flex items-center h-6 px-2.5 rounded text-xs font-medium bg-warning-bg text-warning">
                Verification Pending
              </div>
            )}
            {profilePhoto && (
              <div className="flex items-center gap-2 mt-1">
                <div className="w-6 h-6 rounded-full overflow-hidden">
                  <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                </div>
                <span className="text-xs text-text-muted">{displayName}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative" ref={notifRef}>
            <button onClick={() => setShowNotif(s => !s)} className="relative w-10 h-9 rounded-md flex items-center justify-center text-text-secondary hover:bg-background">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-error text-white rounded-full text-[10px] flex items-center justify-center">{unreadCount}</span>
              )}
            </button>
            {showNotif && (
              <div className="absolute right-0 mt-2 w-96 bg-white border border-border rounded-lg shadow-card z-50">
                <div className="p-3 border-b border-border-light flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Notifications</h3>
                  <button onClick={markAllRead} className="text-xs text-primary hover:underline">Mark all read</button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-sm text-text-muted">No notifications</div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className={`p-3 border-b border-border-light hover:bg-background cursor-pointer ${!n.read ? 'bg-primary-tint' : ''}`} onClick={() => handleNotificationClick(n)}>
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {n.type === 'approved' ? <CheckCircle className="w-4 h-4 text-success" /> : n.type === 'rejected' ? <XCircle className="w-4 h-4 text-error" /> : n.type === 'info' ? <AlertCircle className="w-4 h-4 text-warning" /> : <UploadCloud className="w-4 h-4 text-primary" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-text-primary">{n.message}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="w-3 h-3 text-text-muted" />
                              <span className="text-xs text-text-muted">{n.timestamp}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onAddDocument}
            className="flex items-center gap-2 h-9 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Document
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-lg shadow-card p-5 flex items-start gap-4 hover:shadow-card-hover transition-shadow cursor-pointer"
          >
            <div className={`w-12 h-12 rounded-md flex items-center justify-center ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="text-[28px] font-semibold text-text-primary leading-tight">{stat.value}</div>
              <div className="text-[11px] font-medium text-text-secondary uppercase tracking-wide mt-1">{stat.label}</div>
              <div className={`flex items-center gap-1 text-xs mt-2 ${stat.up ? 'text-success' : 'text-error'}`}>
                {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.trend}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Compliance Status Widget */}
      <div className="mb-6">
        {getComplianceWidget()}
      </div>

      {/* Activity Timeline & Recent Uploads */}
      <div className="grid grid-cols-3 gap-6">
        {/* Activity Timeline */}
        <div className="bg-white rounded-lg shadow-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-light">
            <h3 className="text-base font-semibold text-text-primary">Recent Activity</h3>
          </div>
          <div className="divide-y divide-border-light max-h-80 overflow-y-auto">
            {(derivedActivities.length === 0) ? (
              <div className="p-4 text-sm text-text-muted">No recent activity</div>
            ) : (
              derivedActivities.map((activity) => (
                <div key={activity.id} className="px-5 py-3 hover:bg-background transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getActivityIcon(activity.type)}`}>
                      <activity.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary">{activity.message}</p>
                      <p className="text-xs text-text-muted mt-0.5">{activity.timestamp}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        {/* Recent Expenses */}
        <div className="bg-white rounded-lg shadow-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-light">
            <h3 className="text-base font-semibold text-text-primary">Recent Expenses</h3>
            <button 
              onClick={() => setActivePage('expenses')}
              className="text-sm text-primary hover:text-primary-light font-medium flex items-center gap-1"
            >
              See All <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-border-light">
            {recentExpenses.map((item) => (
              <div key={item.id} className="px-5 py-3 hover:bg-background transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-text-primary">{item.vendor}</div>
                    <div className="text-xs text-text-muted mt-0.5">{item.category} | {item.date}</div>
                  </div>
                  <div className="text-sm font-medium text-text-primary">{item.amount}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Sales */}
        <div className="bg-white rounded-lg shadow-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-light">
            <h3 className="text-base font-semibold text-text-primary">Recent Sales</h3>
            <button 
              onClick={() => setActivePage('sales')}
              className="text-sm text-primary hover:text-primary-light font-medium flex items-center gap-1"
            >
              See All <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-border-light">
            {recentSales.map((item) => (
              <div key={item.id} className="px-5 py-3 hover:bg-background transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-text-primary">{item.customer}</div>
                    <div className="text-xs text-text-muted mt-0.5">{item.invoice} | {item.date}</div>
                  </div>
                  <div className="text-sm font-medium text-success">{item.amount}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Uploads */}
        <div className="bg-white rounded-lg shadow-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-light">
            <h3 className="text-base font-semibold text-text-primary">Recent Uploads</h3>
            <button 
              onClick={() => setActivePage('upload-history')}
              className="text-sm text-primary hover:text-primary-light font-medium flex items-center gap-1"
            >
              See All <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-border-light">
            {recentUploads.map((item) => (
              <div key={item.id} className="px-5 py-3 hover:bg-background transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileTypeIcon type={item.type} />
                    <div>
                      <div className="text-sm font-medium text-text-primary truncate max-w-[160px]">{item.filename}</div>
                      <div className="text-xs text-text-muted mt-0.5">{item.category} | {item.date}</div>
                    </div>
                  </div>
                  <span className={`inline-flex items-center h-6 px-2.5 rounded text-xs font-medium ${
                    item.status === 'Approved' ? 'bg-success-bg text-success' :
                    item.status === 'Rejected' ? 'bg-error-bg text-error' :
                    item.status === 'Pending' ? 'bg-warning-bg text-warning' :
                    'bg-info-bg text-primary'
                  }`}>
                    {item.status || 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Expenses Page
function ExpensesPage({ onAddDocument, records, setRecords }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [viewingFile, setViewingFile] = useState(null)
  const [resubmitModal, setResubmitModal] = useState(null)

  const filteredData = records.filter(item => {
    const matchesSearch = item.filename.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        item.fileId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        item.user.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !filterStatus || item.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const handleResubmit = (record) => {
    setResubmitModal(record)
  }

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Approved': return 'bg-success-bg text-success'
      case 'Pending': return 'bg-warning-bg text-warning'
      case 'Rejected': return 'bg-error-bg text-error'
      case 'Info Requested': return 'bg-info-bg text-primary'
      case 'Needs Clarification': return 'bg-warning-bg text-warning'
      default: return 'bg-border text-text-secondary'
    }
  }

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this file?')) {
      setRecords(records.filter(item => item.id !== id))
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Expenses</h1>
        <button onClick={() => onAddDocument('expenses')} className="flex items-center gap-2 h-9 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors">
          <Plus className="w-4 h-4" />
          Add Document
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full h-9 pl-10 pr-4 bg-background border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-9 px-3 bg-background border border-border rounded-md text-sm focus:outline-none focus:border-primary">
            <option value="">All Status</option>
            <option value="Approved">Approved</option>
            <option value="Pending">Pending</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F9FAFB]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide w-16">SN</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">File Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">File ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Uploaded By</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Date & Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? (
                filteredData.map((row, index) => (
                  <tr key={row.id} className="border-b border-border-light hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-4 py-3.5 text-sm">{index + 1}</td>
                    <td onClick={() => setViewingFile(row)} className="px-4 py-3.5 text-sm cursor-pointer">{row.filename}</td>
                    <td className="px-4 py-3.5 text-sm font-medium">{row.fileId}</td>
                    <td className="px-4 py-3.5 text-sm">{row.user}</td>
                    <td className="px-4 py-3.5 text-sm">{row.date}</td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setViewingFile(row)} className="w-8 h-8 border border-border rounded flex items-center justify-center text-text-secondary hover:border-primary hover:text-primary" title="View"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(row.id)} className="w-8 h-8 border border-border rounded flex items-center justify-center text-text-secondary hover:border-error hover:text-error" title="Delete"><X className="w-4 h-4" /></button>
                        {row.status === 'Rejected' && (
                          <button onClick={() => setResubmitModal(row)} className="h-8 px-3 rounded-md bg-primary-tint text-primary text-xs font-medium hover:bg-primary-light">Resubmit</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={7}><EmptyState title="No records found" description="Try uploading your first expense or check filters." cta={<button onClick={() => onAddDocument('expenses')} className="h-9 px-4 bg-primary text-white rounded-md text-sm">Upload Expense</button>} /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewingFile && (
        <FileViewerModal
          file={viewingFile}
          onClose={() => setViewingFile(null)}
          onSave={(updated) => {
            setRecords((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)))
            setViewingFile(null)
          }}
          onDelete={(id) => {
            if (confirm('Are you sure you want to delete this file?')) {
              setRecords((prev) => prev.filter((r) => r.id !== id))
              setViewingFile(null)
            }
          }}
        />
      )}

      {resubmitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setResubmitModal(null)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Resubmit Document</h3>
              <button onClick={() => setResubmitModal(null)}><X className="w-5 h-5" /></button>
            </div>

            <p className="text-sm text-text-muted mb-3">This will keep the existing metadata but allow uploading a new file version. Previous versions are preserved for audit.</p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-text-muted">File</label>
                <input type="file" className="w-full" id="resubmit-file-input" />
              </div>

              <div className="pt-4 flex items-center gap-2 justify-end">
                <button onClick={() => setResubmitModal(null)} className="h-9 px-4 border border-border rounded-md text-sm">Cancel</button>
                <button onClick={() => {
                  const input = document.getElementById('resubmit-file-input')
                  if (!input || !input.files || input.files.length === 0) { alert('Please choose a file to resubmit'); return }
                  const newFile = input.files[0]
                  const newPreview = URL.createObjectURL(newFile)
                  setRecords(prev => prev.map(r => {
                    if (r.id !== resubmitModal.id) return r
                    const versions = r.versions ? [...r.versions] : []
                    // Push current as previous version
                    versions.push({ version: versions.length + 1, filename: r.filename, previewUrl: r.previewUrl, date: r.date })
                    return {
                      ...r,
                      filename: newFile.name,
                      rawFile: newFile,
                      previewUrl: newPreview,
                      date: new Date().toLocaleString(),
                      status: 'Pending',
                      adminComment: null,
                      requiredAction: null,
                      versions,
                    }
                  }))
                  setResubmitModal(null)
                }} className="h-9 px-4 bg-primary text-white rounded-md text-sm">Resubmit</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

}

// Home / Landing Page for unauthenticated users
function HomePage({ onGetStarted, onLogin }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-4xl w-full bg-white rounded-lg shadow-card p-10 text-center">
        <div className="mb-6">
          <div className="w-14 h-14 bg-primary rounded-md flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-semibold text-text-primary">Kiamina Accounting Services</h1>
          <p className="text-text-muted mt-2">A simple dashboard to upload and manage financial documents.</p>
        </div>

        <div className="flex items-center justify-center gap-4 mt-6">
          <button onClick={onGetStarted} className="h-12 px-6 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light">Get Started</button>
          <button onClick={onLogin} className="h-12 px-6 border border-border rounded-md text-sm font-medium hover:bg-background">Sign In</button>
        </div>

        <div className="mt-8 text-sm text-text-muted">
          <nav className="flex items-center gap-4 justify-center">
            <a className="hover:underline">Features</a>
            <a className="hover:underline">Pricing</a>
            <a className="hover:underline">Docs</a>
            <a className="hover:underline">Contact</a>
          </nav>
        </div>
      </div>
    </div>
  )
}

// Sales Page
function SalesPage({ onAddDocument, records, setRecords }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [viewingFile, setViewingFile] = useState(null)
  const [resubmitModal, setResubmitModal] = useState(null)

  const filteredData = records.filter(item => {
    const matchesSearch = item.filename.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        item.fileId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        item.user.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !filterStatus || item.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this file?')) {
      setRecords(records.filter(item => item.id !== id))
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Sales</h1>
        <button onClick={() => onAddDocument('sales')} className="flex items-center gap-2 h-9 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light">
          <Plus className="w-4 h-4" />Add Document
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full h-9 pl-10 pr-4 bg-background border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-9 px-3 bg-background border border-border rounded-md text-sm">
            <option value="">All Status</option>
            <option value="Approved">Approved</option>
            <option value="Pending">Pending</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F9FAFB]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide w-16">SN</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">File Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">File ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Uploaded By</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Date & Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? (
                filteredData.map((row, index) => (
                  <tr key={row.id} className="border-b border-border-light hover:bg-[#F9FAFB]">
                    <td className="px-4 py-3.5 text-sm">{index + 1}</td>
                    <td onClick={() => setViewingFile(row)} className="px-4 py-3.5 text-sm cursor-pointer">{row.filename}</td>
                    <td className="px-4 py-3.5 text-sm font-medium">{row.fileId}</td>
                    <td className="px-4 py-3.5 text-sm">{row.user}</td>
                    <td className="px-4 py-3.5 text-sm">{row.date}</td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setViewingFile(row)} className="w-8 h-8 border rounded flex items-center justify-center text-text-secondary hover:border-primary" title="View"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(row.id)} className="w-8 h-8 border rounded flex items-center justify-center text-text-secondary hover:border-error" title="Delete"><X className="w-4 h-4" /></button>
                        {row.status === 'Rejected' && (
                          <button onClick={() => setResubmitModal(row)} className="h-8 px-3 rounded-md bg-primary-tint text-primary text-xs font-medium hover:bg-primary-light">Resubmit</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={7}><EmptyState title="No records found" description="No sales documents yet." cta={<button onClick={() => onAddDocument('sales')} className="h-9 px-4 bg-primary text-white rounded-md text-sm">Upload Sales</button>} /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewingFile && (
        <FileViewerModal
          file={viewingFile}
          onClose={() => setViewingFile(null)}
          onSave={(updated) => {
            setRecords((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)))
            setViewingFile(null)
          }}
          onDelete={(id) => {
            if (confirm('Are you sure you want to delete this file?')) {
              setRecords((prev) => prev.filter((r) => r.id !== id))
              setViewingFile(null)
            }
          }}
        />
      )}

      {resubmitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setResubmitModal(null)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Resubmit Document</h3>
              <button onClick={() => setResubmitModal(null)}><X className="w-5 h-5" /></button>
            </div>

            <p className="text-sm text-text-muted mb-3">This will keep the existing metadata but allow uploading a new file version. Previous versions are preserved for audit.</p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-text-muted">File</label>
                <input type="file" className="w-full" id="resubmit-file-input-sales" />
              </div>

              <div className="pt-4 flex items-center gap-2 justify-end">
                <button onClick={() => setResubmitModal(null)} className="h-9 px-4 border border-border rounded-md text-sm">Cancel</button>
                <button onClick={() => {
                  const input = document.getElementById('resubmit-file-input-sales')
                  if (!input || !input.files || input.files.length === 0) { alert('Please choose a file to resubmit'); return }
                  const newFile = input.files[0]
                  const newPreview = URL.createObjectURL(newFile)
                  setRecords(prev => prev.map(r => {
                    if (r.id !== resubmitModal.id) return r
                    const versions = r.versions ? [...r.versions] : []
                    versions.push({ version: versions.length + 1, filename: r.filename, previewUrl: r.previewUrl, date: r.date })
                    return {
                      ...r,
                      filename: newFile.name,
                      rawFile: newFile,
                      previewUrl: newPreview,
                      date: new Date().toLocaleString(),
                      status: 'Pending',
                      adminComment: null,
                      requiredAction: null,
                      versions,
                    }
                  }))
                  setResubmitModal(null)
                }} className="h-9 px-4 bg-primary text-white rounded-md text-sm">Resubmit</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Bank Statements Page
function BankStatementsPage({ onAddDocument, records, setRecords }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [viewingFile, setViewingFile] = useState(null)

  const filteredData = records.filter(item => {
    const matchesSearch = item.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.fileId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.user.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !filterStatus || item.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this file?')) {
      setRecords(records.filter(item => item.id !== id))
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Bank Statements</h1>
        <button
          onClick={() => onAddDocument('bank-statements')}
          className="flex items-center gap-2 h-9 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Document
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full h-9 pl-10 pr-4 bg-background border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-9 px-3 bg-background border border-border rounded-md text-sm focus:outline-none focus:border-primary">
            <option value="">All Status</option>
            <option value="Approved">Approved</option>
            <option value="Pending">Pending</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F9FAFB]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide w-16">SN</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">File Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">File ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Uploaded By</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Date & Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? (
                filteredData.map((row, index) => (
                  <tr key={row.id} className="border-b border-border-light hover:bg-[#F9FAFB]">
                    <td className="px-4 py-3.5 text-sm">{index + 1}</td>
                    <td onClick={() => setViewingFile(row)} className="px-4 py-3.5 text-sm cursor-pointer">{row.filename}</td>
                    <td className="px-4 py-3.5 text-sm font-medium">{row.fileId}</td>
                    <td className="px-4 py-3.5 text-sm">{row.user}</td>
                    <td className="px-4 py-3.5 text-sm">{row.date}</td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setViewingFile(row)} className="w-8 h-8 border rounded flex items-center justify-center text-text-secondary hover:border-primary" title="View"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(row.id)} className="w-8 h-8 border rounded flex items-center justify-center text-text-secondary hover:border-error" title="Delete"><X className="w-4 h-4" /></button>
                        {row.status === 'Rejected' && (
                          <button onClick={() => setResubmitModal(row)} className="h-8 px-3 rounded-md bg-primary-tint text-primary text-xs font-medium hover:bg-primary-light">Resubmit</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={7}><EmptyState title="No records found" description="No bank statements uploaded." cta={<button onClick={() => onAddDocument('bank-statements')} className="h-9 px-4 bg-primary text-white rounded-md text-sm">Upload Statement</button>} /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewingFile && (
        <FileViewerModal
          file={viewingFile}
          onClose={() => setViewingFile(null)}
          onSave={(updated) => {
            setRecords((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)))
            setViewingFile(null)
          }}
          onDelete={(id) => {
            if (confirm('Are you sure you want to delete this file?')) {
              setRecords((prev) => prev.filter((r) => r.id !== id))
              setViewingFile(null)
            }
          }}
        />
      )}
      {resubmitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setResubmitModal(null)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Resubmit Document</h3>
              <button onClick={() => setResubmitModal(null)}><X className="w-5 h-5" /></button>
            </div>

            <p className="text-sm text-text-muted mb-3">This will keep the existing metadata but allow uploading a new file version. Previous versions are preserved for audit.</p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-text-muted">File</label>
                <input type="file" className="w-full" id="resubmit-file-input-bank" />
              </div>

              <div className="pt-4 flex items-center gap-2 justify-end">
                <button onClick={() => setResubmitModal(null)} className="h-9 px-4 border border-border rounded-md text-sm">Cancel</button>
                <button onClick={() => {
                  const input = document.getElementById('resubmit-file-input-bank')
                  if (!input || !input.files || input.files.length === 0) { alert('Please choose a file to resubmit'); return }
                  const newFile = input.files[0]
                  const newPreview = URL.createObjectURL(newFile)
                  setRecords(prev => prev.map(r => {
                    if (r.id !== resubmitModal.id) return r
                    const versions = r.versions ? [...r.versions] : []
                    versions.push({ version: versions.length + 1, filename: r.filename, previewUrl: r.previewUrl, date: r.date })
                    return {
                      ...r,
                      filename: newFile.name,
                      rawFile: newFile,
                      previewUrl: newPreview,
                      date: new Date().toLocaleString(),
                      status: 'Pending',
                      adminComment: null,
                      requiredAction: null,
                      versions,
                    }
                  }))
                  setResubmitModal(null)
                }} className="h-9 px-4 bg-primary text-white rounded-md text-sm">Resubmit</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Upload History Page
function UploadHistoryPage({ records }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [sortBy, setSortBy] = useState('date')
  const [sortOrder, setSortOrder] = useState('desc')

  const filteredData = records
    .filter(item => {
      const matchesSearch = item.filename.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.user.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesDate = !filterDate || item.date.includes(filterDate)
      const matchesType = !filterType || item.type === filterType
      const matchesCategory = !filterCategory || item.category === filterCategory
      return matchesSearch && matchesDate && matchesType && matchesCategory
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a.date)
        const dateB = new Date(b.date)
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
      }
      return 0
    })

  const clearFilters = () => {
    setSearchTerm('')
    setFilterDate('')
    setFilterType('')
    setFilterCategory('')
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Upload History</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search by filename or user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-10 pr-4 bg-background border border-border rounded-md text-sm focus:outline-none focus:border-primary"
            />
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="h-9 px-3 bg-background border border-border rounded-md text-sm focus:outline-none focus:border-primary"
            />
          </div>

          {/* Document Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="h-9 px-3 bg-background border border-border rounded-md text-sm focus:outline-none focus:border-primary"
          >
            <option value="">All Types</option>
            <option value="PDF">PDF</option>
            <option value="XLSX">XLSX</option>
            <option value="DOCX">DOCX</option>
            <option value="CSV">CSV</option>
          </select>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-9 px-3 bg-background border border-border rounded-md text-sm focus:outline-none focus:border-primary"
          >
            <option value="">All Categories</option>
            <option value="Expense">Expenses</option>
            <option value="Sales">Sales</option>
            <option value="Bank Statement">Bank Statement</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-9 px-3 bg-background border border-border rounded-md text-sm focus:outline-none focus:border-primary"
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="h-9 px-3 bg-background border border-border rounded-md text-sm hover:bg-gray-50 flex items-center gap-1"
          >
            {sortOrder === 'desc' ? '\u2193' : '\u2191'}
          </button>

          {/* Clear Filters */}
          {(searchTerm || filterDate || filterType || filterCategory) && (
            <button
              onClick={clearFilters}
              className="h-9 px-3 text-sm text-error hover:bg-error-bg rounded-md"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F9FAFB]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">File Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">File Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Upload Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Uploaded By</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? (
                filteredData.map((row) => (
                  <tr key={row.id} className="border-b border-border-light hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <FileTypeIcon type={row.type} />
                        <span className="text-sm">{row.filename}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm">{row.type}</td>
                    <td className="px-4 py-3.5"><CategoryTag category={row.category} /></td>
                    <td className="px-4 py-3.5 text-sm">{row.date}</td>
                    <td className="px-4 py-3.5 text-sm">{row.user}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={row.status} /></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8">
                    <EmptyState title="No records" description="No matching records found." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ClientSupportWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [draftMessage, setDraftMessage] = useState('')
  const [agentConnected, setAgentConnected] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Hi. I am Kiamina Support Bot. Ask me about uploads, expenses, sales, or settings. Type "agent" for a human support agent.',
    },
  ])

  const appendMessage = (sender, text) => {
    setMessages((prev) => [...prev, { id: Date.now() + Math.random(), sender, text }])
  }

  const getBotReply = (inputText) => {
    const text = inputText.toLowerCase()
    if (text.includes('upload')) return 'Go to Add Document, choose category, then upload files or folders. I can guide you step by step.'
    if (text.includes('expense')) return 'For expenses, open Expenses, click Add Document, and include vendor, class, payment method, and date.'
    if (text.includes('sales')) return 'For sales, upload invoice files and fill customer, invoice number, and payment status.'
    if (text.includes('setting') || text.includes('profile')) return 'Go to Settings to manage your profile, business details, and tax setup.'
    if (text.includes('verification')) return 'Identity verification is in Settings > Identity Verification. Upload the required documents and submit.'
    return 'I can help with uploads, dashboard navigation, settings, expenses, and sales. Ask me a specific question or type "agent".'
  }

  const connectHumanAgent = () => {
    if (agentConnected) {
      appendMessage('agent', 'I am here. Please share your issue and I will assist now.')
      return
    }

    appendMessage('bot', 'Connecting you to a human support agent...')
    setAgentConnected(true)

    setTimeout(() => {
      appendMessage('agent', 'Hi, this is Kiamina Support. I have joined the chat. How can I help you today?')
    }, 500)
  }

  const handleSend = () => {
    const text = draftMessage.trim()
    if (!text || isSending) return

    appendMessage('user', text)
    setDraftMessage('')

    const asksForAgent = /(agent|human|person|representative|support team)/i.test(text)
    if (asksForAgent) {
      connectHumanAgent()
      return
    }

    setIsSending(true)
    setTimeout(() => {
      if (agentConnected) {
        appendMessage('agent', 'Thanks. I am reviewing this now and will help you resolve it.')
      } else {
        appendMessage('bot', getBotReply(text))
      }
      setIsSending(false)
    }, 350)
  }

  const quickAsk = (prompt) => {
    setDraftMessage(prompt)
  }

  return (
    <div className="fixed bottom-5 right-5 z-[120]">
      {isOpen && (
        <div className="w-[360px] max-w-[calc(100vw-2rem)] bg-white border border-border rounded-xl shadow-card mb-3 overflow-hidden">
          <div className="px-4 py-3 border-b border-border-light bg-background/60">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold text-text-primary">Support Chat</h4>
                <p className="text-xs text-text-muted">
                  {agentConnected ? 'Human agent connected' : 'Bot available. Type "agent" for human support.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-md border border-border-light text-text-secondary hover:text-text-primary hover:bg-white"
              >
                <X className="w-4 h-4 mx-auto" />
              </button>
            </div>
          </div>

          <div className="h-72 overflow-y-auto p-3 space-y-2 bg-white">
            {messages.map((message) => {
              const isUser = message.sender === 'user'
              const roleLabel = message.sender === 'agent' ? 'AGENT' : message.sender === 'bot' ? 'BOT' : 'YOU'
              return (
                <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-lg px-3 py-2 ${isUser ? 'bg-primary text-white' : 'bg-background border border-border-light text-text-primary'}`}>
                    <div className={`text-[10px] font-semibold tracking-wide ${isUser ? 'text-white/80' : 'text-text-muted'}`}>{roleLabel}</div>
                    <p className="text-sm mt-1 leading-snug">{message.text}</p>
                  </div>
                </div>
              )
            })}

            {isSending && (
              <div className="flex justify-start">
                <div className="bg-background border border-border-light rounded-lg px-3 py-2 text-sm text-text-muted">
                  Typing...
                </div>
              </div>
            )}
          </div>

          <div className="px-3 pt-3 pb-2 border-t border-border-light">
            {!agentConnected && (
              <div className="flex flex-wrap gap-2 mb-2">
                <button type="button" onClick={() => quickAsk('How do I upload documents?')} className="text-xs h-7 px-2.5 rounded border border-border bg-background text-text-secondary hover:text-text-primary">Upload help</button>
                <button type="button" onClick={() => quickAsk('Show me expenses guidance')} className="text-xs h-7 px-2.5 rounded border border-border bg-background text-text-secondary hover:text-text-primary">Expenses help</button>
                <button type="button" onClick={() => quickAsk('Connect me to an agent')} className="text-xs h-7 px-2.5 rounded border border-border bg-background text-text-secondary hover:text-text-primary">Talk to agent</button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={draftMessage}
                onChange={(e) => setDraftMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
                placeholder={agentConnected ? 'Message the human support agent...' : 'Ask the support bot or type "agent"...'}
                className="flex-1 h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!draftMessage.trim() || isSending}
                className="h-10 px-3 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
              >
                Send <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="h-11 px-4 rounded-full bg-primary text-white shadow-card hover:bg-primary-light inline-flex items-center gap-2"
      >
        <MessageCircle className="w-4 h-4" />
        <span className="text-sm font-medium">Support</span>
      </button>
    </div>
  )
}

// Reusable file viewer modal used by pages
function FileViewerModal({ file, onClose, onSave, onDelete }) {
  const [editData, setEditData] = useState(file)
  const [textPreview, setTextPreview] = useState(null)
  const [selectedVersion, setSelectedVersion] = useState(null)

  useEffect(() => {
    setEditData(file)
    setTextPreview(null)
    setSelectedVersion(null)
  }, [file])

  useEffect(() => {
    // load text preview for TXT/CSV types
    const active = selectedVersion || editData || file
    const ext = (active?.extension || file?.extension || (active?.rawFile?.name?.split('.')?.pop() || '')).toUpperCase()
    if (!['TXT', 'CSV'].includes(ext)) {
      setTextPreview(null)
      return
    }
    const url = active?.previewUrl || file?.previewUrl || (active?.rawFile ? URL.createObjectURL(active.rawFile) : null)
    if (!url) {
      setTextPreview('Preview not available for this file type.')
      return
    }

    let cancelled = false
    fetch(url)
      .then((response) => response.text())
      .then((value) => {
        if (!cancelled) setTextPreview(value)
      })
      .catch(() => {
        if (!cancelled) setTextPreview('Unable to load preview.')
      })

    return () => {
      cancelled = true
    }
  }, [editData, file, selectedVersion])

  const renderFilePreview = () => {
    const active = selectedVersion || editData || file
    const ext = (active?.extension || file?.extension || (active?.rawFile?.name?.split('.')?.pop() || '')).toUpperCase()
    const url = active?.previewUrl || file?.previewUrl || (active?.rawFile ? URL.createObjectURL(active.rawFile) : null)

    if (url && ext === 'PDF') {
      return <iframe title="pdf-preview" src={url} className="w-full h-64" />
    }
    if (url && ['PNG', 'JPG', 'JPEG', 'GIF', 'WEBP', 'BMP'].includes(ext)) {
      return <img src={url} alt={active?.filename || file?.filename || 'Preview'} className="w-full object-contain max-h-64" />
    }
    if (url && ['TXT', 'CSV'].includes(ext)) {
      return (
        <div className="p-3 text-sm font-mono whitespace-pre-wrap max-h-64 overflow-auto">
          {textPreview ?? 'Loading preview...'}
        </div>
      )
    }
    return (
      <div className="p-4 text-sm text-text-muted">Preview not available for this file type. You can download to view.</div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border-light flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text-primary">Document Details</h3>
          <button onClick={onClose} className="w-8 h-8 border border-border rounded-md text-text-secondary hover:text-text-primary hover:border-primary">
            <X className="w-4 h-4 mx-auto" />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5 max-h-[calc(90vh-72px)] overflow-y-auto">
          <div>
            <label className="block text-xs text-text-muted mb-2">Preview</label>
            <div className="border border-border rounded-md overflow-hidden bg-background">
              {renderFilePreview()}
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-muted">File ID</label>
            <div className="py-2 font-medium">{file.fileId}</div>
          </div>

          <div>
            <label className="block text-xs text-text-muted">Uploaded By</label>
            <input value={editData.user} onChange={(e) => setEditData(prev => ({ ...prev, user: e.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm" />
          </div>

          <div>
            <label className="block text-xs text-text-muted">Date & Time</label>
            <div className="py-2">{file.date}</div>
          </div>

          {/* Show category-specific metadata if present */}
          {('vendorName' in editData || 'vendorName' in file) && (
            <div>
              <label className="block text-xs text-text-muted">Vendor</label>
              <input value={editData.vendorName || ''} onChange={(e) => setEditData(prev => ({ ...prev, vendorName: e.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm" />
            </div>
          )}
          {('expenseClass' in editData || 'expenseClass' in file) && (
            <div>
              <label className="block text-xs text-text-muted">Class</label>
              <input value={editData.expenseClass || ''} onChange={(e) => setEditData(prev => ({ ...prev, expenseClass: e.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm" />
            </div>
          )}
          {('expenseDate' in editData || 'expenseDate' in file) && (
            <div>
              <label className="block text-xs text-text-muted">Expense Date</label>
              <input type="date" value={editData.expenseDate || ''} onChange={(e) => setEditData(prev => ({ ...prev, expenseDate: e.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm" />
            </div>
          )}
          {('paymentMethod' in editData || 'paymentMethod' in file) && (
            <div>
              <label className="block text-xs text-text-muted">Payment Method</label>
              <input value={editData.paymentMethod || ''} onChange={(e) => setEditData(prev => ({ ...prev, paymentMethod: e.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm" />
            </div>
          )}
          {('customerName' in editData || 'customerName' in file) && (
            <div>
              <label className="block text-xs text-text-muted">Customer</label>
              <input value={editData.customerName || ''} onChange={(e) => setEditData(prev => ({ ...prev, customerName: e.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm" />
            </div>
          )}
          {('invoiceNumber' in editData || 'invoiceNumber' in file) && (
            <div>
              <label className="block text-xs text-text-muted">Invoice #</label>
              <input value={editData.invoiceNumber || ''} onChange={(e) => setEditData(prev => ({ ...prev, invoiceNumber: e.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm" />
            </div>
          )}
          {('salesClass' in editData || 'salesClass' in file) && (
            <div>
              <label className="block text-xs text-text-muted">Class</label>
              <input value={editData.salesClass || ''} onChange={(e) => setEditData(prev => ({ ...prev, salesClass: e.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm" />
            </div>
          )}
          {('bankName' in editData || 'bankName' in file) && (
            <div>
              <label className="block text-xs text-text-muted">Bank Name</label>
              <input value={editData.bankName || ''} onChange={(e) => setEditData(prev => ({ ...prev, bankName: e.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm" />
            </div>
          )}
          {('accountName' in editData || 'accountName' in file) && (
            <div>
              <label className="block text-xs text-text-muted">Account Name</label>
              <input value={editData.accountName || ''} onChange={(e) => setEditData(prev => ({ ...prev, accountName: e.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm" />
            </div>
          )}
          {('accountLast4' in editData || 'accountLast4' in file) && (
            <div>
              <label className="block text-xs text-text-muted">Account Last 4</label>
              <input value={editData.accountLast4 || ''} maxLength={4} onChange={(e) => setEditData(prev => ({ ...prev, accountLast4: e.target.value.replace(/\D/g, '').slice(0, 4) }))} className="w-full h-10 px-3 border border-border rounded-md text-sm" />
            </div>
          )}
          {('statementStartDate' in editData || 'statementStartDate' in file) && (
            <div>
              <label className="block text-xs text-text-muted">Statement Start Date</label>
              <input type="date" value={editData.statementStartDate || ''} onChange={(e) => setEditData(prev => ({ ...prev, statementStartDate: e.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm" />
            </div>
          )}
          {('statementEndDate' in editData || 'statementEndDate' in file) && (
            <div>
              <label className="block text-xs text-text-muted">Statement End Date</label>
              <input type="date" value={editData.statementEndDate || ''} onChange={(e) => setEditData(prev => ({ ...prev, statementEndDate: e.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm" />
            </div>
          )}
          {('description' in editData || 'description' in file) && (
            <div>
              <label className="block text-xs text-text-muted">Description</label>
              <textarea value={editData.description || ''} onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-md text-sm resize-none" rows={3} />
            </div>
          )}

          {file.status === 'Rejected' && (
            <div className="p-3 bg-error-bg rounded-md">
              <label className="block text-xs text-text-muted">Admin Comment</label>
              <div className="py-2 text-sm text-error">{file.adminComment || 'No comment provided by admin.'}</div>
              <label className="block text-xs text-text-muted">Required Action</label>
              <div className="py-2 text-sm text-error">{file.requiredAction || 'Please resubmit with requested documents.'}</div>
            </div>
          )}

          {Array.isArray(file.versions) && file.versions.length > 0 && (
            <div>
              <label className="block text-xs text-text-muted">Version History</label>
              <div className="border border-border rounded-md p-2 max-h-40 overflow-y-auto">
                {file.versions.slice().reverse().map((v, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 py-2 border-b last:border-b-0">
                    <div className="text-sm">
                      <div className="font-medium">Version {v.version}</div>
                      <div className="text-xs text-text-muted">{v.date}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setSelectedVersion(v)} className="text-xs px-2 py-1 border border-border rounded">View</button>
                      <a href={v.previewUrl} download={v.filename} className="text-xs px-2 py-1 border border-border rounded">Download</a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-text-muted">Status</label>
            <select value={editData.status} onChange={(e) => setEditData(prev => ({ ...prev, status: e.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm">
              <option>Pending</option>
              <option>Approved</option>
              <option>Rejected</option>
            </select>
          </div>

          <div className="pt-4 flex items-center gap-2 justify-end">
            <a href={editData.previewUrl || file.previewUrl || (file.rawFile ? URL.createObjectURL(file.rawFile) : '')} download={editData.filename} className="h-9 px-4 border border-border rounded-md text-sm text-text-primary hover:bg-background flex items-center justify-center">Download</a>
            <button onClick={() => { onDelete(file.id) }} className="h-9 px-4 border border-border rounded-md text-sm text-error hover:bg-error-bg">Delete</button>
            <button onClick={() => { onSave(editData) }} className="h-9 px-4 bg-primary text-white rounded-md text-sm">Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Settings Page

export {
  StatusBadge,
  CategoryTag,
  FileTypeIcon,
  Sidebar,
  TopBar,
  DashboardPage,
  ExpensesPage,
  HomePage,
  SalesPage,
  BankStatementsPage,
  UploadHistoryPage,
  ClientSupportWidget,
  FileViewerModal,
}


