#!/usr/bin/env python3
"""
docorg - one-source-of-truth document organizer for macOS multi-cloud setups.

Safety contract:
  * Nothing is ever deleted. Duplicates are MOVED to a quarantine folder.
  * Cloud placeholder files (dataless / not downloaded) are never read, so
    running this does NOT pull your whole Drive down onto the laptop.
  * Every mutating step is a dry run until you pass --apply.
"""
import argparse, csv, hashlib, json, os, re, shlex, sqlite3, sys, unicodedata
from datetime import datetime, date
from pathlib import Path

DB_DEFAULT = "~/docorg-data/docorg.db"
OUT_DEFAULT = "~/docorg-data/reports"
TEXT_EXT = {".txt", ".md", ".csv", ".json", ".eml", ".rtf"}
DOC_EXT = {".pdf", ".docx", ".doc", ".pptx", ".xlsx", ".pages", ".numbers", ".key"}
SKIP_DIRS = {".git", "node_modules", ".Trash", "Library/Caches", ".venv", "__pycache__",
             ".docorg-quarantine", "#recycle", ".dropbox.cache"}
SKIP_NAMES = {".DS_Store", "Icon\r", "desktop.ini", ".localized"}


# ---------------------------------------------------------------- utilities
def expand(p):
    return Path(os.path.expanduser(str(p))).resolve()


def load_taxonomy(path):
    with open(path) as f:
        return json.load(f)


def is_placeholder(st, path):
    """True if the file is a cloud stub whose bytes are not on disk."""
    if path.name.startswith(".") and path.name.endswith(".icloud"):
        return True
    return st.st_size > 0 and getattr(st, "st_blocks", 1) == 0


def sha256(path, cap=None):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        read = 0
        while True:
            b = f.read(1 << 20)
            if not b:
                break
            h.update(b)
            read += len(b)
            if cap and read >= cap:
                break
    return h.hexdigest()


def slugify(s, maxlen=70):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"[^\w\s.-]", " ", s)
    s = re.sub(r"\s+", "-", s.strip())
    s = re.sub(r"-{2,}", "-", s).strip("-.")
    return s[:maxlen].strip("-.")


# ------------------------------------------------------------------ schema
def connect(dbpath):
    p = expand(dbpath)
    p.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(p)
    db.executescript("""
    CREATE TABLE IF NOT EXISTS files(
      path TEXT PRIMARY KEY, root TEXT, cloud TEXT, name TEXT, ext TEXT,
      size INTEGER, mtime REAL, placeholder INTEGER, sha256 TEXT,
      matter TEXT, doctype TEXT, docdate TEXT, proposed TEXT, dupe_of TEXT,
      scanned_at TEXT);
    CREATE INDEX IF NOT EXISTS idx_size ON files(size);
    CREATE INDEX IF NOT EXISTS idx_sha  ON files(sha256);
    CREATE VIRTUAL TABLE IF NOT EXISTS ftext USING fts5(path UNINDEXED, body);
    """)
    return db


# -------------------------------------------------------------------- scan
def cloud_of(path):
    s = str(path)
    if "com~apple~CloudDocs" in s or "/CloudStorage/iCloud" in s:
        return "icloud"
    if "GoogleDrive-" in s:
        return "gdrive"
    if "OneDrive" in s:
        return "onedrive"
    if "/Dropbox" in s:
        return "dropbox"
    return "local"


DATE_PATTERNS = [
    (re.compile(r"(20\d{2})[.\-_](\d{1,2})[.\-_](\d{1,2})"), (1, 2, 3)),
    (re.compile(r"\b(\d{1,2})[.\-/](\d{1,2})[.\-/](2\d)\b"), None),   # 3.18.26
    (re.compile(r"\b(\d{1,2})[.\-/](\d{1,2})[.\-/](20\d{2})\b"), None),
]


def infer_date(name):
    m = DATE_PATTERNS[0][0].search(name)
    if m:
        y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
        try:
            return date(y, mo, d).isoformat()
        except ValueError:
            return None
    for rx, _ in DATE_PATTERNS[1:]:
        m = rx.search(name)
        if m:
            mo, d, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
            y = y + 2000 if y < 100 else y
            try:
                return date(y, mo, d).isoformat()
            except ValueError:
                continue
    return None


def classify(name, tax):
    low = name.lower()
    matter = "99-UNSORTED"
    for code, keys in tax["matters"].items():
        if any(k.lower() in low for k in keys):
            matter = code
            break
    doctype = "MISC"
    for code, keys in tax["doctypes"].items():
        if any(k.lower() in low for k in keys):
            doctype = code
            break
    return matter, doctype


