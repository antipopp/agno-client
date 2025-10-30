/**
 * Converts a JSON object to markdown code block
 */
export function getJsonMarkdown(content: unknown): string {
  try {
    const jsonString = JSON.stringify(content, null, 2);
    return `\`\`\`json\n${jsonString}\n\`\`\``;
  } catch {
    return '```\nError formatting JSON\n```';
  }
}
