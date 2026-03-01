// Mock Data
export const expensesData = [
  { id: 1, status: 'Ready', user: 'John Doe', date: 'Feb 24, 2026', vendor: 'Shell Petroleum', category: 'Fuel', amount: '\u20A6245,000' },
  { id: 2, status: 'To Review', user: 'Sarah Smith', date: 'Feb 23, 2026', vendor: 'Amazon Web Services', category: 'Software', amount: '\u20A6890,000' },
  { id: 3, status: 'Processing', user: 'Mike Johnson', date: 'Feb 22, 2026', vendor: 'Lagos Electric', category: 'Utilities', amount: '\u20A6156,500' },
  { id: 4, status: 'Ready', user: 'John Doe', date: 'Feb 21, 2026', vendor: 'Dangote Cement', category: 'Materials', amount: '\u20A61,250,000' },
  { id: 5, status: 'Ready', user: 'Sarah Smith', date: 'Feb 20, 2026', vendor: 'Travel Agency Ltd', category: 'Travel', amount: '\u20A6320,000' },
  { id: 6, status: 'To Review', user: 'Mike Johnson', date: 'Feb 19, 2026', vendor: 'Office Supplies Co', category: 'Office', amount: '\u20A687,500' },
  { id: 7, status: 'Ready', user: 'John Doe', date: 'Feb 18, 2026', vendor: 'GTBank', category: 'Banking', amount: '\u20A612,500' },
]

export const salesData = [
  { id: 1, status: 'Ready', customer: 'Tech Solutions Ltd', invoice: 'INV-2026-0042', date: 'Feb 24, 2026', category: 'Consulting', amount: '\u20A62,500,000' },
  { id: 2, status: 'Processing', customer: 'Global Ventures', invoice: 'INV-2026-0041', date: 'Feb 23, 2026', category: 'Services', amount: '\u20A6890,000' },
  { id: 3, status: 'Ready', customer: 'Alpha Industries', invoice: 'INV-2026-0040', date: 'Feb 22, 2026', category: 'Products', amount: '\u20A65,750,000' },
  { id: 4, status: 'To Review', customer: 'Beta Corporation', invoice: 'INV-2026-0039', date: 'Feb 21, 2026', category: 'Consulting', amount: '\u20A61,200,000' },
  { id: 5, status: 'Ready', customer: 'Delta Enterprises', invoice: 'INV-2026-0038', date: 'Feb 20, 2026', category: 'Services', amount: '\u20A63,400,000' },
  { id: 6, status: 'Ready', customer: 'Omega Holdings', invoice: 'INV-2026-0037', date: 'Feb 19, 2026', category: 'Products', amount: '\u20A68,900,000' },
  { id: 7, status: 'Processing', customer: 'Sigma Group', invoice: 'INV-2026-0036', date: 'Feb 18, 2026', category: 'Consulting', amount: '\u20A61,850,000' },
]

export const bankData = [
  { id: 1, date: 'Feb 24, 2026', ref: 'TRF/001247', description: 'Transfer from Tech Solutions Ltd', debit: '-', credit: '\u20A62,500,000', balance: '\u20A645,230,000', status: 'Ready' },
  { id: 2, date: 'Feb 24, 2026', ref: 'CHQ/002891', description: 'Payment to Shell Petroleum', debit: '\u20A6245,000', credit: '-', balance: '\u20A642,730,000', status: 'Ready' },
  { id: 3, date: 'Feb 23, 2026', ref: 'TRF/001246', description: 'AWS Monthly Subscription', debit: '\u20A6890,000', credit: '-', balance: '\u20A642,975,000', status: 'To Review' },
  { id: 4, date: 'Feb 23, 2026', ref: 'TRF/001245', description: 'Transfer from Global Ventures', debit: '-', credit: '\u20A6890,000', balance: '\u20A643,865,000', status: 'Processing' },
  { id: 5, date: 'Feb 22, 2026', ref: 'DEB/000456', description: 'DSTV Subscription', debit: '\u20A634,500', credit: '-', balance: '\u20A642,975,000', status: 'Ready' },
  { id: 6, date: 'Feb 22, 2026', ref: 'TRF/001244', description: 'Transfer from Alpha Industries', debit: '-', credit: '\u20A65,750,000', balance: '\u20A643,009,500', status: 'Ready' },
  { id: 7, date: 'Feb 21, 2026', ref: 'CHQ/002890', description: 'Dangote Cement - Materials', debit: '\u20A61,250,000', credit: '-', balance: '\u20A637,259,500', status: 'Ready' },
  { id: 8, date: 'Feb 21, 2026', ref: 'TRF/001243', description: 'Transfer from Beta Corporation', debit: '-', credit: '\u20A61,200,000', balance: '\u20A638,509,500', status: 'To Review' },
]

