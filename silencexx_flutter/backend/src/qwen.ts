import axios from 'axios';
import { config } from './config';
import { beginUsage, finishUsage, TokenUsage } from './aiUsage';

export interface AIMessage { role: 'system' | 'user' | 'assistant'; content: string; }
export function parseUsage(raw: any): TokenUsage | undefined {
  const valid = (n: unknown): n is number => Number.isSafeInteger(n) && Number(n) >= 0;
  if (!valid(raw?.prompt_tokens) || !valid(raw?.completion_tokens)) return undefined;
  const cachedInput = raw.prompt_tokens_details?.cached_tokens ?? 0;
  const reasoning = raw.completion_tokens_details?.reasoning_tokens ?? 0;
  if (!valid(cachedInput) || cachedInput > raw.prompt_tokens || !valid(reasoning) || reasoning > raw.completion_tokens) return undefined;
  return { input: raw.prompt_tokens, output: raw.completion_tokens, cachedInput, reasoning };
}
export function tokenCost(usage: TokenUsage, rates = { input: config.qwenInputPrice, cached: config.qwenCachedInputPrice, output: config.qwenOutputPrice }): number {
  return ((usage.input - usage.cachedInput) * rates.input + usage.cachedInput * rates.cached + usage.output * rates.output) / 1_000_000;
}
export async function completeQwen(messages: AIMessage[], options: { feature: string; maxTokens?: number; temperature?: number; json?: boolean }) {
  if (!config.qwenApiKey) throw new Error('Qwen API key is missing. Set QWEN_API_KEY on the backend.');
  if (!config.qwenBaseUrl.startsWith('https://')) throw new Error('Qwen API requires HTTPS');
  const singapore = new URL(config.qwenBaseUrl).hostname === 'dashscope-intl.aliyuncs.com' || new URL(config.qwenBaseUrl).hostname.endsWith('.ap-southeast-1.maas.aliyuncs.com');
  if ((!singapore || (config.qwenModel !== 'qwen-flash' && config.qwenModel !== 'qwen-flash-2025-07-28')) &&
      (!process.env.QWEN_INPUT_USD_PER_MILLION || !process.env.QWEN_OUTPUT_USD_PER_MILLION || !process.env.QWEN_CACHED_INPUT_USD_PER_MILLION)) {
    throw new Error('Set token prices for the selected Qwen model and region');
  }
  if (messages.reduce((n, m) => n + m.content.length, 0) > config.qwenMaxInputChars) throw new Error('AI context is too long');
  const id = await beginUsage(options.feature); // Do not spend money if the ledger cannot accept the request.
  const start = Date.now();
  let data: any;
  try {
    const response = await axios.post(`${config.qwenBaseUrl}/chat/completions`, {
      model: config.qwenModel, messages, stream: false, enable_thinking: false,
      max_tokens: options.maxTokens ?? config.qwenMaxOutputTokens, temperature: options.temperature ?? 0.6,
      ...(options.json ? { response_format: { type: 'json_object' } } : {}),
    }, { headers: { Authorization: `Bearer ${config.qwenApiKey}`, 'Content-Type': 'application/json' }, timeout: config.qwenTimeoutMs });
    data = response.data;
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    const definitelyRejected = status !== undefined && [400,401,403,404,422,429].includes(status);
    await finishUsage(id, { status: definitelyRejected ? 'error' : 'unknown',
      ...(definitelyRejected ? { costUsd: 0 } : {}), latencyMs: Date.now() - start,
      errorCode: status ? `HTTP_${status}` : 'NETWORK_OR_TIMEOUT' });
    // Never log Axios errors: their request config contains the API key and message text.
    throw new Error(`Qwen request failed (${status ?? 'network/timeout'}). Please try later.`);
  }
  const usage = parseUsage(data?.usage);
  const content = data?.choices?.[0]?.message?.content;
  const finishReason = data?.choices?.[0]?.finish_reason;
  const validContent = typeof content === 'string' && content.trim().length > 0;
  await finishUsage(id, { status: usage ? (validContent ? 'success' : 'error') : 'unknown', usage,
    costUsd: usage ? tokenCost(usage) : undefined, providerRequestId: data?.id,
    servedOutputTokens: validContent ? (usage ? usage.output - usage.reasoning : undefined) : 0,
    latencyMs: Date.now() - start, errorCode: validContent ? undefined : 'EMPTY_RESPONSE' });
  if (!validContent) throw new Error('Qwen returned an empty response');
  return { text: content.trim() as string, usage, finishReason, providerRequestId: data?.id as string | undefined };
}
