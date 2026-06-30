import { SITE } from "@/data/site";
import {
  buildBookingEmailText,
  formatDateLabel,
  type BookingEmailPayload,
} from "@/lib/booking-message";

const BOOKING_EMAIL = SITE.bookingEmail;

function bookingFields(payload: BookingEmailPayload, subject: string) {
  return {
    _subject: subject,
    _captcha: "false",
    _template: "table",
    _replyto: payload.email,
    message: buildBookingEmailText(payload),
    Registreringsnummer: payload.registration,
    Biltyp: payload.carType,
    Datum: formatDateLabel(payload.date),
    Tid: payload.time,
    "E-post": payload.email,
    Telefon: payload.phone,
    Tjänster: payload.services
      .map((s) => `${s.quantity > 1 ? `${s.quantity}× ` : ""}${s.name} (${s.price})`)
      .join("\n"),
    Totalt: payload.total,
  };
}

async function sendViaWeb3Forms(payload: BookingEmailPayload, subject: string) {
  const accessKey = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY;
  if (!accessKey) return false;

  const response = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      access_key: accessKey,
      subject,
      from_name: `Bokning ${payload.registration}`,
      email: payload.email,
      message: buildBookingEmailText(payload),
    }),
  });

  const result = (await response.json()) as { success?: boolean; message?: string };
  if (!result.success) {
    throw new Error(result.message ?? "Web3Forms rejected the booking");
  }
  return true;
}

async function sendViaFormSubmitAjax(payload: BookingEmailPayload, subject: string) {
  const response = await fetch(
    `https://formsubmit.co/ajax/${encodeURIComponent(BOOKING_EMAIL)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(bookingFields(payload, subject)),
    },
  );

  const result = (await response.json()) as {
    success?: string | boolean;
    message?: string;
  };

  if (result.success === true || result.success === "true") return;

  const message = result.message ?? "FormSubmit rejected the booking";
  throw new Error(message);
}

function sendViaFormSubmitPost(payload: BookingEmailPayload, subject: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const iframeName = `booking_${Date.now()}`;
    const iframe = document.createElement("iframe");
    iframe.name = iframeName;
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText = "position:absolute;width:0;height:0;border:0;visibility:hidden";
    document.body.appendChild(iframe);

    const form = document.createElement("form");
    form.method = "POST";
    form.action = `https://formsubmit.co/${encodeURIComponent(BOOKING_EMAIL)}`;
    form.target = iframeName;
    form.acceptCharset = "UTF-8";

    for (const [name, value] of Object.entries(bookingFields(payload, subject))) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }

    const done = () => {
      window.clearTimeout(timer);
      form.remove();
      iframe.remove();
      resolve();
    };

    const timer = window.setTimeout(done, 3500);
    iframe.addEventListener("load", done, { once: true });

    document.body.appendChild(form);
    form.addEventListener("error", () => reject(new Error("Form post failed")), { once: true });
    form.submit();
  });
}

/**
 * Sends the booking form to Glansbilvatt@gmail.com from the browser.
 * Uses Web3Forms if NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY is set (recommended),
 * otherwise FormSubmit (free, no API key — first use needs a one-click activation email).
 */
export async function sendBookingToEmail(payload: BookingEmailPayload): Promise<void> {
  const subject = `Ny bokning – ${payload.registration}`;

  if (await sendViaWeb3Forms(payload, subject)) return;

  try {
    await sendViaFormSubmitAjax(payload, subject);
    return;
  } catch (ajaxError) {
    const ajaxMessage =
      ajaxError instanceof Error ? ajaxError.message : "FormSubmit AJAX failed";

    if (!ajaxMessage.toLowerCase().includes("activation")) {
      try {
        await sendViaFormSubmitPost(payload, subject);
        return;
      } catch {
        throw ajaxError;
      }
    }

    await sendViaFormSubmitPost(payload, subject);
  }
}
