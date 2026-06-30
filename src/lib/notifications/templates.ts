function layout(preheader: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Crunchy Bingebite</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#111;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
  <tr>
    <td style="background:linear-gradient(135deg,#1c1c1c,#111);padding:28px 32px;border-bottom:1px solid #222;">
      <p style="margin:0;font-size:22px;font-weight:700;color:#f59e0b;">🌾 Crunchy Bingebite</p>
      <p style="margin:4px 0 0;font-size:12px;color:#666;">Premium flavored makhana</p>
    </td>
  </tr>
  <tr>
    <td style="padding:36px 32px;">${content}</td>
  </tr>
  <tr>
    <td style="padding:20px 32px;border-top:1px solid #222;text-align:center;">
      <p style="margin:0;font-size:11px;color:#444;line-height:1.6;">
        You received this because you have an account at Crunchy Bingebite.<br/>
        Questions? <a href="mailto:support@bingebite.in" style="color:#f59e0b;text-decoration:none;">support@bingebite.in</a>
      </p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

function h1(text: string) {
  return `<h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#f1f1f1;">${text}</h1>`
}
function p(text: string, style = "") {
  return `<p style="margin:0 0 16px;font-size:14px;color:#999;line-height:1.6;${style}">${text}</p>`
}
function badge(label: string) {
  return `<span style="display:inline-block;background:#f59e0b;color:#000;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;letter-spacing:0.5px;">${label}</span>`
}
function divider() {
  return `<hr style="border:none;border-top:1px solid #222;margin:20px 0;"/>`
}
function row(label: string, value: string) {
  return `<tr>
    <td style="padding:6px 0;font-size:13px;color:#666;">${label}</td>
    <td style="padding:6px 0;font-size:13px;color:#f1f1f1;text-align:right;font-weight:600;">${value}</td>
  </tr>`
}
function btn(text: string, href: string) {
  return `<a href="${href}" style="display:inline-block;background:#f59e0b;color:#000;font-size:14px;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;margin-top:8px;">${text}</a>`
}

export function welcomeTemplate(name: string): { subject: string; html: string } {
  return {
    subject: "Welcome to Crunchy Bingebite! 🌾",
    html: layout(
      "Welcome! Premium makhana delivered to your door.",
      `${h1("Welcome, ${name}! 🎉")}
${p("You've joined the Crunchy Bingebite family. Get ready for the crunchiest, healthiest snacks delivered to your door.")}
${badge("NEW MEMBER")}
${divider()}
${p("Here's what you can look forward to:")}
<ul style="margin:0 0 20px;padding-left:20px;color:#999;font-size:14px;line-height:2;">
  <li>Premium roasted makhana in 8+ flavors</li>
  <li>Free delivery on orders above ₹499</li>
  <li>Earn Binge Points on every order</li>
  <li>Easy returns & refunds</li>
</ul>
${btn("Shop Now", "https://bingebite.in/products")}`
    ),
  }
}

export function orderPlacedTemplate(
  name: string, orderNumber: string, total: number, items: number, paymentMethod: string
): { subject: string; html: string } {
  return {
    subject: `Order #${orderNumber} confirmed! 🛍️`,
    html: layout(
      `Your order ${orderNumber} has been placed.`,
      `${h1("Order Placed Successfully!")}
${p("Hi ${name}, we've received your order and are preparing it.")}
${badge("ORDER CONFIRMED")}
${divider()}
<table width="100%" cellpadding="0" cellspacing="0">
  ${row("Order Number", "#" + orderNumber)}
  ${row("Items", items + " item" + (items !== 1 ? "s" : ""))}
  ${row("Total", "₹" + total.toFixed(2))}
  ${row("Payment", paymentMethod === "COD" ? "Cash on Delivery" : "Online Payment")}
</table>
${divider()}
${p("We'll notify you when your order is packed and shipped.", "font-size:13px;")}
${btn("Track Order", "https://bingebite.in/orders")}`
    ),
  }
}

export function paymentSuccessTemplate(
  name: string, orderNumber: string, total: number
): { subject: string; html: string } {
  return {
    subject: `Payment confirmed for #${orderNumber} ✅`,
    html: layout(
      `Payment of ₹${total} confirmed.`,
      `${h1("Payment Confirmed! ✅")}
${p("Hi ${name}, your payment was successful.")}
${badge("PAID")}
${divider()}
<table width="100%" cellpadding="0" cellspacing="0">
  ${row("Order Number", "#" + orderNumber)}
  ${row("Amount Paid", "₹" + total.toFixed(2))}
  ${row("Status", "Confirmed")}
</table>
${divider()}
${p("We'll start packing your order right away!", "font-size:13px;")}
${btn("View Order", "https://bingebite.in/orders")}`
    ),
  }
}

export function paymentFailedTemplate(name: string): { subject: string; html: string } {
  return {
    subject: "Payment failed — please retry",
    html: layout(
      "Your payment could not be processed.",
      `${h1("Payment Failed")}
${p("Hi ${name}, we could not process your payment.")}
${p("Your order has not been placed. Please try again or use a different payment method.")}
${btn("Try Again", "https://bingebite.in/checkout")}`
    ),
  }
}

export function orderShippedTemplate(
  name: string, orderNumber: string, trackingNumber?: string | null
): { subject: string; html: string } {
  return {
    subject: `Your order #${orderNumber} is on its way! 🚚`,
    html: layout(
      "Your order has been shipped.",
      `${h1("On Its Way! 🚚")}
${p("Hi ${name}, your order has been shipped.")}
${badge("SHIPPED")}
${divider()}
${trackingNumber ? `<table width="100%" cellpadding="0" cellspacing="0">${row("Order", "#" + orderNumber)}${row("Tracking", trackingNumber)}</table>${divider()}` : ""}
${p("Estimated delivery: 2–5 business days.", "font-size:13px;")}
${btn("Track Order", "https://bingebite.in/orders")}`
    ),
  }
}

export function orderDeliveredTemplate(name: string, orderNumber: string): { subject: string; html: string } {
  return {
    subject: `Order #${orderNumber} delivered! Enjoy 🎉`,
    html: layout(
      "Your order has been delivered.",
      `${h1("Order Delivered! 🎉")}
${p("Hi ${name}, your Crunchy Bingebite order has arrived!")}
${badge("DELIVERED")}
${divider()}
${p("How was your snacking experience? Leave a review and earn Binge Points.", "font-size:13px;")}
${btn("Write a Review", "https://bingebite.in/orders")}`
    ),
  }
}

export function returnApprovedTemplate(name: string, orderNumber: string): { subject: string; html: string } {
  return {
    subject: `Return approved for #${orderNumber}`,
    html: layout(
      "Your return request has been approved.",
      `${h1("Return Approved")}
${p("Hi ${name}, your return request for order #${orderNumber} has been approved.")}
${badge("APPROVED")}
${divider()}
${p("Our team will arrange a pickup within 2–3 business days. Please keep the items ready.", "font-size:13px;")}
${btn("View Order", "https://bingebite.in/orders")}`
    ),
  }
}

export function refundCompletedTemplate(
  name: string, orderNumber: string, amount: number
): { subject: string; html: string } {
  return {
    subject: `Refund of ₹${amount} processed for #${orderNumber}`,
    html: layout(
      `Refund of ₹${amount} is on its way.`,
      `${h1("Refund Processed")}
${p("Hi ${name}, your refund has been processed.")}
${badge("REFUNDED")}
${divider()}
<table width="100%" cellpadding="0" cellspacing="0">
  ${row("Order", "#" + orderNumber)}
  ${row("Refund Amount", "₹" + amount.toFixed(2))}
  ${row("Expected", "5–7 business days")}
</table>
${divider()}
${p("Refunds typically reflect in 5–7 business days depending on your bank.", "font-size:13px;")}
${btn("Order History", "https://bingebite.in/orders")}`
    ),
  }
}
