import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildCspHeader,
  CSP_HEADER_VALUE,
  PERCORIUM_CSP_DIRECTIVES,
  SECURITY_HEADERS,
} from "./csp";
import cspMiddleware from "../../../server/middleware/00-csp";

describe("Content Security Policy & Defense-in-Depth Headers", () => {
  it("enforces strict script execution boundaries", () => {
    const scripts = PERCORIUM_CSP_DIRECTIVES["script-src"];
    assert.ok(scripts.includes("'self'"));
    assert.ok(!scripts.includes("*"), "Wildcard scripts must never be allowed");
    assert.ok(!scripts.includes("http:"), "Insecure HTTP scripts must never be allowed");

    // Object src must be none
    assert.deepEqual(PERCORIUM_CSP_DIRECTIVES["object-src"], ["'none'"]);
    // Base uri must be self
    assert.deepEqual(PERCORIUM_CSP_DIRECTIVES["base-uri"], ["'self'"]);
    // Form action must be self
    assert.deepEqual(PERCORIUM_CSP_DIRECTIVES["form-action"], ["'self'"]);
  });

  it("permits only trusted 0x domains in connect-src", () => {
    const connect = PERCORIUM_CSP_DIRECTIVES["connect-src"];
    assert.ok(connect.includes("https://api.0x.org"));
    assert.ok(connect.includes("https://gas.api.0x.org"));
    assert.ok(connect.includes("https://*.0x.org"));
  });

  it("permits DexScreener in connect-src, frame-src, and img-src", () => {
    const connect = PERCORIUM_CSP_DIRECTIVES["connect-src"];
    assert.ok(connect.includes("https://dexscreener.com"));
    assert.ok(connect.includes("https://api.dexscreener.com"));
    assert.ok(connect.includes("https://*.dexscreener.com"));

    const frames = PERCORIUM_CSP_DIRECTIVES["frame-src"];
    assert.ok(frames.includes("https://dexscreener.com"));
    assert.ok(frames.includes("https://*.dexscreener.com"));

    const images = PERCORIUM_CSP_DIRECTIVES["img-src"];
    assert.ok(images.includes("https://dexscreener.com"));
    assert.ok(images.includes("https://*.dexscreener.com"));
  });

  it("permits official Base RPC and fallbacks in connect-src", () => {
    const connect = PERCORIUM_CSP_DIRECTIVES["connect-src"];
    assert.ok(connect.includes("https://mainnet.base.org"));
    assert.ok(connect.includes("https://*.base.org"));
    assert.ok(connect.includes("wss://mainnet.base.org"));
    assert.ok(connect.includes("wss://*.base.org"));
    assert.ok(connect.includes("https://base-rpc.publicnode.com"));
  });

  it("allows safe embedding inside Google AI Studio and sandbox frames", () => {
    const ancestors = PERCORIUM_CSP_DIRECTIVES["frame-ancestors"];
    assert.ok(ancestors.includes("https://ai.studio"));
    assert.ok(ancestors.includes("https://*.run.app"));
    assert.ok(ancestors.includes("https://*.google.com"));
  });

  it("formats buildCspHeader properly into semicolon-separated directives", () => {
    const header = buildCspHeader();
    assert.ok(header.includes("default-src 'self'"));
    assert.ok(header.includes("connect-src"));
    assert.ok(header.includes("object-src 'none'"));
    assert.equal(header, CSP_HEADER_VALUE);
  });

  it("includes security headers in SECURITY_HEADERS map", () => {
    assert.equal(SECURITY_HEADERS["X-Content-Type-Options"], "nosniff");
    assert.equal(
      SECURITY_HEADERS["Referrer-Policy"],
      "strict-origin-when-cross-origin",
    );
    assert.equal(
      SECURITY_HEADERS["Permissions-Policy"],
      "camera=(), microphone=(), geolocation=()",
    );
    assert.equal(
      SECURITY_HEADERS["Content-Security-Policy"],
      CSP_HEADER_VALUE,
    );
  });

  it("attaches CSP and security headers via Nitro middleware", async () => {
    const mockEvent = {
      url: new URL("https://example.com/"),
      req: { method: "GET", headers: new Headers() },
    };

    const mockResponse = new Response("<html><body>Percorium</body></html>", {
      status: 200,
      headers: { "content-type": "text/html" },
    });

    const intercepted = (await cspMiddleware(
      mockEvent,
      async () => mockResponse,
    )) as Response;

    assert.ok(intercepted instanceof Response);
    assert.equal(
      intercepted.headers.get("Content-Security-Policy"),
      CSP_HEADER_VALUE,
    );
    assert.equal(intercepted.headers.get("X-Content-Type-Options"), "nosniff");
    assert.equal(
      intercepted.headers.get("Referrer-Policy"),
      "strict-origin-when-cross-origin",
    );
    assert.equal(await intercepted.text(), "<html><body>Percorium</body></html>");
  });
});
