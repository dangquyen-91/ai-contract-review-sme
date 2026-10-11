import { mutateLegalSource } from "@/lib/api/legal-source-proxy";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  return mutateLegalSource(request, (await context.params).id);
}