export const uploadHistoryData = [
  { id: 1, filename: 'Expense_Report_Feb2026.pdf', type: 'PDF', category: 'Expense', date: 'Feb 24, 2026 10:30 AM', user: 'John Doe', status: 'Approved' },
  { id: 2, filename: 'Sales_Data_Jan2026.xlsx', type: 'XLSX', category: 'Sales', date: 'Feb 23, 2026 2:15 PM', user: 'Sarah Smith', status: 'Approved' },
  { id: 3, filename: 'Bank_Statement_GTB_Feb2026.pdf', type: 'PDF', category: 'Bank Statement', date: 'Feb 22, 2026 9:45 AM', user: 'Mike Johnson', status: 'Pending Review' },
  { id: 4, filename: 'Transactions_Export.csv', type: 'CSV', category: 'Bank Statement', date: 'Feb 21, 2026 4:20 PM', user: 'John Doe', status: 'Approved' },
  { id: 5, filename: 'Invoice_Template.docx', type: 'DOCX', category: 'Sales', date: 'Feb 20, 2026 11:00 AM', user: 'Sarah Smith', status: 'Rejected' },
  { id: 6, filename: 'Receipt_Scanned_0042.pdf', type: 'PDF', category: 'Expense', date: 'Feb 19, 2026 3:30 PM', user: 'Mike Johnson', status: 'Approved' },
  { id: 7, filename: 'Budget_Analysis_2026.xlsx', type: 'XLSX', category: 'Sales', date: 'Feb 18, 2026 8:15 AM', user: 'John Doe', status: 'Pending Review' },
]

export const expenseDocumentSeed = [
  { id: 1, fileId: 'EXP-001', filename: 'Expense_Report_Jan2026.pdf', user: 'John Doe', date: 'Feb 24, 2026 10:30 AM', status: 'Approved' },
  { id: 2, fileId: 'EXP-002', filename: 'Fuel_Receipts.pdf', user: 'Sarah Smith', date: 'Feb 23, 2026 2:15 PM', status: 'Pending Review' },
  { id: 3, fileId: 'EXP-003', filename: 'Office_Supplies.xlsx', user: 'Mike Johnson', date: 'Feb 22, 2026 9:45 AM', status: 'Approved' },
  { id: 4, fileId: 'EXP-004', filename: 'Travel_Expenses.pdf', user: 'John Doe', date: 'Feb 21, 2026 4:20 PM', status: 'Rejected' },
  { id: 5, fileId: 'EXP-005', filename: 'Utilities_Bill.pdf', user: 'Sarah Smith', date: 'Feb 20, 2026 11:00 AM', status: 'Pending Review' },
]

export const salesDocumentSeed = [
  { id: 1, fileId: 'SAL-001', filename: 'Sales_Report_Jan2026.xlsx', user: 'John Doe', date: 'Feb 24, 2026 10:30 AM', status: 'Approved' },
  { id: 2, fileId: 'SAL-002', filename: 'Invoice_001.pdf', user: 'Sarah Smith', date: 'Feb 23, 2026 2:15 PM', status: 'Pending Review' },
  { id: 3, fileId: 'SAL-003', filename: 'Revenue_Data.xlsx', user: 'Mike Johnson', date: 'Feb 22, 2026 9:45 AM', status: 'Approved' },
  { id: 4, fileId: 'SAL-004', filename: 'Client_Payments.pdf', user: 'John Doe', date: 'Feb 21, 2026 4:20 PM', status: 'Rejected' },
  { id: 5, fileId: 'SAL-005', filename: 'Sales_Analysis.xlsx', user: 'Sarah Smith', date: 'Feb 20, 2026 11:00 AM', status: 'Pending Review' },
]

export const bankStatementDocumentSeed = [
  { id: 1, fileId: 'BNK-001', filename: 'GTBank_Statement_Jan2026.pdf', user: 'John Doe', date: 'Feb 24, 2026 10:30 AM', status: 'Approved' },
  { id: 2, fileId: 'BNK-002', filename: 'Zenith_Statement_Feb2026.pdf', user: 'Sarah Smith', date: 'Feb 23, 2026 2:15 PM', status: 'Pending Review' },
  { id: 3, fileId: 'BNK-003', filename: 'Access_Statement_Q1.pdf', user: 'Mike Johnson', date: 'Feb 22, 2026 9:45 AM', status: 'Approved' },
  { id: 4, fileId: 'BNK-004', filename: 'UBA_Statement_2026-02.pdf', user: 'John Doe', date: 'Feb 21, 2026 4:20 PM', status: 'Rejected' },
]

export const INDUSTRY_OPTIONS = [
  'Oil & Gas', 'Technology', 'Fintech', 'Healthcare', 'Pharmaceuticals',
  'Education', 'Real Estate', 'Construction', 'Maritime', 'Logistics',
  'Manufacturing', 'Retail', 'E-commerce', 'Professional Services', 'Consulting',
  'Legal Services', 'Accounting & Finance', 'Media & Entertainment', 'Hospitality',
  'Agriculture', 'Non-Governmental Organization', 'Public Sector', 'Telecommunications',
  'Energy', 'Transportation', 'Mining', 'Insurance', 'Banking', 'Digital Marketing',
  'Creative Services', 'Food & Beverage', 'Automotive', 'Aviation',
  'Government Contracting', 'Renewable Energy', 'Import & Export', 'Security Services',
  'Waste Management', 'Research & Development', 'Others'
]


