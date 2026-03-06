import { Resend } from "resend";

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "eSeller Store Bay <noreply@Essbyebay.com>";
const ADMIN_EMAIL = "admin@Essbyebay.com";
const SITE_NAME = "eSeller Store Bay";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://essbyebay.com";

// ─── Email wrapper ────────────────────────────────────────────
async function sendEmail({
  to,
  subject,
  html,
  replyTo,
}: {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      replyTo: replyTo || ADMIN_EMAIL,
    });

    if (error) {
      console.error("[Email Error]", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.error("[Email Exception]", err);
    return { success: false, error: "Failed to send email" };
  }
}

// ─── Shared HTML layout ──────────────────────────────────────
function emailLayout(content: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;margin-top:24px;margin-bottom:24px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
    <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:28px 32px;text-align:center">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px">${SITE_NAME}</h1>
    </div>
    <div style="padding:32px">
      ${content}
    </div>
    <div style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center">
      <p style="margin:0;color:#9ca3af;font-size:12px">&copy; ${new Date().getFullYear()} ${SITE_NAME}. All rights reserved.</p>
      <p style="margin:4px 0 0;color:#9ca3af;font-size:12px">
        <a href="${SITE_URL}" style="color:#6366f1;text-decoration:none">${SITE_URL}</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function button(text: string, url: string) {
  return `<a href="${url}" style="display:inline-block;background:#4f46e5;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin:16px 0">${text}</a>`;
}

// ─── Welcome email ───────────────────────────────────────────
export async function sendWelcomeEmail(to: string, name: string) {
  return sendEmail({
    to,
    subject: `Welcome to ${SITE_NAME}!`,
    html: emailLayout(`
      <h2 style="margin:0 0 16px;color:#111827;font-size:20px">Welcome, ${name}! 🎉</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">
        Thank you for joining <strong>${SITE_NAME}</strong>. We're excited to have you on board!
      </p>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">
        Start exploring our marketplace with thousands of products from verified sellers.
      </p>
      ${button("Start Shopping", SITE_URL)}
      <p style="color:#9ca3af;font-size:13px;margin:16px 0 0">If you have any questions, reply to this email or contact our support team.</p>
    `),
  });
}

// ─── Account suspended ────────────────────────────────────────
export async function sendAccountSuspendedEmail(to: string, name: string, reason?: string) {
  return sendEmail({
    to,
    subject: `Account Suspended – ${SITE_NAME}`,
    html: emailLayout(`
      <h2 style="margin:0 0 16px;color:#111827;font-size:20px">Account Suspended</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">
        Hi ${name}, your account on <strong>${SITE_NAME}</strong> has been suspended by an administrator.
      </p>
      ${reason ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:0 0 16px"><p style="margin:0;color:#991b1b;font-size:14px"><strong>Reason:</strong> ${reason}</p></div>` : ""}
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">
        If you believe this is a mistake, please contact our support team for assistance.
      </p>
      ${button("Contact Support", `${SITE_URL}/support-policy`)}
    `),
  });
}

// ─── Account restored ─────────────────────────────────────────
export async function sendAccountRestoredEmail(to: string, name: string) {
  return sendEmail({
    to,
    subject: `Account Restored – ${SITE_NAME}`,
    html: emailLayout(`
      <h2 style="margin:0 0 16px;color:#111827;font-size:20px">Account Restored ✅</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">
        Hi ${name}, great news! Your account on <strong>${SITE_NAME}</strong> has been restored and is now active again.
      </p>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">
        You can now log in and continue using all features of the platform.
      </p>
      ${button("Log In Now", `${SITE_URL}/users/login`)}
    `),
  });
}

// ─── Role changed ─────────────────────────────────────────────
export async function sendRoleChangedEmail(to: string, name: string, newRole: string) {
  const roleLabels: Record<string, string> = {
    customer: "Customer",
    seller: "Seller",
    admin: "Administrator",
  };
  return sendEmail({
    to,
    subject: `Account Role Updated – ${SITE_NAME}`,
    html: emailLayout(`
      <h2 style="margin:0 0 16px;color:#111827;font-size:20px">Role Updated</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">
        Hi ${name}, your account role on <strong>${SITE_NAME}</strong> has been updated to <strong>${roleLabels[newRole] || newRole}</strong>.
      </p>
      ${newRole === "seller" ? `<p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">You can now create your shop and start selling products on our marketplace!</p>${button("Create Your Shop", `${SITE_URL}/shop/create`)}` : ""}
      ${newRole === "customer" ? `${button("Continue Shopping", SITE_URL)}` : ""}
    `),
  });
}

// ─── Shop verified ────────────────────────────────────────────
export async function sendShopVerifiedEmail(to: string, sellerName: string, shopName: string) {
  return sendEmail({
    to,
    subject: `Shop Verified! – ${SITE_NAME}`,
    html: emailLayout(`
      <h2 style="margin:0 0 16px;color:#111827;font-size:20px">Shop Verified! 🎊</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">
        Congratulations ${sellerName}! Your shop <strong>"${shopName}"</strong> has been verified on <strong>${SITE_NAME}</strong>.
      </p>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">
        Your shop now has a verified badge and will appear higher in search results. Start adding products to grow your business!
      </p>
      ${button("Go to Dashboard", `${SITE_URL}/seller`)}
    `),
  });
}

// ─── Shop unverified ──────────────────────────────────────────
export async function sendShopUnverifiedEmail(to: string, sellerName: string, shopName: string) {
  return sendEmail({
    to,
    subject: `Shop Verification Removed – ${SITE_NAME}`,
    html: emailLayout(`
      <h2 style="margin:0 0 16px;color:#111827;font-size:20px">Verification Removed</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">
        Hi ${sellerName}, the verification status for your shop <strong>"${shopName}"</strong> has been removed.
      </p>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">
        Please ensure your shop complies with our marketplace policies. Contact support if you need assistance with re-verification.
      </p>
      ${button("Contact Support", `${SITE_URL}/support-policy`)}
    `),
  });
}

// ─── Order confirmation ───────────────────────────────────────
export async function sendOrderConfirmationEmail(opts: {
  to: string;
  customerName: string;
  orderId: string;
  items: { title: string; quantity: number; price: number }[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
}) {
  const { to: recipient, customerName, orderId, items, subtotal, tax, shipping, total } = opts;
  const itemRows = items.map(i => `<tr><td style="padding:6px 0;border-bottom:1px solid #f3f4f6;color:#374151;font-size:13px">${i.title}</td><td style="padding:6px 0;border-bottom:1px solid #f3f4f6;text-align:center;color:#6b7280;font-size:13px">${i.quantity}</td><td style="padding:6px 0;border-bottom:1px solid #f3f4f6;text-align:right;color:#374151;font-size:13px">$${(i.price * i.quantity).toFixed(2)}</td></tr>`).join("");
  return sendEmail({
    to: recipient,
    subject: `Order Confirmed #${orderId.slice(0, 8).toUpperCase()} – ${SITE_NAME}`,
    html: emailLayout(`
      <h2 style="margin:0 0 16px;color:#111827;font-size:20px">Order Confirmed! 🛒</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">Hi ${customerName}, thank you for your order!</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:0 0 16px">
        <p style="margin:0 0 8px;color:#166534;font-size:14px"><strong>Order ID:</strong> #${orderId.slice(0, 8).toUpperCase()}</p>
        <p style="margin:0;color:#166534;font-size:14px"><strong>Items:</strong> ${items.length} item${items.length > 1 ? "s" : ""}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;margin:0 0 16px">
        <thead><tr><th style="text-align:left;padding:8px 0;border-bottom:2px solid #e5e7eb;color:#6b7280;font-size:12px;text-transform:uppercase">Item</th><th style="text-align:center;padding:8px 0;border-bottom:2px solid #e5e7eb;color:#6b7280;font-size:12px">Qty</th><th style="text-align:right;padding:8px 0;border-bottom:2px solid #e5e7eb;color:#6b7280;font-size:12px">Total</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div style="background:#f9fafb;border-radius:8px;padding:12px 16px;margin:0 0 16px">
        <div style="display:flex;justify-content:space-between;font-size:13px;color:#6b7280;margin-bottom:4px"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:13px;color:#6b7280;margin-bottom:4px"><span>Tax</span><span>$${tax.toFixed(2)}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:13px;color:#6b7280;margin-bottom:4px"><span>Shipping</span><span>${shipping > 0 ? '$' + shipping.toFixed(2) : 'Free'}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:700;color:#111827;border-top:1px solid #e5e7eb;padding-top:8px;margin-top:4px"><span>Total</span><span>$${total.toFixed(2)}</span></div>
      </div>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">We'll notify you when your order ships.</p>
      ${button("Track Your Order", `${SITE_URL}/track-your-order`)}
    `),
  });
}

// ─── Order status update ──────────────────────────────────────
export async function sendOrderStatusEmail(opts: {
  to: string;
  customerName: string;
  orderId: string;
  status: string;
  total?: number;
}) {
  const { to, customerName: name, orderId, status } = opts;
  const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
    processing: { label: "Processing", color: "#1d4ed8", bg: "#eff6ff" },
    shipped: { label: "Shipped", color: "#b45309", bg: "#fffbeb" },
    delivered: { label: "Delivered", color: "#15803d", bg: "#f0fdf4" },
    cancelled: { label: "Cancelled", color: "#b91c1c", bg: "#fef2f2" },
    refunded: { label: "Refunded", color: "#7c3aed", bg: "#f5f3ff" },
  };
  const s = statusLabels[status] || { label: status, color: "#374151", bg: "#f9fafb" };

  return sendEmail({
    to,
    subject: `Order ${s.label} #${orderId.slice(0, 8).toUpperCase()} – ${SITE_NAME}`,
    html: emailLayout(`
      <h2 style="margin:0 0 16px;color:#111827;font-size:20px">Order ${s.label}</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">Hi ${name}, your order status has been updated.</p>
      <div style="background:${s.bg};border-radius:8px;padding:16px;margin:0 0 16px;text-align:center">
        <p style="margin:0;color:${s.color};font-size:16px;font-weight:600">${s.label}</p>
        <p style="margin:4px 0 0;color:${s.color};font-size:13px">Order #${orderId.slice(0, 8).toUpperCase()}</p>
      </div>
      ${button("View Order Details", `${SITE_URL}/track-your-order`)}
    `),
  });
}

