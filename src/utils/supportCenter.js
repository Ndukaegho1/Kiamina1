const SUPPORT_TICKETS_STORAGE_KEY = 'kiaminaSupportTickets'
const SUPPORT_LEADS_STORAGE_KEY = 'kiaminaSupportLeads'
const SUPPORT_LEAD_SEQUENCE_STORAGE_KEY = 'kiaminaSupportLeadSequence'
const SUPPORT_ANON_LEAD_SESSION_STORAGE_KEY = 'kiaminaSupportAnonLeadSession'
const AGENT_REQUEST_PATTERN = /(agent|human|person|representative|support team)/i
const MESSAGE_FAIL_PROBABILITY = 0.12
const SUPPORT_COMPANY_NAME = 'Kiamina Accounting Services'
const GENERIC_AGENT_NAME_PATTERN = /^(admin|administrator|senior admin|super admin|support agent|agent|system administrator)$/i
const GENERIC_AGENT_TOKENS = new Set(['admin', 'administrator', 'senior', 'super', 'support', 'agent', 'system'])
const LEAD_ALIAS_DOMAIN = 'lead.kiamina.local'
const LEAD_EMAIL_PATTERN = /^lead-(\d+)@lead\.kiamina\.local$/i

const LEAD_ORGANIZATION_TYPE = Object.freeze({
  BUSINESS: 'business',
  NON_PROFIT: 'non-profit',
  INDIVIDUAL: 'individual',
  UNKNOWN: '',
})

const LEAD_CATEGORY = Object.freeze({
  INQUIRY_FOLLOW_UP: 'Inquiry_FollowUP',
  NEWSLETTER_SUBSCRIBER: 'Newsletter_Subscriber',
  GENERAL: 'General',
})

const LEAD_INTAKE_STAGE = Object.freeze({
  FULL_NAME: 'awaiting_full_name',
  EMAIL: 'awaiting_email',
  INQUIRY: 'awaiting_inquiry',
  COMPLETE: 'complete',
})

const SUPPORT_TIMEZONE = 'Africa/Lagos'
const SUPPORT_WORKING_HOURS_TEXT = 'Mon-Fri 8:00 AM - 6:00 PM, Sat-Sun 9:00 AM - 1:00 PM (WAT)'
const SUPPORT_AGENT_OFFLINE_TEXT = `Human agents are currently offline. Working hours: ${SUPPORT_WORKING_HOURS_TEXT}.`
const LEAD_GEO_LOOKUP_ENDPOINTS = Object.freeze([
  { key: 'ipwho', url: 'https://ipwho.is/' },
  { key: 'ipapi', url: 'https://ipapi.co/json/' },
  { key: 'ipinfo', url: 'https://ipinfo.io/json' },
  { key: 'ipify', url: 'https://api.ipify.org?format=json' },
])

const SUPPORT_TICKET_STATUS = Object.freeze({
  OPEN: 'open',
  ASSIGNED: 'assigned',
  RESOLVED: 'resolved',
})

const SUPPORT_CHANNEL = Object.freeze({
  BOT: 'bot',
  HUMAN: 'human',
})

const SUPPORT_MESSAGE_STATUS = Object.freeze({
  SENDING: 'sending',
  SENT: 'sent',
  FAILED: 'failed',
})

const SUPPORT_SENDER = Object.freeze({
  CLIENT: 'client',
  AGENT: 'agent',
  BOT: 'bot',
  SYSTEM: 'system',
})

const BOT_WELCOME_TEXT = 'Hi. I am Kiamina Support Bot. Ask about uploads, expenses, sales, or settings.'

function capitalizeWord(value = '') {
  const normalized = toTrimmedValue(value)
  if (!normalized) return ''
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase()
}

function getNameFromEmail(email = '') {
  const localPart = toEmail(email).split('@')[0] || ''
  const candidate = localPart
    .split(/[._-]+/)
    .map((part) => toTrimmedValue(part))
    .find((part) => part && !GENERIC_AGENT_TOKENS.has(part.toLowerCase()))
  return capitalizeWord(candidate)
}

function getAgentDisplayName(value = '', email = '') {
  const normalizedName = toTrimmedValue(value)
  const parts = normalizedName
    .split(/\s+/)
    .map((part) => toTrimmedValue(part))
    .filter(Boolean)
  const firstMeaningfulPart = parts.find((part) => !GENERIC_AGENT_TOKENS.has(part.toLowerCase()))

  if (firstMeaningfulPart && !GENERIC_AGENT_NAME_PATTERN.test(normalizedName.toLowerCase())) {
    return capitalizeWord(firstMeaningfulPart)
  }

  const emailName = getNameFromEmail(email)
  if (emailName) return emailName
  if (firstMeaningfulPart) return capitalizeWord(firstMeaningfulPart)
  return 'Support'
}

function buildAgentIntroduction(name = '') {
  return `Hi, this is ${getAgentDisplayName(name)} from ${SUPPORT_COMPANY_NAME}.`
}

function buildAgentHandoffMessage(name = '') {
  return `Hi, this is ${getAgentDisplayName(name)} from ${SUPPORT_COMPANY_NAME}. I will assist you from here. How may I help you?`
}

const listenerSet = new Set()
let storageListenerBound = false
let supportState = {
  tickets: [],
  leads: [],
}

