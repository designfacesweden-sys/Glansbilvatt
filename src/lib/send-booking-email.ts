import { SITE } from "@/data/site";
import {
  buildBookingEmailText,
  buildCustomerConfirmationText,
  buildWeb3FormsFields,
  type BookingEmailPayload,
} from "@/lib/booking-message";

export const WEB3FORMS_NOT_CONFIGURED = "WEB3FORMS_NOT_CONFIGURED";

function bookingSubject(payload: BookingEmailPayload) {
  const date = new Date(payload.date);
  const short = Number.isNaN(date.getTime())
    ? payload.date
    : new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short" }).format(date);
  return `Ny bokning – ${payload.registration} · ${short} ${payload.time}`;
}

/** Owner + customer via /api/booking (Gmail SMTP). */
async function sendViaSmtpApi(payload: BookingEmailPayload) {
  try {
    const response = await fetch("/api/booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = (await response.json().catch(() => null)) as {
      ok?: boolean;
      via?: string;
      code?: string;
    } | null;

    return Boolean(response.ok && result?.via === "smtp");
  } catch {
    return false;
  }
}

function formSubmitAjaxUrl() {
  const site = SITE as typeof SITE & { formSubmitId?: string };
  const id = site.formSubmitId?.trim() ?? "";
  if (id) return `https://formsubmit.co/ajax/${id}`;
  return `https://formsubmit.co/ajax/${encodeURIComponent(SITE.bookingEmail)}`;
}

/**
 * One FormSubmit request:
 * - shop inbox gets the booking notice (subject + message)
 * - customer email field gets the Bekräftelse auto-reply
 */
async function sendViaFormSubmitAjax(payload: BookingEmailPayload) {
  const fields = buildWeb3FormsFields(payload);
  const customerText = buildCustomerConfirmationText(payload);
  const body: Record<string, string> = {
    name: payload.customerName,
    email: payload.email,
    phone: payload.phone,
    _subject: bookingSubject(payload),
    _template: "table",
    _captcha: "false",
    _autoresponse: customerText,
    _replyto: payload.email,
    ...fields,
    message: buildBookingEmailText(payload),
  };

  const response = await fetch(formSubmitAjaxUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json().catch(() => null)) as {
    success?: boolean | string;
    message?: string;
  } | null;

  const ok =
    response.ok &&
    (data?.success === true ||
      data?.success === "true" ||
      (typeof data?.message === "string" && /sent|success|thank/i.test(data.message)));

  if (!ok) {
    const raw = data?.message ?? "";
    const needsActivation = /activat/i.test(raw);
    throw new Error(
      needsActivation
        ? "Bekräftelsemejlet är inte aktiverat. Öppna glansbiltvatt@gmail.com och klicka på länken från FormSubmit, och boka sedan igen."
        : raw && raw.length < 180
          ? raw
          : "Kunde inte skicka bekräftelsemejl. Försök igen eller ring oss.",
    );
  }
}

/**
 * Prefer SMTP (shop notice + customer Bekräftelse).
 * Else FormSubmit: shop gets Ny bokning, customer gets Bekräftelse auto-reply.
 */
export async function sendBookingToEmail(payload: BookingEmailPayload): Promise<void> {
  if (await sendViaSmtpApi(payload)) return;
  await sendViaFormSubmitAjax(payload);
}
