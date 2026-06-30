import { sendBookingEmail, type BookingEmailPayload } from "@/lib/booking-email";
import { isValidBookingContact } from "@/lib/booking-validation";

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

function bookingErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (message === "FORM_SUBMIT_ACTIVATION_REQUIRED") {
    return Response.json(
      {
        error:
          "Bokningsformuläret behöver aktiveras. Be ägaren öppna aktiveringslänken i Glansbilvatt@gmail.com (skickas av FormSubmit vid första bokningen).",
        code: "FORM_SUBMIT_ACTIVATION_REQUIRED",
      },
      { status: 503 },
    );
  }

  if (message.includes("Resend:")) {
    return Response.json(
      {
        error:
          "E-post kunde inte skickas via Resend. Kontrollera RESEND_API_KEY och RESEND_FROM i .env.local.",
        code: "RESEND_ERROR",
        detail: message,
      },
      { status: 502 },
    );
  }

  return Response.json(
    { error: "Kunde inte skicka bokningen. Försök igen eller ring oss.", code: "SEND_FAILED" },
    { status: 500 },
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!isValidPayload(body)) {
      return Response.json({ error: "Ogiltiga bokningsuppgifter." }, { status: 400 });
    }

    await sendBookingEmail(body, request.headers);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[api/booking]", error);
    return bookingErrorResponse(error);
  }
}
