import { SITE } from "@/data/site";
import {
  buildBookingEmailText,
  buildCustomerConfirmationText,
  buildWeb3FormsFields,
  type BookingEmailPayload,
} from "@/lib/booking-message";

export const FORM_SUBMIT_ACTIVATION_REQUIRED = "FORM_SUBMIT_ACTIVATION_REQUIRED";

function bookingSubject(payload: BookingEmailPayload) {
  const date = new Date(payload.date);
  const short = Number.isNaN(date.getTime())
    ? payload.date
    : new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short" }).format(date);
  return `Ny bokning – ${payload.registration} · ${short} ${payload.time}`;
}

function formSubmitFields(payload: BookingEmailPayload) {
  return {
    _subject: bookingSubject(payload),
    _template: "table",
    _captcha: "false",
    _replyto: payload.email,
    // Free forever: auto-reply to the customer's email field
    _autoresponse: buildCustomerConfirmationText(payload),
    email: payload.email,
    name: payload.registration,
    ...buildWeb3FormsFields(payload),
    message: buildBookingEmailText(payload),
  };
}

function isFormSubmitSuccess(result: unknown) {
  if (!result || typeof result !== "object") return false;
  const success = (result as { success?: string | boolean }).success;
  return success === true || success === "true";
}

function isActivationMessage(message: string) {
  return message.toLowerCase().includes("activation");
}

/**
 * Free forever: FormSubmit → owner (glansbiltvatt@gmail.com) + auto-reply → customer.
 * First booking ever: open that Gmail and click FormSubmit’s activation link, then book again.
 */
async function sendViaFormSubmitAjax(payload: BookingEmailPayload) {
  const response = await fetch(
    `https://formsubmit.co/ajax/${encodeURIComponent(SITE.bookingEmail)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(formSubmitFields(payload)),
    },
  );

  const result = (await response.json().catch(() => null)) as {
    success?: string | boolean;
    message?: string;
  } | null;

  if (isFormSubmitSuccess(result)) return;

  const message = result?.message ?? "FormSubmit rejected the booking";
  if (isActivationMessage(message)) {
    throw new Error(FORM_SUBMIT_ACTIVATION_REQUIRED);
  }
  throw new Error(message);
}

/** Hidden form post — often delivers the first-time activation mail more reliably. */
function sendViaFormSubmitIframe(payload: BookingEmailPayload): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("FormSubmit requires a browser"));
      return;
    }

    const iframeName = `booking_${Date.now()}`;
    const iframe = document.createElement("iframe");
    iframe.name = iframeName;
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText = "position:absolute;width:0;height:0;border:0;visibility:hidden";
    document.body.appendChild(iframe);

    const form = document.createElement("form");
    form.method = "POST";
    form.action = `https://formsubmit.co/${encodeURIComponent(SITE.bookingEmail)}`;
    form.target = iframeName;
    form.acceptCharset = "UTF-8";

    for (const [name, value] of Object.entries(formSubmitFields(payload))) {
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

    const timer = window.setTimeout(done, 4000);
    iframe.addEventListener("load", done, { once: true });
    document.body.appendChild(form);
    form.addEventListener("error", () => reject(new Error("Form post failed")), { once: true });
    form.submit();
  });
}

/** Owner-only backup via Web3Forms (no free customer auto-reply). */
async function sendViaWeb3FormsOwnerOnly(payload: BookingEmailPayload) {
  const accessKey = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY?.trim();
  if (!accessKey) return false;

  const response = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      access_key: accessKey,
      subject: bookingSubject(payload),
      from_name: `${SITE.name} – Bokning`,
      email: payload.email,
      ...buildWeb3FormsFields(payload),
      message: buildBookingEmailText(payload),
    }),
  });

  const result = (await response.json()) as { success?: boolean; message?: string };
  if (!result.success) {
    throw new Error(result.message ?? "Web3Forms rejected the booking");
  }
  return true;
}

/**
 * Sends booking to owner + confirmation to customer (FormSubmit, free).
 * Falls back to Web3Forms for the owner only if FormSubmit is unavailable.
 */
export async function sendBookingToEmail(payload: BookingEmailPayload): Promise<void> {
  try {
    await sendViaFormSubmitAjax(payload);
    return;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === FORM_SUBMIT_ACTIVATION_REQUIRED) {
      // Trigger activation mail to the owner inbox, then ask them to confirm once.
      try {
        await sendViaFormSubmitIframe(payload);
      } catch {
        // ignore — activation mail may still have been queued by AJAX
      }
      throw new Error(FORM_SUBMIT_ACTIVATION_REQUIRED);
    }

    try {
      await sendViaFormSubmitIframe(payload);
      return;
    } catch {
      // continue to Web3Forms owner backup
    }
  }

  // At least notify the shop owner
  const sentOwner = await sendViaWeb3FormsOwnerOnly(payload);
  if (!sentOwner) {
    throw new Error("Kunde inte skicka bokningen. Försök igen eller ring oss.");
  }
}
