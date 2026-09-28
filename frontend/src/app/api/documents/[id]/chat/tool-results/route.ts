import { proxyDocumentChat } from "@/_lib/chatProxy";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyDocumentChat(request, id, "/tool-results");
}
