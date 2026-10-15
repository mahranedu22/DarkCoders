import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const { MAX_AUDIO_BYTES } = await import("@/lib/ai/gateway.server");

        const declared = Number(request.headers.get("content-length") ?? 0);
        if (declared && declared > MAX_AUDIO_BYTES) {
          return new Response(JSON.stringify({ error: "Recording is too long" }), {
            status: 413,
            headers: { "Content-Type": "application/json" },
          });
        }

        let file: File | null = null;
        try {
          const form = await request.formData();
          const value = form.get("file");
          if (value instanceof File) file = value;
        } catch {
          file = null;
        }
        if (!file || !file.size) {
          return new Response(JSON.stringify({ error: "No audio received" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        // If GEMINI_API_KEY is present, transcribe via Gemini multimodal audio
        const apiKey = process.env["GEMINI_API_KEY"];
        if (apiKey) {
          try {
            const arrayBuffer = await file.arrayBuffer();
            const base64Data = Buffer.from(arrayBuffer).toString("base64");
            const mimeType = file.type && file.type.startsWith("audio/") ? file.type : "audio/wav";

            let modelName = process.env["GEMINI_MODEL"] || "gemini-3.5-flash";
            if (modelName === "gemini-2.5-flash") modelName = "gemini-3.5-flash";
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

            const geminiRes = await fetch(geminiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: request.signal,
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        text: "Transcribe this audio recording verbatim. Output only the spoken words, with no explanations, no preamble, and no markdown fences.",
                      },
                      {
                        inlineData: {
                          mimeType,
                          data: base64Data,
                        },
                      },
                    ],
                  },
                ],
              }),
            });

            if (!geminiRes.ok) {
              const errText = await geminiRes.text();
              throw new Error(`Gemini transcription error (${geminiRes.status}): ${errText.slice(0, 200)}`);
            }

            const data = (await geminiRes.json()) as {
              candidates?: Array<{
                content?: { parts?: Array<{ text?: string }> };
              }>;
            };

            const text = data.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text?.trim() ?? "";
            const ssePayload = `data: ${JSON.stringify({ type: "transcript.text.done", text })}\n\n`;

            return new Response(ssePayload, {
              status: 200,
              headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
              },
            });
          } catch (error) {
            if (request.signal.aborted) return new Response(null, { status: 499 });
            const message = error instanceof Error ? error.message : "Transcription failed";
            return new Response(JSON.stringify({ error: message }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }
        }

        // Fallback to original gateway transcribe
        try {
          const { transcribe } = await import("@/lib/ai/transcribe.server");
          const upstream = await transcribe(file, request.signal);
          const headers = new Headers({ "Cache-Control": "no-cache" });
          headers.set("Content-Type", upstream.headers.get("Content-Type") ?? "text/event-stream");
          return new Response(upstream.body, { status: upstream.status, headers });
        } catch (error) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          const message = error instanceof Error ? error.message : "Transcription failed";
          return new Response(JSON.stringify({ error: message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