def cmd_scan(a):
    tax = load_taxonomy(a.taxonomy)
    db = connect(a.db)
    now = datetime.now().isoformat(timespec="seconds")
    n = skipped = ph = 0
    seen = set()
    cur = db.cursor()
    for root in a.roots:
        rp = expand(root)
        if not rp.exists():
            print(f"  ! root not found, skipping: {rp}", file=sys.stderr)
            continue
        for dirpath, dirnames, filenames in os.walk(rp, followlinks=False):
            dirnames[:] = [d for d in dirnames
                           if d not in SKIP_DIRS and not d.startswith(".Trash")]
            for fn in filenames:
                if fn in SKIP_NAMES:
                    skipped += 1
                    continue
                p = Path(dirpath) / fn
                try:
                    st = p.lstat()
                except OSError:
                    skipped += 1
                    continue
                if not os.path.isfile(p) or os.path.islink(p):
                    skipped += 1
                    continue
                stub = is_placeholder(st, p)
                ph += stub
                real = fn[1:-7] if stub and fn.endswith(".icloud") else fn
                matter, doctype = classify(str(p), tax)
                cur.execute(
                    "INSERT OR REPLACE INTO files(path,root,cloud,name,ext,size,mtime,"
                    "placeholder,sha256,matter,doctype,docdate,proposed,dupe_of,scanned_at)"
                    " VALUES(?,?,?,?,?,?,?,?,NULL,?,?,?,NULL,NULL,?)",
                    (str(p), str(rp), cloud_of(p), real, Path(real).suffix.lower(),
                     st.st_size, st.st_mtime, int(stub), matter, doctype,
                     infer_date(real), now))
                seen.add(str(p))
                n += 1
                if n % 2000 == 0:
                    db.commit()
                    print(f"  .. {n} files", file=sys.stderr)
    db.commit()
    # Purge rows for files that no longer exist under the roots we just walked,
    # so renames and deletions don't leave ghosts behind on a re-scan.
    prefixes = tuple(str(expand(x)) + os.sep for x in a.roots)
    stale = [r[0] for r in db.execute("SELECT path FROM files")
             if r[0] not in seen and r[0].startswith(prefixes)
             and not os.path.exists(r[0])]
    for sp in stale:
        cur.execute("DELETE FROM files WHERE path=?", (sp,))
        cur.execute("DELETE FROM ftext WHERE path=?", (sp,))
    db.commit()
    print(f"scan complete: {n} files indexed, {ph} cloud placeholders (not read), "
          f"{skipped} skipped, {len(stale)} stale entries purged")
    for row in db.execute("SELECT cloud,COUNT(*),SUM(size) FROM files GROUP BY cloud "
                          "ORDER BY 2 DESC"):
        print(f"  {row[0]:<10} {row[1]:>7} files  {(row[2] or 0)/1e9:>8.2f} GB")


# ------------------------------------------------------------------ dupes
def rank(path, name, cloud, mtime, prefer_cloud):
    """Lower is better = the copy we KEEP."""
    s = 0
    s -= 1000 if cloud == prefer_cloud else 0
    s -= 200 if re.match(r"^20\d{2}[.\-]\d{2}[.\-]\d{2}", name) else 0   # canonical date prefix
    s += 100 if re.search(r"\b(copy|copy \d+|\(\d+\)| \d\.| conflict|conflicted)\b",
                          name, re.I) else 0
    s += 50 if "/Saved from Chrome/" in path or "/Downloads/" in path else 0
    s += len(path) / 1000.0
    s += mtime / 1e12
    return s


