import { SITE } from "@/data/site";
import {
  buildBookingEmailText,
  buildCustomerConfirmationText,
  buildWeb3FormsFields,
  formatDateLabel,
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

/** Owner inbox via Web3Forms (proven working on your domain). */
async function sendOwnerViaWeb3Forms(payload: BookingEmailPayload) {
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

  for (const [key, value] of Object.entries(buildWeb3FormsFields(payload))) {
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

/**
 * Customer confirmation.
 * Prefer /api/booking (SMTP or FormSubmit server POST with _autoresponse).
 * FormSubmit's free auto-reply does NOT work with their /ajax/ endpoint.
 */
async function sendCustomerConfirmation(payload: BookingEmailPayload) {
  const response = await fetch("/api/booking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (response.ok) {
    const result = (await response.json().catch(() => null)) as { via?: string } | null;
    // SMTP already emailed the owner too — skip duplicate Web3Forms if you want;
    // we still send Web3Forms separately for the nice owner template you already get.
    return result?.via ?? "api";
  }

  const result = (await response.json().catch(() => null)) as {
    code?: string;
    error?: string;
  } | null;

  if (result?.code === "FORM_SUBMIT_ACTIVATION_REQUIRED") {
    throw new Error(FORM_SUBMIT_ACTIVATION_REQUIRED);
  }

  // Last resort: classic form POST in a hidden iframe (not AJAX)
  await sendCustomerViaFormIframe(payload);
  return "iframe";
}

function sendCustomerViaFormIframe(payload: BookingEmailPayload): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("FormSubmit requires a browser"));
      return;
    }

    const iframeName = `customer_confirm_${Date.now()}`;
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

    const fields = buildWeb3FormsFields(payload);
    const values: Record<string, string> = {
      _subject: `Ny bokning – ${payload.registration}`,
      _template: "table",
      _autoresponse: buildCustomerConfirmationText(payload),
      _replyto: payload.email,
      email: payload.email,
      name: payload.registration,
      Registreringsnummer: fields.Registreringsnummer,
      Biltyp: fields.Biltyp,
      Datum: formatDateLabel(payload.date),
      Tid: fields.Tid,
      Telefon: fields.Telefon,
      Tjänster: fields.Tjänster,
      Totalt: fields.Totalt,
      message: buildBookingEmailText(payload),
    };

    for (const [name, value] of Object.entries(values)) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }

    const cleanup = () => {
      window.clearTimeout(timer);
      form.remove();
      iframe.remove();
    };

    const done = () => {
      cleanup();
      resolve();
    };

    const timer = window.setTimeout(done, 4500);
    iframe.addEventListener("load", done, { once: true });
    document.body.appendChild(form);
    form.addEventListener(
      "error",
      () => {
        cleanup();
        reject(new Error("FormSubmit iframe failed"));
      },
      { once: true },
    );
    form.submit();
  });
}

/**
 * Owner (Web3Forms) + customer confirmation (API / FormSubmit auto-reply).
 */
export async function sendBookingToEmail(payload: BookingEmailPayload): Promise<void> {
  await sendOwnerViaWeb3Forms(payload);

  try {
    await sendCustomerConfirmation(payload);
  } catch (error) {
    if (error instanceof Error && error.message === FORM_SUBMIT_ACTIVATION_REQUIRED) {
      throw error;
    }
    console.warn("[booking] Customer confirmation failed", error);
    throw new Error(
      "Bokningen skickades till verkstaden, men kundbekräftelsen kunde inte skickas. Försök igen eller ring oss.",
    );
  }
}
