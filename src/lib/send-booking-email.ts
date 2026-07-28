import { SITE } from "@/data/site";
import {
  buildBookingEmailText,
  buildCustomerConfirmationText,
  buildWeb3FormsFields,
  type BookingEmailPayload,
} from "@/lib/booking-message";

export const WEB3FORMS_NOT_CONFIGURED = "WEB3FORMS_NOT_CONFIGURED";
export const FORM_SUBMIT_ACTIVATION_REQUIRED = "FORM_SUBMIT_ACTIVATION_REQUIRED";

function bookingSubject(payload: BookingEmailPayload) {
  const date = new Date(payload.date);
  const short = Number.isNaN(date.getTime())
    ? payload.date
    : new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short" }).format(date);
  return `Ny bokning – ${payload.registration} · ${short} ${payload.time}`;
}

/**
 * Web3Forms (same flow as their docs): POST FormData to api.web3forms.com/submit.
 * Sends the order to the inbox linked to the access key (glansbiltvatt@gmail.com).
 */
async function sendViaWeb3Forms(payload: BookingEmailPayload) {
  const accessKey = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY?.trim();
  if (!accessKey) {
    throw new Error(WEB3FORMS_NOT_CONFIGURED);
  }

  const formData = new FormData();
  formData.append("access_key", accessKey);
  formData.append("subject", bookingSubject(payload));
  formData.append("from_name", `${SITE.name} – Bokning`);
  formData.append("name", payload.registration);
  formData.append("email", payload.email);
  formData.append("phone", payload.phone);
  formData.append("message", buildBookingEmailText(payload));

  const fields = buildWeb3FormsFields(payload);
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }

  const response = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    body: formData,
  });

  const data = (await response.json()) as { success?: boolean; message?: string };

  if (!response.ok || !data.success) {
    throw new Error(data.message ?? "Kunde inte skicka bokningen.");
  }
}

/** Free customer confirmation (and second copy to owner) via FormSubmit. */
async function sendCustomerConfirmation(payload: BookingEmailPayload) {
  const body = {
    _subject: `Bekräftelse – din bokning hos ${SITE.name}`,
    _template: "table",
    _captcha: "false",
    _replyto: SITE.bookingEmail,
    _autoresponse: buildCustomerConfirmationText(payload),
    email: payload.email,
    name: payload.registration,
    ...buildWeb3FormsFields(payload),
    message: buildCustomerConfirmationText(payload),
  };

  const response = await fetch(
    `https://formsubmit.co/ajax/${encodeURIComponent(SITE.bookingEmail)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  const result = (await response.json().catch(() => null)) as {
    success?: string | boolean;
    message?: string;
  } | null;

  const ok = result?.success === true || result?.success === "true";
  if (ok) return;

  const message = result?.message ?? "";
  if (message.toLowerCase().includes("activation")) {
    // Don't block booking success — owner already got Web3Forms mail
    console.warn("[booking] FormSubmit needs activation for customer confirmation");
    return;
  }
}

/**
 * Sends booking email via Web3Forms (required success).
 * Also tries FormSubmit so the customer can get a free confirmation.
 */
export async function sendBookingToEmail(payload: BookingEmailPayload): Promise<void> {
  await sendViaWeb3Forms(payload);

  try {
    await sendCustomerConfirmation(payload);
  } catch (error) {
    console.warn("[booking] Customer confirmation skipped", error);
  }
}
