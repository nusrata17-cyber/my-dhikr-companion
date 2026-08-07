import { defineTool } from "@lovable.dev/mcp-js";
import { DHIKR_LIST } from "@/lib/dhikr/data";

export default defineTool({
  name: "list_dhikr",
  title: "List dhikr phrases",
  description:
    "List every dhikr phrase supported by My Dhikr Companion, with its Arabic text, transliteration and English meaning.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const items = DHIKR_LIST.map((d) => ({
      id: d.id,
      arabic: d.arabic,
      transliteration: d.transliteration,
      meaning: d.meaning,
    }));
    return {
      content: [
        {
          type: "text" as const,
          text: items
            .map((d) => `${d.transliteration} (${d.arabic}) — ${d.meaning} [id: ${d.id}]`)
            .join("\n"),
        },
      ],
      structuredContent: { items },
    };
  },
});
