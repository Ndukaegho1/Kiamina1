const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PURPOSES = new Set(["login", "password-reset", "sms-verification", "onboarding"]);

const normalizeString = (value) => String(value ?? "").trim();

const normalizePurpose = (value) => {
  const normalized = normalizeString(value || "login").toLowerCase();
  return PURPOSES.has(normalized) ? normalized : null;
};

export const validateSendOtpPayload = (body) => {
  const email = normalizeString(body?.email).toLowerCase();
  const purpose = normalizePurpose(body?.purpose);
  const errors = [];

  if (!email) {
    errors.push("email is required");
  } else if (!EMAIL_REGEX.test(email)) {
    errors.push("email must be a valid email address");
  }

  if (!purpose) {
    errors.push("purpose must be one of: login, password-reset, sms-verification, onboarding");
  }

  return {
    errors,
    payload: {
      email,
      purpose: purpose || "login"
    }
  };
};

export const validateVerifyOtpPayload = (body) => {
  const email = normalizeString(body?.email).toLowerCase();
  const purpose = normalizePurpose(body?.purpose);
  const otp = normalizeString(body?.otp);
  const errors = [];

  if (!email) {
    errors.push("email is required");
  } else if (!EMAIL_REGEX.test(email)) {
    errors.push("email must be a valid email address");
  }

  if (!purpose) {
    errors.push("purpose must be one of: login, password-reset, sms-verification, onboarding");
  }

  if (!otp) {
    errors.push("otp is required");
  } else if (!/^\d{4,8}$/.test(otp)) {
    errors.push("otp must be 4 to 8 digits");
  }

  return {
    errors,
    payload: {
      email,
      purpose: purpose || "login",
      otp
    }
  };
};

export const validateVerifyTokenPayload = (body) => {
  const idToken = normalizeString(body?.idToken);
  if (!idToken) {
    return {
      error: "idToken is required"
    };
  }

  if (idToken.length < 20) {
    return {
      error: "idToken format appears invalid"
    };
  }

  return {
    idToken
  };
};
