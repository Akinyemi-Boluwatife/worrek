import { api } from "@/_lib/apiConstants";

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return Response.json({ message: "Malformed upload." }, { status: 400 });
  }

  const cookie = request.headers.get("cookie") ?? undefined;

  try {
    const response = await api.uploadDocument(formData, cookie);

    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    console.error(
      "Document upload proxy failed:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return Response.json(
      {
        message:
          "We couldn't upload this document right now. Please try again.",
      },
      { status: 502 },
    );
  }
}
