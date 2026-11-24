"""Check an Anthropic Messages endpoint using the caller's configuration."""

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request


def main():
    names = ("HCAI_MESSAGES_URL", "HCAI_API_KEY", "HCAI_MODEL")
    config = {name: os.environ.get(name, "").strip() for name in names}
    missing = [name for name in names if not config[name]]
    if missing:
        print(f"Missing configuration: {', '.join(missing)}", file=sys.stderr)
        return 2

    url = urllib.parse.urlsplit(config["HCAI_MESSAGES_URL"])
    if url.scheme != "https" or not url.hostname or url.username or url.password:
        print("HCAI_MESSAGES_URL must be an HTTPS URL without user credentials.", file=sys.stderr)
        return 2

    payload = {
        "model": config["HCAI_MODEL"],
        "messages": [{"role": "user", "content": "Reply with OK."}],
        "max_tokens": 20,
    }
    request = urllib.request.Request(
        url.geturl(),
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "anthropic-version": "2023-06-01"},
        method="POST",
    )
    request.add_unredirected_header("x-api-key", config["HCAI_API_KEY"])

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            body = json.load(response)
            if not isinstance(body, dict) or not body.get("content"):
                print("The endpoint did not return any message content.", file=sys.stderr)
                return 1
            print(f"HTTP {response.status}: message response received.")
    except urllib.error.HTTPError as error:
        print(f"Request failed with HTTP {error.code}.", file=sys.stderr)
        return 1
    except (urllib.error.URLError, TimeoutError, ValueError):
        print("The request failed or the endpoint returned an invalid response.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
