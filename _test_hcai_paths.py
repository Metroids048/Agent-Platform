import urllib.request, json

base = "https://ai.hctopup.com/v1"
key = "sk-6fe5913e3d87b14096f2cc06e550c76cf51bfa9d096d7a50f5685809162465c0"

# Check various possible Anthropic-compatible paths
paths = [
    "/v1/messages",
    "/v1/anthropic/messages",
    "/anthropic/v1/messages",
    "/v1/complete",
    "/api/v1/messages",
]

headers = {
    "Content-Type": "application/json",
    "x-api-key": key,
    "anthropic-version": "2023-06-01"
}

data = {
    "model": "gpt-5.5",
    "max_tokens": 10,
    "messages": [{"role": "user", "content": "hi"}]
}

for path in paths:
    url = f"https://ai.hctopup.com{path}"
    req = urllib.request.Request(url, data=json.dumps(data).encode(), headers=headers, method="POST")
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        body = resp.read().decode()
        print(f"{path}: {resp.status} OK - {body[:200]}")
    except Exception as e:
        status = getattr(e, 'code', 'N/A')
        body = ""
        if hasattr(e, 'read'):
            try: body = e.read().decode()
            except: pass
        print(f"{path}: {status} - {str(e)[:100]}")
        if body:
            print(f"  Body: {body[:200]}")
