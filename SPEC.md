# Kiamina Accounting Services - Enterprise Dashboard Specification

## 1. Project Overview

**Project Name:** Kiamina Accounting Services Dashboard  
**Project Type:** Enterprise Web Application (Single Page Application)  
**Core Functionality:** Professional accounting dashboard for managing expenses, sales, bank statements, and document uploads  
**Target Users:** Business owners, finance managers, auditors, accounting professionals

---

## 2. UI/UX Specification

### 2.1 Layout Structure

**Overall Layout:**
- Full-screen dashboard layout
- Fixed left sidebar (260px width)
- Main content workspace (fluid width, calc(100% - 260px))
- Top utility bar inside main content (56px height)

**Page Sections:**
- Left Sidebar: Logo, client name, region selector, primary navigation
- Main Content: Top bar with search, notifications, profile; page content area
- Modal: Centered overlay for Add Document functionality

**Responsive Behavior:**
- Desktop-first design (1200px+)
- Tablet adaptation (768px-1199px)
- Mobile sidebar collapse (< 768px)

### 2.2 Visual Design

**Color Palette:**
- Primary Brand: `#153585` (Deep corporate blue)
- Primary Light: `#1E4499`
- Primary Dark: `#0F244D`
- Background: `#F4F5F7` (Light neutral)
- Sidebar Background: `#FFFFFF`
- Card Background: `#FFFFFF`
- Text Primary: `#1A1D21`
- Text Secondary: `#5E6368`
- Text Muted: `#8A8F94`
- Border: `#E3E5E8`
- Border Light: `#F0F1F2`
- Success: `#0D7D4D`
- Warning: `#B86E00`
- Error: `#C92A2A`
- Info: `#153585`

**Status Badge Colors:**
- Ready: `#E8F5EE` background, `#0D7D4D` text
- To Review: `#FFF4E5` background, `#B86E00` text
- Processing: `#E8EEFF` background, `#153585` text

**Typography:**
- Primary Font: 'Helvetica Neue', Helvetica, Arial, sans-serif
- Heading 1: 24px, 600 weight
- Heading 2: 20px, 600 weight
- Heading 3: 16px, 600 weight
- Body: 14px, 400 weight
- Small: 12px, 400 weight
- Uppercase Label: 11px, 500 weight, letter-spacing: 0.5px

**Spacing System:**
- Base unit: 4px
- XS: 4px
- SM: 8px
- MD: 16px
- LG: 24px
- XL: 32px
- XXL: 48px

**Visual Effects:**
- Card Shadow: `0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)`
- Card Hover Shadow: `0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)`
- Border Radius: 8px (cards), 6px (buttons), 4px (inputs/badges)
- Transitions: 150ms ease-in-out

### 2.3 Components

**Sidebar:**
- Logo area: 60px height, centered
- Client info: 48px height, padding 16px
- Region selector: Dropdown with flag
- Navigation items: 44px height, 16px horizontal padding
- Active state: `#153585` background tint (8%), left border 3px
- Hover state: Background `#F4F5F7`

**Top Utility Bar:**
- Height: 56px
- Background: `#FFFFFF`
- Border bottom: 1px solid `#E3E5E8`
- Search input: 280px width, 36px height
- Notification icon: 36px circular, icon only
- Profile dropdown: Avatar + name

**Statistics Cards:**
- Height: 120px
- Padding: 20px
- Icon: 40px circular, light background
- Number: 28px, 600 weight
- Label: 11px, 500 weight, uppercase, `#5E6368`

**Data Tables:**
- Header row: Background `#F9FAFB`, font-weight 600
- Row height: 52px
- Row hover: Background `#F9FAFB`
- Cell padding: 12px 16px
- Amount alignment: Right
- Checkbox: 16px, centered

**Buttons:**
- Primary: Background `#153585`, text white, height 36px
- Secondary: Background white, border `#E3E5E8`, text `#1A1D21`, height 36px
- Icon button: 36px circular, transparent background
- Hover: Darken background 10%

**Modal:**
- Overlay: Background rgba(0, 0, 0, 0.5)
- Modal width: 520px
- Background: white
- Border radius: 12px
- Header: 56px height, border bottom
- Content padding: 24px

