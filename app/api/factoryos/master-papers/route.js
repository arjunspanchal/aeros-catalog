import { requireSession } from "@/lib/factoryos/session";
import { listMasterPapers } from "@/lib/paper-rm";

export const runtime = "nodejs";

// Read-only list from the Paper RM Database base. Any logged-in user can read it —
// it's master catalogue data, not sensitive.
export async function GET() {
  try {
    requireSession();
    const masterPapers = await listMasterPapers();
    return Response.json({ masterPapers });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
