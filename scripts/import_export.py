#!/usr/bin/env python3
"""Importa a Supabase el volcado JSON de la agenda (carpeta export/<coll>/<id>.json o un agenda-YYYY-MM-DD.json).
Uso: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... OWNER_ID=<uuid usuario> python3 import_export.py <ruta>
"""
import json, os, sys, glob, urllib.request

URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_KEY"]
OWNER = os.environ["OWNER_ID"]
src = sys.argv[1]

rows = []
if os.path.isdir(src):
    for f in glob.glob(os.path.join(src, "*", "*.json")):
        coll = os.path.basename(os.path.dirname(f)); id_ = os.path.splitext(os.path.basename(f))[0]
        data = json.load(open(f, encoding="utf-8"))
        if coll != "settings" and "id" not in data: data["id"] = id_
        rows.append({"coll": coll, "id": id_, "data": data, "owner": OWNER})
else:
    dump = json.load(open(src, encoding="utf-8"))
    for coll, docs in dump.items():
        if coll == "settings": rows.append({"coll": "settings", "id": "main", "data": docs, "owner": OWNER}); continue
        for id_, data in (docs or {}).items():
            data.setdefault("id", id_); rows.append({"coll": coll, "id": id_, "data": data, "owner": OWNER})

print(f"{len(rows)} documentos")
for i in range(0, len(rows), 200):
    chunk = rows[i:i+200]
    req = urllib.request.Request(f"{URL}/rest/v1/docs?on_conflict=coll,id", data=json.dumps(chunk).encode(), method="POST",
        headers={"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates,return=minimal"})
    with urllib.request.urlopen(req) as r: print("ok", r.status, i)
