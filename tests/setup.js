import { afterEach } from "vitest";

if (typeof window !== "undefined") {
  const { cleanup } = await import("@testing-library/react");
  afterEach(cleanup);
  // jsdom 30 does not implement these; components call them.
  Element.prototype.scrollIntoView ||= function scrollIntoView() {};
  window.matchMedia ||= (query) => ({
    matches: false, media: query, onchange: null,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; },
  });
}