def cmd_dupes(a):
    db = connect(a.db)
    out = expand(a.out)
    out.mkdir(parents=True, exist_ok=True)
    groups = [r[0] for r in db.execute(
        "SELECT size FROM files WHERE size>0 AND placeholder=0 "
        "GROUP BY size HAVING COUNT(*)>1")]
    print(f"{len(groups)} size-collision groups; hashing candidates...")
    cur = db.cursor()
    hashed = 0
    for sz in groups:
        for (p,) in db.execute("SELECT path FROM files WHERE size=? AND placeholder=0 "
                               "AND sha256 IS NULL", (sz,)).fetchall():
            try:
                cur.execute("UPDATE files SET sha256=? WHERE path=?", (sha256(p), p))
                hashed += 1
            except OSError:
                pass
        db.commit()
    print(f"hashed {hashed} files")

    rows = db.execute(
        "SELECT sha256,path,name,cloud,mtime,size FROM files "
        "WHERE sha256 IS NOT NULL AND sha256 IN "
        "(SELECT sha256 FROM files WHERE sha256 IS NOT NULL "
        " GROUP BY sha256 HAVING COUNT(*)>1) ORDER BY sha256").fetchall()
    bysha = {}
    for sha, p, nm, cl, mt, sz in rows:
        bysha.setdefault(sha, []).append((p, nm, cl, mt, sz))

    csv_path = out / "duplicates.csv"
    sh_path = out / "quarantine-duplicates.sh"
    reclaim = ndup = 0
    with open(csv_path, "w", newline="") as fc, open(sh_path, "w") as fs:
        w = csv.writer(fc)
        w.writerow(["sha256", "action", "size_bytes", "cloud", "path"])
        fs.write("#!/bin/bash\n# Generated by docorg. MOVES duplicates to quarantine "
                 "- deletes nothing.\nset -euo pipefail\n"
                 f'Q="{a.quarantine}"\nmkdir -p "$Q"\n\n')
        for sha, items in bysha.items():
            items.sort(key=lambda t: rank(t[0], t[1], t[2], t[3], a.prefer_cloud))
            keep = items[0]
            w.writerow([sha, "KEEP", keep[4], keep[2], keep[0]])
            for p, nm, cl, mt, sz in items[1:]:
                w.writerow([sha, "QUARANTINE", sz, cl, p])
                dest = f'"$Q"/{cl}/{sha[:12]}'
                fs.write(f'mkdir -p {dest}\nmv -n {shlex.quote(p)} {dest}/ '
                         f'|| echo SKIP {shlex.quote(p)}\n')
                cur.execute("UPDATE files SET dupe_of=? WHERE path=?", (keep[0], p))
                reclaim += sz
                ndup += 1
    db.commit()
    os.chmod(sh_path, 0o755)
    print(f"\n{len(bysha)} duplicate sets | {ndup} redundant copies | "
          f"{reclaim/1e9:.2f} GB reclaimable")
    print(f"  review : {csv_path}")
    print(f"  execute: {sh_path}")


# ----------------------------------------------------------------- rename
def cmd_rename(a):
    tax = load_taxonomy(a.taxonomy)
    db = connect(a.db)
    out = expand(a.out)
    out.mkdir(parents=True, exist_ok=True)
    rows = db.execute("SELECT path,name,ext,matter,doctype,docdate,mtime FROM files "
                      "WHERE dupe_of IS NULL AND ext IN ({})".format(
                          ",".join("?" * len(DOC_EXT | TEXT_EXT))),
                      tuple(sorted(DOC_EXT | TEXT_EXT))).fetchall()
    csv_path = out / "renames.csv"
    sh_path = out / "apply-renames.sh"
    seen, n = set(), 0
    with open(csv_path, "w", newline="") as fc, open(sh_path, "w") as fs:
        w = csv.writer(fc)
        w.writerow(["matter", "doctype", "date", "old_path", "new_name"])
        fs.write("#!/bin/bash\n# Generated by docorg. In-place renames only.\n"
                 "set -euo pipefail\n\n")
        for p, nm, ext, matter, doctype, dd, mt in rows:
            d = dd or datetime.fromtimestamp(mt).date().isoformat()
            stem = Path(nm).stem
            for rx in (r"^20\d{2}[.\-_]\d{1,2}[.\-_]\d{1,2}\s*[-_]?\s*",
                       r"^\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}\s*[-_]?\s*"):
                stem = re.sub(rx, "", stem)
            stem = re.sub(r"^\s*" + re.escape(matter.split("-", 1)[-1]) + r"\s*[-–—]\s*",
                          "", stem, flags=re.I)
            new = f"{d}__{matter}__{doctype}__{slugify(stem)}{ext}"
            dest = str(Path(p).parent / new)
            if dest == p:
                continue
            k = dest.lower()
            if k in seen:
                new = f"{d}__{matter}__{doctype}__{slugify(stem)}-{abs(hash(p))%9999:04d}{ext}"
                dest = str(Path(p).parent / new)
            seen.add(k)
            w.writerow([matter, doctype, d, p, new])
            fs.write(f'[ -e {shlex.quote(dest)} ] || mv -n {shlex.quote(p)} '
                     f'{shlex.quote(dest)}\n')
            n += 1
    os.chmod(sh_path, 0o755)
    print(f"{n} renames proposed\n  review : {csv_path}\n  execute: {sh_path}")


# -------------------------------------------------------------------- text
def extract_text(p):
    import subprocess
    ext = p.suffix.lower()
    try:
        if ext in TEXT_EXT:
            return p.read_text(errors="ignore")[:400000]
        if ext == ".pdf":
            r = subprocess.run(["pdftotext", "-q", "-l", "40", str(p), "-"],
                               capture_output=True, timeout=120)
            return r.stdout.decode(errors="ignore")[:400000]
        if ext in {".docx", ".pptx", ".xlsx"}:
            import zipfile
            with zipfile.ZipFile(p) as z:
                buf = []
                for n in z.namelist():
                    if re.search(r"(word/document|ppt/slides/slide\d+|"
                                 r"xl/sharedStrings)\.xml$", n):
                        buf.append(re.sub(r"<[^>]+>", " ", z.read(n).decode(
                            "utf8", "ignore")))
                return re.sub(r"\s+", " ", " ".join(buf))[:400000]
    except Exception:
        return ""
    return ""


