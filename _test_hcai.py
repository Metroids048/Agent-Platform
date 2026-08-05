import urllib.request, json, sys

url = "https://ai.hctopup.com/v1/chat/completions"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer sk-6fe5913e3d87b14096f2cc06e550c76cf51bfa9d096d7a50f5685809162465c0"
}
data = {
    "model": "gpt-5.5",
    "messages": [{"role": "user", "content": "Say hello in one word"}],
    "max_tokens": 20
}

req = urllib.request.Request(url, data=json.dumps(data).encode(), headers=headers, method="POST")
try:
    resp = urllib.request.urlopen(req, timeout=20)
    print("Status:", resp.status)
    print("Response:", resp.read().decode())
except Exception as e:
    print(f"Error: {e}")
    if hasattr(e, 'read'):
        print("Body:", e.read().decode())
