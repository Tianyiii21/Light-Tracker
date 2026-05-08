import { Router } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { GeneratePoetryBody } from "@workspace/api-zod";

const router = Router();

const FALLBACK_QUOTES: Record<string, string[]> = {
  morning_quote: [
    "Today feels softer somehow.",
    "The light stayed a little longer.",
    "Some moments quietly mattered.",
    "Even ordinary days glow a little.",
    "The world was gentle in places.",
  ],
  gratitude_header: [
    "Small lights still found me today.",
    "Some moments deserve the sky.",
    "There was warmth hidden in today.",
    "Today held things worth keeping.",
    "Light arrives in quiet ways.",
  ],
  closing_line: [
    "Tonight will keep this light safe.",
    "The ocean remembers gentle things.",
    "Your light made tonight's sky a little warmer.",
    "These small things mattered.",
    "The sky holds what you've released.",
  ],
};

const PROMPTS: Record<string, string> = {
  morning_quote:
    'Write one short, quietly poetic sentence (under 12 words) for a morning gratitude journal. Tone: observational, emotionally honest, gently hopeful — never motivational or prescriptive. Examples: "Today feels softer somehow." / "Some moments quietly mattered." / "The light stayed a little longer." Return only the sentence, nothing else.',
  gratitude_header:
    'Write one short poetic sentence (under 12 words) to open a gratitude journal page. Tone: gentle, quietly hopeful, grounded. Examples: "Small lights still found me today." / "Some moments deserve the sky." / "There was warmth hidden in today." Return only the sentence, nothing else.',
  closing_line:
    'Write one short, warm, emotionally grounding closing line (under 15 words) for a gratitude journaling app, shown after the user releases their lantern. Tone: intimate, quietly grateful, human — not inspirational or motivational. Examples: "Tonight will keep this light safe." / "The ocean remembers gentle things." / "Your light made tonight\'s sky a little warmer." Return only the sentence.',
};

function pickFallback(type: string): string {
  const list = FALLBACK_QUOTES[type] ?? FALLBACK_QUOTES.morning_quote;
  return list[Math.floor(Math.random() * list.length)];
}

router.post("/poetry/generate", async (req, res) => {
  const parsed = GeneratePoetryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { type } = parsed.data;
  const prompt = PROMPTS[type];

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 100,
      messages: [{ role: "user", content: prompt }],
    });

    const block = message.content[0];
    const text = block.type === "text" ? block.text.trim() : pickFallback(type);
    res.json({ text });
  } catch {
    res.json({ text: pickFallback(type) });
  }
});

export default router;
