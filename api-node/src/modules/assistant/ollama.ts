import { AppError } from "../../lib/errors";

// The free AI runs on this computer with Ollama (https://ollama.com); the API talks to it over HTTP.
//   OLLAMA_URL    where Ollama listens (default http://localhost:11434)
//   OLLAMA_MODEL  the model that answers (default qwen3:4b-instruct: answers without a long "thinking"
//                 step, fits a 4 GB graphics card, speaks Arabic and French, and can use tools).
//                 Download it once with: ollama pull qwen3:4b-instruct
// Without Ollama running, the assistant answers 503 "not available right now"; the rest of the shop works.

export type OllamaToolCall = { function: { name: string; arguments: Record<string, unknown> } };
export type OllamaMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string; tool_calls?: OllamaToolCall[] }
  | { role: "tool"; content: string; tool_name: string };
export type OllamaTool = { type: "function"; function: { name: string; description: string; parameters: object } };
export type OllamaReply = { content: string; tool_calls?: OllamaToolCall[] };

const offline = () => new AppError(503, "ASSISTANT_OFFLINE", "The assistant is not available right now. Please try again later.");
const url = () => process.env.OLLAMA_URL ?? "http://localhost:11434";
const model = () => process.env.OLLAMA_MODEL ?? "qwen3:4b-instruct";

// Does the model "think" before answering? Then its reasoning is asked for in a separate field
// (and dropped), so it never shows in the answer. Models that don't think refuse that setting.
// Asked once per model.
const thinks = new Map<string, Promise<boolean>>();
function modelThinks(name: string) {
  if (!thinks.has(name)) {
    const answer = fetch(`${url()}/api/show`, { method: "POST", body: JSON.stringify({ model: name }), signal: AbortSignal.timeout(10_000) })
      .then((res) => (res.ok ? (res.json() as Promise<{ capabilities?: string[] }>) : { capabilities: [] }))
      .then((info) => info.capabilities?.includes("thinking") ?? false)
      .catch(() => {
        thinks.delete(name); // Ollama not running yet: ask again next time
        return false;
      });
    thinks.set(name, answer);
  }
  return thinks.get(name)!;
}

export const ollama = {
  // One round: the conversation so far and the tools it may use -> an answer, or tool calls to run first.
  async chat(messages: OllamaMessage[], tools: OllamaTool[]): Promise<OllamaReply> {
    const name = model();
    let res: Response;
    try {
      res = await fetch(`${url()}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: name,
          messages,
          tools,
          stream: false,
          ...((await modelThinks(name)) && { think: true }),
          keep_alive: "30m", // keep the model loaded between questions
          options: { temperature: 0.2 }, // stick to the data rather than be creative
        }),
        signal: AbortSignal.timeout(180_000), // a laptop without a graphics card is slow
      });
    } catch (err) {
      console.error("Ollama is not reachable:", err);
      throw offline();
    }
    if (!res.ok) {
      console.error(`Ollama answered ${res.status}:`, await res.text().catch(() => ""));
      throw offline();
    }
    const body = (await res.json()) as { message: OllamaReply };
    return body.message;
  },
};
