import { proxyDocumentChat } from "@/_lib/chat-proxy";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyDocumentChat(request, id);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyDocumentChat(request, id);
}
