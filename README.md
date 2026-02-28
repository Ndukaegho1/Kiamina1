# Kiamina Accounting Dashboard (Frontend)

Single-page React + Vite application for Kiamina Accounting Services.  
It provides two workspaces in one app:

1. Client workspace (document uploads, folders, history, support, settings)
2. Admin workspace (RBAC, review, support inbox, leads, notifications, work-hours, activity)

The codebase is local-first and persists most state in `localStorage` and `IndexedDB` (file blobs), with optional backend API calls for OTP/email and notifications.

## Table Of Contents

1. Project Scope
2. Tech Stack
3. Run Locally
4. App Entry And Routing Model
5. Core Feature Map
6. Client Workspace
7. Admin Workspace
8. Support System (Client + Admin)
9. Role-Based Access Control (RBAC)
10. Persistence Model (Storage Keys)
11. Backend API Contracts
12. File Handling And Preview Pipeline
13. Project Structure
14. Important Utilities
15. Known Limitations And Notes
16. Suggested Next Steps

## 1) Project Scope

This frontend implements:

- Client onboarding and authentication with OTP verification
- Document upload workflow for Expenses, Sales, and Bank Statements
- Folder-first document organization with file-level metadata and version history
- Creatable "Class" tagging model (single-select, mandatory on upload)
- Client support chat with bot/human handoff and attachment support
- Lead capture from anonymous support sessions and newsletter subscription
- Full admin surface with role hierarchy, permissions, ticket handling, document review, notifications, trash, and activity logs
- Admin work-hours time tracking with inactivity auto-pause and break credit logic

## 2) Tech Stack

- Framework: React 18
- Build tool: Vite 5
- Styling: Tailwind CSS + custom CSS variables (`src/index.css`)
- Icons: `lucide-react`
- Charts: `chart.js`, `react-chartjs-2`
- Office/file parsing:
  - `pdfjs-dist`
  - `xlsx`
  - `jszip`
- Animation loader: `@lottiefiles/dotlottie-react`

## 3) Run Locally

### Requirements

- Node.js 18+ (recommended)
- npm 9+

### Commands

```bash
npm install
npm run dev
```

Build and preview:

```bash
npm run build
npm run preview
```

### Notes

- Dev app runs via Vite.
- The app is designed to run without a backend for many flows, but some admin/security operations expect APIs (see API section).

## 4) App Entry And Routing Model

- Entry point: `src/main.jsx`
- Root app: `src/App.jsx`
- No React Router is used.
- Navigation is controlled by app state (`activePage`) plus `history.pushState`/`replaceState`.
- App modes:
  - Public home
  - Client auth
  - Admin auth
  - Client dashboard/workspace
  - Admin dashboard/workspace

Primary route state constants:

- Client pages: `dashboard`, `expenses`, `sales`, `bank-statements`, `upload-history`, `recent-activities`, `support`, `settings`
- Admin pages from `src/components/admin/adminConfig.js`

## 5) Core Feature Map

- Authentication and OTP:
  - Client login/signup with OTP
  - Admin login with OTP
  - Invite-based admin onboarding + OTP
- Document operations:
  - Upload by category and folder
  - Mandatory owner
  - Mandatory class/tag per file
  - Preview + download + edit metadata + versioning
- Support:
  - Bot intro, lead intake (name -> email -> inquiry)
  - Human handoff
  - Ticket status lifecycle
  - Attachments and previews
- Admin governance:
  - RBAC role hierarchy and permission sets
  - Client assignments (multi-assignee for area accountants)
  - Activity and audit trails
  - Notification send/schedule/drafts
  - Trash with restore
  - Work-hour tracking and export

## 6) Client Workspace

Main client UI lives in:

