import { useState } from 'react'
import {
  canAccessAdminPage,
  AdminSidebar,
  AdminTopBar,
  AdminDashboardPage,
  AdminClientsPage,
  AdminClientProfilePage,
  AdminClientDocumentsPage,
  AdminClientUploadHistoryPage,
  AdminDocumentReviewCenter,
  AdminCommunicationsCenter,
  AdminSendNotificationPage,
  AdminActivityLogPage,
} from './AdminViews'
import AdminSettingsPage from './settings/AdminSettingsPage'
import { ADMIN_DEFAULT_PAGE } from './adminConfig'

const defaultAdminNotifications = [
  { id: 'NOT-001', type: 'comment', message: 'New comment on Expense_Report_Feb2026.pdf', timestamp: 'Feb 24, 2026 11:00 AM', read: false },
  { id: 'NOT-002', type: 'status', message: 'Bank_Statement_GTB_Feb2026.pdf requires review', timestamp: 'Feb 22, 2026 9:45 AM', read: false },
]

function AdminAccessDenied({ onReturn }) {
  return (
    <div className="h-full min-h-[420px] bg-white rounded-lg shadow-card border border-border-light p-8 flex items-center justify-center">
      <div className="max-w-md text-center">
        <h2 className="text-2xl font-semibold text-text-primary">Insufficient Permissions</h2>
        <p className="text-sm text-text-secondary mt-2">You do not have access to this feature.</p>
        <button
          type="button"
          onClick={onReturn}
          className="mt-5 h-10 px-4 bg-primary text-white rounded-md text-sm font-semibold hover:bg-primary-light transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  )
}

function AdminWorkspace({
  activePage,
  setActivePage,
  onLogout,
  showToast,
  adminFirstName,
  currentAdminAccount,
  onRequestImpersonation,
  impersonationEnabled,
  onAdminActionLog,
}) {
  const [adminNotifications, setAdminNotifications] = useState(defaultAdminNotifications)
  const [selectedClientContext, setSelectedClientContext] = useState(null)

  const handleMarkNotificationRead = (notificationId) => {
    setAdminNotifications((prev) => prev.map((notification) => (
      notification.id === notificationId ? { ...notification, read: true } : notification
    )))
  }

  const openClientContext = (client) => {
    if (!client) return
    setSelectedClientContext(client)
  }

  const renderAdminPage = () => {
    if (!canAccessAdminPage(activePage, currentAdminAccount)) {
      return <AdminAccessDenied onReturn={() => setActivePage(ADMIN_DEFAULT_PAGE)} />
    }

    switch (activePage) {
      case 'admin-dashboard':
        return <AdminDashboardPage setActivePage={setActivePage} />
      case 'admin-clients':
        return (
          <AdminClientsPage
            showToast={showToast}
            setActivePage={setActivePage}
            onRequestImpersonation={onRequestImpersonation}
            currentAdminAccount={currentAdminAccount}
            impersonationEnabled={impersonationEnabled}
            onAdminActionLog={onAdminActionLog}
            onOpenClientProfile={openClientContext}
            onOpenClientDocuments={openClientContext}
            onOpenClientUploadHistory={openClientContext}
          />
        )
      case 'admin-client-profile':
        return (
          <AdminClientProfilePage
            client={selectedClientContext}
            setActivePage={setActivePage}
            showToast={showToast}
            onAdminActionLog={onAdminActionLog}
          />
        )
      case 'admin-client-documents':
        return (
          <AdminClientDocumentsPage
            client={selectedClientContext}
            setActivePage={setActivePage}
            showToast={showToast}
            onAdminActionLog={onAdminActionLog}
          />
        )
      case 'admin-client-upload-history':
        return <AdminClientUploadHistoryPage client={selectedClientContext} setActivePage={setActivePage} showToast={showToast} />
      case 'admin-documents':
        return <AdminDocumentReviewCenter showToast={showToast} />
      case 'admin-communications':
        return <AdminCommunicationsCenter showToast={showToast} />
      case 'admin-notifications':
        return <AdminSendNotificationPage showToast={showToast} />
      case 'admin-activity':
        return <AdminActivityLogPage />
      case 'admin-settings':
        return <AdminSettingsPage showToast={showToast} currentAdminAccount={currentAdminAccount} />
      default:
        return <AdminDashboardPage setActivePage={setActivePage} />
    }
  }

  return (
    <div className="flex min-h-screen w-screen bg-background">
      <AdminSidebar activePage={activePage} setActivePage={setActivePage} onLogout={onLogout} currentAdminAccount={currentAdminAccount} />

      <div className="flex-1 flex flex-col ml-64">
        <AdminTopBar
          adminFirstName={adminFirstName}
          notifications={adminNotifications}
          onMarkNotificationRead={handleMarkNotificationRead}
          currentAdminAccount={currentAdminAccount}
        />
        <main className="p-6 flex-1 overflow-auto">
          {renderAdminPage()}
        </main>
      </div>
    </div>
  )
}

export default AdminWorkspace
export { ADMIN_DEFAULT_PAGE }
