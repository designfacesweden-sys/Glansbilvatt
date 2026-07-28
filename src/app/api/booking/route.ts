import { SITE } from "@/data/site";
import {
  buildBookingEmailHtml,
  buildBookingEmailText,
  buildCustomerConfirmationHtml,
  buildCustomerConfirmationText,
  buildWeb3FormsFields,
  formatDateLabel,
  type BookingEmailPayload,
} from "@/lib/booking-message";
import { isValidBookingContact } from "@/lib/booking-validation";

export type { BookingEmailPayload };

function isValidPayload(body: unknown): body is BookingEmailPayload {
  if (!body || typeof body !== "object") return false;
  const data = body as Record<string, unknown>;
  return (
    typeof data.registration === "string" &&
    typeof data.email === "string" &&
    typeof data.phone === "string" &&
    isValidBookingContact({
      registration: data.registration,
      email: data.email,
      phone: data.phone,
    }) &&
    typeof data.carType === "string" &&
    data.carType.length > 0 &&
    typeof data.date === "string" &&
    typeof data.time === "string" &&
    Array.isArray(data.services) &&
    typeof data.total === "string"
  );
}

async function sendBothViaSmtp(payload: BookingEmailPayload) {
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!user || !pass) return false;

  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });

  const from = process.env.SMTP_FROM ?? `${SITE.name} <${user}>`;
  const ownerTo = process.env.BOOKING_OWNER_EMAIL ?? SITE.bookingEmail;

  await transporter.sendMail({
    from,
    to: ownerTo,
    replyTo: payload.email,
    subject: `Ny bokning – ${payload.registration}`,
    text: buildBookingEmailText(payload),
    html: buildBookingEmailHtml(payload),
  });

  await transporter.sendMail({
    from,
    to: payload.email,
    replyTo: ownerTo,
    subject: `Bekräftelse – din bokning hos ${SITE.name}`,
    text: buildCustomerConfirmationText(payload),
    html: buildCustomerConfirmationHtml(payload),
  });

  return true;
}

/** FormSubmit normal POST (not /ajax/) so `_autoresponse` can reach the customer. */
async function sendCustomerViaFormSubmit(payload: BookingEmailPayload) {
  const fields = buildWeb3FormsFields(payload);
  const body = new URLSearchParams({
    _subject: `Ny bokning – ${payload.registration}`,
    _template: "table",
    _autoresponse: buildCustomerConfirmationText(payload),
    _replyto: payload.email,
    email: payload.email,
    name: payload.registration,
    Registreringsnummer: fields.Registreringsnummer,
    Biltyp: fields.Biltyp,
    Datum: fields.Datum,
    Tid: fields.Tid,
    Telefon: fields.Telefon,
    Tjänster: fields.Tjänster,
    Totalt: fields.Totalt,
    message: buildBookingEmailText(payload),
  });

  const response = await fetch(
    `https://formsubmit.co/${encodeURIComponent(SITE.bookingEmail)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "text/html,application/json",
      },
      body: body.toString(),
      redirect: "manual",
    },
  );

  const text = await response.text().catch(() => "");
  const lowered = text.toLowerCase();

  if (
    lowered.includes("activate") ||
    lowered.includes("confirm your email") ||
    lowered.includes("activation")
  ) {
    throw new Error("FORM_SUBMIT_ACTIVATION_REQUIRED");
  }

  // 200 / 302 / 303 typically means FormSubmit accepted the submission
  if (response.status >= 400 && response.status !== 302 && response.status !== 303) {
    throw new Error(`FormSubmit failed (${response.status})`);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!isValidPayload(body)) {
      return Response.json({ error: "Ogiltiga bokningsuppgifter." }, { status: 400 });
    }

    if (await sendBothViaSmtp(body)) {
      return Response.json({ ok: true, via: "smtp" });
    }

    await sendCustomerViaFormSubmit(body);
    return Response.json({ ok: true, via: "formsubmit" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    console.error("[api/booking]", error);

    if (message === "FORM_SUBMIT_ACTIVATION_REQUIRED") {
      return Response.json(
        {
          error:
            "Aktivera kundmejl: öppna glansbiltvatt@gmail.com och klicka länken från FormSubmit, boka sedan igen.",
          code: "FORM_SUBMIT_ACTIVATION_REQUIRED",
        },
        { status: 503 },
      );
    }

    return Response.json(
      { error: "Kunde inte skicka kundbekräftelsen.", code: "SEND_FAILED" },
      { status: 500 },
    );
  }
}
