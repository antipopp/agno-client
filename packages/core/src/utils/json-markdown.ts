/**
 * Converts a JSON object to markdown code block
 */
const JSON_FORMATTING_ERROR = "```\nError formatting JSON\n```";

export function getJsonMarkdown(content: unknown): string {
  try {
    const jsonString = JSON.stringify(content, null, 2);
    if (jsonString === undefined) {
      return JSON_FORMATTING_ERROR;
    }
    return `\`\`\`json\n${jsonString}\n\`\`\``;
  } catch {
    return JSON_FORMATTING_ERROR;
  }
}
