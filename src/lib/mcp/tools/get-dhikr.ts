import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { DHIKR_LIST, getDhikr } from "@/lib/dhikr/data";

export default defineTool({
  name: "get_dhikr",
  title: "Get a dhikr phrase",
  description:
    "Get one dhikr phrase by id, including its Arabic text, transliteration, English meaning and the pronunciation variants the counter accepts.",
  inputSchema: {
    id: z
      .string()
      .describe(`Dhikr id. One of: ${DHIKR_LIST.map((d) => d.id).join(", ")}`),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ id }) => {
    const dhikr = getDhikr(id.trim());
    if (!dhikr) {
      throw new ToolError(
        `Unknown dhikr id "${id}". Available ids: ${DHIKR_LIST.map((d) => d.id).join(", ")}`,
      );
    }
    return {
      content: [
        {
          type: "text" as const,
          text: `${dhikr.transliteration} (${dhikr.arabic})\nMeaning: ${dhikr.meaning}\nAccepted variants: ${dhikr.canonical.join(" | ")}`,
        },
      ],
      structuredContent: {
        id: dhikr.id,
        arabic: dhikr.arabic,
        transliteration: dhikr.transliteration,
        meaning: dhikr.meaning,
        variants: dhikr.canonical,
      },
    };
  },
});
