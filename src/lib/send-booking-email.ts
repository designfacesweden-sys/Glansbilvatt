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

/** Owner inbox via Web3Forms. */
async function sendOwnerViaWeb3Forms(payload: BookingEmailPayload) {
  const accessKey = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY?.trim();
  if (!accessKey) {
    throw new Error(WEB3FORMS_NOT_CONFIGURED);
  }

  const formData = new FormData();
  formData.append("access_key", accessKey);
  formData.append("subject", bookingSubject(payload));
  formData.append("from_name", `${SITE.name} – Bokning`);
  formData.append("name", payload.customerName);
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

function formSubmitUrl() {
  const site = SITE as typeof SITE & { formSubmitId?: string };
  const id = site.formSubmitId?.trim() ?? "";
  if (id) return `https://formsubmit.co/${id}`;
  return `https://formsubmit.co/${encodeURIComponent(SITE.bookingEmail)}`;
}

/**
 * Classic form post, not AJAX. FormSubmit only auto-replies to the customer's
 * email field on a normal form submit. The shop copy uses the booking subject,
 * never the customer confirmation.
 */
function sendViaFormSubmit(payload: BookingEmailPayload): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("Kunde inte skicka bekräftelsemejl."));
      return;
    }

    const iframeName = `booking_mail_${Date.now()}`;
    const iframe = document.createElement("iframe");
    iframe.name = iframeName;
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText = "position:absolute;width:0;height:0;border:0;visibility:hidden";

    const form = document.createElement("form");
    form.method = "POST";
    form.action = formSubmitUrl();
    form.target = iframeName;
    form.acceptCharset = "UTF-8";

    const values: Record<string, string> = {
      name: payload.customerName,
      email: payload.email,
      phone: payload.phone,
      _subject: bookingSubject(payload),
      _template: "table",
      _captcha: "false",
      _replyto: payload.email,
      _autoresponse: buildCustomerConfirmationText(payload),
      ...buildWeb3FormsFields(payload),
      message: buildBookingEmailText(payload),
    };

    for (const [name, value] of Object.entries(values)) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }

    let submitted = false;
    const cleanup = () => {
      window.clearTimeout(timer);
      form.remove();
      iframe.remove();
    };

    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("Kunde inte skicka bekräftelsemejl. Försök igen eller ring oss."));
    }, 12000);

    iframe.addEventListener("load", () => {
      if (!submitted) return;
      cleanup();
      resolve();
    });

    document.body.appendChild(iframe);
    document.body.appendChild(form);
    submitted = true;
    form.submit();
  });
}

/**
 * SMTP sends the booking notice to the shop and the Bekräftelse to the customer.
 * Otherwise Web3Forms notifies the shop, and FormSubmit auto-replies to the customer.
 */
export async function sendBookingToEmail(payload: BookingEmailPayload): Promise<void> {
  if (await sendViaSmtpApi(payload)) return;

  const accessKey = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY?.trim();
  if (accessKey) {
    await sendOwnerViaWeb3Forms(payload);
  }

  await sendViaFormSubmit(payload);
}
