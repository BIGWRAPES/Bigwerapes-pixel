export interface ProviderRequest {
  systemInstruction: string;
  userContent: string;
}

export interface TextGenerationProvider {
  generateText(request: ProviderRequest, signal: AbortSignal): Promise<string>;
}

const model = '@cf/qwen/qwen3-30b-a3b-fp8';
const maxProviderResponseBytes = 128 * 1024;
const maxOutputTokens = 768;

class ProviderError extends Error {
  readonly status: number;

  constructor(status: number) {
    super('The text provider request failed.');
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

async function readProviderResponse(response: Response): Promise<unknown> {
  const contentLength = response.headers.get('Content-Length');
  if (contentLength && Number(contentLength) > maxProviderResponseBytes) {
    await response.body?.cancel().catch(() => {});
    throw new ProviderError(502);
  }

  if (!response.body) throw new ProviderError(502);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxProviderResponseBytes) {
        await reader.cancel().catch(() => {});
        throw new ProviderError(502);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  try {
    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new ProviderError(502);
  }
}

class CloudflareWorkersAiProvider implements TextGenerationProvider {
  private readonly accountId: string;
  private readonly apiToken: string;

  constructor(accountId: string, apiToken: string) {
    this.accountId = accountId;
    this.apiToken = apiToken;
  }

  async generateText(request: ProviderRequest, signal: AbortSignal): Promise<string> {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/v1/chat/completions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: request.systemInstruction },
            { role: 'user', content: request.userContent },
          ],
          max_tokens: maxOutputTokens,
          stream: false,
          temperature: 0.4,
        }),
        signal,
      },
    );

    if (!response.ok) throw new ProviderError(response.status);
    const contentType = response.headers.get('Content-Type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      await response.body?.cancel().catch(() => {});
      throw new ProviderError(502);
    }

    const body: unknown = await readProviderResponse(response);
    if (!isRecord(body) || !Array.isArray(body.choices)) throw new ProviderError(502);
    const firstChoice = body.choices[0];
    if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) throw new ProviderError(502);
    const content = firstChoice.message.content;
    if (typeof content !== 'string' || !content.trim()) throw new ProviderError(502);

    return content.trim().slice(0, 8000);
  }
}

export function getTextGenerationProvider(): TextGenerationProvider | null {
  const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID')?.trim();
  const apiToken = Deno.env.get('CLOUDFLARE_API_TOKEN')?.trim();
  if (!accountId && !apiToken) return null;
  if (!accountId || !/^[a-f0-9]{32}$/i.test(accountId) || !apiToken || /[\r\n]/.test(apiToken)) {
    throw new Error('The text provider configuration is invalid.');
  }
  return new CloudflareWorkersAiProvider(accountId, apiToken);
}
