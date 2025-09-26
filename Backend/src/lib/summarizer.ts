import { pipeline, env, Pipeline } from '@xenova/transformers';

env.localModelPath = './.models';
env.allowLocalModels = true;

let pipe: Pipeline | null = null;
let boot: Promise<Pipeline> | null = null;

async function getPipe() {
  if (pipe) return pipe;
  if (!boot) {
    // small, fast CPU summarizer
    boot = pipeline('summarization', 'Xenova/distilbart-cnn-6-6') as unknown as Promise<Pipeline>;
  }
  pipe = await boot;
  return pipe!;
}

export async function summarize(text: string, maxNewTokens = 48) {
  if (!text || text.length < 80) return text || '';
  const p = await getPipe();
  const out = await p(text, { max_new_tokens: maxNewTokens, min_new_tokens: 10 });
  const s = Array.isArray(out) ? out[0]?.summary_text : (out as any)?.summary_text;
  return (s || '').trim();
}
// Add this to your summarizer file
export async function summarizeBatch(texts: string[], maxNewTokens = 48): Promise<string[]> {
  if (!texts || texts.length === 0) return [];
  
  const p = await getPipe();
  
  // Filter and prepare texts for batch processing
  const processableTexts = texts.map(text => {
    if (!text || text.length < 80) return text || '';
    return text;
  });
  
  // Batch process all texts at once
  const results = await Promise.all(
    processableTexts.map(async (text) => {
      if (text.length < 80) return text;
      try {
        const out = await p(text, { max_new_tokens: maxNewTokens, min_new_tokens: 10 });
        const s = Array.isArray(out) ? out[0]?.summary_text : (out as any)?.summary_text;
        return (s || '').trim() || text;
      } catch (error) {
        console.warn('Summarization failed for text, using original:', error);
        return text;
      }
    })
  );
  
  return results;
}