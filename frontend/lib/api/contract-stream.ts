import { ApiClientError, refreshSession } from "@/lib/api/client";

export async function readContractStream<TEvent>(
  url: string,
  body: object | undefined,
  onEvent: (event: TEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (body !== undefined) return consumeStream(url, body, onEvent, signal);
  // Backend heartbeats arrive every 15 seconds; a silent connection should fall back to polling.
  const controller = new AbortController();
  let idle: ReturnType<typeof setTimeout>;
  const touch = () => {
    clearTimeout(idle);
    idle = setTimeout(() => controller.abort(new DOMException("Luồng rà soát mất kết nối.", "TimeoutError")), 45_000);
  };
  touch();
  try {
    return await consumeStream(url, body, onEvent, AbortSignal.any([controller.signal, ...(signal ? [signal] : [])]), touch);
  } finally {
    clearTimeout(idle!);
    controller.abort();
  }
}

async function consumeStream<TEvent>(
  url: string,
  body: object | undefined,
  onEvent: (event: TEvent) => void,
  signal?: AbortSignal,
  touch?: () => void,
): Promise<void> {
  const options: RequestInit = {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
    signal,
  };
  let response = await fetch(url, options);
  touch?.();
  if (response.status === 401 && body === undefined) {
    await response.body?.cancel();
    await refreshSession();
    signal?.throwIfAborted();
    response = await fetch(url, options);
  }
  if (!response.ok || !response.body) {
    const payload = await response.json().catch(() => null);
    throw new ApiClientError(payload?.error?.message ?? "Không thể bắt đầu luồng AI.", { status: response.status });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completed = false;
  const handleFrame = (frame: string) => {
    const lines = frame.split("\n");
    const event = lines.find((line) => line.startsWith("event:"))?.slice(6).trim();
    const data = lines.filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n");
    // Heartbeats are SSE comments (": ping") and carry no event or data.
    if (!event || !data) return;
    const parsed = JSON.parse(data);
    if (event === "error") throw new ApiClientError(parsed.message ?? "Luồng AI bị lỗi.", { status: parsed.status });
    if (event === "done") completed = true;
    onEvent({ event, data: parsed } as TEvent);
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      touch?.();
      buffer += decoder.decode(value, { stream: !done });
      buffer = buffer.replace(/\r\n/g, "\n");
      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1 && !completed) {
        handleFrame(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf("\n\n");
      }
      if (completed) { await reader.cancel(); break; }
      if (done) break;
    }
    if (!completed && buffer.trim()) handleFrame(buffer);
    if (!completed) throw new ApiClientError("Luồng AI kết thúc trước khi hoàn tất. Vui lòng thử lại.");
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }
}
