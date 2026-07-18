import { SITE } from "@/data/site";

export type BookingEmailPayload = {
  registration: string;
  email: string;
  phone: string;
  carType: string;
  date: string;
  time: string;
  services: { name: string; quantity: number; price: string }[];
  total: string;
};

const BRAND_RED = "#9a231e";
const BRAND_RED_DARK = "#7a1c18";
const TEXT = "#111111";
const MUTED = "#5c5c5c";
const BORDER = "#e8e8e8";
const BG = "#f5f5f5";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatDateLabel(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatServicesText(payload: BookingEmailPayload) {
  if (payload.services.length === 0) return "Inga tjänster valda";

  return payload.services
    .map((service) => {
      const qty = service.quantity > 1 ? `${service.quantity}× ` : "";
      return `  • ${qty}${service.name} — ${service.price}`;
    })
    .join("\n");
}

function formatServicesHtml(payload: BookingEmailPayload) {
  if (payload.services.length === 0) {
    return `<tr><td colspan="2" style="padding:12px 16px;color:${MUTED};font-size:14px;">Inga tjänster valda</td></tr>`;
  }

  return payload.services
    .map(
      (service, index) => `
        <tr style="background:${index % 2 === 0 ? "#ffffff" : "#fafafa"};">
          <td style="padding:12px 16px;font-size:14px;color:${TEXT};border-bottom:1px solid ${BORDER};">
            ${service.quantity > 1 ? `<strong>${service.quantity}×</strong> ` : ""}${escapeHtml(service.name)}
          </td>
          <td style="padding:12px 16px;font-size:14px;color:${MUTED};text-align:right;border-bottom:1px solid ${BORDER};white-space:nowrap;">
            ${escapeHtml(service.price)}
          </td>
        </tr>`,
    )
    .join("");
}

function detailRow(label: string, value: string, link?: string) {
  const content = link
    ? `<a href="${link}" style="color:${BRAND_RED};text-decoration:none;font-weight:600;">${escapeHtml(value)}</a>`
    : `<span style="color:${TEXT};font-weight:600;">${escapeHtml(value)}</span>`;

  return `
    <tr>
      <td style="padding:10px 0;width:42%;font-size:14px;color:${MUTED};vertical-align:top;">${label}</td>
      <td style="padding:10px 0;font-size:14px;vertical-align:top;">${content}</td>
    </tr>`;
}

export function buildBookingEmailText(payload: BookingEmailPayload) {
  return [
    "══════════════════════════════════════",
    "  NY BOKNINGSFÖRFRÅGAN — GLANSIG BILTVÄTT",
    "══════════════════════════════════════",
    "",
    "BOKNING",
    "──────────────────────────────────────",
    `Registreringsnummer: ${payload.registration}`,
    `Biltyp:            ${payload.carType}`,
    `Datum:             ${formatDateLabel(payload.date)}`,
    `Tid:               ${payload.time}`,
    "",
    "KONTAKT",
    "──────────────────────────────────────",
    `E-post:            ${payload.email}`,
    `Telefon:           ${payload.phone}`,
    "",
    "VALDA TJÄNSTER",
    "──────────────────────────────────────",
    formatServicesText(payload),
    "",
    `TOTALT: ${payload.total}`,
    "",
    "──────────────────────────────────────",
    `${SITE.name} · ${SITE.address.full}`,
    SITE.phone,
  ].join("\n");
}

export function buildBookingEmailHtml(payload: BookingEmailPayload) {
  const phoneHref = payload.phone.replace(/\s/g, "");

  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Ny bokningsförfrågan</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid ${BORDER};">
          <tr>
            <td style="background:${BRAND_RED};padding:28px 32px;">
              <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#f5d4d2;">Glansig Biltvätt</p>
              <h1 style="margin:0;font-size:26px;line-height:1.2;font-weight:700;color:#ffffff;">Ny bokningsförfrågan</h1>
              <p style="margin:10px 0 0;font-size:14px;line-height:1.5;color:#f5d4d2;">En kund har skickat en bokning via webbplatsen.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;">
              <p style="margin:0 0 14px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND_RED};">Bokning</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${detailRow("Registreringsnummer", payload.registration)}
                ${detailRow("Biltyp", payload.carType)}
                ${detailRow("Datum", formatDateLabel(payload.date))}
                ${detailRow("Tid", payload.time)}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 8px;">
              <p style="margin:0 0 14px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND_RED};">Kontakt</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${detailRow("E-post", payload.email, `mailto:${escapeHtml(payload.email)}`)}
                ${detailRow("Telefon", payload.phone, `tel:${escapeHtml(phoneHref)}`)}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 8px;">
              <p style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND_RED};">Valda tjänster</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:8px;overflow:hidden;">
                <tr style="background:#fafafa;">
                  <th align="left" style="padding:10px 16px;font-size:12px;font-weight:700;color:${MUTED};text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid ${BORDER};">Tjänst</th>
                  <th align="right" style="padding:10px 16px;font-size:12px;font-weight:700;color:${MUTED};text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid ${BORDER};">Pris</th>
                </tr>
                ${formatServicesHtml(payload)}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdf3f3;border:1px solid #f0d4d3;border-radius:8px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;font-size:13px;color:${MUTED};">Totalt</p>
                    <p style="margin:4px 0 0;font-size:24px;font-weight:700;color:${BRAND_RED_DARK};">${escapeHtml(payload.total)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px;background:#fafafa;border-top:1px solid ${BORDER};">
              <p style="margin:0;font-size:12px;line-height:1.6;color:${MUTED};text-align:center;">
                ${escapeHtml(SITE.name)} · ${escapeHtml(SITE.address.full)}<br />
                <a href="${SITE.phoneHref}" style="color:${BRAND_RED};text-decoration:none;">${escapeHtml(SITE.phone)}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function isFormSubmitSuccess(result: unknown) {
  if (!result || typeof result !== "object") return false;
  const success = (result as { success?: string | boolean }).success;
  return success === true || success === "true";
}

export function getFormSubmitErrorMessage(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  const message = (result as { message?: string }).message;
  return typeof message === "string" ? message : null;
}

export function buildFormSubmitFields(payload: BookingEmailPayload, subject: string) {
  return {
    _subject: subject,
    _template: "box",
    _captcha: "false",
    _replyto: payload.email,
    message: buildBookingEmailText(payload),
    Registreringsnummer: payload.registration,
    Biltyp: payload.carType,
    Datum: formatDateLabel(payload.date),
    Tid: payload.time,
    "E-post": payload.email,
    Telefon: payload.phone,
    Tjänster: payload.services
      .map((service) => {
        const qty = service.quantity > 1 ? `${service.quantity}× ` : "";
        return `${qty}${service.name} (${service.price})`;
      })
      .join("\n"),
    Totalt: payload.total,
  };
}

function buildFormSubmitBody(payload: BookingEmailPayload, subject: string) {
  return buildFormSubmitFields(payload, subject);
}

export type FormSubmitRequestContext = {
  origin?: string | null;
  referer?: string | null;
  userAgent?: string | null;
};

function formSubmitHeaders(context?: FormSubmitRequestContext) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (context?.origin) headers.Origin = context.origin;
  if (context?.referer) headers.Referer = context.referer;
  if (context?.userAgent) headers["User-Agent"] = context.userAgent;
  return headers;
}

/** FormSubmit AJAX — works from browser or server when the form is activated. */
export async function sendBookingViaFormSubmit(
  payload: BookingEmailPayload,
  context?: FormSubmitRequestContext,
) {
  const subject = `Ny bokning – ${payload.registration}`;
  const response = await fetch(
    `https://formsubmit.co/ajax/${encodeURIComponent(SITE.bookingEmail)}`,
    {
      method: "POST",
      headers: formSubmitHeaders(context),
      body: JSON.stringify(buildFormSubmitBody(payload, subject)),
    },
  );

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getFormSubmitErrorMessage(result) ?? "FormSubmit request failed");
  }

  if (!isFormSubmitSuccess(result)) {
    const message = getFormSubmitErrorMessage(result);
    if (message?.toLowerCase().includes("activation")) {
      throw new Error("FORM_SUBMIT_ACTIVATION_REQUIRED");
    }
    throw new Error(message ?? "FormSubmit rejected submission");
  }
}

