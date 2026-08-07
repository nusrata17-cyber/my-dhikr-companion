import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { DHIKR_LIST, getDhikr } from "@/lib/dhikr/data";
import { matchTranscript, prepareReferences, describeReason } from "@/lib/dhikr/matcher";

export default defineTool({
  name: "count_dhikr_in_text",
  title: "Count dhikr in text",
  description:
    "Run the app's recognition matcher over a transcript and count complete, non-overlapping repetitions of a dhikr. Accepts Arabic script or Latin transliteration.",
  inputSchema: {
    id: z
      .string()
      .describe(`Dhikr id to count. One of: ${DHIKR_LIST.map((d) => d.id).join(", ")}`),
    text: z.string().describe("Transcript to analyse, e.g. 'subhanallah subhanallah'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ id, text }) => {
    const dhikr = getDhikr(id.trim());
    if (!dhikr) {
      throw new ToolError(
        `Unknown dhikr id "${id}". Available ids: ${DHIKR_LIST.map((d) => d.id).join(", ")}`,
      );
    }
    const result = matchTranscript(text, prepareReferences(dhikr.canonical));
    return {
      content: [
        {
          type: "text" as const,
          text: `Counted ${result.count} × ${dhikr.transliteration} (best match score ${result.bestScore.toFixed(2)}) — ${describeReason(result.reason)}`,
        },
      ],
      structuredContent: {
        id: dhikr.id,
        count: result.count,
        accepted: result.accepted,
        reason: result.reason,
        bestScore: result.bestScore,
        normalized: result.normalized,
      },
    };
  },
});
