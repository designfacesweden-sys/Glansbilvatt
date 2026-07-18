import { SITE } from "@/data/site";
import {
  buildBookingEmailHtml,
  buildBookingEmailText,
  sendBookingViaFormSubmit,
  type BookingEmailPayload,
  type FormSubmitRequestContext,
} from "@/lib/booking-message";

export type { BookingEmailPayload };

function formSubmitContextFromHeaders(headers?: Headers): FormSubmitRequestContext | undefined {
  if (!headers) return undefined;
  return {
    origin: headers.get("origin"),
    referer: headers.get("referer"),
    userAgent: headers.get("user-agent"),
  };
}

async function sendViaResend(payload: BookingEmailPayload) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return false;

  const subject = `Ny bokning – ${payload.registration}`;
  const { Resend } = await import("resend");
  const resend = new Resend(resendKey);
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM ?? "Glansig Biltvätt <onboarding@resend.dev>",
    to: process.env.RESEND_TO ?? SITE.bookingEmail,
    replyTo: payload.email,
    subject,
    text: buildBookingEmailText(payload),
    html: buildBookingEmailHtml(payload),
  });

  if (error) {
    throw new Error(`Resend: ${error.message}`);
  }
  return true;
}

async function sendViaSmtp(payload: BookingEmailPayload) {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return false;

  const subject = `Ny bokning – ${payload.registration}`;
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? `Glansig Biltvätt <${user}>`,
    to: SITE.bookingEmail,
    replyTo: payload.email,
    subject,
    text: buildBookingEmailText(payload),
    html: buildBookingEmailHtml(payload),
  });
  return true;
}

export async function sendBookingEmail(
  payload: BookingEmailPayload,
  requestHeaders?: Headers,
) {
  if (await sendViaResend(payload)) return;
  if (await sendViaSmtp(payload)) return;

  const context = formSubmitContextFromHeaders(requestHeaders);
  try {
    await sendBookingViaFormSubmit(payload, context);
    return;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "FORM_SUBMIT_ACTIVATION_REQUIRED") {
      throw new Error("FORM_SUBMIT_ACTIVATION_REQUIRED");
    }
    throw error;
  }
}