- `src/components/client/dashboard/ClientDashboardViews.jsx`
- `src/components/client/dashboard/ClientDocumentsWorkspace.jsx`
- `src/components/client/documents/ClientAddDocumentModal.jsx`
- `src/components/client/support/ClientSupportExperience.jsx`
- `src/components/client/settings/ClientSettingsPage.jsx`
- `src/components/client/onboarding/ClientOnboardingExperience.jsx`

### 6.1 Add Document Modal

`ClientAddDocumentModal.jsx`

Implemented behavior:

- Category selection (Expenses, Sales, Bank Statements)
- Folder name required
- Document owner required
- File selection supports browse and drag-drop
- "Select folder" copy removed in upload action area; upload is file-based
- Class field:
  - Single-select, creatable autocomplete
  - Required (`Class *`)
  - Creates new value on Enter
  - Reuses previously created values
  - Case-insensitive dedupe + trim
  - Chip UX with remove/backspace behavior
  - Placeholder uses `e.g. HeadOffice`
- Expenses: payment method dropdown
- Sales: invoice + invoice number fields (optional)
- Upload blocked unless required fields are valid

### 6.2 Documents And Folders

`ClientDocumentsWorkspace.jsx`

- Folder listing and folder drill-in pages
- Sorting/filtering in sections and inside folders:
  - Date (newest/oldest)
  - Alphabetical (A-Z/Z-A)
- Search and date range filters
- File metadata edit panel
- File lock behavior when approved
- Version history and activity timeline
- Bulk actions (class/priority/delete/move)
- Restore/archive/delete handling
- Download filename pattern: `Business Name - Original File Name`

### 6.3 Upload History

`UploadHistoryPage` in `ClientDashboardViews.jsx`

- Unified history from uploaded files
- Filter and sort controls
- Open file location from upload history into folder context

### 6.4 Recent Activities

- Activity table sourced from scoped client activity log
- Filtering/sorting support

### 6.5 Settings

`ClientSettingsPage.jsx`

- Profile, business, tax, address, notifications, verification docs
- Some fields become lock-protected after being set
- Scoped persistence by account email

### 6.6 Onboarding

`ClientOnboardingExperience.jsx`

- 5-step onboarding flow
- Business/tax/profile/verification/preferences
- Persists onboarding state and settings data

## 7) Admin Workspace

Main admin UI lives in:

- `src/components/admin/AdminWorkspace.jsx`
- `src/components/admin/AdminViews.jsx`
- `src/components/admin/settings/AdminSettingsPage.jsx`
- `src/components/admin/support/AdminSupportInboxPanel.jsx`

### 7.1 Admin Pages

From `AdminViews.jsx`:

- Admin Dashboard
- Document Review Center
- Client Management
- Client Profile/Documents/Upload History
- Communications Center (support inbox)
- Leads
- Send Notification
- Work Hours
- Activity Log
- Trash
- Admin Settings

### 7.2 Document Review Center

- Reads real stored client docs (no mock fallback)
- Review actions and comments
- Real preview pipeline supports image/pdf/text/office where possible
- Download from cache/preview with business-prefixed naming

### 7.3 Client Management

- Client list scoped by admin role/assignment
- Compliance/status visibility
- Impersonation entry point (permission-gated)

### 7.4 Admin Settings

`AdminSettingsPage.jsx` implements:

- Profile settings
- Password update + temporary password flow
- Super admin email-change flow with SMS OTP (backend-verified)
- Admin account creation
  - Generate strong password helper
  - Copy credential packet for handoff
- Invite flow
  - 48h expiry
  - Dev-only demo invite generator
  - Invite delete logged
- Permission editor per admin
- Client assignment to Area Accountant (multi-assignee)
- Logout control:
  - Global client logout
  - Selected client logout
- All major actions are logged

### 7.5 Notifications Center

`AdminSendNotificationPage`:

- Bulk or targeted audience
- Draft save/edit/send
- Scheduled notifications queue
- Email delivery through backend endpoint
- Brief client in-app notifications only for successful email recipients
- Delivery failure handling when email fails for all recipients