// ─── Admin notification for new user signup ───────────────────
export async function sendAdminNewUserNotification(userName: string, userEmail: string, role: string) {
  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `New ${role} Registration – ${userName}`,
    html: emailLayout(`
      <h2 style="margin:0 0 16px;color:#111827;font-size:20px">New User Registration</h2>
      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin:0 0 16px">
        <p style="margin:0 0 8px;color:#0c4a6e;font-size:14px"><strong>Name:</strong> ${userName}</p>
        <p style="margin:0 0 8px;color:#0c4a6e;font-size:14px"><strong>Email:</strong> ${userEmail}</p>
        <p style="margin:0;color:#0c4a6e;font-size:14px"><strong>Role:</strong> ${role}</p>
      </div>
      ${button("View in Admin Panel", `${SITE_URL}/admin/users`)}
    `),
  });
}

// ─── Custom/bulk email from admin ─────────────────────────────
export async function sendCustomEmail(to: string | string[], subject: string, message: string) {
  return sendEmail({
    to,
    subject,
    html: emailLayout(`
      <div style="color:#4b5563;font-size:15px;line-height:1.8">${message.replace(/\n/g, "<br/>")}</div>
    `),
  });
}

// ─── Review deleted notification ──────────────────────────────
export async function sendReviewDeletedEmail(
  to: string,
  name: string,
  productTitle: string,
  reason?: string
) {
  return sendEmail({
    to,
    subject: `Review Removed – ${SITE_NAME}`,
    html: emailLayout(`
      <h2 style="margin:0 0 16px;color:#111827;font-size:20px">Review Removed</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">
        Hi ${name}, your review for <strong>"${productTitle}"</strong> has been removed by our moderation team.
      </p>
      ${reason ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:0 0 16px"><p style="margin:0;color:#991b1b;font-size:14px"><strong>Reason:</strong> ${reason}</p></div>` : ""}
      <p style="color:#9ca3af;font-size:13px;margin:16px 0 0">If you believe this was a mistake, please contact support.</p>
    `),
  });
}

export { sendEmail, emailLayout, SITE_NAME, SITE_URL, ADMIN_EMAIL, FROM_EMAIL };

// ─── Seller application submitted ─────────────────────────────
export async function sendSellerApplicationEmail(to: string, sellerName: string, shopName: string) {
  return sendEmail({
    to,
    subject: `Seller Application Received – ${SITE_NAME}`,
    html: emailLayout(`
      <h2 style="margin:0 0 16px;color:#111827;font-size:20px">Application Received! 🎯</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">
        Hi ${sellerName}, thank you for applying to become a seller on <strong>${SITE_NAME}</strong>!
      </p>
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:0 0 16px">
        <p style="margin:0 0 8px;color:#1e40af;font-size:14px"><strong>Shop Name:</strong> ${shopName}</p>
        <p style="margin:0;color:#1e40af;font-size:14px"><strong>Status:</strong> Under Review</p>
      </div>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">
        Our team will review your application and verify your shop. You'll receive an email once your shop is approved.
      </p>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">
        In the meantime, you can access your seller dashboard to start setting up your products.
      </p>
      ${button("Go to Seller Dashboard", `${SITE_URL}/seller/dashboard`)}
    `),
  });
}

// ─── Admin notification for new shop application ──────────────
export async function sendAdminNewShopNotification(sellerName: string, sellerEmail: string, shopName: string) {
  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `New Shop Application: ${shopName}`,
    html: emailLayout(`
      <h2 style="margin:0 0 16px;color:#111827;font-size:20px">New Shop Application</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">A new seller has applied to open a shop on the marketplace.</p>
      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin:0 0 16px">
        <p style="margin:0 0 8px;color:#0c4a6e;font-size:14px"><strong>Seller:</strong> ${sellerName}</p>
        <p style="margin:0 0 8px;color:#0c4a6e;font-size:14px"><strong>Email:</strong> ${sellerEmail}</p>
        <p style="margin:0;color:#0c4a6e;font-size:14px"><strong>Shop Name:</strong> ${shopName}</p>
      </div>
      ${button("Review in Admin Panel", `${SITE_URL}/admin/sellers`)}
    `),
  });
}

// ─── Seller withdrawal request confirmation ───────────────────
export async function sendWithdrawalRequestEmail(to: string, sellerName: string, amount: string) {
  return sendEmail({
    to,
    subject: `Withdrawal Request Received – ${SITE_NAME}`,
    html: emailLayout(`
      <h2 style="margin:0 0 16px;color:#111827;font-size:20px">Withdrawal Request Received</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">
        Hi ${sellerName}, your withdrawal request has been submitted.
      </p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:0 0 16px;text-align:center">
        <p style="margin:0;color:#166534;font-size:24px;font-weight:700">$${amount}</p>
        <p style="margin:4px 0 0;color:#15803d;font-size:13px">Pending Processing</p>
      </div>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">
        Our team will process your request within 3-5 business days. You'll be notified once the payment is sent.
      </p>
      ${button("View Dashboard", `${SITE_URL}/seller/withdraw`)}
    `),
  });
}

// ─── Support ticket confirmation ──────────────────────────────
export async function sendSupportTicketEmail(to: string, name: string, ticketId: string, subject: string) {
  return sendEmail({
    to,
    subject: `Support Ticket Created #${ticketId.slice(0, 8).toUpperCase()} – ${SITE_NAME}`,
    html: emailLayout(`
      <h2 style="margin:0 0 16px;color:#111827;font-size:20px">Support Ticket Created</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">Hi ${name}, we've received your support request.</p>
      <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:16px;margin:0 0 16px">
        <p style="margin:0 0 8px;color:#5b21b6;font-size:14px"><strong>Ticket ID:</strong> #${ticketId.slice(0, 8).toUpperCase()}</p>
        <p style="margin:0;color:#5b21b6;font-size:14px"><strong>Subject:</strong> ${subject}</p>
      </div>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">
        Our support team will get back to you within 24 hours. You can track ticket updates in your dashboard.
      </p>
      ${button("View Ticket", `${SITE_URL}/seller/support`)}
    `),
  });
}

// ─── OTP verification email ──────────────────────────────────
export async function sendOtpEmail(to: string, code: string) {
  return sendEmail({
    to,
    subject: `Your Verification Code – ${SITE_NAME}`,
    html: emailLayout(`
      <h2 style="margin:0 0 16px;color:#111827;font-size:20px">Email Verification</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">
        Use the following code to verify your email address. This code expires in 10 minutes.
      </p>
      <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:24px;margin:0 0 16px;text-align:center">
        <p style="margin:0;font-size:32px;font-weight:700;letter-spacing:8px;color:#4f46e5">${code}</p>
      </div>
      <p style="color:#9ca3af;font-size:13px;margin:16px 0 0">If you didn't request this code, please ignore this email.</p>
    `),
  });
}