/** Browser-side fallback using a hidden iframe (no AJAX activation quirks). */
export function submitBookingViaFormIframe(payload: BookingEmailPayload): Promise<void> {
  if (typeof document === "undefined") {
    return Promise.reject(new Error("Form iframe submit requires a browser"));
  }

  const subject = `Ny bokning – ${payload.registration}`;
  const fields = buildFormSubmitFields(payload, subject);
  const iframeName = `formsubmit_${Date.now()}`;

  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.name = iframeName;
    iframe.title = "Bokning skickas";
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText = "display:none;width:0;height:0;border:0;position:absolute;";
    document.body.appendChild(iframe);

    const form = document.createElement("form");
    form.method = "POST";
    form.action = `https://formsubmit.co/${encodeURIComponent(SITE.bookingEmail)}`;
    form.target = iframeName;
    form.style.display = "none";

    for (const [name, value] of Object.entries(fields)) {
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

    const timer = window.setTimeout(() => {
      cleanup();
      resolve();
    }, 4000);

    iframe.addEventListener(
      "load",
      () => {
        cleanup();
        resolve();
      },
      { once: true },
    );

    document.body.appendChild(form);
    form.addEventListener(
      "error",
      () => {
        cleanup();
        reject(new Error("FormSubmit iframe submit failed"));
      },
      { once: true },
    );
    form.submit();
  });
}

/** @deprecated Use sendBookingViaFormSubmit */
export async function submitBookingViaFormSubmit(payload: BookingEmailPayload) {
  return sendBookingViaFormSubmit(payload);
}

/** Opens the visitor's email app with the booking pre-filled — always works, no setup. */
export function openBookingMailto(payload: BookingEmailPayload) {
  const subject = encodeURIComponent(`Ny bokning – ${payload.registration}`);
  const body = encodeURIComponent(buildBookingEmailText(payload));
  window.location.href = `mailto:${SITE.bookingEmail}?subject=${subject}&body=${body}`;
}

/**
 * Send booking from the browser straight to Glansbilvatt@gmail.com.
 * No API keys or server config needed — uses FormSubmit, then mailto as fallback.
 */
export async function submitBookingFromBrowser(
  payload: BookingEmailPayload,
): Promise<"sent" | "mailto"> {
  try {
    await submitBookingViaFormIframe(payload);
    return "sent";
  } catch {
    // try ajax next
  }

  try {
    await sendBookingViaFormSubmit(payload);
    return "sent";
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "FORM_SUBMIT_ACTIVATION_REQUIRED"
    ) {
      throw error;
    }
  }

  openBookingMailto(payload);
  return "mailto";
}
