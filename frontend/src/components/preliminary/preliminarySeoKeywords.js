const BASE_KEYWORDS = [
  'accounting firm in Port Harcourt',
  'accounting firm in Lagos',
  'accounting firm in Abuja',
  'accounting firm in Nigeria',
  'accounting firm in Rivers State',
  'accounting firm in Lagos State',
  'accounting firm in Abuja FCT',
  'bookkeeping firm in Port Harcourt',
  'bookkeeping firm in Lagos',
  'bookkeeping firm in Abuja',
  'bookkeeping services Port Harcourt',
  'bookkeeping services Lagos',
  'bookkeeping services Abuja',
  'bookkeeping services Nigeria',
  'accounting services Port Harcourt',
  'accounting services Lagos',
  'accounting services Abuja',
  'accounting services Nigeria',
  'chartered accountant Port Harcourt',
  'chartered accountant Lagos',
  'chartered accountant Abuja',
  'ACA accounting firm Nigeria',
  'CPA accounting firm Nigeria',
  'ACCA accounting firm Nigeria',
  'professional accounting services Nigeria',
  'outsourced accounting services Nigeria',
  'outsourced bookkeeping services Nigeria',
  'cloud accounting firm Nigeria',
  'cloud bookkeeping services Nigeria',
  'virtual accounting services Nigeria',
  'virtual bookkeeping services Nigeria',
  'accounting firm for SMEs Nigeria',
  'accounting firm for startups Nigeria',
  'accounting firm for small businesses Nigeria',
  'bookkeeping for small businesses Nigeria',
  'bookkeeping for startups Nigeria',
  'bookkeeping for SMEs Nigeria',
  'accounting firm for nonprofits Nigeria',
  'bookkeeping for nonprofits Nigeria',
  'accounting firm for NGOs Nigeria',
  'bookkeeping for NGOs Nigeria',
  'nonprofit accounting services Nigeria',
  'nonprofit bookkeeping services Nigeria',
  'accounting advisory services Nigeria',
  'financial reporting services Nigeria',
  'management reporting services Nigeria',
  'CFO consulting services Nigeria',
  'virtual CFO services Nigeria',
  'financial modeling services Nigeria',
  'payroll processing services Nigeria',
  'tax compliance services Nigeria',
  'VAT compliance services Nigeria',
  'CIT filing services',
  'PAYE compliance services Nigeria',
  'cross border reporting services',
  'consolidated financial reporting',
  'group financial reporting',
  'working capital advisory',
  'cash flow forecasting services',
  'scenario analysis services',
  'sensitivity analysis services',
  'business intelligence reporting',
  'executive financial reporting',
  'strategic financial reporting',
  'bookkeeping services Canada',
  'bookkeeping services USA',
  'bookkeeping services UK',
  'accounting services Canada',
  'accounting services USA',
  'accounting services UK',
  'CFO services Canada',
  'CFO services USA',
  'CFO services UK',
  'financial modeling Canada',
  'financial modeling USA',
  'financial modeling UK',
  'tax compliance Canada',
  'tax compliance UK',
  'sales tax compliance USA',
  'HST compliance Canada',
  'VAT compliance UK',
]

const NIGERIA_LOCATIONS = [
  'Port Harcourt',
  'Lagos',
  'Abuja',
  'Uyo',
  'Calabar',
  'Owerri',
  'Awka',
  'Benin City',
  'Asaba',
  'Warri',
  'Yenagoa',
  'Ibadan',
  'Lokoja',
  'Rivers State',
  'Lagos State',
  'Abuja FCT',
  'Nigeria wide',
]

const GLOBAL_LOCATIONS = [
  'Nigeria',
  'Canada',
  'USA',
  'UK',
  'United States',
  'United Kingdom',
  'Ontario Canada',
  'Alberta Canada',
  'Toronto Canada',
  'Calgary Canada',
  'California USA',
]

const INDUSTRIES = [
  'oil and gas',
  'technology companies',
  'SaaS companies',
  'ecommerce businesses',
  'digital media companies',
  'entertainment industry',
  'professional services',
  'maritime companies',
  'retail businesses',
  'nonprofits',
  'charities',
  'foundations',
  'NGOs',
  'donor funded projects',
]

const AUDIENCES = [
  'small businesses',
  'SMEs',
  'startups',
  'enterprises',
  'business owners',
  'founders',
  'CEOs',
  'management teams',
  'sole proprietors',
  'self employed',
  'content creators',
  'influencers',
  'streamers',
  'freelancers',
]

const SOFTWARE = [
  'QuickBooks',
  'Xero',
  'Sage',
  'Zoho Books',
  'NetSuite',
  'Microsoft Dynamics',
  'Dext',
]

const REPORTING_TOPICS = [
  'IFRS compliant financial reporting',
  'accounting standards compliant reporting',
  'audit support financial reporting',
  'regulatory compliant financial reporting',
  'board financial reporting services',
  'investor financial reporting services',
  'grant financial reporting services',
  'donor financial reporting services',
  'cash flow reporting services',
  'profit and loss reporting services',
  'balance sheet reporting services',
  'restricted fund reporting',
  'unrestricted fund reporting',
  'fund tracking reports',
  'financial transparency reporting',
  'performance reporting services',
  'operational KPI reporting',
  'management dashboards Nigeria',
  'financial performance dashboards',
  'reporting process optimization',
]

