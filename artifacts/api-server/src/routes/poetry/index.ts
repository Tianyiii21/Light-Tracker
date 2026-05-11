import { Router } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { GeneratePoetryBody } from "@workspace/api-zod";

const router = Router();

const FALLBACK_QUOTES: Record<string, string[]> = {
  morning_quote: [
    "You showed up today, and that was enough.",
    "Something in you kept going today.",
    "Today held more than you might have noticed.",
    "You carried today with more grace than you knew.",
    "The fact that you are here says something.",
    "Quiet days count too.",
    "You did more good today than you realise.",
    "Rest is part of the work too.",
    "Today was yours, even the hard parts.",
    "Something small you did today mattered.",
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
    'Write one short reflective sentence (under 12 words) for an evening gratitude journaling app. The tone should feel like a wise, warm friend noticing something true and human about ordinary days — emotionally intelligent, quietly encouraging, and grounded in real life experience. Avoid abstract imagery, nature metaphors, or poetic flourishes. Speak directly to the person. Examples of the right tone: "You showed up today, and that was enough." / "Something in you kept going today." / "Today held more than you might have noticed." / "You carried today with more grace than you knew." Return only the sentence, nothing else.',
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
