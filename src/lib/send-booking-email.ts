import { SITE } from "@/data/site";
import {
  buildCustomerConfirmationText,
  buildWeb3FormsFields,
  type BookingEmailPayload,
} from "@/lib/booking-message";

export const WEB3FORMS_NOT_CONFIGURED = "WEB3FORMS_NOT_CONFIGURED";

/**
 * Free booking mail (Web3Forms): order → glansbiltvatt@gmail.com, confirmation → customer.
 * Setup once: https://web3forms.com → use glansbiltvatt@gmail.com → paste access key in
 * NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY (.env.local + Vercel).
 */
export async function sendBookingToEmail(payload: BookingEmailPayload): Promise<void> {
  const accessKey = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY?.trim();
  if (!accessKey) {
    throw new Error(WEB3FORMS_NOT_CONFIGURED);
  }

  const subject = `Ny bokning – ${payload.registration} · ${formatShortDate(payload.date)} ${payload.time}`;
  const customerSubject = `Bekräftelse – din bokning hos ${SITE.name}`;

  const response = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      access_key: accessKey,
      subject,
      from_name: `${SITE.name} – Bokning`,
      // reply-to = customer (so you can hit Reply in Gmail)
      email: payload.email,
      ...buildWeb3FormsFields(payload),
      autoresponse: {
        subject: customerSubject,
        message: buildCustomerConfirmationText(payload),
      },
    }),
  });

  const result = (await response.json()) as { success?: boolean; message?: string };
  if (!result.success) {
    throw new Error(result.message ?? "Kunde inte skicka bokningen.");
  }
}

function formatShortDate(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short",
  }).format(date);
}
