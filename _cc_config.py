import sqlite3, json

conn = sqlite3.connect(r"C:\Users\win\.cc-switch\cc-switch.db")
c = conn.cursor()

# Show all provider metas for claude
c.execute("SELECT id, name, meta, settings_config FROM providers WHERE app_type='claude'")
print("=== All Claude providers ===")
for r in c.fetchall():
    print(f"\nID: {r[0]}")
    print(f"Name: {r[1]}")
    try:
        meta = json.loads(r[2]) if r[2] else {}
        print(f"Meta keys: {list(meta.keys())}")
        print(f"Meta: {json.dumps(meta, indent=2, ensure_ascii=False)}")
    except:
        print(f"Meta (raw): {r[2]}")
    # Show first part of settings
    if r[3] and len(r[3]) > 100:
        print(f"Settings (truncated): {r[3][:200]}...")
    elif r[3]:
        print(f"Settings: {r[3]}")

# Check if currentProviderClaude matches
c.execute("SELECT value FROM settings WHERE key='currentProviderClaude'")
row = c.fetchone()
print(f"\n=== Current provider for Claude ===")
print(f"ID: {row[0] if row else 'N/A'}")

conn.close()