const safeParseJson = (rawValue, fallback) => {
  try {
    const parsed = rawValue ? JSON.parse(rawValue) : fallback
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

const toTrimmedValue = (value = '') => String(value || '').trim()
const toEmail = (value = '') => toTrimmedValue(value).toLowerCase()
const nowIso = () => new Date().toISOString()
const addHoursIso = (sourceIso, hours) => new Date((Date.parse(sourceIso) || Date.now()) + (hours * 60 * 60 * 1000)).toISOString()
const createId = (prefix) => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`

const normalizeLeadOrganizationType = (value = '') => {
  const normalized = toTrimmedValue(value).toLowerCase()
  if (normalized === LEAD_ORGANIZATION_TYPE.BUSINESS) return LEAD_ORGANIZATION_TYPE.BUSINESS
  if (normalized === LEAD_ORGANIZATION_TYPE.NON_PROFIT) return LEAD_ORGANIZATION_TYPE.NON_PROFIT
  if (normalized === LEAD_ORGANIZATION_TYPE.INDIVIDUAL) return LEAD_ORGANIZATION_TYPE.INDIVIDUAL
  return LEAD_ORGANIZATION_TYPE.UNKNOWN
}

const normalizeLeadCategory = (value = '') => {
  const normalized = toTrimmedValue(value)
  if (normalized === LEAD_CATEGORY.INQUIRY_FOLLOW_UP) return LEAD_CATEGORY.INQUIRY_FOLLOW_UP
  if (normalized === LEAD_CATEGORY.NEWSLETTER_SUBSCRIBER) return LEAD_CATEGORY.NEWSLETTER_SUBSCRIBER
  return LEAD_CATEGORY.GENERAL
}

const normalizeLeadCategories = (...values) => {
  const nextCategories = []
  const seen = new Set()
  const pushCategory = (candidate) => {
    const normalized = normalizeLeadCategory(candidate)
    if (!normalized || seen.has(normalized)) return
    seen.add(normalized)
    nextCategories.push(normalized)
  }

  values.forEach((value) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => pushCategory(entry))
      return
    }
    const normalizedValue = toTrimmedValue(value)
    if (!normalizedValue) return
    normalizedValue
      .split(/[|,]/)
      .map((entry) => toTrimmedValue(entry))
      .filter(Boolean)
      .forEach((entry) => pushCategory(entry))
  })

  return nextCategories
}

const hasLeadCategory = (leadOrTicket = {}, category = '') => {
  const normalizedCategory = normalizeLeadCategory(category)
  if (!normalizedCategory || normalizedCategory === LEAD_CATEGORY.GENERAL) return false
  const categories = normalizeLeadCategories(
    leadOrTicket?.leadCategories,
    leadOrTicket?.leadCategory,
  )
  return categories.includes(normalizedCategory)
}

const normalizeLeadIntakeStage = (value = '') => {
  const normalized = toTrimmedValue(value)
  if (normalized === LEAD_INTAKE_STAGE.FULL_NAME) return LEAD_INTAKE_STAGE.FULL_NAME
  if (normalized === LEAD_INTAKE_STAGE.EMAIL) return LEAD_INTAKE_STAGE.EMAIL
  if (normalized === LEAD_INTAKE_STAGE.INQUIRY) return LEAD_INTAKE_STAGE.INQUIRY
  if (normalized === LEAD_INTAKE_STAGE.COMPLETE) return LEAD_INTAKE_STAGE.COMPLETE
  return ''
}

const buildLeadAliasEmail = (leadNumber = 0) => `lead-${Math.max(1, Number(leadNumber) || 1)}@${LEAD_ALIAS_DOMAIN}`

const parseLeadNumberFromAlias = (clientEmail = '') => {
  const match = toEmail(clientEmail).match(LEAD_EMAIL_PATTERN)
  if (!match) return 0
  const parsed = Number(match[1] || 0)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

const isValidEmail = (value = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail(value))

const getLeadIntakeStage = (lead = {}) => {
  const presetStage = normalizeLeadIntakeStage(lead.intakeStage)
  const hasFullName = Boolean(toTrimmedValue(lead.fullName))
  const hasEmail = isValidEmail(lead.contactEmail)
  const hasInquiry = Boolean(toTrimmedValue(lead.inquiryText))

  if (presetStage === LEAD_INTAKE_STAGE.FULL_NAME) return LEAD_INTAKE_STAGE.FULL_NAME
  if (presetStage === LEAD_INTAKE_STAGE.EMAIL && hasFullName) return LEAD_INTAKE_STAGE.EMAIL
  if (presetStage === LEAD_INTAKE_STAGE.INQUIRY && hasFullName && hasEmail) return LEAD_INTAKE_STAGE.INQUIRY
  if (presetStage === LEAD_INTAKE_STAGE.COMPLETE && hasFullName && hasEmail && hasInquiry) return LEAD_INTAKE_STAGE.COMPLETE

  if (!hasFullName) return LEAD_INTAKE_STAGE.FULL_NAME
  if (!hasEmail) return LEAD_INTAKE_STAGE.EMAIL
  if (!hasInquiry) return LEAD_INTAKE_STAGE.INQUIRY
  return LEAD_INTAKE_STAGE.COMPLETE
}

const buildLeadIntakePrompt = ({
  stage = LEAD_INTAKE_STAGE.FULL_NAME,
  firstName = '',
} = {}) => {
  if (stage === LEAD_INTAKE_STAGE.FULL_NAME) {
    return 'Please enter your full name. Example: "My name is Richard Mike."'
  }
  if (stage === LEAD_INTAKE_STAGE.EMAIL) {
    return `${firstName ? `Thanks ${firstName}. ` : ''}Please drop your email address.`
  }
  if (stage === LEAD_INTAKE_STAGE.INQUIRY) {
    return 'How may we help you today? You can also type "agent" if you want a human agent.'
  }
  return ''
}

const getFirstName = (fullName = '') => (
  toTrimmedValue(fullName).split(/\s+/).filter(Boolean)[0] || ''
)

const normalizeIntakeFullName = (value = '') => {
  const normalized = toTrimmedValue(value).replace(/\s+/g, ' ')
  if (!normalized) return ''
  const introMatch = normalized.match(/^my name is\s+(.+)$/i)
  const candidate = toTrimmedValue(introMatch ? introMatch[1] : normalized)
  return candidate.replace(/[.]+$/, '').trim()
}

const getSupportLocalTimeParts = (referenceDate = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: SUPPORT_TIMEZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(referenceDate)
  const weekdayShort = toTrimmedValue(parts.find((part) => part.type === 'weekday')?.value).toLowerCase()
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0)
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0)
  return {
    weekdayShort,
    hour: Number.isFinite(hour) ? hour : 0,
    minute: Number.isFinite(minute) ? minute : 0,
  }
}

export const isSupportAgentOnline = (referenceDate = new Date()) => {
  const { weekdayShort, hour, minute } = getSupportLocalTimeParts(referenceDate)
  const isWeekend = weekdayShort === 'sat' || weekdayShort === 'sun'
  const startHour = isWeekend ? 9 : 8
  const endHour = isWeekend ? 13 : 18
  const decimalHour = hour + (minute / 60)
  return decimalHour >= startHour && decimalHour < endHour
}

const normalizeAttachment = (attachment = {}, index = 0) => ({
  id: toTrimmedValue(attachment.id) || createId(`ATT${index}`),
  name: toTrimmedValue(attachment.name) || `attachment-${index + 1}`,
  type: toTrimmedValue(attachment.type) || 'application/octet-stream',
  size: Number.isFinite(Number(attachment.size)) ? Number(attachment.size) : 0,
  cacheKey: toTrimmedValue(attachment.cacheKey),
  previewDataUrl: toTrimmedValue(attachment.previewDataUrl),
})

const normalizeMessage = (message = {}, index = 0) => ({
  id: toTrimmedValue(message.id) || createId(`MSG${index}`),
  sender: toTrimmedValue(message.sender) || SUPPORT_SENDER.SYSTEM,
  senderName: toTrimmedValue(message.senderName) || '',
  text: String(message.text || ''),
  createdAtIso: toTrimmedValue(message.createdAtIso) || nowIso(),
  deliveryStatus: toTrimmedValue(message.deliveryStatus) || SUPPORT_MESSAGE_STATUS.SENT,
  deliveryError: toTrimmedValue(message.deliveryError),
  retryCount: Number.isFinite(Number(message.retryCount)) ? Number(message.retryCount) : 0,
  readByClient: Boolean(message.readByClient),
  readByAdmin: Boolean(message.readByAdmin),
  attachments: (Array.isArray(message.attachments) ? message.attachments : [])
    .map((attachment, attachmentIndex) => normalizeAttachment(attachment, attachmentIndex)),
})

const normalizeLead = (lead = {}, index = 0) => {
  const inferredNumber = parseLeadNumberFromAlias(lead.clientEmail)
  const normalizedLeadNumber = Number.isFinite(Number(lead.leadNumber))
    && Number(lead.leadNumber) > 0
    ? Math.floor(Number(lead.leadNumber))
    : (inferredNumber || index + 1)
  const normalizedClientEmail = toEmail(lead.clientEmail) || buildLeadAliasEmail(normalizedLeadNumber)
  const normalizedLabel = toTrimmedValue(lead.leadLabel) || `Lead ${normalizedLeadNumber}`
  const normalizedLocation = toTrimmedValue(lead.location)
    || [
      toTrimmedValue(lead.city),
      toTrimmedValue(lead.region),
      toTrimmedValue(lead.country),
    ].filter(Boolean).join(', ')
  const inferredCategory = String(lead.source || '').toLowerCase().includes('newsletter')
    ? LEAD_CATEGORY.NEWSLETTER_SUBSCRIBER
    : LEAD_CATEGORY.INQUIRY_FOLLOW_UP
  const normalizedCategories = normalizeLeadCategories(
    lead.leadCategories,
    lead.leadCategory,
    inferredCategory,
  )
  const normalizedCategory = normalizedCategories.includes(LEAD_CATEGORY.INQUIRY_FOLLOW_UP)
    ? LEAD_CATEGORY.INQUIRY_FOLLOW_UP
    : (normalizedCategories[0] || LEAD_CATEGORY.GENERAL)
  const inferredIntakeStage = (
    normalizedCategories.includes(LEAD_CATEGORY.INQUIRY_FOLLOW_UP)
      ? getLeadIntakeStage(lead)
      : LEAD_INTAKE_STAGE.COMPLETE
  )
  return {
    id: toTrimmedValue(lead.id) || createId(`LEAD${normalizedLeadNumber}`),
    leadNumber: normalizedLeadNumber,
    leadLabel: normalizedLabel,
    clientEmail: normalizedClientEmail,
    fullName: toTrimmedValue(lead.fullName),
    contactEmail: toEmail(lead.contactEmail || lead.email),
    organizationType: normalizeLeadOrganizationType(lead.organizationType),
    ipAddress: toTrimmedValue(lead.ipAddress),
    city: toTrimmedValue(lead.city),
    region: toTrimmedValue(lead.region),
    country: toTrimmedValue(lead.country),
    location: normalizedLocation,
    leadCategory: normalizedCategory,
    leadCategories: normalizedCategories,
    inquiryText: String(lead.inquiryText || ''),
    intakeStage: inferredIntakeStage,
    intakeComplete: inferredIntakeStage === LEAD_INTAKE_STAGE.COMPLETE,
    createdAtIso: toTrimmedValue(lead.createdAtIso) || nowIso(),
    updatedAtIso: toTrimmedValue(lead.updatedAtIso) || nowIso(),
    source: toTrimmedValue(lead.source) || 'support-chat',
  }
}

const normalizeTicket = (ticket = {}, index = 0) => {
  const normalizedMessages = (Array.isArray(ticket.messages) ? ticket.messages : [])
    .map((message, messageIndex) => normalizeMessage(message, messageIndex))
  const latestMessage = normalizedMessages[normalizedMessages.length - 1]
  const normalizedLeadCategories = normalizeLeadCategories(ticket.leadCategories, ticket.leadCategory)
  const normalizedLeadCategory = normalizedLeadCategories.includes(LEAD_CATEGORY.INQUIRY_FOLLOW_UP)
    ? LEAD_CATEGORY.INQUIRY_FOLLOW_UP
    : (normalizedLeadCategories[0] || LEAD_CATEGORY.GENERAL)
  return {
    id: toTrimmedValue(ticket.id) || createId(`SUP${index}`),
    clientEmail: toEmail(ticket.clientEmail),
    clientName: toTrimmedValue(ticket.clientName) || 'Client User',
    businessName: toTrimmedValue(ticket.businessName),
    status: toTrimmedValue(ticket.status) || SUPPORT_TICKET_STATUS.OPEN,
    channel: toTrimmedValue(ticket.channel) || SUPPORT_CHANNEL.BOT,
    createdAtIso: toTrimmedValue(ticket.createdAtIso) || nowIso(),
    updatedAtIso: toTrimmedValue(ticket.updatedAtIso) || latestMessage?.createdAtIso || nowIso(),
    assignedAdminName: toTrimmedValue(ticket.assignedAdminName),
    assignedAdminEmail: toEmail(ticket.assignedAdminEmail),
    unreadByClient: Number.isFinite(Number(ticket.unreadByClient)) ? Number(ticket.unreadByClient) : 0,
    unreadByAdmin: Number.isFinite(Number(ticket.unreadByAdmin)) ? Number(ticket.unreadByAdmin) : 0,
    slaDueAtIso: toTrimmedValue(ticket.slaDueAtIso),
    resolvedAtIso: toTrimmedValue(ticket.resolvedAtIso),
    isLead: Boolean(ticket.isLead),
    leadId: toTrimmedValue(ticket.leadId),
    leadLabel: toTrimmedValue(ticket.leadLabel),
    leadFullName: toTrimmedValue(ticket.leadFullName),
    leadContactEmail: toEmail(ticket.leadContactEmail),
    leadOrganizationType: normalizeLeadOrganizationType(ticket.leadOrganizationType),
    leadCategory: normalizedLeadCategory,
    leadCategories: normalizedLeadCategories,
    leadInquiryText: String(ticket.leadInquiryText || ''),
    leadIntakeStage: normalizeLeadIntakeStage(ticket.leadIntakeStage) || LEAD_INTAKE_STAGE.COMPLETE,
    leadIpAddress: toTrimmedValue(ticket.leadIpAddress),
    leadLocation: toTrimmedValue(ticket.leadLocation),
    messages: normalizedMessages,
  }
}

const sortTickets = (tickets = []) => (
  [...tickets].sort((left, right) => (
    (Date.parse(right.updatedAtIso || '') || 0) - (Date.parse(left.updatedAtIso || '') || 0)
  ))
)

const sortLeads = (leads = []) => (
  [...leads].sort((left, right) => {
    const byUpdated = (Date.parse(right.updatedAtIso || '') || 0) - (Date.parse(left.updatedAtIso || '') || 0)
    if (byUpdated !== 0) return byUpdated
    return (Number(left.leadNumber) || 0) - (Number(right.leadNumber) || 0)
  })
)

const readSupportTickets = () => {
  if (typeof localStorage === 'undefined') return []
  const parsed = safeParseJson(localStorage.getItem(SUPPORT_TICKETS_STORAGE_KEY), [])
  if (!Array.isArray(parsed)) return []
  return sortTickets(parsed.map((ticket, index) => normalizeTicket(ticket, index)))
}

const readSupportLeads = () => {
  if (typeof localStorage === 'undefined') return []
  const parsed = safeParseJson(localStorage.getItem(SUPPORT_LEADS_STORAGE_KEY), [])
  if (!Array.isArray(parsed)) return []
  return sortLeads(parsed.map((lead, index) => normalizeLead(lead, index)))
}

const readLeadSequence = () => {
  if (typeof localStorage === 'undefined') return 0
  const parsed = Number(localStorage.getItem(SUPPORT_LEAD_SEQUENCE_STORAGE_KEY) || 0)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0
}

const persistLeadSequence = (value = 0) => {
  if (typeof localStorage === 'undefined') return
  const numeric = Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0
  localStorage.setItem(SUPPORT_LEAD_SEQUENCE_STORAGE_KEY, String(numeric))
}

const updateLeadSequenceFromLeads = (leads = []) => {
  const maxLeadNumber = leads.reduce((highest, lead) => (
    Math.max(highest, Number(lead.leadNumber) || 0)
  ), 0)
  const nextSequence = Math.max(readLeadSequence(), maxLeadNumber)
  persistLeadSequence(nextSequence)
  return nextSequence
}

const nextLeadSequence = () => {
  const current = readLeadSequence()
  const next = Math.max(1, current + 1)
  persistLeadSequence(next)
  return next
}

const persistSupportTickets = (tickets = []) => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(SUPPORT_TICKETS_STORAGE_KEY, JSON.stringify(sortTickets(tickets)))
}

const persistSupportLeads = (leads = []) => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(SUPPORT_LEADS_STORAGE_KEY, JSON.stringify(sortLeads(leads)))
  updateLeadSequenceFromLeads(leads)
}

const toSnapshot = () => ({
  tickets: supportState.tickets.map((ticket) => ({
    ...ticket,
    messages: ticket.messages.map((message) => ({
      ...message,
      attachments: message.attachments.map((attachment) => ({ ...attachment })),
    })),
  })),
  leads: supportState.leads.map((lead) => ({ ...lead })),
})

const emitSupportState = () => {
  const snapshot = toSnapshot()
  listenerSet.forEach((listener) => {
    try {
      listener(snapshot)
    } catch {
      // Ignore subscriber errors to avoid breaking other listeners.
    }
  })
}

const replaceTicket = (tickets = [], nextTicket = null) => {
  if (!nextTicket?.id) return sortTickets(tickets)
  const exists = tickets.some((ticket) => ticket.id === nextTicket.id)
  if (!exists) return sortTickets([...tickets, nextTicket])
  return sortTickets(tickets.map((ticket) => (ticket.id === nextTicket.id ? nextTicket : ticket)))
}

const replaceLead = (leads = [], nextLead = null) => {
  if (!nextLead?.id) return sortLeads(leads)
  const exists = leads.some((lead) => lead.id === nextLead.id)
  if (!exists) return sortLeads([...leads, nextLead])
  return sortLeads(leads.map((lead) => (lead.id === nextLead.id ? nextLead : lead)))
}

const updateSupportTickets = (updater) => {
  const currentTickets = supportState.tickets
  const updatedTickets = sortTickets(typeof updater === 'function' ? updater(currentTickets) : currentTickets)
  supportState = {
    ...supportState,
    tickets: updatedTickets,
  }
  persistSupportTickets(updatedTickets)
  emitSupportState()
  return updatedTickets
}

const updateSupportLeads = (updater) => {
  const currentLeads = supportState.leads
  const updatedLeads = sortLeads(typeof updater === 'function' ? updater(currentLeads) : currentLeads)
  supportState = {
    ...supportState,
    leads: updatedLeads,
  }
  persistSupportLeads(updatedLeads)
  emitSupportState()
  return updatedLeads
}

const bindStorageListener = () => {
  if (storageListenerBound || typeof window === 'undefined') return
  storageListenerBound = true
  window.addEventListener('storage', (event) => {
    if (
      event.key !== SUPPORT_TICKETS_STORAGE_KEY
      && event.key !== SUPPORT_LEADS_STORAGE_KEY
      && event.key !== SUPPORT_LEAD_SEQUENCE_STORAGE_KEY
      && event.key !== SUPPORT_ANON_LEAD_SESSION_STORAGE_KEY
    ) return
    supportState = {
      tickets: readSupportTickets(),
      leads: readSupportLeads(),
    }
    emitSupportState()
  })
}

const createImmediateMessage = ({
  sender = SUPPORT_SENDER.SYSTEM,
  senderName = '',
  text = '',
  attachments = [],
  readByClient = false,
  readByAdmin = false,
}) => ({
  id: createId('MSG'),
  sender,
  senderName,
  text: String(text || ''),
  createdAtIso: nowIso(),
  deliveryStatus: SUPPORT_MESSAGE_STATUS.SENT,
  deliveryError: '',
  retryCount: 0,
  readByClient,
  readByAdmin,
  attachments: (Array.isArray(attachments) ? attachments : []).map((attachment, index) => normalizeAttachment(attachment, index)),
})

const createPendingMessage = ({
  sender = SUPPORT_SENDER.CLIENT,
  senderName = '',
  text = '',
  attachments = [],
  retryCount = 0,
}) => ({
  id: createId('MSG'),
  sender,
  senderName,
  text: String(text || ''),
  createdAtIso: nowIso(),
  deliveryStatus: SUPPORT_MESSAGE_STATUS.SENDING,
  deliveryError: '',
  retryCount,
  readByClient: sender === SUPPORT_SENDER.CLIENT,
  readByAdmin: sender === SUPPORT_SENDER.AGENT,
  attachments: (Array.isArray(attachments) ? attachments : []).map((attachment, index) => normalizeAttachment(attachment, index)),
})

const getTicketById = (tickets = [], ticketId = '') => (
  tickets.find((ticket) => ticket.id === ticketId) || null
)

const getLeadById = (leads = [], leadId = '') => (
  leads.find((lead) => lead.id === leadId) || null
)

const getLeadByClientEmail = (leads = [], clientEmail = '') => {
  const normalizedEmail = toEmail(clientEmail)
  if (!normalizedEmail) return null
  return leads.find((lead) => lead.clientEmail === normalizedEmail) || null
}

const clearAnonymousLeadSessionByClientEmail = (clientEmail = '') => {
  if (typeof localStorage === 'undefined') return
  const normalizedClientEmail = toEmail(clientEmail)
  if (!normalizedClientEmail) return
  const savedSession = safeParseJson(localStorage.getItem(SUPPORT_ANON_LEAD_SESSION_STORAGE_KEY), null)
  const savedClientEmail = toEmail(savedSession?.clientEmail)
  if (!savedClientEmail || savedClientEmail !== normalizedClientEmail) return
  try {
    localStorage.removeItem(SUPPORT_ANON_LEAD_SESSION_STORAGE_KEY)
  } catch {
    // Ignore localStorage removal failures.
  }
}

const persistAnonymousLeadSession = ({
  leadId = '',
  leadLabel = '',
  clientEmail = '',
} = {}) => {
  if (typeof localStorage === 'undefined') return
  const normalizedClientEmail = toEmail(clientEmail)
  if (!normalizedClientEmail) return
  try {
    localStorage.setItem(SUPPORT_ANON_LEAD_SESSION_STORAGE_KEY, JSON.stringify({
      leadId: toTrimmedValue(leadId),
      leadLabel: toTrimmedValue(leadLabel),
      clientEmail: normalizedClientEmail,
      createdAtIso: nowIso(),
    }))
  } catch {
    // Ignore session persistence failures.
  }
}

const getLeadByContactEmail = (leads = [], contactEmail = '') => {
  const normalizedContactEmail = toEmail(contactEmail)
  if (!normalizedContactEmail) return null
  return leads.find((lead) => (
    toEmail(lead.contactEmail) === normalizedContactEmail
    || toEmail(lead.clientEmail) === normalizedContactEmail
  )) || null
}

const getLatestClientTicket = (tickets = [], clientEmail = '') => (
  sortTickets(tickets.filter((ticket) => ticket.clientEmail === clientEmail))[0] || null
)

const getActiveClientTicket = (tickets = [], clientEmail = '') => {
  const scoped = sortTickets(tickets.filter((ticket) => ticket.clientEmail === clientEmail))
  const active = scoped.find((ticket) => ticket.status !== SUPPORT_TICKET_STATUS.RESOLVED)
  return active || scoped[0] || null
}

const updateTicketWithMessage = ({
  ticket,
  message,
  incrementClientUnread = false,
  incrementAdminUnread = false,
}) => {
  if (!ticket || !message) return ticket
  return {
    ...ticket,
    messages: [...ticket.messages, message],
    updatedAtIso: message.createdAtIso || nowIso(),
    unreadByClient: ticket.unreadByClient + (incrementClientUnread ? 1 : 0),
    unreadByAdmin: ticket.unreadByAdmin + (incrementAdminUnread ? 1 : 0),
  }
}

const hasRecentOfflineNotice = (ticket = null) => {
  if (!ticket || !Array.isArray(ticket.messages)) return false
  const latestNotice = [...ticket.messages]
    .reverse()
    .find((message) => (
      message?.sender === SUPPORT_SENDER.SYSTEM
      && toTrimmedValue(message?.text) === SUPPORT_AGENT_OFFLINE_TEXT
    ))
  if (!latestNotice) return false
  const noticeMs = Date.parse(latestNotice.createdAtIso || '')
  if (!Number.isFinite(noticeMs)) return true
  const hoursSinceNotice = (Date.now() - noticeMs) / (60 * 60 * 1000)
  return hoursSinceNotice <= 6
}

const appendAgentOfflineNoticeIfNeeded = (ticket = null) => {
  if (!ticket) return ticket
  if (isSupportAgentOnline()) return ticket
  if (hasRecentOfflineNotice(ticket)) return ticket
  const offlineMessage = createImmediateMessage({
    sender: SUPPORT_SENDER.SYSTEM,
    senderName: SUPPORT_COMPANY_NAME,
    text: SUPPORT_AGENT_OFFLINE_TEXT,
  })
  return updateTicketWithMessage({
    ticket,
    message: offlineMessage,
    incrementClientUnread: true,
  })
}

const appendLeadIntakePromptIfNeeded = ({
  ticket = null,
  stage = LEAD_INTAKE_STAGE.COMPLETE,
  firstName = '',
} = {}) => {
  if (!ticket || stage === LEAD_INTAKE_STAGE.COMPLETE) return ticket
  const promptText = buildLeadIntakePrompt({ stage, firstName })
  if (!promptText) return ticket
  const alreadyPresent = Array.isArray(ticket.messages) && ticket.messages.some((message) => (
    message?.sender === SUPPORT_SENDER.BOT
    && toTrimmedValue(message?.text) === promptText
  ))
  if (alreadyPresent) return ticket
  const promptMessage = createImmediateMessage({
    sender: SUPPORT_SENDER.BOT,
    senderName: 'Kiamina Support Bot',
    text: promptText,
  })
  return updateTicketWithMessage({
    ticket,
    message: promptMessage,
    incrementClientUnread: true,
  })
}

const applyLeadToTicket = (ticket = {}, lead = null) => {
  if (!ticket || !lead) return ticket
  return normalizeTicket({
    ...ticket,
    isLead: true,
    leadId: lead.id,
    leadLabel: lead.leadLabel,
    leadFullName: lead.fullName,
    leadContactEmail: lead.contactEmail,
    leadOrganizationType: lead.organizationType,
    leadCategory: lead.leadCategory,
    leadCategories: lead.leadCategories,
    leadInquiryText: lead.inquiryText,
    leadIntakeStage: lead.intakeStage,
    leadIpAddress: lead.ipAddress,
    leadLocation: lead.location,
    clientName: lead.leadLabel || ticket.clientName || 'Lead',
  })
}

const ensureClientTicket = ({
  tickets = [],
  leads = [],
  clientEmail = '',
  clientName = 'Client User',
  businessName = '',
  forceNew = false,
}) => {
  const normalizedEmail = toEmail(clientEmail)
  if (!normalizedEmail) return { tickets, ticket: null }
  const lead = getLeadByClientEmail(leads, normalizedEmail)

  const existingTicket = !forceNew ? getLatestClientTicket(tickets, normalizedEmail) : null
  if (existingTicket) {
    const leadCategories = normalizeLeadCategories(
      lead?.leadCategories,
      lead?.leadCategory,
      existingTicket?.leadCategories,
      existingTicket?.leadCategory,
    )
    const leadCategory = leadCategories.includes(LEAD_CATEGORY.INQUIRY_FOLLOW_UP)
      ? LEAD_CATEGORY.INQUIRY_FOLLOW_UP
      : (leadCategories[0] || LEAD_CATEGORY.GENERAL)
    const hasInquiryCategory = leadCategories.includes(LEAD_CATEGORY.INQUIRY_FOLLOW_UP)
    const hasClientMessage = Array.isArray(existingTicket.messages) && existingTicket.messages.some((message) => (
      message?.sender === SUPPORT_SENDER.CLIENT && toTrimmedValue(message?.text)
    ))
    let leadIntakeStage = (
      normalizeLeadIntakeStage(existingTicket.leadIntakeStage)
      || normalizeLeadIntakeStage(lead?.intakeStage)
      || LEAD_INTAKE_STAGE.COMPLETE
    )
    if (hasInquiryCategory && !hasClientMessage) {
      leadIntakeStage = LEAD_INTAKE_STAGE.FULL_NAME
    }

    const refreshed = {
      ...existingTicket,
      clientName: lead?.leadLabel || toTrimmedValue(clientName) || existingTicket.clientName || 'Client User',
      businessName: toTrimmedValue(businessName) || existingTicket.businessName || '',
      isLead: Boolean(lead) || Boolean(existingTicket.isLead),
      leadId: lead?.id || existingTicket.leadId || '',
      leadLabel: lead?.leadLabel || existingTicket.leadLabel || '',
      leadFullName: lead?.fullName || existingTicket.leadFullName || '',
      leadContactEmail: lead?.contactEmail || existingTicket.leadContactEmail || '',
      leadOrganizationType: lead?.organizationType || existingTicket.leadOrganizationType || '',
      leadCategory,
      leadCategories,
      leadInquiryText: lead?.inquiryText || existingTicket.leadInquiryText || '',
      leadIntakeStage,
      leadIpAddress: lead?.ipAddress || existingTicket.leadIpAddress || '',
      leadLocation: lead?.location || existingTicket.leadLocation || '',
    }
    const withIntakePrompt = appendLeadIntakePromptIfNeeded({
      ticket: refreshed,
      stage: hasInquiryCategory ? leadIntakeStage : LEAD_INTAKE_STAGE.COMPLETE,
      firstName: getFirstName(lead?.fullName || refreshed.leadFullName),
    })
    const withOfflineNotice = appendAgentOfflineNoticeIfNeeded(withIntakePrompt)
    return {
      tickets: replaceTicket(tickets, withOfflineNotice),
      ticket: withOfflineNotice,
    }
  }

  const leadCategories = lead
    ? normalizeLeadCategories(lead?.leadCategories, lead?.leadCategory, LEAD_CATEGORY.INQUIRY_FOLLOW_UP)
    : []
  const hasInquiryCategory = leadCategories.includes(LEAD_CATEGORY.INQUIRY_FOLLOW_UP)
  const leadCategory = hasInquiryCategory
    ? LEAD_CATEGORY.INQUIRY_FOLLOW_UP
    : (leadCategories[0] || LEAD_CATEGORY.GENERAL)
  const leadIntakeStage = (lead && hasInquiryCategory)
    ? LEAD_INTAKE_STAGE.FULL_NAME
    : LEAD_INTAKE_STAGE.COMPLETE
  const leadIntakePrompt = (lead && hasInquiryCategory)
    ? buildLeadIntakePrompt({ stage: leadIntakeStage, firstName: getFirstName(lead?.fullName) })
    : ''
  const greeting = createImmediateMessage({
    sender: SUPPORT_SENDER.BOT,
    senderName: 'Kiamina Support Bot',
    text: BOT_WELCOME_TEXT,
    readByClient: true,
    readByAdmin: true,
  })
  const intakePromptMessage = leadIntakePrompt
    ? createImmediateMessage({
        sender: SUPPORT_SENDER.BOT,
        senderName: 'Kiamina Support Bot',
        text: leadIntakePrompt,
        readByClient: true,
        readByAdmin: true,
      })
    : null
  const createdAtIso = nowIso()
  const nextTicket = normalizeTicket({
    id: createId('SUP'),
    clientEmail: normalizedEmail,
    clientName: lead?.leadLabel || toTrimmedValue(clientName) || 'Client User',
    businessName: toTrimmedValue(businessName),
    status: SUPPORT_TICKET_STATUS.OPEN,
    channel: SUPPORT_CHANNEL.BOT,
    createdAtIso,
    updatedAtIso: createdAtIso,
    unreadByClient: 0,
    unreadByAdmin: 0,
    slaDueAtIso: '',
    resolvedAtIso: '',
    isLead: Boolean(lead),
    leadId: lead?.id || '',
    leadLabel: lead?.leadLabel || '',
    leadFullName: lead?.fullName || '',
    leadContactEmail: lead?.contactEmail || '',
    leadOrganizationType: lead?.organizationType || '',
    leadCategory,
    leadCategories,
    leadInquiryText: lead?.inquiryText || '',
    leadIntakeStage,
    leadIpAddress: lead?.ipAddress || '',
    leadLocation: lead?.location || '',
    messages: intakePromptMessage ? [greeting, intakePromptMessage] : [greeting],
  })
  const withOfflineNotice = appendAgentOfflineNoticeIfNeeded(nextTicket)
  return {
    tickets: replaceTicket(tickets, withOfflineNotice),
    ticket: withOfflineNotice,
  }
}

const shouldMessageDeliveryFail = ({
  sender = SUPPORT_SENDER.CLIENT,
  retryCount = 0,
  text = '',
}) => {
  if (!(sender === SUPPORT_SENDER.CLIENT || sender === SUPPORT_SENDER.AGENT)) return false
  if (/^\/fail\b/i.test(String(text || '').trim()) && retryCount === 0) return true
  const probability = retryCount > 0 ? MESSAGE_FAIL_PROBABILITY * 0.25 : MESSAGE_FAIL_PROBABILITY
  return Math.random() < probability
}

const queueMessageDelivery = ({
  ticketId = '',
  messageId = '',
  sender = SUPPORT_SENDER.CLIENT,
  retryCount = 0,
  text = '',
  onSent,
}) => {
  const minDelay = 320
  const maxDelay = 980
  const delayMs = minDelay + Math.floor(Math.random() * (maxDelay - minDelay))
  setTimeout(() => {
    const failed = shouldMessageDeliveryFail({ sender, retryCount, text })
    let shouldRunOnSent = false
    updateSupportTickets((tickets) => {
      const ticket = getTicketById(tickets, ticketId)
      if (!ticket) return tickets
      const targetMessage = ticket.messages.find((message) => message.id === messageId)
      if (!targetMessage) return tickets
      if (targetMessage.deliveryStatus !== SUPPORT_MESSAGE_STATUS.SENDING) return tickets

      const nextMessage = {
        ...targetMessage,
        deliveryStatus: failed ? SUPPORT_MESSAGE_STATUS.FAILED : SUPPORT_MESSAGE_STATUS.SENT,
        deliveryError: failed ? 'Delivery failed. Retry this message.' : '',
      }
      shouldRunOnSent = !failed

      const nextMessages = ticket.messages.map((message) => (message.id === messageId ? nextMessage : message))
      const nextTicket = {
        ...ticket,
        messages: nextMessages,
        updatedAtIso: nowIso(),
        unreadByClient: ticket.unreadByClient + (!failed && (sender === SUPPORT_SENDER.AGENT || sender === SUPPORT_SENDER.BOT || sender === SUPPORT_SENDER.SYSTEM) ? 1 : 0),
        unreadByAdmin: ticket.unreadByAdmin + (!failed && sender === SUPPORT_SENDER.CLIENT ? 1 : 0),
      }
      return replaceTicket(tickets, nextTicket)
    })
    if (shouldRunOnSent && typeof onSent === 'function') onSent()
  }, delayMs)
}

const appendBotReply = ({ ticketId = '', promptText = '' }) => {
  setTimeout(() => {
    updateSupportTickets((tickets) => {
      const ticket = getTicketById(tickets, ticketId)
      if (!ticket) return tickets
      if (ticket.status === SUPPORT_TICKET_STATUS.RESOLVED) return tickets
      if (ticket.channel !== SUPPORT_CHANNEL.BOT) return tickets

      const botMessage = createImmediateMessage({
        sender: SUPPORT_SENDER.BOT,
        senderName: 'Kiamina Support Bot',
        text: buildSupportBotReply(promptText),
      })
      return replaceTicket(tickets, updateTicketWithMessage({
        ticket,
        message: botMessage,
        incrementClientUnread: true,
      }))
    })
  }, 420 + Math.floor(Math.random() * 300))
}

const shouldRequestAgent = (text = '') => AGENT_REQUEST_PATTERN.test(String(text || '').trim())

const findMessage = (ticket = null, messageId = '') => (
  ticket?.messages?.find((message) => message.id === messageId) || null
)

export const buildSupportBotReply = (inputText = '') => {
  const text = String(inputText || '').toLowerCase()
  if (text.includes('upload')) return 'Upload guide: 1) Choose category. 2) Enter folder name. 3) Upload file(s). 4) Set Class. 5) Submit.'
  if (text.includes('expense')) return 'Expenses guide: open Expenses, upload to a folder, complete Class and metadata, then monitor status in folder view.'
  if (text.includes('sales')) return 'Sales guide: open Sales, upload into a folder, complete Class and invoice metadata, then track review status.'
  if (text.includes('bank')) return 'Bank statement guide: open Bank Statements, upload statement files, set Class and period details, then monitor review status.'
  if (text.includes('setting') || text.includes('profile')) return 'Settings guide: update profile photo, company logo, business profile, tax details, and verification docs.'
  if (text.includes('verification')) return 'Verification guide: Settings > Identity Verification. Upload required docs and submit for review.'
  return 'I can help with uploads, expenses, sales, bank statements, and settings. Type "agent" for human support.'
}

export const formatSupportSlaCountdown = (slaDueAtIso = '', referenceMs = Date.now()) => {
  const dueMs = Date.parse(slaDueAtIso || '')
  if (!Number.isFinite(dueMs)) return ''
  const deltaMs = dueMs - referenceMs
  const prefix = deltaMs >= 0 ? 'Due in' : 'Overdue by'
  const absoluteMinutes = Math.max(1, Math.round(Math.abs(deltaMs) / 60000))
  const hours = Math.floor(absoluteMinutes / 60)
  const minutes = absoluteMinutes % 60
  if (hours > 0) return `${prefix} ${hours}h ${minutes}m`
  return `${prefix} ${minutes}m`
}

export const initializeAnonymousSupportLead = () => {
  if (typeof localStorage === 'undefined') {
    return { ok: false, message: 'Support lead session is unavailable in this environment.' }
  }

  const savedSession = safeParseJson(localStorage.getItem(SUPPORT_ANON_LEAD_SESSION_STORAGE_KEY), null)
  const savedClientEmail = toEmail(savedSession?.clientEmail)
  if (savedClientEmail) {
    let existingLead = getLeadByClientEmail(supportState.leads, savedClientEmail)
    if (!existingLead) {
      const fallbackNumber = parseLeadNumberFromAlias(savedClientEmail) || nextLeadSequence()
      const recreatedLead = normalizeLead({
        id: toTrimmedValue(savedSession?.leadId),
        leadNumber: fallbackNumber,
        leadLabel: toTrimmedValue(savedSession?.leadLabel) || `Lead ${fallbackNumber}`,
        clientEmail: savedClientEmail,
        leadCategory: LEAD_CATEGORY.INQUIRY_FOLLOW_UP,
        source: 'chat-inquiry',
        createdAtIso: nowIso(),
        updatedAtIso: nowIso(),
      })
      updateSupportLeads((leads) => replaceLead(leads, recreatedLead))
      existingLead = recreatedLead
    }
    if (existingLead && (!existingLead.ipAddress || !existingLead.location)) {
      void hydrateSupportLeadNetworkProfile({ clientEmail: existingLead.clientEmail })
    }
    return {
      ok: true,
      lead: existingLead,
      leadId: existingLead.id,
      leadLabel: existingLead.leadLabel,
      clientEmail: existingLead.clientEmail,
    }
  }

  const nextLeadNumber = nextLeadSequence()
  const nextLead = normalizeLead({
    id: createId('LEAD'),
    leadNumber: nextLeadNumber,
    leadLabel: `Lead ${nextLeadNumber}`,
    clientEmail: buildLeadAliasEmail(nextLeadNumber),
    leadCategory: LEAD_CATEGORY.INQUIRY_FOLLOW_UP,
    createdAtIso: nowIso(),
    updatedAtIso: nowIso(),
    source: 'chat-inquiry',
  })
  updateSupportLeads((leads) => replaceLead(leads, nextLead))
  persistAnonymousLeadSession({
    leadId: nextLead.id,
    leadLabel: nextLead.leadLabel,
    clientEmail: nextLead.clientEmail,
  })
  if (!nextLead.ipAddress || !nextLead.location) {
    void hydrateSupportLeadNetworkProfile({ clientEmail: nextLead.clientEmail })
  }
  return {
    ok: true,
    lead: nextLead,
    leadId: nextLead.id,
    leadLabel: nextLead.leadLabel,
    clientEmail: nextLead.clientEmail,
  }
}

const refreshLeadLinkedTickets = (lead = null) => {
  if (!lead?.id) return
  updateSupportTickets((tickets) => (
    tickets.map((ticket) => {
      const isLinked = ticket.leadId === lead.id || ticket.clientEmail === lead.clientEmail
      if (!isLinked) return ticket
      return applyLeadToTicket(ticket, lead)
    })
  ))
}

export const updateSupportLeadProfile = ({
  clientEmail = '',
  fullName = '',
  contactEmail = '',
  organizationType = LEAD_ORGANIZATION_TYPE.UNKNOWN,
} = {}) => {
  const normalizedClientEmail = toEmail(clientEmail)
  if (!normalizedClientEmail) return { ok: false, message: 'Lead identity is missing.' }
  let nextLead = null
  updateSupportLeads((leads) => {
    const existingLead = getLeadByClientEmail(leads, normalizedClientEmail)
    if (!existingLead) return leads
    nextLead = normalizeLead({
      ...existingLead,
      fullName: toTrimmedValue(fullName) || existingLead.fullName,
      contactEmail: toEmail(contactEmail) || existingLead.contactEmail,
      organizationType: normalizeLeadOrganizationType(organizationType) || existingLead.organizationType,
      leadCategories: normalizeLeadCategories(existingLead.leadCategories, existingLead.leadCategory),
      leadCategory: existingLead.leadCategory || LEAD_CATEGORY.INQUIRY_FOLLOW_UP,
      updatedAtIso: nowIso(),
    })
    return replaceLead(leads, nextLead)
  })
  if (!nextLead) return { ok: false, message: 'Lead record was not found.' }
  refreshLeadLinkedTickets(nextLead)
  return { ok: true, lead: nextLead }
}

export const registerNewsletterSubscriberLead = ({
  contactEmail = '',
  fullName = '',
} = {}) => {
  const normalizedContactEmail = toEmail(contactEmail)
  if (!isValidEmail(normalizedContactEmail)) {
    return { ok: false, message: 'A valid email is required.' }
  }

  const normalizedName = toTrimmedValue(fullName)
  let nextLead = null
  updateSupportLeads((leads) => {
    const existingLead = getLeadByContactEmail(leads, normalizedContactEmail)
    if (existingLead) {
      nextLead = normalizeLead({
        ...existingLead,
        fullName: normalizedName || existingLead.fullName,
        contactEmail: normalizedContactEmail,
        leadCategories: normalizeLeadCategories(
          existingLead.leadCategories,
          existingLead.leadCategory,
          LEAD_CATEGORY.NEWSLETTER_SUBSCRIBER,
        ),
        leadCategory: LEAD_CATEGORY.NEWSLETTER_SUBSCRIBER,
        source: 'newsletter-subscription',
        updatedAtIso: nowIso(),
      })
      return replaceLead(leads, nextLead)
    }

    const nextLeadNumber = nextLeadSequence()
    nextLead = normalizeLead({
      id: createId('LEAD'),
      leadNumber: nextLeadNumber,
      leadLabel: `Lead ${nextLeadNumber}`,
      clientEmail: normalizedContactEmail,
      fullName: normalizedName,
      contactEmail: normalizedContactEmail,
      organizationType: LEAD_ORGANIZATION_TYPE.UNKNOWN,
      leadCategory: LEAD_CATEGORY.NEWSLETTER_SUBSCRIBER,
      source: 'newsletter-subscription',
      createdAtIso: nowIso(),
      updatedAtIso: nowIso(),
    })
    return replaceLead(leads, nextLead)
  })

  if (!nextLead) return { ok: false, message: 'Unable to save newsletter lead.' }
  refreshLeadLinkedTickets(nextLead)
  if (!nextLead.ipAddress || !nextLead.location) {
    void hydrateSupportLeadNetworkProfile({ clientEmail: nextLead.clientEmail })
  }
  return { ok: true, lead: nextLead }
}

export const deleteSupportLead = ({
  leadId = '',
  clientEmail = '',
} = {}) => {
  const normalizedLeadId = toTrimmedValue(leadId)
  const normalizedClientEmail = toEmail(clientEmail)
  if (!normalizedLeadId && !normalizedClientEmail) {
    return { ok: false, message: 'Lead identifier is required.' }
  }

  let removedLead = null
  updateSupportLeads((leads) => {
    const targetLead = normalizedLeadId
      ? getLeadById(leads, normalizedLeadId)
      : getLeadByClientEmail(leads, normalizedClientEmail)
    if (!targetLead) return leads
    removedLead = targetLead
    return leads.filter((lead) => lead.id !== targetLead.id)
  })

  if (!removedLead) {
    return { ok: false, message: 'Lead was not found.' }
  }

  const removedLeadId = toTrimmedValue(removedLead.id)
  const removedLeadClientEmail = toEmail(removedLead.clientEmail)
  let removedTickets = []
  updateSupportTickets((tickets) => {
    removedTickets = tickets.filter((ticket) => (
      Boolean(ticket?.isLead)
      && (
        (removedLeadId && toTrimmedValue(ticket.leadId) === removedLeadId)
        || (removedLeadClientEmail && toEmail(ticket.clientEmail) === removedLeadClientEmail)
      )
    ))
    if (removedTickets.length === 0) return tickets
    const removedTicketIds = new Set(removedTickets.map((ticket) => ticket.id))
    return tickets.filter((ticket) => !removedTicketIds.has(ticket.id))
  })

  clearAnonymousLeadSessionByClientEmail(removedLeadClientEmail)

  return {
    ok: true,
    lead: removedLead,
    tickets: removedTickets,
    removedTicketCount: removedTickets.length,
  }
}

export const restoreSupportLead = ({
  lead = null,
  tickets = [],
} = {}) => {
  if (!lead || typeof lead !== 'object') {
    return { ok: false, message: 'Lead payload is required for restore.' }
  }

  const normalizedLead = normalizeLead(lead, 0)
  updateSupportLeads((leads) => replaceLead(leads, normalizedLead))

  const normalizedTickets = (Array.isArray(tickets) ? tickets : [])
    .filter((ticket) => ticket && typeof ticket === 'object')
    .map((ticket, index) => normalizeTicket(ticket, index))
    .map((ticket) => applyLeadToTicket(ticket, normalizedLead))

  const uniqueTickets = []
  const seenTicketIds = new Set()
  normalizedTickets.forEach((ticket) => {
    const normalizedTicketId = toTrimmedValue(ticket.id)
    if (!normalizedTicketId || seenTicketIds.has(normalizedTicketId)) return
    seenTicketIds.add(normalizedTicketId)
    uniqueTickets.push(ticket)
  })

  if (uniqueTickets.length > 0) {
    updateSupportTickets((existingTickets) => (
      uniqueTickets.reduce((nextTickets, ticket) => replaceTicket(nextTickets, ticket), existingTickets)
    ))
  }

  refreshLeadLinkedTickets(normalizedLead)
  return {
    ok: true,
    lead: normalizedLead,
    restoredTicketCount: uniqueTickets.length,
  }
}

const fetchJsonWithTimeout = async (url = '', timeoutMs = 5000) => {
  const abortController = typeof AbortController === 'function' ? new AbortController() : null
  const timeoutId = abortController ? setTimeout(() => abortController.abort(), timeoutMs) : null
  try {
    return await fetch(url, {
      method: 'GET',
      signal: abortController?.signal,
    })
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

const normalizeLeadGeoProfile = (payload = {}, providerKey = '') => {
  const source = toTrimmedValue(providerKey).toLowerCase()
  if (source === 'ipwho' && payload?.success === false) {
    return {
      ipAddress: '',
      city: '',
      region: '',
      country: '',
      location: '',
    }
  }
  const ipAddress = toTrimmedValue(
    payload?.ip
    || payload?.ip_address
    || payload?.query
    || payload?.ipAddress,
  )
  const city = toTrimmedValue(payload?.city)
  const region = toTrimmedValue(payload?.region || payload?.region_name)
  const country = toTrimmedValue(payload?.country || payload?.country_name)
  const location = toTrimmedValue(payload?.location)
    || [city, region, country].filter(Boolean).join(', ')
  return {
    ipAddress,
    city,
    region,
    country,
    location,
  }
}

const fetchLeadGeoProfile = async () => {
  if (typeof fetch !== 'function') return { ok: false, message: 'Network API unavailable.' }

  for (const endpoint of LEAD_GEO_LOOKUP_ENDPOINTS) {
    try {
      const response = await fetchJsonWithTimeout(endpoint.url, 5000)
      if (!response?.ok) continue
      const payload = await response.json().catch(() => null)
      if (!payload || typeof payload !== 'object') continue
      const profile = normalizeLeadGeoProfile(payload, endpoint.key)
      if (!profile.ipAddress && !profile.location) continue
      return {
        ok: true,
        ...profile,
      }
    } catch {
      // Try the next provider.
    }
  }

  return { ok: false, message: 'IP profile lookup failed.' }
}

export const hydrateSupportLeadNetworkProfile = async ({
  clientEmail = '',
} = {}) => {
  const normalizedClientEmail = toEmail(clientEmail)
  if (!normalizedClientEmail) return { ok: false, message: 'Lead identity is missing.' }
  const currentLead = getLeadByClientEmail(supportState.leads, normalizedClientEmail)
  if (!currentLead) return { ok: false, message: 'Lead record not found.' }
  if (currentLead.ipAddress && currentLead.location) {
    return { ok: true, lead: currentLead }
  }
  const lookupResult = await fetchLeadGeoProfile()
  if (!lookupResult.ok) return lookupResult

  let nextLead = null
  updateSupportLeads((leads) => {
    const existingLead = getLeadByClientEmail(leads, normalizedClientEmail)
    if (!existingLead) return leads
    nextLead = normalizeLead({
      ...existingLead,
      ipAddress: lookupResult.ipAddress || existingLead.ipAddress,
      city: lookupResult.city || existingLead.city,
      region: lookupResult.region || existingLead.region,
      country: lookupResult.country || existingLead.country,
      location: lookupResult.location || existingLead.location,
      updatedAtIso: nowIso(),
    })
    return replaceLead(leads, nextLead)
  })
  if (!nextLead) return { ok: false, message: 'Unable to update lead network profile.' }
  refreshLeadLinkedTickets(nextLead)
  return { ok: true, lead: nextLead }
}

export const getSupportCenterSnapshot = () => toSnapshot()

export const subscribeSupportCenter = (listener) => {
  if (typeof listener !== 'function') return () => {}
  listenerSet.add(listener)
  listener(toSnapshot())
  return () => {
    listenerSet.delete(listener)
  }
}

export const ensureClientSupportThread = ({
  clientEmail = '',
  clientName = 'Client User',
  businessName = '',
} = {}) => {
  const normalizedEmail = toEmail(clientEmail)
  if (!normalizedEmail) return { ok: false, message: 'Client email is required.' }
  let ticketId = ''
  updateSupportTickets((tickets) => {
    const result = ensureClientTicket({
      tickets,
      leads: supportState.leads,
      clientEmail: normalizedEmail,
      clientName,
      businessName,
      forceNew: false,
    })
    ticketId = result.ticket?.id || ''
    return result.tickets
  })
  const lead = getLeadByClientEmail(supportState.leads, normalizedEmail)
  if (lead && (!lead.ipAddress || !lead.location)) {
    void hydrateSupportLeadNetworkProfile({ clientEmail: normalizedEmail })
  }
  return { ok: Boolean(ticketId), ticketId }
}

export const startNewClientSupportThread = ({
  clientEmail = '',
  clientName = 'Client User',
  businessName = '',
} = {}) => {
  const normalizedEmail = toEmail(clientEmail)
  if (!normalizedEmail) return { ok: false, message: 'Client email is required.' }
  let ticketId = ''
  updateSupportTickets((tickets) => {
    const autoClosedTickets = tickets.map((ticket) => {
      if (ticket.clientEmail !== normalizedEmail) return ticket
      if (ticket.status === SUPPORT_TICKET_STATUS.RESOLVED) return ticket
      const autoCloseMessage = createImmediateMessage({
        sender: SUPPORT_SENDER.SYSTEM,
        senderName: SUPPORT_COMPANY_NAME,
        text: 'This chat was closed automatically because a new chat was started.',
      })
      return updateTicketWithMessage({
        ticket: {
          ...ticket,
          status: SUPPORT_TICKET_STATUS.RESOLVED,
          resolvedAtIso: nowIso(),
          slaDueAtIso: '',
        },
        message: autoCloseMessage,
        incrementClientUnread: true,
      })
    })
    const result = ensureClientTicket({
      tickets: autoClosedTickets,
      leads: supportState.leads,
      clientEmail: normalizedEmail,
      clientName,
      businessName,
      forceNew: true,
    })
    ticketId = result.ticket?.id || ''
    return result.tickets
  })
  const lead = getLeadByClientEmail(supportState.leads, normalizedEmail)
  if (lead && (!lead.ipAddress || !lead.location)) {
    void hydrateSupportLeadNetworkProfile({ clientEmail: normalizedEmail })
  }
  return { ok: Boolean(ticketId), ticketId }
}

export const requestHumanSupport = ({
  clientEmail = '',
  clientName = 'Client User',
  businessName = '',
  ticketId = '',
} = {}) => {
  const normalizedEmail = toEmail(clientEmail)
  let nextTicketId = ticketId
  updateSupportTickets((tickets) => {
    let workingTickets = tickets
    let targetTicket = ticketId ? getTicketById(workingTickets, ticketId) : null

    if (!targetTicket) {
      const ensureResult = ensureClientTicket({
        tickets: workingTickets,
        leads: supportState.leads,
        clientEmail: normalizedEmail,
        clientName,
        businessName,
      })
      workingTickets = ensureResult.tickets
      targetTicket = ensureResult.ticket
      nextTicketId = targetTicket?.id || ''
    }

    if (!targetTicket) return workingTickets
    if (targetTicket.channel === SUPPORT_CHANNEL.HUMAN && targetTicket.status !== SUPPORT_TICKET_STATUS.RESOLVED) {
      return workingTickets
    }

    if (!isSupportAgentOnline()) {
      const offlineNotice = createImmediateMessage({
        sender: SUPPORT_SENDER.SYSTEM,
        senderName: SUPPORT_COMPANY_NAME,
        text: SUPPORT_AGENT_OFFLINE_TEXT,
      })
      const nextTicket = updateTicketWithMessage({
        ticket: {
          ...targetTicket,
          channel: SUPPORT_CHANNEL.BOT,
          status: targetTicket.status === SUPPORT_TICKET_STATUS.RESOLVED ? SUPPORT_TICKET_STATUS.OPEN : targetTicket.status,
          resolvedAtIso: '',
          slaDueAtIso: '',
        },
        message: offlineNotice,
        incrementClientUnread: true,
      })
      return replaceTicket(workingTickets, nextTicket)
    }

    const waitingNotice = createImmediateMessage({
      sender: SUPPORT_SENDER.SYSTEM,
      senderName: SUPPORT_COMPANY_NAME,
      text: 'Please wait, an agent will be with you shortly.',
    })
    const nextTicket = updateTicketWithMessage({
      ticket: {
        ...targetTicket,
        channel: SUPPORT_CHANNEL.HUMAN,
        status: targetTicket.status === SUPPORT_TICKET_STATUS.RESOLVED ? SUPPORT_TICKET_STATUS.OPEN : targetTicket.status,
        resolvedAtIso: '',
        slaDueAtIso: addHoursIso(nowIso(), 2),
      },
      message: waitingNotice,
      incrementClientUnread: true,
    })
    return replaceTicket(workingTickets, nextTicket)
  })
  return { ok: Boolean(nextTicketId), ticketId: nextTicketId }
}

const appendLeadIntakeBotMessage = ({
  ticketId = '',
  text = '',
} = {}) => {
  const normalizedText = toTrimmedValue(text)
  if (!toTrimmedValue(ticketId) || !normalizedText) return
  updateSupportTickets((tickets) => {
    const ticket = getTicketById(tickets, ticketId)
    if (!ticket) return tickets
    const botMessage = createImmediateMessage({
      sender: SUPPORT_SENDER.BOT,
      senderName: 'Kiamina Support Bot',
      text: normalizedText,
    })
    const nextTicket = updateTicketWithMessage({
      ticket,
      message: botMessage,
      incrementClientUnread: true,
    })
    return replaceTicket(tickets, nextTicket)
  })
}

const updateLeadById = (leadId = '', updater = null) => {
  const normalizedLeadId = toTrimmedValue(leadId)
  if (!normalizedLeadId || typeof updater !== 'function') return null
  let nextLead = null
  updateSupportLeads((leads) => {
    const lead = getLeadById(leads, normalizedLeadId)
    if (!lead) return leads
    const candidate = updater(lead)
    if (!candidate) return leads
    nextLead = normalizeLead({
      ...lead,
      ...candidate,
      updatedAtIso: nowIso(),
    })
    return replaceLead(leads, nextLead)
  })
  if (nextLead) refreshLeadLinkedTickets(nextLead)
  return nextLead
}

const handleLeadIntakeOnDeliveredMessage = ({
  ticketId = '',
  messageId = '',
} = {}) => {
  const ticket = getTicketById(supportState.tickets, ticketId)
  if (!ticket || !ticket.isLead) return { handled: false }
  if (!hasLeadCategory(ticket, LEAD_CATEGORY.INQUIRY_FOLLOW_UP)) return { handled: false }

  const deliveredMessage = findMessage(ticket, messageId)
  if (!deliveredMessage || deliveredMessage.sender !== SUPPORT_SENDER.CLIENT) return { handled: false }
  const userText = toTrimmedValue(deliveredMessage.text)
  const lead = getLeadById(supportState.leads, ticket.leadId) || getLeadByClientEmail(supportState.leads, ticket.clientEmail)
  if (!lead) return { handled: false }

  const stage = normalizeLeadIntakeStage(ticket.leadIntakeStage) || getLeadIntakeStage(lead)
  if (stage === LEAD_INTAKE_STAGE.COMPLETE) {
    return { handled: false }
  }

  if (stage === LEAD_INTAKE_STAGE.FULL_NAME) {
    const normalizedFullName = normalizeIntakeFullName(userText)
    if (!normalizedFullName || isValidEmail(normalizedFullName)) {
      appendLeadIntakeBotMessage({
        ticketId,
        text: buildLeadIntakePrompt({ stage: LEAD_INTAKE_STAGE.FULL_NAME }),
      })
      return { handled: true }
    }
    const updatedLead = updateLeadById(lead.id, () => ({
      fullName: normalizedFullName,
      intakeStage: LEAD_INTAKE_STAGE.EMAIL,
      intakeComplete: false,
      leadCategories: normalizeLeadCategories(lead.leadCategories, lead.leadCategory, LEAD_CATEGORY.INQUIRY_FOLLOW_UP),
      leadCategory: LEAD_CATEGORY.INQUIRY_FOLLOW_UP,
    }))
    appendLeadIntakeBotMessage({
      ticketId,
      text: buildLeadIntakePrompt({
        stage: LEAD_INTAKE_STAGE.EMAIL,
        firstName: getFirstName(updatedLead?.fullName || normalizedFullName),
      }),
    })
    return { handled: true }
  }

  if (stage === LEAD_INTAKE_STAGE.EMAIL) {
    if (!isValidEmail(userText)) {
      appendLeadIntakeBotMessage({
        ticketId,
        text: 'Please share a valid email address so we can follow up with you.',
      })
      return { handled: true }
    }
    const normalizedContactEmail = toEmail(userText)
    const existingLeadByEmail = getLeadByContactEmail(supportState.leads, normalizedContactEmail)
    if (existingLeadByEmail && existingLeadByEmail.id !== lead.id) {
      let mergedLead = null
      updateSupportLeads((leads) => {
        const baseLead = getLeadById(leads, existingLeadByEmail.id) || existingLeadByEmail
        mergedLead = normalizeLead({
          ...baseLead,
          fullName: baseLead.fullName || lead.fullName,
          contactEmail: normalizedContactEmail,
          leadCategories: normalizeLeadCategories(
            baseLead.leadCategories,
            baseLead.leadCategory,
            lead.leadCategories,
            lead.leadCategory,
            LEAD_CATEGORY.INQUIRY_FOLLOW_UP,
          ),
          leadCategory: LEAD_CATEGORY.INQUIRY_FOLLOW_UP,
          intakeStage: LEAD_INTAKE_STAGE.INQUIRY,
          intakeComplete: false,
          updatedAtIso: nowIso(),
        })
        const filteredLeads = leads.filter((entry) => (
          entry.id !== lead.id && entry.id !== baseLead.id
        ))
        return replaceLead(filteredLeads, mergedLead)
      })

      if (mergedLead) {
        updateSupportTickets((tickets) => (
          tickets.map((item) => {
            const sameLead = toTrimmedValue(item.leadId) === toTrimmedValue(lead.id)
            const sameClientEmail = toEmail(item.clientEmail) === toEmail(lead.clientEmail)
            const sameMergedLead = toTrimmedValue(item.leadId) === toTrimmedValue(mergedLead.id)
            if (!sameLead && !sameClientEmail && !sameMergedLead) return item
            return normalizeTicket({
              ...item,
              isLead: true,
              leadId: mergedLead.id,
              leadLabel: mergedLead.leadLabel,
              leadFullName: mergedLead.fullName,
              leadContactEmail: mergedLead.contactEmail,
              leadOrganizationType: mergedLead.organizationType,
              leadCategory: mergedLead.leadCategory,
              leadCategories: mergedLead.leadCategories,
              leadInquiryText: mergedLead.inquiryText,
              leadIntakeStage: item.id === ticketId ? LEAD_INTAKE_STAGE.INQUIRY : item.leadIntakeStage,
              leadIpAddress: mergedLead.ipAddress,
              leadLocation: mergedLead.location,
              clientName: mergedLead.leadLabel || item.clientName,
            })
          })
        ))
        persistAnonymousLeadSession({
          leadId: mergedLead.id,
          leadLabel: mergedLead.leadLabel,
          clientEmail: mergedLead.clientEmail,
        })
      }
    } else {
      updateLeadById(lead.id, () => ({
        contactEmail: normalizedContactEmail,
        intakeStage: LEAD_INTAKE_STAGE.INQUIRY,
        intakeComplete: false,
        leadCategories: normalizeLeadCategories(lead.leadCategories, lead.leadCategory, LEAD_CATEGORY.INQUIRY_FOLLOW_UP),
        leadCategory: LEAD_CATEGORY.INQUIRY_FOLLOW_UP,
      }))
    }
    appendLeadIntakeBotMessage({
      ticketId,
      text: buildLeadIntakePrompt({ stage: LEAD_INTAKE_STAGE.INQUIRY }),
    })
    return { handled: true }
  }

  if (stage === LEAD_INTAKE_STAGE.INQUIRY) {
    if (!userText) {
      appendLeadIntakeBotMessage({
        ticketId,
        text: buildLeadIntakePrompt({ stage: LEAD_INTAKE_STAGE.INQUIRY }),
      })
      return { handled: true }
    }
    updateLeadById(lead.id, () => ({
      inquiryText: userText,
      intakeStage: LEAD_INTAKE_STAGE.COMPLETE,
      intakeComplete: true,
      leadCategories: normalizeLeadCategories(lead.leadCategories, lead.leadCategory, LEAD_CATEGORY.INQUIRY_FOLLOW_UP),
      leadCategory: LEAD_CATEGORY.INQUIRY_FOLLOW_UP,
    }))
    return {
      handled: true,
      stageCompleted: true,
      inquiryText: userText,
    }
  }

  return { handled: false }
}

export const sendClientSupportMessage = ({
  clientEmail = '',
  clientName = 'Client User',
  businessName = '',
  text = '',
  attachments = [],
} = {}) => {
  const normalizedEmail = toEmail(clientEmail)
  const messageText = String(text || '')
  const normalizedAttachments = (Array.isArray(attachments) ? attachments : []).map((attachment, index) => normalizeAttachment(attachment, index))
  if (!normalizedEmail) return { ok: false, message: 'Client email is required.' }
  if (!toTrimmedValue(messageText) && normalizedAttachments.length === 0) return { ok: false, message: 'Message cannot be empty.' }

  let ticketId = ''
  let messageId = ''
  let queuedText = messageText
  updateSupportTickets((tickets) => {
    let ensureResult = ensureClientTicket({
      tickets,
      leads: supportState.leads,
      clientEmail: normalizedEmail,
      clientName,
      businessName,
      forceNew: false,
    })
    let ticket = ensureResult.ticket
    if (ticket?.status === SUPPORT_TICKET_STATUS.RESOLVED) {
      ensureResult = ensureClientTicket({
        tickets: ensureResult.tickets,
        leads: supportState.leads,
        clientEmail: normalizedEmail,
        clientName,
        businessName,
        forceNew: true,
      })
      ticket = ensureResult.ticket
    }
    if (!ticket) return tickets

    const pendingMessage = createPendingMessage({
      sender: SUPPORT_SENDER.CLIENT,
      senderName: toTrimmedValue(clientName) || 'Client User',
      text: queuedText,
      attachments: normalizedAttachments,
      retryCount: 0,
    })
    ticketId = ticket.id
    messageId = pendingMessage.id

    const nextTicket = updateTicketWithMessage({
      ticket,
      message: pendingMessage,
    })
    return replaceTicket(ensureResult.tickets, nextTicket)
  })

  if (!ticketId || !messageId) return { ok: false, message: 'Unable to queue message.' }

  queueMessageDelivery({
    ticketId,
    messageId,
    sender: SUPPORT_SENDER.CLIENT,
    retryCount: 0,
    text: queuedText,
    onSent: () => {
      const intakeResult = handleLeadIntakeOnDeliveredMessage({
        ticketId,
        messageId,
      })
      if (intakeResult.handled && !intakeResult.stageCompleted) return

      const snapshot = getSupportCenterSnapshot()
      const ticket = getTicketById(snapshot.tickets, ticketId)
      const deliveredMessage = findMessage(ticket, messageId)
      if (!ticket || !deliveredMessage) return
      const effectivePromptText = intakeResult.stageCompleted
        ? (intakeResult.inquiryText || deliveredMessage.text)
        : deliveredMessage.text
      if (shouldRequestAgent(effectivePromptText)) {
        requestHumanSupport({
          clientEmail: normalizedEmail,
          clientName,
          businessName,
          ticketId,
        })
        return
      }
      if (ticket.channel === SUPPORT_CHANNEL.BOT) {
        appendBotReply({ ticketId, promptText: effectivePromptText })
      }
    },
  })

  return { ok: true, ticketId, messageId }
}

export const sendAdminSupportMessage = ({
  ticketId = '',
  adminName = '',
  adminEmail = '',
  text = '',
  attachments = [],
} = {}) => {
  const messageText = String(text || '')
  const normalizedAttachments = (Array.isArray(attachments) ? attachments : []).map((attachment, index) => normalizeAttachment(attachment, index))
  if (!toTrimmedValue(ticketId)) return { ok: false, message: 'Ticket is required.' }
  if (!toTrimmedValue(messageText) && normalizedAttachments.length === 0) return { ok: false, message: 'Reply cannot be empty.' }

  let messageId = ''
  updateSupportTickets((tickets) => {
    const ticket = getTicketById(tickets, ticketId)
    if (!ticket) return tickets
    if (ticket.status === SUPPORT_TICKET_STATUS.RESOLVED) return tickets
    const normalizedAdminName = getAgentDisplayName(
      adminName || ticket.assignedAdminName,
      adminEmail || ticket.assignedAdminEmail,
    )
    const hasPriorAgentReply = ticket.messages.some((message) => message.sender === SUPPORT_SENDER.AGENT)
    const trimmedMessageText = toTrimmedValue(messageText)
    const composedMessageText = hasPriorAgentReply
      ? messageText
      : (trimmedMessageText ? `${buildAgentHandoffMessage(normalizedAdminName)} ${trimmedMessageText}` : buildAgentHandoffMessage(normalizedAdminName))

    const pendingMessage = createPendingMessage({
      sender: SUPPORT_SENDER.AGENT,
      senderName: normalizedAdminName,
      text: composedMessageText,
      attachments: normalizedAttachments,
      retryCount: 0,
    })
    messageId = pendingMessage.id
    const nextTicket = updateTicketWithMessage({
      ticket: {
        ...ticket,
        status: SUPPORT_TICKET_STATUS.ASSIGNED,
        channel: SUPPORT_CHANNEL.HUMAN,
        assignedAdminName: normalizedAdminName,
        assignedAdminEmail: toEmail(adminEmail) || ticket.assignedAdminEmail,
        resolvedAtIso: '',
        slaDueAtIso: addHoursIso(nowIso(), 1),
      },
      message: pendingMessage,
    })
    return replaceTicket(tickets, nextTicket)
  })

  if (!messageId) return { ok: false, message: 'Unable to queue reply.' }

  queueMessageDelivery({
    ticketId,
    messageId,
    sender: SUPPORT_SENDER.AGENT,
    retryCount: 0,
    text: messageText,
  })
  return { ok: true, ticketId, messageId }
}

export const retrySupportMessage = ({
  ticketId = '',
  messageId = '',
} = {}) => {
  if (!toTrimmedValue(ticketId) || !toTrimmedValue(messageId)) {
    return { ok: false, message: 'Ticket and message are required.' }
  }

  let queuedSender = SUPPORT_SENDER.CLIENT
  let queuedText = ''
  let queuedRetryCount = 0
  let canQueue = false
  updateSupportTickets((tickets) => {
    const ticket = getTicketById(tickets, ticketId)
    if (!ticket) return tickets
    const targetMessage = findMessage(ticket, messageId)
    if (!targetMessage || targetMessage.deliveryStatus !== SUPPORT_MESSAGE_STATUS.FAILED) return tickets

    queuedSender = targetMessage.sender
    queuedText = targetMessage.text
    queuedRetryCount = (targetMessage.retryCount || 0) + 1
    canQueue = true

    const nextMessage = {
      ...targetMessage,
      deliveryStatus: SUPPORT_MESSAGE_STATUS.SENDING,
      deliveryError: '',
      retryCount: queuedRetryCount,
    }
    const nextMessages = ticket.messages.map((message) => (
      message.id === messageId ? nextMessage : message
    ))
    const nextTicket = {
      ...ticket,
      updatedAtIso: nowIso(),
      messages: nextMessages,
    }
    return replaceTicket(tickets, nextTicket)
  })

  if (!canQueue) return { ok: false, message: 'Message is not retryable.' }

  queueMessageDelivery({
    ticketId,
    messageId,
    sender: queuedSender,
    retryCount: queuedRetryCount,
    text: queuedText,
    onSent: () => {
      if (queuedSender !== SUPPORT_SENDER.CLIENT) return
      const intakeResult = handleLeadIntakeOnDeliveredMessage({
        ticketId,
        messageId,
      })
      if (intakeResult.handled && !intakeResult.stageCompleted) return
      const snapshot = getSupportCenterSnapshot()
      const ticket = getTicketById(snapshot.tickets, ticketId)
      const deliveredMessage = findMessage(ticket, messageId)
      if (!ticket || !deliveredMessage) return
      const effectivePromptText = intakeResult.stageCompleted
        ? (intakeResult.inquiryText || deliveredMessage.text)
        : deliveredMessage.text
      if (shouldRequestAgent(effectivePromptText)) {
        requestHumanSupport({
          clientEmail: ticket.clientEmail,
          clientName: ticket.clientName,
          businessName: ticket.businessName,
          ticketId,
        })
        return
      }
      if (ticket.channel === SUPPORT_CHANNEL.BOT) {
        appendBotReply({ ticketId, promptText: effectivePromptText })
      }
    },
  })
  return { ok: true, ticketId, messageId }
}

export const markSupportTicketReadByClient = (ticketId = '') => {
  if (!toTrimmedValue(ticketId)) return
  updateSupportTickets((tickets) => {
    const ticket = getTicketById(tickets, ticketId)
    if (!ticket) return tickets
    if (!ticket.unreadByClient) return tickets
    const nextTicket = {
      ...ticket,
      unreadByClient: 0,
      messages: ticket.messages.map((message) => (
        message.sender === SUPPORT_SENDER.CLIENT ? message : { ...message, readByClient: true }
      )),
    }
    return replaceTicket(tickets, nextTicket)
  })
}

export const markSupportTicketReadByAdmin = (ticketId = '') => {
  if (!toTrimmedValue(ticketId)) return
  updateSupportTickets((tickets) => {
    const ticket = getTicketById(tickets, ticketId)
    if (!ticket) return tickets
    if (!ticket.unreadByAdmin) return tickets
    const nextTicket = {
      ...ticket,
      unreadByAdmin: 0,
      messages: ticket.messages.map((message) => (
        message.sender === SUPPORT_SENDER.AGENT ? message : { ...message, readByAdmin: true }
      )),
    }
    return replaceTicket(tickets, nextTicket)
  })
}

export const assignSupportTicket = ({
  ticketId = '',
  adminName = '',
  adminEmail = '',
} = {}) => {
  if (!toTrimmedValue(ticketId)) return { ok: false, message: 'Ticket is required.' }
  let updated = false
  updateSupportTickets((tickets) => {
    const ticket = getTicketById(tickets, ticketId)
    if (!ticket) return tickets
    if (ticket.status === SUPPORT_TICKET_STATUS.RESOLVED) return tickets
    const normalizedAdminName = getAgentDisplayName(
      adminName || ticket.assignedAdminName,
      adminEmail || ticket.assignedAdminEmail,
    )
    const hasPriorAgentReply = ticket.messages.some((message) => message.sender === SUPPORT_SENDER.AGENT)
    const assignmentMessage = hasPriorAgentReply
      ? createImmediateMessage({
          sender: SUPPORT_SENDER.SYSTEM,
          senderName: SUPPORT_COMPANY_NAME,
          text: `Ticket assigned to ${normalizedAdminName}.`,
        })
      : createImmediateMessage({
          sender: SUPPORT_SENDER.AGENT,
          senderName: normalizedAdminName,
          text: buildAgentHandoffMessage(normalizedAdminName),
        })
    const nextTicket = updateTicketWithMessage({
      ticket: {
        ...ticket,
        status: SUPPORT_TICKET_STATUS.ASSIGNED,
        channel: SUPPORT_CHANNEL.HUMAN,
        assignedAdminName: normalizedAdminName,
        assignedAdminEmail: toEmail(adminEmail) || ticket.assignedAdminEmail,
        resolvedAtIso: '',
        slaDueAtIso: addHoursIso(nowIso(), 1),
      },
      message: assignmentMessage,
      incrementClientUnread: true,
    })
    updated = true
    return replaceTicket(tickets, nextTicket)
  })
  return updated ? { ok: true, ticketId } : { ok: false, message: 'Unable to assign ticket.' }
}

export const resolveSupportTicket = ({
  ticketId = '',
  adminName = '',
} = {}) => {
  if (!toTrimmedValue(ticketId)) return { ok: false, message: 'Ticket is required.' }
  let updated = false
  updateSupportTickets((tickets) => {
    const ticket = getTicketById(tickets, ticketId)
    if (!ticket) return tickets
    if (ticket.status === SUPPORT_TICKET_STATUS.RESOLVED) return tickets
    const normalizedAdminName = getAgentDisplayName(adminName, ticket.assignedAdminEmail)
    const resolutionMessage = createImmediateMessage({
      sender: SUPPORT_SENDER.SYSTEM,
      senderName: SUPPORT_COMPANY_NAME,
      text: `Ticket resolved by ${normalizedAdminName}.`,
    })
    const nextTicket = updateTicketWithMessage({
      ticket: {
        ...ticket,
        status: SUPPORT_TICKET_STATUS.RESOLVED,
        resolvedAtIso: nowIso(),
        slaDueAtIso: '',
      },
      message: resolutionMessage,
      incrementClientUnread: true,
    })
    updated = true
    return replaceTicket(tickets, nextTicket)
  })
  return updated ? { ok: true, ticketId } : { ok: false, message: 'Unable to resolve ticket.' }
}

export const reopenSupportTicket = ({
  ticketId = '',
  adminName = '',
} = {}) => {
  if (!toTrimmedValue(ticketId)) return { ok: false, message: 'Ticket is required.' }
  let updated = false
  updateSupportTickets((tickets) => {
    const ticket = getTicketById(tickets, ticketId)
    if (!ticket) return tickets
    if (ticket.status !== SUPPORT_TICKET_STATUS.RESOLVED) return tickets
    const normalizedAdminName = getAgentDisplayName(adminName, ticket.assignedAdminEmail)
    const reopenMessage = createImmediateMessage({
      sender: SUPPORT_SENDER.SYSTEM,
      senderName: SUPPORT_COMPANY_NAME,
      text: `Ticket reopened by ${normalizedAdminName}.`,
    })
    const nextTicket = updateTicketWithMessage({
      ticket: {
        ...ticket,
        status: SUPPORT_TICKET_STATUS.OPEN,
        channel: SUPPORT_CHANNEL.HUMAN,
        resolvedAtIso: '',
        slaDueAtIso: addHoursIso(nowIso(), 2),
      },
      message: reopenMessage,
      incrementClientUnread: true,
    })
    updated = true
    return replaceTicket(tickets, nextTicket)
  })
  return updated ? { ok: true, ticketId } : { ok: false, message: 'Unable to reopen ticket.' }
}

supportState = {
  tickets: readSupportTickets(),
  leads: readSupportLeads(),
}
updateLeadSequenceFromLeads(supportState.leads)
bindStorageListener()

export {
  SUPPORT_TICKETS_STORAGE_KEY,
  SUPPORT_LEADS_STORAGE_KEY,
  SUPPORT_TICKET_STATUS,
  SUPPORT_CHANNEL,
  SUPPORT_MESSAGE_STATUS,
  SUPPORT_SENDER,
  LEAD_ORGANIZATION_TYPE,
  LEAD_CATEGORY,
}
