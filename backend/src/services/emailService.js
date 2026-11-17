import nodemailer from 'nodemailer';
import config from '../config/index.js';
import logger from '../utils/logger.js';

let transporter = null;

function getTransporter() {
  if (!transporter && config.smtp.host && config.smtp.user) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }
  return transporter;
}

export async function sendEmail({ to, subject, html, text }) {
  const transport = getTransporter();
  if (!transport) {
    logger.warn('Email not configured, skipping send to:', to);
    return { skipped: true };
  }

  try {
    const info = await transport.sendMail({
      from: config.smtp.from,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ''),
    });
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error('Email send failed:', error.message);
    throw error;
  }
}

export async function sendWelcomeEmail(user, temporaryPassword) {
  return sendEmail({
    to: user.email,
    subject: `Welcome to ${config.app.name}`,
    html: `
      <h2>Welcome, ${user.first_name}!</h2>
      <p>Your account has been created on the ${config.app.name}.</p>
      <p><strong>Email:</strong> ${user.email}</p>
      <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
      <p>Please login and change your password immediately.</p>
      <p><a href="${config.app.url}/login">Login to Portal</a></p>
    `,
  });
}

export async function sendPasswordResetEmail(user, newPassword) {
  return sendEmail({
    to: user.email,
    subject: `Your ${config.app.name} password has been reset`,
    html: `
      <h2>Password Reset</h2>
      <p>An administrator has approved your password reset request and set a new password for your account.</p>
      <p><strong>Email:</strong> ${user.email}</p>
      <p><strong>New Password:</strong> ${newPassword}</p>
      <p>Please login and change your password immediately.</p>
      <p><a href="${config.app.url}/login">Login to Portal</a></p>
    `,
  });
}

export async function sendPasswordResetRejectedEmail(user, reason) {
  return sendEmail({
    to: user.email,
    subject: `Your ${config.app.name} password reset request was rejected`,
    html: `
      <h2>Password Reset Request Rejected</h2>
      <p>Your request to reset your password was reviewed and rejected by an administrator.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      <p>Contact your administrator if you believe this is a mistake.</p>
    `,
  });
}

export async function sendLeaveStatusEmail(user, leave, status) {
  return sendEmail({
    to: user.email,
    subject: `Leave Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    html: `
      <h2>Leave Request Update</h2>
      <p>Your leave request from ${leave.start_date} to ${leave.end_date} has been <strong>${status}</strong>.</p>
      ${leave.admin_remarks ? `<p><strong>Remarks:</strong> ${leave.admin_remarks}</p>` : ''}
    `,
  });
}

export async function sendCertificateEmail(user, certificate) {
  return sendEmail({
    to: user.email,
    subject: `Certificate Issued - ${certificate.certificate_number}`,
    html: `
      <h2>Certificate Issued</h2>
      <p>A new certificate has been issued to you.</p>
      <p><strong>Certificate No:</strong> ${certificate.certificate_number}</p>
      <p><strong>Type:</strong> ${certificate.type}</p>
      <p>Login to the portal to view and download your certificate.</p>
    `,
  });
}

export async function sendNotificationEmail(user, notification) {
  return sendEmail({
    to: user.email,
    subject: notification.title,
    html: `<p>${notification.message}</p>`,
  });
}
