import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import "../shared/i18n";

afterEach(() => {
  cleanup();
});

class ResizeObserverMock {
  observe() {}

  unobserve() {}

  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) =>
  setTimeout(cb, 0) as unknown as number,
);
vi.stubGlobal("cancelAnimationFrame", (id: number) => {
  clearTimeout(id);
});

const canvasContextMock = {
  arc: vi.fn(),
  beginPath: vi.fn(),
  clearRect: vi.fn(),
  drawImage: vi.fn(),
  fill: vi.fn(),
  lineTo: vi.fn(),
  moveTo: vi.fn(),
  restore: vi.fn(),
  save: vi.fn(),
  setTransform: vi.fn(),
  stroke: vi.fn(),
};

Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  configurable: true,
  value: vi.fn(() => canvasContextMock),
});

Object.defineProperty(HTMLCanvasElement.prototype, "toDataURL", {
  configurable: true,
  value: vi.fn(() => "data:image/jpeg;base64,frame"),
});

Object.defineProperty(HTMLMediaElement.prototype, "play", {
  configurable: true,
  value: vi.fn().mockResolvedValue(undefined),
});

Object.defineProperty(HTMLMediaElement.prototype, "readyState", {
  configurable: true,
  get: () => 4,
});

Object.defineProperty(HTMLVideoElement.prototype, "videoWidth", {
  configurable: true,
  get: () => 640,
});

Object.defineProperty(HTMLVideoElement.prototype, "videoHeight", {
  configurable: true,
  get: () => 480,
});

Object.defineProperty(HTMLVideoElement.prototype, "getBoundingClientRect", {
  configurable: true,
  value: () => ({
    width: 640,
    height: 480,
    top: 0,
    left: 0,
    right: 640,
    bottom: 480,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  }),
});

Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
  configurable: true,
  value: vi.fn().mockResolvedValue(undefined),
});

Object.defineProperty(document, "exitFullscreen", {
  configurable: true,
  value: vi.fn().mockResolvedValue(undefined),
});