def cmd_index(a):
    db = connect(a.db)
    rows = db.execute("SELECT path,ext,placeholder FROM files WHERE dupe_of IS NULL "
                      "AND placeholder=0").fetchall()
    cur = db.cursor()
    n = 0
    for p, ext, _ in rows:
        if ext not in (TEXT_EXT | {".pdf", ".docx", ".pptx", ".xlsx"}):
            continue
        if cur.execute("SELECT 1 FROM ftext WHERE path=?", (p,)).fetchone():
            continue
        body = extract_text(Path(p))
        if body.strip():
            cur.execute("INSERT INTO ftext(path,body) VALUES(?,?)", (p, body))
            n += 1
            if n % 200 == 0:
                db.commit()
                print(f"  .. indexed {n}", file=sys.stderr)
    db.commit()
    print(f"full-text index built: {n} documents searchable")


def cmd_search(a):
    db = connect(a.db)
    q = " ".join(a.terms)
    rows = db.execute(
        "SELECT f.matter,f.doctype,f.docdate,ftext.path,"
        "snippet(ftext,1,'>>> ',' <<<','...',14) "
        "FROM ftext JOIN files f ON f.path=ftext.path "
        "WHERE ftext MATCH ? ORDER BY bm25(ftext) LIMIT ?", (q, a.limit)).fetchall()
    if not rows:
        print("no matches")
        return
    for matter, doctype, dd, p, snip in rows:
        print(f"\n\033[1m{dd or '????-??-??'}  {matter} / {doctype}\033[0m\n  {p}\n"
              f"  {' '.join(snip.split())}")


# ----------------------------------------------------------------- catalog
def cmd_catalog(a):
    db = connect(a.db)
    out = expand(a.out)
    out.mkdir(parents=True, exist_ok=True)
    rows = db.execute(
        "SELECT matter,doctype,docdate,name,cloud,size,path FROM files "
        "WHERE dupe_of IS NULL ORDER BY matter,docdate,doctype,name").fetchall()
    with open(out / "CATALOG.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["matter", "doctype", "date", "name", "cloud", "size_bytes", "path"])
        w.writerows(rows)
    with open(out / "CATALOG.md", "w") as f:
        f.write(f"# Document Catalog\n\nGenerated {datetime.now():%Y-%m-%d %H:%M}  |  "
                f"{len(rows)} unique documents\n")
        cur_m = cur_d = None
        for matter, doctype, dd, nm, cl, sz, p in rows:
            if matter != cur_m:
                f.write(f"\n## {matter}\n")
                cur_m, cur_d = matter, None
            if doctype != cur_d:
                f.write(f"\n### {doctype}\n\n")
                cur_d = doctype
            f.write(f"- `{dd or '????-??-??'}` **{nm}** — {cl}, {sz/1024:.0f} KB\n")
    counts = db.execute("SELECT matter,COUNT(*) FROM files WHERE dupe_of IS NULL "
                        "GROUP BY matter ORDER BY 2 DESC").fetchall()
    print(f"catalog written to {out}/CATALOG.md and CATALOG.csv")
    for m, c in counts:
        print(f"  {m:<24} {c:>6}")


# -------------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser(prog="docorg", description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--db", default=DB_DEFAULT)
    ap.add_argument("--out", default=OUT_DEFAULT)
    here = Path(__file__).resolve().parent.parent
    ap.add_argument("--taxonomy", default=str(here / "config" / "taxonomy.json"))
    sub = ap.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("scan", help="inventory files (metadata only, no downloads)")
    s.add_argument("roots", nargs="+")
    s.set_defaults(fn=cmd_scan)

    s = sub.add_parser("dupes", help="find byte-identical duplicates")
    s.add_argument("--prefer-cloud", default="gdrive")
    s.add_argument("--quarantine", default="$HOME/docorg-data/.docorg-quarantine")
    s.set_defaults(fn=cmd_dupes)

    s = sub.add_parser("rename", help="propose canonical filenames")
    s.set_defaults(fn=cmd_rename)

    s = sub.add_parser("index", help="build offline full-text search index")
    s.set_defaults(fn=cmd_index)

    s = sub.add_parser("search", help="search the full-text index")
    s.add_argument("terms", nargs="+")
    s.add_argument("--limit", type=int, default=20)
    s.set_defaults(fn=cmd_search)

    s = sub.add_parser("catalog", help="emit CATALOG.md / CATALOG.csv")
    s.set_defaults(fn=cmd_catalog)

    a = ap.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