### 7.6 Leads Page

- Dedicated leads table
- Captures from:
  - Support inquiry flow (`Inquiry_FollowUP`)
  - Newsletter subscription (`Newsletter_Subscriber`)
- Includes:
  - Full name
  - Email
  - Organization type
  - IP + location
  - Ticket counts
- Search/filter/sort
- Excel export
- Delete to trash + restore

### 7.7 Trash

- Consolidated soft-delete repository
- Supports restore for:
  - Leads
  - Notification drafts
  - Admin invites
  - Admin accounts
  - Generic storage payload records
- Count badges are shown in sidebar

### 7.8 Work Hours

- Clock In / Clock Out / Resume
- Auto-pause after 30 minutes inactivity
- Break credit logic:
  - 1:00 PM - 2:00 PM local time
  - Credited if clocked in before break
- Multi-session daily aggregation
- Scope:
  - Super Admin and Area Accountant can view workforce summaries
  - Other admin levels see personal summaries
- Filter/search/sort + Excel export

## 8) Support System (Client + Admin)

Core engine:

- `src/utils/supportCenter.js`
- `src/components/client/support/ClientSupportExperience.jsx`
- `src/components/admin/support/AdminSupportInboxPanel.jsx`
- `src/utils/supportAttachments.js`
- `src/components/common/SupportAttachmentPreviewModal.jsx`

### 8.1 Bot + Human Flow

- Initial bot greeting:
  - "Hi. I am Kiamina Support Bot. Ask about uploads, expenses, sales, or settings."
- For anonymous users:
  - asks full name
  - asks email
  - asks inquiry
- Human handoff on keyword request (e.g. `agent`, `human`)
- Offline message shown outside support hours
- Support hours in code:
  - Mon-Fri: 8:00 AM - 6:00 PM (WAT)
  - Sat-Sun: 9:00 AM - 1:00 PM (WAT)

### 8.2 Ticket Model

- Statuses: `open`, `assigned`, `resolved`
- Channels: `bot`, `human`
- Read counters for client/admin
- New chat can always be opened by client

### 8.3 Message Delivery Simulation

- Messages enter `sending` -> `sent`/`failed`
- Retry flow available
- Notification sounds on unread increments (with initial delay)

### 8.4 Attachments

Supported preview categories:

- Images
- PDF
- Text/csv
- Spreadsheet (`xls/xlsx/xlsm/xlsb`)
- Word (`docx`; `doc` limited)
- PowerPoint (`pptx`; `ppt` limited)
- Video/audio
- Generic fallback with open/download

Admins can open attachment context actions (including download).

## 9) Role-Based Access Control (RBAC)

Core definitions in `src/components/admin/adminIdentity.js`.

Admin levels:

1. `super`
2. `area_accountant`
3. `customer_service`
4. `technical_support`

Each level has default permissions and can also have explicit customized permission sets.

Server-side enforcement is still required for real production APIs; current frontend enforces role/permission checks in UI and local flows.

## 10) Persistence Model (Storage Keys)

### 10.1 Primary App/Auth

- `kiaminaAccounts`
- `kiaminaAuthUser` (local/session)
- `kiaminaAdminInvites`
- `kiaminaAdminActivityLog`
- `kiaminaAdminSettings`
- `kiaminaOtpPreview` (dev)
- `kiaminaOtpStore` (session)

### 10.2 Client Domain (scoped per email where applicable)

- `kiaminaClientDocuments[:email]`
- `kiaminaClientActivityLog[:email]`
- `kiaminaClientStatusControl[:email]`
- `kiaminaClientBriefNotifications[:email]`
- `kiaminaOnboardingState[:email]`
- `settingsFormData[:email]`
- `profilePhoto[:email]`
- `companyLogo[:email]`
- `notificationSettings[:email]`
- `verificationDocs[:email]`

### 10.3 Admin Domain

