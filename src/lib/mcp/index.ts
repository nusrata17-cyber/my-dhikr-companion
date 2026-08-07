import { defineMcp } from "@lovable.dev/mcp-js";
import listDhikrTool from "./tools/list-dhikr";
import getDhikrTool from "./tools/get-dhikr";
import countDhikrInTextTool from "./tools/count-dhikr-in-text";

export default defineMcp({
  name: "my-dhikr-companion",
  title: "My Dhikr Companion",
  version: "0.1.0",
  instructions:
    "Tools for My Dhikr Companion, a voice-counting dhikr app. Use `list_dhikr` to see the supported phrases, `get_dhikr` for one phrase's Arabic text, meaning and accepted pronunciation variants, and `count_dhikr_in_text` to count repetitions of a dhikr inside a transcript. Personal counts, sessions and history stay on the user's device and are not available here.",
  tools: [listDhikrTool, getDhikrTool, countDhikrInTextTool],
});