**Status Badges:**
- Height: 24px
- Padding: 0 10px
- Border radius: 4px
- Font size: 12px, font-weight 500

---

## 3. Functionality Specification

### 3.1 Navigation

**Sidebar Navigation Items:**
1. Dashboard Overview (default active)
2. Expenses
3. Sales
4. Bank Statements
5. Divider
6. Upload History
7. Settings
8. Logout

**Page Routing:**
- Single page application with JavaScript navigation
- URL hash-based routing (#dashboard, #expenses, #sales, #bank-statements, #upload-history)
- Smooth transitions between pages

### 3.2 Dashboard Overview Page

**Statistics Section:**
- Two chart panels side by side
- Financial Activity Overview: Combined line/area chart for Expenses, Sales, Bank Statements
- Upload Activity: Bar chart showing document uploads over time

**Summary Cards (4 cards):**
1. Total Expenses: ₦45,230,000 (with upward trend indicator)
2. Total Sales: ₦128,750,000 (with upward trend indicator)
3. Bank Statement Entries: 1,247
4. Documents Uploaded: 342

### 3.3 Expenses Page

**Header:**
- Title: "Expenses"
- Right: Add Document button

**Table Columns:**
- Checkbox (selection)
- Status (Ready/To Review/Processing badge)
- User (name)
- Date (formatted)
- Vendor (name)
- Category (dropdown value)
- Amount (right-aligned, formatted currency)
- Action (view button)

**Features:**
- Sortable columns
- Search/filter functionality
- Bulk selection

### 3.4 Sales Page

**Table Columns:**
- Checkbox (selection)
- Status (Ready/To Review/Processing badge)
- Customer (name)
- Invoice Number
- Date (formatted)
- Category (dropdown value)
- Amount (right-aligned, formatted currency)
- Action (view button)

### 3.5 Bank Statements Page

**Header:**
- Title: "Bank Statements"
- Right: Add Document button

**Table Columns:**
- Date
- Reference
- Description
- Debit (right-aligned)
- Credit (right-aligned)
- Balance (right-aligned, bold)
- Status (badge)

### 3.6 Upload History Page

**Table Columns:**
- File Name (with icon based on type)
- File Type (extension)
- Category (Expense/Sales/Bank Statement)
- Upload Date
- Uploaded By
- Status (badge)

### 3.7 Add Document Modal

**Trigger:** Add Document button on Expenses, Sales, Bank Statements pages

**Modal Structure:**
1. Header: "Add Document" + Close button
2. Category Selection: Three cards for Expenses, Sales, Bank Statements
3. Upload Area: Drag-and-drop zone with file input
4. Helper text: "All file types supported."

**Interactions:**
- Click category to select (visual highlight)
- Drag files to upload zone
- Click to open file browser
- Selected files show in list
- Upload button to submit

---

## 4. Acceptance Criteria

### 4.1 Visual Checkpoints

- [ ] Sidebar is fixed, 260px wide, white background
- [ ] Brand color #153585 is used consistently for primary elements
- [ ] All cards have subtle shadows and 8px border radius
- [ ] Typography uses Helvetica Neue/Helvetica/Arial
- [ ] Background is light neutral (#F4F5F7)
- [ ] Spacing is generous and consistent
- [ ] Active navigation has brand color background tint and left border
- [ ] Status badges use correct colors for each status type
- [ ] Tables have proper alignment (amounts right-aligned)
- [ ] Modal is centered with overlay

### 4.2 Functional Checkpoints

- [ ] All navigation items work and show correct page
- [ ] Charts render on Dashboard Overview
- [ ] Statistics cards display with proper formatting
- [ ] Data tables render with all columns
- [ ] Add Document modal opens from correct pages
- [ ] Category selection works in modal
- [ ] Drag-and-drop area is functional
- [ ] Page transitions are smooth

### 4.3 Professional Standards

- [ ] No startup/consumer app aesthetic
- [ ] Feels like enterprise accounting software
- [ ] Communicates financial control and data integrity
- [ ] Clean, structured, audit-ready appearance
- [ ] No flashy gradients or excessive colors
- [ ] Minimal, professional design language
