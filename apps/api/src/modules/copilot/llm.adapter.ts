import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import {
  SYSTEM_PROMPTS, DEFAULT_CHAT_MODEL, redactPii, detectPromptInjection, MODEL_DEFAULTS,
} from "@nexus/ai-contracts";
import type { Env } from "../../config/env.js";
import type { CopilotWorkflow } from "@nexus/shared";

type StreamChunk = { token: string; done?: boolean; model?: string; tokens?: { prompt: number; output: number } };

export class LlmAdapter {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;

  constructor(private env: Env) {
    if (env.LLM_PROVIDER === "anthropic" && env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    } else if (env.LLM_PROVIDER === "openai" && env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    }
  }

  get isAvailable(): boolean {
    return this.anthropic !== null || this.openai !== null;
  }

  get provider(): "anthropic" | "openai" | "fallback" {
    if (this.anthropic) return "anthropic";
    if (this.openai) return "openai";
    return "fallback";
  }

  async *streamChat(
    workflow: CopilotWorkflow | "default",
    userMessage: string,
    context?: string,
  ): AsyncGenerator<StreamChunk> {
    const sanitized = redactPii(userMessage);
    if (detectPromptInjection(sanitized)) {
      yield { token: "I cannot process that request due to safety policies.", done: true, model: "safety-filter" };
      return;
    }

    const systemPrompt = SYSTEM_PROMPTS[workflow as keyof typeof SYSTEM_PROMPTS] ?? SYSTEM_PROMPTS.default;
    const fullSystem = context ? `${systemPrompt}\n\n--- Context ---\n${context}` : systemPrompt;

    if (this.anthropic) {
      yield* this.streamAnthropic(sanitized, fullSystem);
    } else if (this.openai) {
      yield* this.streamOpenAi(sanitized, fullSystem);
    } else {
      const response = this.fallbackResponse(sanitized, workflow);
      for (const char of response) {
        yield { token: char };
        await sleep(8);
      }
      yield { token: "", done: true, model: "nexus-analyst-v3-fallback", tokens: { prompt: 0, output: response.length } };
    }
  }

  private async *streamAnthropic(userMessage: string, systemPrompt: string): AsyncGenerator<StreamChunk> {
    const model = this.env.CHAT_MODEL || "claude-sonnet-4-6";
    const stream = this.anthropic!.messages.stream({
      model,
      max_tokens: MODEL_DEFAULTS.maxTokens ?? 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    let outputLen = 0;
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        const token = event.delta.text;
        if (token) {
          outputLen += token.length;
          yield { token };
        }
      }
    }
    const finalMsg = await stream.finalMessage();
    yield {
      token: "",
      done: true,
      model,
      tokens: {
        prompt: finalMsg.usage?.input_tokens ?? userMessage.length,
        output: finalMsg.usage?.output_tokens ?? outputLen,
      },
    };
  }

  private async *streamOpenAi(userMessage: string, systemPrompt: string): AsyncGenerator<StreamChunk> {
    const model = this.env.CHAT_MODEL || DEFAULT_CHAT_MODEL;
    const stream = await this.openai!.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: MODEL_DEFAULTS.temperature,
      max_tokens: MODEL_DEFAULTS.maxTokens,
      stream: true,
    });
    let outputLen = 0;
    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content ?? "";
      if (token) {
        outputLen += token.length;
        yield { token };
      }
    }
    yield { token: "", done: true, model, tokens: { prompt: userMessage.length, output: outputLen } };
  }

  /** Non-streaming completion for background tasks (recommendations, threat scoring, etc.). */
  async complete(systemPrompt: string, userMessage: string): Promise<string> {
    const sanitized = redactPii(userMessage);

    if (this.anthropic) {
      const model = this.env.CHAT_MODEL || "claude-sonnet-4-6";
      const msg = await this.anthropic.messages.create({
        model,
        max_tokens: MODEL_DEFAULTS.maxTokens ?? 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: sanitized }],
      });
      const block = msg.content[0];
      return block?.type === "text" ? block.text : "";
    }

    if (this.openai) {
      const model = this.env.CHAT_MODEL || DEFAULT_CHAT_MODEL;
      const completion = await this.openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: sanitized },
        ],
        temperature: MODEL_DEFAULTS.temperature,
        max_tokens: MODEL_DEFAULTS.maxTokens,
      });
      return completion.choices[0]?.message?.content ?? "";
    }

    return this.fallbackResponse(sanitized, "default");
  }

  private fallbackResponse(message: string, workflow: CopilotWorkflow | "default"): string {
    const p = message.toLowerCase();
    if (p.includes("inc-") || p.includes("incident") || workflow === "incident_explanation") {
      return `INC-1042 — Privileged IAM role attached outside change window.

• Severity: HIGH. Actor: build-runner-44 via OIDC.
• Blast radius: aws-prod root + secrets-vault (2 crown jewels reachable).
• Containment: revoke role binding, rotate trust policy, force re-auth on linked identities.

Proposed playbook: aws.revoke_role → vault.rotate → notify #soc-prod. Run it?

*[Degraded mode — configure ANTHROPIC_API_KEY for live LLM responses]*`;
    }
    if (p.includes("sigma") || p.includes("rule") || workflow === "query_generation") {
      return `\`\`\`yaml
title: LSASS Access via rundll32
id: 4f1c-detect-rundll32-lsass
status: experimental
logsource:
  product: windows
  category: process_access
detection:
  selection:
    SourceImage|endswith: '\\\\rundll32.exe'
    TargetImage|endswith: '\\\\lsass.exe'
  condition: selection
level: high
\`\`\`

Deploy to staging tenant?

*[Degraded mode — configure ANTHROPIC_API_KEY for live LLM responses]*`;
    }
    return `I analyzed the relevant telemetry across EDR, identity, and cloud control planes. Here is what I found:

• 3 correlated signals match the MITRE T1078 pattern over the past 4h.
• Two endpoints show beaconing to a domain registered <72h ago.
• Recommended next step: isolate edge-7f2a and revoke the impacted Okta session.

Want me to draft a containment runbook and open an incident?

*[Degraded mode — configure ANTHROPIC_API_KEY for live LLM responses]*`;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
