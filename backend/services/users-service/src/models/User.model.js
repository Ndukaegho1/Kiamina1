import mongoose from "mongoose";

const clientProfileSchema = new mongoose.Schema(
  {
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    otherNames: { type: String, default: "" },
    fullName: { type: String, default: "" },
    phoneCountryCode: { type: String, default: "+234" },
    phoneLocalNumber: { type: String, default: "" },
    phone: { type: String, default: "" },
    roleInCompany: { type: String, default: "" },
    language: { type: String, default: "English" },
    address1: { type: String, default: "" },
    address2: { type: String, default: "" },
    city: { type: String, default: "" },
    postalCode: { type: String, default: "" },
    addressCountry: { type: String, default: "Nigeria" }
  },
  { _id: false }
);

const entityProfileSchema = new mongoose.Schema(
  {
    businessType: {
      type: String,
      enum: ["", "individual", "business", "non-profit"],
      default: ""
    },
    businessName: { type: String, default: "" },
    country: { type: String, default: "" },
    currency: { type: String, default: "NGN" },
    industry: { type: String, default: "" },
    industryOther: { type: String, default: "" },
    cacNumber: { type: String, default: "" },
    tin: { type: String, default: "" },
    reportingCycle: { type: String, default: "" },
    startMonth: { type: String, default: "" },
    financialYearEndMonth: { type: String, default: "" },
    financialYearStartMonth: { type: String, default: "" }
  },
  { _id: false }
);

const onboardingSchema = new mongoose.Schema(
  {
    currentStep: { type: Number, default: 1, min: 1 },
    completed: { type: Boolean, default: false },
    skipped: { type: Boolean, default: false },
    verificationPending: { type: Boolean, default: true },
    completedAt: { type: Date, default: null },
    skippedAt: { type: Date, default: null }
  },
  { _id: false }
);

const identityVerificationSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["pending", "submitted", "verified", "rejected"],
      default: "pending"
    },
    idType: { type: String, default: "" },
    idNumber: { type: String, default: "" },
    submittedAt: { type: Date, default: null },
    verifiedAt: { type: Date, default: null },
    locked: { type: Boolean, default: false }
  },
  { _id: false }
);

const businessVerificationSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["pending", "submitted", "verified", "rejected"],
      default: "pending"
    },
    registrationDocumentName: { type: String, default: "" },
    submittedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    locked: { type: Boolean, default: false }
  },
  { _id: false }
);

const verificationSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["pending", "submitted", "verified", "rejected", "suspended"],
      default: "pending"
    },
    profileStepCompleted: { type: Boolean, default: false },
    identityStepCompleted: { type: Boolean, default: false },
    businessStepCompleted: { type: Boolean, default: false },
    stepsCompleted: { type: Number, default: 0, min: 0, max: 3 },
    fullyVerifiedAt: { type: Date, default: null },
    identity: {
      type: identityVerificationSchema,
      default: () => ({})
    },
    business: {
      type: businessVerificationSchema,
      default: () => ({})
    }
  },
  { _id: false }
);

const notificationPreferencesSchema = new mongoose.Schema(
  {
    inAppEnabled: { type: Boolean, default: true },
    soundEnabled: { type: Boolean, default: true },
    documentApproved: { type: Boolean, default: true },
    documentRejected: { type: Boolean, default: true },
    documentInfoRequested: { type: Boolean, default: true },
    verificationUpdates: { type: Boolean, default: true },
    accountSuspended: { type: Boolean, default: true },
    adminMessages: { type: Boolean, default: true },
    emailNewUploads: { type: Boolean, default: true },
    emailApprovals: { type: Boolean, default: true },
    emailWeeklySummary: { type: Boolean, default: true },
    emailSecurityAlerts: { type: Boolean, default: true }
  },
  { _id: false }
);

const clientDashboardSchema = new mongoose.Schema(
  {
    companyName: { type: String, default: "" },
    businessCountry: { type: String, default: "" },
    baseCurrency: { type: String, default: "NGN" },
    defaultLandingPage: { type: String, default: "dashboard" },
    showGreeting: { type: Boolean, default: true },
    compactMode: { type: Boolean, default: false },
    widgets: {
      type: [String],
      default: ["verification", "documents", "notifications", "recent-activity"]
    },
    favoritePages: {
      type: [String],
      default: []
    },
    lastVisitedPage: { type: String, default: "dashboard" },
    lastVisitedAt: { type: Date, default: null }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    uid: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true
    },
    displayName: {
      type: String,
      default: ""
    },
    roles: {
      type: [String],
      default: ["client"]
    },
    status: {
      type: String,
      enum: ["active", "disabled", "suspended"],
      default: "active"
    },
    clientProfile: {
      type: clientProfileSchema,
      default: () => ({})
    },
    entityProfile: {
      type: entityProfileSchema,
      default: () => ({})
    },
    onboarding: {
      type: onboardingSchema,
      default: () => ({})
    },
    verification: {
      type: verificationSchema,
      default: () => ({})
    },
    notificationPreferences: {
      type: notificationPreferencesSchema,
      default: () => ({})
    },
    clientDashboard: {
      type: clientDashboardSchema,
      default: () => ({})
    }
  },
  {
    timestamps: true
  }
);

export const User = mongoose.model("User", userSchema);