const SERVICE_FAMILIES = [
  'accounting services',
  'bookkeeping services',
  'financial reporting services',
  'management reporting services',
  'CFO advisory services',
  'CFO consulting services',
  'financial modeling services',
  'payroll services',
  'payroll compliance services',
  'tax compliance services',
  'outsourced accounting services',
  'outsourced bookkeeping services',
  'virtual accounting services',
  'virtual bookkeeping services',
  'cloud accounting services',
  'cloud bookkeeping services',
  'reporting services',
  'compliance reporting services',
]

const GEO_QUALIFIERS = [
  ...NIGERIA_LOCATIONS,
  ...GLOBAL_LOCATIONS,
  'Port Harcourt Nigeria',
  'Lagos Nigeria',
  'Abuja Nigeria',
  'Port Harcourt Rivers',
  'Lagos State Nigeria',
  'Abuja FCT Nigeria',
  'Canada wide',
  'USA wide',
  'UK wide',
  'international',
  'cross border',
  'remote',
  'online',
]

const add = (set, value) => {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim()
  if (!normalized) return
  set.add(normalized)
}

const buildKeywords = () => {
  const set = new Set()

  BASE_KEYWORDS.forEach((item) => add(set, item))
  REPORTING_TOPICS.forEach((item) => add(set, item))

  NIGERIA_LOCATIONS.forEach((location) => {
    add(set, `accounting firm in ${location}`)
    add(set, `bookkeeping firm in ${location}`)
    add(set, `accounting services ${location}`)
    add(set, `bookkeeping services ${location}`)
    add(set, `financial reporting services ${location}`)
    add(set, `management reporting services ${location}`)
    add(set, `CFO advisory services ${location}`)
    add(set, `financial modeling services ${location}`)
    add(set, `payroll services ${location}`)
    add(set, `tax compliance ${location}`)
    add(set, `reporting services ${location}`)
  })

  GLOBAL_LOCATIONS.forEach((location) => {
    add(set, `accounting services ${location}`)
    add(set, `bookkeeping services ${location}`)
    add(set, `financial reporting ${location}`)
    add(set, `management reporting ${location}`)
    add(set, `CFO services ${location}`)
    add(set, `payroll services ${location}`)
    add(set, `tax compliance ${location}`)
    add(set, `reporting services ${location}`)
  })

  INDUSTRIES.forEach((industry) => {
    add(set, `accounting firm for ${industry}`)
    add(set, `bookkeeping for ${industry}`)
    add(set, `financial reporting for ${industry}`)
    add(set, `management reporting for ${industry}`)
    add(set, `CFO advisory for ${industry}`)
    add(set, `financial modeling for ${industry}`)
    add(set, `payroll services for ${industry}`)
    add(set, `tax compliance for ${industry}`)
  })

  AUDIENCES.forEach((audience) => {
    add(set, `accounting services for ${audience}`)
    add(set, `bookkeeping services for ${audience}`)
    add(set, `reporting services for ${audience}`)
    add(set, `CFO advisory for ${audience}`)
    add(set, `tax compliance for ${audience}`)
    add(set, `payroll compliance for ${audience}`)
  })

  SERVICE_FAMILIES.forEach((serviceFamily) => {
    GEO_QUALIFIERS.forEach((qualifier) => {
      add(set, `${serviceFamily} ${qualifier}`)
    })
  })

  SERVICE_FAMILIES.forEach((serviceFamily) => {
    INDUSTRIES.forEach((industry) => {
      add(set, `${serviceFamily} for ${industry}`)
    })
  })

  SOFTWARE.forEach((tool) => {
    add(set, `accounting firm with ${tool} expertise`)
    add(set, `bookkeeping firm with ${tool}`)
    add(set, `${tool} accounting implementation services`)
    add(set, `${tool} bookkeeping support`)
  })

  ;[
    'remote accounting services',
    'remote bookkeeping services',
    'virtual accounting services',
    'virtual bookkeeping services',
    'cloud accounting services',
    'cloud bookkeeping services',
    'cross border accounting services',
    'cross border bookkeeping services',
    'global accounting advisory',
    'international bookkeeping advisory',
    'audit ready accounting services',
    'investor ready accounting services',
    'financial controls advisory',
    'internal controls advisory',
    'finance transformation services',
    'working capital management advisory',
    'liquidity management advisory',
    'cost optimization advisory',
    'profitability advisory services',
    'financial strategy consulting',
    'regulatory compliance services Nigeria',
    'statutory compliance services Nigeria',
    'CAC annual returns filing',
    'tax audit support services',
    'tax risk management services',
    'payroll compliance advisory',
    'payroll audit support',
    'payroll reporting services',
    'payroll reconciliation services',
    'monthly financial reporting services',
    'quarterly financial reporting services',
    'annual financial reporting services',
    'management reporting outsourcing',
    'financial reporting outsourcing',
  ].forEach((item) => add(set, item))

  // Ensure close to the requested 1000-keyword set while remaining maintainable.
  return Array.from(set).slice(0, 1000)
}

export const PRELIMINARY_SEO_KEYWORDS = buildKeywords()
export const PRELIMINARY_SEO_KEYWORDS_CONTENT = PRELIMINARY_SEO_KEYWORDS.join(', ')
