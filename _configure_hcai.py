import sqlite3, json, os, sys

DB = os.path.expanduser(r"~\.cc-switch\cc-switch.db")
HCAI_ID = "hcai-1780471653026"

conn = sqlite3.connect(DB)
c = conn.cursor()

# 1. Update HCAI meta to include apiFormat: "openai" + endpointAutoSelect
c.execute("SELECT meta FROM providers WHERE id=?", (HCAI_ID,))
row = c.fetchone()
if row:
    meta = json.loads(row[0]) if row[0] else {}
    meta["apiFormat"] = "openai"
    meta["endpointAutoSelect"] = True
    meta["commonConfigEnabled"] = True
    new_meta = json.dumps(meta, ensure_ascii=False)
    c.execute("UPDATE providers SET meta=? WHERE id=?", (new_meta, HCAI_ID))
    print(f"Updated HCAI meta: {new_meta}")
else:
    print("HCAI provider not found!")
    sys.exit(1)

# 2. Enable CC Switch proxy for claude
c.execute("UPDATE proxy_config SET proxy_enabled=1, enabled=1 WHERE app_type='claude'")
print("Enabled CC Switch local proxy for claude (port 15721)")

# 3. No need to change currentProviderClaude in DB - it's in settings.json
# But check if it exists in DB
c.execute("SELECT value FROM settings WHERE key='currentProviderClaude'")
row = c.fetchone()
if row:
    print(f"Current DB setting for Claude provider: {row[0]}")

conn.commit()
conn.close()
print("\nDone. Now also need to:")
print("1. Update ~/.cc-switch/settings.json -> currentProviderClaude = hcai-1780471653026")
print("2. Update ~/.claude/settings.json -> model = gpt-5.5 + ANTHROPIC_BASE_URL = http://127.0.0.1:15721")