- `kiaminaClientAssignments`
- `kiaminaAdminWorkSessions`
- `kiaminaAdminSentNotifications`
- `kiaminaAdminNotificationDrafts`
- `kiaminaAdminNotificationEditDraftId`
- `kiaminaAdminScheduledNotifications`
- `kiaminaAdminTrash`
- `kiaminaAccountCreatedAtFallback`
- `kiaminaClientSessionControl`

### 10.4 Support Domain

- `kiaminaSupportTickets`
- `kiaminaSupportLeads`
- `kiaminaSupportLeadSequence`
- `kiaminaSupportAnonLeadSession`

### 10.5 IndexedDB

- DB name: `kiaminaFileCache`
- Store: `fileBlobs`
- Utility: `src/utils/fileCache.js`

## 11) Backend API Contracts

The frontend calls these endpoints when available:

### Auth/OTP

- `POST /api/auth/send-otp`
  - body: `{ email, otp, purpose }`
- `POST /api/auth/send-password-reset-link`
  - body: `{ email, resetLink }`
- `POST /api/auth/send-sms-otp`
  - body: `{ phoneNumber, purpose, email, currentEmail }`
- `POST /api/auth/verify-sms-otp`
  - body: `{ phoneNumber, otp, purpose, email, currentEmail }`

### Notifications

- `POST /api/notifications/send-email`
  - body: `{ to, subject, message, link, priority, sentAtIso, deliveryOrigin }`

### Lead Geo Enrichment (public providers)

- `https://ipwho.is/`
- `https://ipapi.co/json/`
- `https://ipinfo.io/json`
- `https://api.ipify.org?format=json`

## 12) File Handling And Preview Pipeline

- Upload writes metadata to scoped records and blobs to IndexedDB cache
- `buildFileCacheKey` binds blobs to `ownerEmail + fileId`
- Download naming utility:
  - `buildClientDownloadFilename({ businessName, fileName })`
- Support and admin review reuse attachment preview helpers for consistent behavior

## 13) Project Structure

```text
src/
  App.jsx
  main.jsx
  index.css
  assets/
  data/
    client/mockData.js
  components/
    auth/
    common/
    client/
      dashboard/
      documents/
      onboarding/
      settings/
      support/
    admin/
      AdminWorkspace.jsx
      AdminViews.jsx
      adminConfig.js
      adminIdentity.js
      adminAssignments.js
      auth/
      settings/
      support/
  utils/
    storage.js
    fileCache.js
    downloadFilename.js
    networkRuntime.js
    supportCenter.js
    supportAttachments.js
    supportNotificationSound.js
```

## 14) Important Utilities

- `storage.js`: scoped localStorage key helpers
- `fileCache.js`: IndexedDB blob cache
- `downloadFilename.js`: safe file naming
- `networkRuntime.js`: connection-aware delays for loaders/UX pacing
- `supportCenter.js`: support state engine, ticket/lead lifecycle, subscriptions
- `supportAttachments.js`: attachment creation, blob retrieval, preview builders
- `supportNotificationSound.js`: notification sound priming and playback

## 15) Known Limitations And Notes

- This is a frontend-first implementation; many workflows use local persistence.
- OTP for client/admin login/signup uses a local demo fallback if backend email endpoint is unavailable.
- Admin login-email change requires backend SMS OTP endpoints (no local fallback).
- Notification dispatch depends on backend email endpoint success.
- `npm run lint` currently expects ESLint but ESLint is not listed in `devDependencies` in this repo snapshot.
- Build may show existing chunk-size and CSS minification warnings from current codebase.

## 16) Suggested Next Steps

1. Add backend persistence for accounts/documents/tickets (replace localStorage as source of truth).
2. Enforce RBAC on server APIs (not only in frontend guards).
3. Add automated tests (unit + integration + e2e).
4. Add schema migration/versioning for local storage payloads.
5. Add CI checks for lint/typecheck/build/test.
