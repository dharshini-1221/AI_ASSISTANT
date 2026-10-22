
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: Number(process.env.EMAIL_PORT) === 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Escape user-controlled values before inserting into HTML
const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[char];
  });

const sendVerificationEmail = async (email, name, verificationToken) => {
  const verificationUrl =
    `${process.env.CLIENT_URL}/verify-email?token=${encodeURIComponent(verificationToken)}`;

  const safeName = escapeHtml(name);

  await transporter.sendMail({
    from: `"AI Mock Interview" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: "Verify your AI Mock Interview account",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px;border:1px solid #ddd;border-radius:12px;">
        <h2 style="color:#2563eb;">Welcome to AI Mock Interview, ${safeName}!</h2>
        <p>Thank you for creating your account.</p>
        <p>Please verify your email address using the button below.</p>
        <p style="margin:30px 0;">
          <a href="${verificationUrl}" style="background:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;">
            Verify Email
          </a>
        </p>
        <p>This verification link expires in <strong>15 minutes</strong>.</p>
        <p style="color:#666;font-size:13px;">If you did not create this account, ignore this email.</p>
      </div>
    `,
  });
};

// Suspicious login alert
const sendSuspiciousLoginAlert = async (
  email,
  name,
  ipAddress,
  device
) => {
  const safeName = escapeHtml(name);
  const safeIp = escapeHtml(ipAddress || "Unknown");
  const safeDevice = escapeHtml(device || "Unknown");

  await transporter.sendMail({
    from: `"AI Mock Interview" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: "Security Alert: New Login Detected",
    text: `Hi ${name || "User"}, a login from a new device or location was detected.

IP Address: ${ipAddress || "Unknown"}
Device: ${device || "Unknown"}

If this wasn't you, change your password immediately and review your active sessions.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #ddd;border-radius:12px;">
        <h2 style="color:#dc2626;">Security Alert: New Login</h2>
        <p>Hi ${safeName || "User"},</p>
        <p>A login from a new device or location was detected on your account.</p>
        <p><strong>IP Address:</strong> ${safeIp}</p>
        <p><strong>Device:</strong> ${safeDevice}</p>
        <p>If this wasn't you, change your password immediately and review your active sessions.</p>
      </div>
    `,
  });
};

// Password changed alert
const sendPasswordChangedAlert = async (email, name) => {
  const safeName = escapeHtml(name || "User");

  await transporter.sendMail({
    from: `"AI Mock Interview" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: "Security Alert: Password Changed",
    text: `Hi ${name || "User"}, your account password was changed. If you did not make this change, reset your password and review your active sessions immediately.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #ddd;border-radius:12px;">
        <h2 style="color:#dc2626;">Password Changed</h2>
        <p>Hi ${safeName},</p>
        <p>Your account password was changed successfully.</p>
        <p>If you did not make this change, reset your password and review your active sessions immediately.</p>
      </div>
    `,
  });
};

module.exports = {
  sendVerificationEmail,
  sendSuspiciousLoginAlert,
  sendPasswordChangedAlert,
};
