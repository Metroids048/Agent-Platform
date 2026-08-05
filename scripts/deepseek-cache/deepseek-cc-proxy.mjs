/**
 * Claude Code -> DeepSeek compatibility + cache-alignment proxy.
 * - Hoists role:"system" from messages[] into top-level `system`
 * - Strips x-anthropic-billing-header lines (cache prefix stability)
 * - Sorts tools[] by name (MCP churn mitigation)
 * - Strips cache_control (ignored by DeepSeek; reduces payload noise)
 */
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.DEEPSEEK_CC_PROXY_PORT || 18789);
const TARGET_HOST = "api.deepseek.com";
const LOG_PATH =
  process.env.DEEPSEEK_CC_PROXY_LOG ||
  path.join(path.dirname(fileURLToPath(import.meta.url)), "deepseek-cc-proxy.log");

const ATTRIBUTION_RE = /^x-anthropic-billing-header:/i;

function appendLog(line) {
  try {
    fs.appendFileSync(LOG_PATH, `${new Date().toISOString()} ${line}\n`, "utf8");
  } catch {
    /* ignore */
  }
}

function contentToText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((block) => {
      if (typeof block === "string") return block;
      if (block?.type === "text") return block.text ?? "";
      if (block?.type === "thinking") return block.thinking ?? "";
      return block?.text ?? block?.content ?? "";
    })
    .filter(Boolean)
    .join("\n");
}

function stripAttributionLines(text) {
  if (!text) return text;
  return text
    .split("\n")
    .filter((line) => !ATTRIBUTION_RE.test(line.trim()))
    .join("\n")
    .trim();
}

function stripCacheControlDeep(value) {
  if (Array.isArray(value)) return value.map(stripCacheControlDeep);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === "cache_control") continue;
      out[k] = stripCacheControlDeep(v);
    }
    return out;
  }
  return value;
}

function normalizeSystemField(system) {
  if (typeof system === "string") {
    return stripAttributionLines(system);
  }
  if (Array.isArray(system)) {
    const blocks = system
      .map((block) => {
        if (typeof block === "string") {
          const text = stripAttributionLines(block);
          return text ? { type: "text", text } : null;
        }
        if (block?.type === "text") {
          const text = stripAttributionLines(block.text ?? "");
          return text ? { ...block, text } : null;
        }
        return stripCacheControlDeep(block);
      })
      .filter(Boolean);
    return blocks.length ? blocks : undefined;
  }
  return system;
}

function stableToolSort(tools) {
  if (!Array.isArray(tools) || tools.length < 2) return tools;
  return [...tools].sort((a, b) => {
    const an = a?.name ?? "";
    const bn = b?.name ?? "";
    return an.localeCompare(bn);
  });
}

function fixAnthropicBody(raw) {
  const data = JSON.parse(raw);
  if (!Array.isArray(data.messages)) return raw;

  const systemParts = [];
  if (data.system) {
    const normalized = normalizeSystemField(data.system);
    if (typeof normalized === "string") {
      if (normalized) systemParts.push(normalized);
    } else if (Array.isArray(normalized)) {
      systemParts.push(contentToText(normalized));
    } else if (normalized) {
      systemParts.push(contentToText(normalized));
    }
  }

  data.messages = data.messages.filter((msg) => {
    if (msg.role !== "system") return true;
    const text = stripAttributionLines(contentToText(msg.content));
    if (text) systemParts.push(text);
    return false;
  });

  const merged = stripAttributionLines(systemParts.filter(Boolean).join("\n\n"));
  if (merged) {
    data.system = merged;
  } else {
    delete data.system;
  }

  if (Array.isArray(data.tools)) {
    data.tools = stableToolSort(stripCacheControlDeep(data.tools));
  }

  data.messages = data.messages.map((msg) => stripCacheControlDeep(msg));
  if (data.system) {
    data.system = normalizeSystemField(data.system);
  }

  return JSON.stringify(data);
}

function logCacheFromBody(body) {
  try {
    const parsed = JSON.parse(body);
    const usage = parsed?.usage;
    if (!usage) return;
    const hit = usage.prompt_cache_hit_tokens ?? usage.cache_read_input_tokens;
    const miss = usage.prompt_cache_miss_tokens ?? usage.input_tokens;
    if (hit != null || miss != null) {
      appendLog(`cache hit=${hit ?? 0} miss=${miss ?? 0}`);
    }
  } catch {
    /* ignore */
  }
}

function forward(req, res, body) {
  let outBody = body;
  if (
    req.method === "POST" &&
    (req.url?.includes("/messages") || req.url?.includes("/complete"))
  ) {
    try {
      outBody = fixAnthropicBody(body);
    } catch {
      outBody = body;
    }
  }

  const headers = { ...req.headers, host: TARGET_HOST };
  delete headers["content-length"];
  headers["content-length"] = Buffer.byteLength(outBody);

  const urlPath = req.url?.startsWith("/anthropic")
    ? req.url
    : `/anthropic${req.url || ""}`;

  const upstream = https.request(
    {
      hostname: TARGET_HOST,
      port: 443,
      path: urlPath,
      method: req.method,
      headers,
    },
    (pres) => {
      const chunks = [];
      pres.on("data", (c) => chunks.push(c));
      pres.on("end", () => {
        const respBody = Buffer.concat(chunks).toString("utf8");
        if (!pres.headers["transfer-encoding"]) {
          logCacheFromBody(respBody);
        }
        res.writeHead(pres.statusCode ?? 502, pres.headers);
        res.end(respBody);
      });
    }
  );

  upstream.on("error", (err) => {
    res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    res.end(`DeepSeek proxy upstream error: ${err.message}`);
  });

  upstream.end(outBody);
}

const server = http.createServer((req, res) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => forward(req, res, Buffer.concat(chunks).toString("utf8")));
});

server.listen(PORT, "127.0.0.1", () => {
  const msg = `deepseek-cc-proxy (cache-aligned) listening on http://127.0.0.1:${PORT}/anthropic\n`;
  process.stdout.write(msg);
  appendLog("started");
});
