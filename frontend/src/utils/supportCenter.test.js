import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  apiFetchMock,
  getApiAccessTokenMock,
  getApiSessionIdMock,
} = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  getApiAccessTokenMock: vi.fn(() => ''),
  getApiSessionIdMock: vi.fn(() => ''),
}))

vi.mock('./apiClient', () => ({
  apiFetch: apiFetchMock,
  getApiAccessToken: getApiAccessTokenMock,
  getApiSessionId: getApiSessionIdMock,
}))

const createStorage = (initialState = {}) => {
  const state = new Map(Object.entries(initialState))
  return {
    getItem: (key) => (state.has(key) ? state.get(key) : null),
    setItem: (key, value) => {
      state.set(String(key), String(value))
    },
    removeItem: (key) => {
      state.delete(String(key))
    },
    clear: () => {
      state.clear()
    },
  }
}

const createJsonResponse = (payload, { status = 200 } = {}) => (
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
)

const makeTicket = ({
  id,
  clientEmail,
  status = 'assigned',
  channel = 'human',
  messages = [],
} = {}) => ({
  id,
  clientEmail,
  clientName: 'Client User',
  businessName: '',
  status,
  channel,
  createdAtIso: '2026-03-20T08:00:00.000Z',
  updatedAtIso: '2026-03-20T08:00:00.000Z',
  assignedAdminName: '',
  assignedAdminEmail: '',
  unreadByClient: 0,
  unreadByAdmin: 0,
  slaDueAtIso: '',
  resolvedAtIso: '',
  isLead: false,
  leadId: '',
  leadLabel: '',
  leadFullName: '',
  leadContactEmail: '',
  leadOrganizationType: '',
  leadCategory: 'General',
  leadCategories: [],
  leadInquiryText: '',
  leadIntakeStage: 'complete',
  leadIpAddress: '',
  leadLocation: '',
  messages,
})

const makeLead = ({
  id = 'LEAD-1',
  clientEmail = 'lead-1@lead.kiamina.local',
  leadLabel = 'Lead 1',
} = {}) => ({
  id,
  leadNumber: 1,
  leadLabel,
  clientEmail,
  fullName: 'Website Visitor',
  contactEmail: '',
  organizationType: 'individual',
  leadCategory: 'Inquiry_FollowUP',
  leadCategories: ['Inquiry_FollowUP'],
  inquiryText: '',
  intakeStage: 'complete',
  intakeComplete: true,
  source: 'chat-inquiry',
  supportStatus: 'new',
  newsletterStatus: 'subscribed',
  leadNotes: '',
  capturePage: '/',
  capturePath: '/',
  createdAtIso: '2026-03-20T08:00:00.000Z',
  updatedAtIso: '2026-03-20T08:00:00.000Z',
  ipAddress: '',
  city: '',
  region: '',
  country: '',
  location: '',
})

const setBrowserEnv = ({
  route = '/dashboard',
  localState = {},
  sessionState = {},
} = {}) => {
  const localStorage = createStorage(localState)
  const sessionStorage = createStorage(sessionState)
  global.window = {
    localStorage,
    sessionStorage,
    location: { pathname: route },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    setTimeout,
    clearTimeout,
  }
  global.localStorage = localStorage
  global.sessionStorage = sessionStorage
}

const flushMicrotasks = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

const loadSupportCenter = async () => {
  vi.resetModules()
  const module = await import('./supportCenter')
  await flushMicrotasks()
  return module
}

beforeEach(() => {
  apiFetchMock.mockReset()
  getApiAccessTokenMock.mockReset()
  getApiSessionIdMock.mockReset()
  getApiAccessTokenMock.mockReturnValue('')
  getApiSessionIdMock.mockReturnValue('')
})

afterEach(() => {
  vi.useRealTimers()
  delete global.window
  delete global.localStorage
  delete global.sessionStorage
})

