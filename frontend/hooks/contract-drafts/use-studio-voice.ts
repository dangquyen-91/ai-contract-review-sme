"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type RecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type RecognitionConstructor = new () => Recognition;
const constructor = () => {
  if (typeof window === "undefined") return undefined;
  const browser = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
};
const subscribe = () => () => {};

export function useStudioVoice(onTranscript: (value: string) => void) {
  const supported = useSyncExternalStore(
    subscribe,
    () => Boolean(constructor()),
    () => false,
  );
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const recognition = useRef<Recognition | null>(null);
  const callback = useRef(onTranscript);
  useEffect(() => {
    callback.current = onTranscript;
  }, [onTranscript]);
  useEffect(
    () => () => {
      if (recognition.current) {
        recognition.current.onresult = null;
        recognition.current.onerror = null;
        recognition.current.onend = null;
        recognition.current.abort();
      }
    },
    [],
  );

  function toggle() {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const Speech = constructor();
    if (!Speech) {
      setError(
        "Trình duyệt chưa hỗ trợ nhập giọng nói. Bạn vẫn có thể nhập yêu cầu bằng bàn phím.",
      );
      return;
    }
    const next = new Speech();
    next.lang = "vi-VN";
    next.continuous = false;
    next.interimResults = true;
    next.onresult = (event) => {
      let pending = "";
      for (
        let index = event.resultIndex;
        index < event.results.length;
        index++
      ) {
        const result = event.results[index];
        if (result.isFinal) callback.current(result[0].transcript.trim());
        else pending += result[0].transcript;
      }
      setInterim(pending);
    };
    next.onerror = (event) => {
      const messages: Record<string, string> = {
        "not-allowed":
          "Chưa được cấp quyền micro. Vui lòng cho phép micro trong trình duyệt.",
        "audio-capture": "Không tìm thấy micro đang hoạt động.",
        "no-speech": "Chưa nghe rõ giọng nói. Bạn có thể thử lại.",
        network:
          "Dịch vụ nhận giọng nói chưa kết nối được. Bạn có thể nhập bằng bàn phím.",
      };
      if (event.error !== "aborted")
        setError(
          messages[event.error] ??
            "Chưa nhận được giọng nói. Vui lòng thử lại.",
        );
      setListening(false);
      setInterim("");
    };
    next.onend = () => {
      setListening(false);
      setInterim("");
      recognition.current = null;
    };
    recognition.current = next;
    setError("");
    setInterim("");
    try {
      next.start();
      setListening(true);
    } catch {
      setError("Chưa mở được micro. Vui lòng thử lại.");
    }
  }
  return { supported, listening, interim, error, toggle };
}