describe('support center backend routing', () => {
  it('routes authenticated replies on an existing support ticket to the support ticket API and preserves inline attachments', async () => {
    const attachmentDataUrl = 'data:text/plain;base64,SGVsbG8='
    const supportTicket = makeTicket({
      id: 'sup_existing',
      clientEmail: 'client@example.com',
      status: 'assigned',
      channel: 'human',
    })
    setBrowserEnv({
      route: '/dashboard',
      localState: {
        kiaminaAuthUser: JSON.stringify({ uid: 'user-1', email: 'client@example.com', fullName: 'Client User' }),
        kiaminaFirebaseIdToken: 'token-123',
        kiaminaSupportTickets: JSON.stringify([supportTicket]),
      },
    })
    getApiAccessTokenMock.mockReturnValue('token-123')

    apiFetchMock.mockImplementation(async (path, options = {}) => {
      const method = String(options?.method || 'GET').toUpperCase()
      if (path === '/api/notifications/support/tickets?scope=own&limit=100') {
        return createJsonResponse([
          {
            ticketId: 'sup_existing',
            ownerEmail: 'client@example.com',
            status: 'in-progress',
            channel: 'web',
            openedAt: '2026-03-20T08:00:00.000Z',
            updatedAt: '2026-03-20T08:00:00.000Z',
            metadata: {},
          },
        ])
      }
      if (path === '/api/notifications/support/tickets/sup_existing/messages?limit=200') {
        return createJsonResponse([])
      }
      if (path === '/api/notifications/knowledge-base/articles/search?q=support&limit=1') {
        return createJsonResponse([])
      }
      if (path === '/api/notifications/chatbot/sessions?scope=own&limit=30') {
        return createJsonResponse([])
      }
      if (path === '/api/notifications/support/tickets/sup_existing/messages' && method === 'POST') {
        const body = JSON.parse(String(options.body || '{}'))
        return createJsonResponse({
          message: 'Support message sent.',
          data: {
            id: 'msg_backend_1',
            senderType: 'user',
            senderDisplayName: body.senderDisplayName,
            content: body.content,
            attachments: body.attachments,
            createdAt: '2026-03-20T08:05:00.000Z',
          },
        }, { status: 201 })
      }
      return createJsonResponse({}, { status: 404 })
    })

    const { sendClientSupportMessage } = await loadSupportCenter()
    const result = await sendClientSupportMessage({
      clientEmail: 'client@example.com',
      clientName: 'Client User',
      ticketId: 'sup_existing',
      text: 'I need help with this file',
      attachments: [
        {
          id: 'ATT-1',
          name: 'note.txt',
          type: 'text/plain',
          size: 5,
          previewDataUrl: attachmentDataUrl,
        },
      ],
    })

    expect(result.ok).toBe(true)
    const supportPostCall = apiFetchMock.mock.calls.find(([path, options]) => (
      path === '/api/notifications/support/tickets/sup_existing/messages'
      && String(options?.method || 'GET').toUpperCase() === 'POST'
    ))
    expect(supportPostCall).toBeTruthy()
    const postedPayload = JSON.parse(String(supportPostCall[1].body || '{}'))
    expect(postedPayload.attachments[0].url).toBe(attachmentDataUrl)
    expect(apiFetchMock.mock.calls.some(([path]) => String(path).includes('/chatbot/sessions/') && String(path).includes('/messages'))).toBe(false)
  })

  it('routes anonymous replies on an existing public support ticket to the public ticket API', async () => {
    const anonymousLead = makeLead()
    const anonymousTicket = makeTicket({
      id: 'sup_public',
      clientEmail: anonymousLead.clientEmail,
      status: 'open',
      channel: 'human',
    })
    setBrowserEnv({
      route: '/',
      localState: {
        kiaminaSupportLeads: JSON.stringify([anonymousLead]),
        kiaminaSupportTickets: JSON.stringify([anonymousTicket]),
        kiaminaSupportAnonLeadSession: JSON.stringify({
          leadId: anonymousLead.id,
          leadLabel: anonymousLead.leadLabel,
          clientEmail: anonymousLead.clientEmail,
          anonymousSessionId: 'anon-123',
          backendTicketId: 'sup_public',
        }),
      },
    })

    apiFetchMock.mockImplementation(async (path, options = {}) => {
      const method = String(options?.method || 'GET').toUpperCase()
      if (path === '/api/notifications/support/public/tickets?sessionId=anon-123&limit=100') {
        return createJsonResponse([
          {
            ticketId: 'sup_public',
            ownerEmail: 'anon-anon-123@anon.support.kiamina.local',
            status: 'open',
            channel: 'web',
            openedAt: '2026-03-20T08:00:00.000Z',
            updatedAt: '2026-03-20T08:00:00.000Z',
            metadata: {
              anonymous: true,
              leadLabel: anonymousLead.leadLabel,
              fullName: anonymousLead.fullName,
            },
          },
        ])
      }
      if (path === '/api/notifications/support/public/tickets/sup_public/messages?sessionId=anon-123&limit=200') {
        return createJsonResponse([])
      }
      if (path === '/api/notifications/support/public/tickets/sup_public/messages' && method === 'POST') {
        const body = JSON.parse(String(options.body || '{}'))
        return createJsonResponse({
          message: 'Support message sent.',
          data: {
            id: 'msg_public_1',
            senderType: 'user',
            senderDisplayName: body.senderDisplayName,
            content: body.content,
            attachments: body.attachments,
            createdAt: '2026-03-20T08:06:00.000Z',
          },
        }, { status: 201 })
      }
      return createJsonResponse({}, { status: 404 })
    })

    const { sendClientSupportMessage } = await loadSupportCenter()
    const result = await sendClientSupportMessage({
      clientEmail: anonymousLead.clientEmail,
      clientName: anonymousLead.leadLabel,
      ticketId: 'sup_public',
      text: 'Hello from the website support widget',
    })

    expect(result.ok).toBe(true)
    const publicPostCall = apiFetchMock.mock.calls.find(([path, options]) => (
      path === '/api/notifications/support/public/tickets/sup_public/messages'
      && String(options?.method || 'GET').toUpperCase() === 'POST'
    ))
    expect(publicPostCall).toBeTruthy()
    const postedPayload = JSON.parse(String(publicPostCall[1].body || '{}'))
    expect(postedPayload.sessionId).toBe('anon-123')
  })

  it('still escalates authenticated support requests to the backend when agents are offline', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-22T20:00:00+01:00'))

    const chatTicket = makeTicket({
      id: 'chat_existing',
      clientEmail: 'client@example.com',
      status: 'open',
      channel: 'bot',
      messages: [
        {
          id: 'MSG-1',
          sender: 'client',
          senderName: 'Client User',
          text: 'Can I speak to an agent?',
          createdAtIso: '2026-03-20T08:00:00.000Z',
          deliveryStatus: 'sent',
          deliveryError: '',
          retryCount: 0,
          readByClient: true,
          readByAdmin: false,
          attachments: [],
        },
      ],
    })
    setBrowserEnv({
      route: '/dashboard',
      localState: {
        kiaminaAuthUser: JSON.stringify({ uid: 'user-1', email: 'client@example.com', fullName: 'Client User' }),
        kiaminaFirebaseIdToken: 'token-123',
        kiaminaSupportTickets: JSON.stringify([chatTicket]),
      },
    })
    getApiAccessTokenMock.mockReturnValue('token-123')

    apiFetchMock.mockImplementation(async (path, options = {}) => {
      const method = String(options?.method || 'GET').toUpperCase()
      if (path === '/api/notifications/support/tickets?scope=own&limit=100') {
        return createJsonResponse([
          {
            ticketId: 'sup_escalated',
            ownerEmail: 'client@example.com',
            status: 'open',
            channel: 'chatbot',
            openedAt: '2026-03-20T08:00:00.000Z',
            updatedAt: '2026-03-20T08:00:00.000Z',
            metadata: {},
          },
        ])
      }
      if (path === '/api/notifications/support/tickets/sup_escalated/messages?limit=200') {
        return createJsonResponse([])
      }
      if (path === '/api/notifications/knowledge-base/articles/search?q=support&limit=1') {
        return createJsonResponse([])
      }
      if (path === '/api/notifications/chatbot/sessions?scope=own&limit=30') {
        return createJsonResponse([])
      }
      if (path === '/api/notifications/chatbot/sessions' && method === 'POST') {
        return createJsonResponse({
          session: {
            sessionId: 'chat_backend',
            ownerEmail: 'client@example.com',
            status: 'active',
            startedAt: '2026-03-20T08:00:00.000Z',
            lastMessageAt: '2026-03-20T08:00:00.000Z',
          },
        }, { status: 201 })
      }
      if (path === '/api/notifications/chatbot/sessions/chat_existing/escalate' && method === 'POST') {
        return createJsonResponse({ ticketId: 'sup_escalated' })
      }
      if (path === '/api/notifications/chatbot/sessions/chat_backend/escalate' && method === 'POST') {
        return createJsonResponse({ ticketId: 'sup_escalated' })
      }
      return createJsonResponse({}, { status: 404 })
    })

    const { requestHumanSupport } = await loadSupportCenter()
    const result = await requestHumanSupport({
      clientEmail: 'client@example.com',
      clientName: 'Client User',
      ticketId: 'chat_existing',
    })

    expect(result.ok).toBe(true)
    expect(result.ticketId).toBe('sup_escalated')
    expect(apiFetchMock.mock.calls.some(([path, options]) => (
      String(path).includes('/chatbot/sessions/')
      && String(path).endsWith('/escalate')
      && String(options?.method || 'GET').toUpperCase() === 'POST'
    ))).toBe(true)
  })
})
