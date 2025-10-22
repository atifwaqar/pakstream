# yf.py
# -------------------------------------------------------------
# pip install yfinance pandas
# -------------------------------------------------------------
# What it does:
# - New share in JSON -> download MAX history (1d) once, save as <ISIN>.csv
# - Existing share    -> fetch only incremental 1h data since last timestamp,
#                       replace overlapping tail, save back to the same CSV
# - Works for ALL shares in the JSON; logs clearly.
# - Timestamps are normalized to UTC tz-naive to avoid tz/NaT issues.
# -------------------------------------------------------------

import json
from pathlib import Path
import re
import time
from datetime import timedelta

import yfinance as yf
import pandas as pd
import sys
import traceback

# ======= CONFIG (edit these to your paths / preferences) =======
JSON_PATH = r"data\stocklist_page-1_2025-10-21T18-29-20Z.json"  # your input JSON
OUT_DIR = Path("history_data")                                   # where CSVs are stored
INTRADAY_INTERVAL = "1h"                                         # high-res interval for incremental updates
SLEEP_BETWEEN_CALLS = 0.6                                         # polite pause between Yahoo calls
MAX_RETRIES = 2                                                   # retries per Yahoo call
AUTO_ADJUST = False                                               # set True if you want adjusted prices
# ===============================================================


# ----------------- helpers: logging & filenames ----------------
def log(msg: str):
    print(f"[LOG] {msg}", flush=True)


def safe_filename(name: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]", "_", name)


# ----------------- helpers: datetime normalization -------------
def normalize_dt_index(idx) -> pd.DatetimeIndex:
    """
    Convert a Series/Index/array-like to a tz-naive UTC DatetimeIndex.
    - Always parses with utc=True to avoid mixed-tz warnings
    - Then removes timezone info (tz-naive) for stable CSV/index ops
    """
    dt = pd.to_datetime(idx, utc=True, errors="coerce")
    # If it's a Series, use .dt; if it's already a DatetimeIndex, call directly
    if isinstance(dt, pd.Series):
        dt = dt.dt.tz_convert("UTC").dt.tz_localize(None)
        return pd.DatetimeIndex(dt)
    # DatetimeIndex path
    dt = dt.tz_convert("UTC").tz_localize(None)
    return dt


def read_csv_normalized(path: Path) -> pd.DataFrame:
    """
    Read a CSV and normalize its Date index (UTC, tz-naive). Robust to tz/mixed formats.
    """
    df = pd.read_csv(path)
    if "Date" not in df.columns:
        df.rename(columns={df.columns[0]: "Date"}, inplace=True)
    # Build normalized index first, drop NaT rows, then assign
    idx = normalize_dt_index(df["Date"])  # tz-naive UTC DatetimeIndex
    mask = ~idx.isna()
    df = df.loc[mask].copy()
    df.index = idx[mask]
    df.drop(columns=["Date"], inplace=True, errors="ignore")
    df.sort_index(inplace=True)
    # keep a conventional column order if present
    cols = [c for c in ["Open","High","Low","Close","Adj Close","Volume","Dividends","Stock Splits"] if c in df.columns]
    return df[cols] if cols else df


def save_csv_normalized(df: pd.DataFrame, out_path: Path):
    """Save with UTC tz-naive index named Date, stable ordering."""
    df = df.copy()
    df.index = normalize_dt_index(df.index)
    df.index.name = "Date"
    df.sort_index(inplace=True)
    df.to_csv(out_path, index=True, date_format="%Y-%m-%d %H:%M:%S")


# ----------------- symbol -> Yahoo ticker guess ----------------
def guess_yahoo_ticker(symbol: str, exchange_country: str = "", exchanges=None) -> str:
    exchanges = exchanges or []
    clean = symbol.strip().replace(" ", "-")
    clean = re.sub(r"[,/]", "", clean)

    suffix_by_country = {
        "SE": ".ST", "GB": ".L", "DE": ".DE", "FR": ".PA", "FI": ".HE", "NO": ".OL",
        "DK": ".CO", "CH": ".SW", "CA": ".TO", "AU": ".AX", "HK": ".HK", "JP": ".T",
        "NL": ".AS", "IT": ".MI", "ES": ".MC", "IE": ".IR", "PT": ".LS", "BE": ".BR",
        "AT": ".VI", "PL": ".WA", "CZ": ".PR", "GR": ".AT", "NZ": ".NZ", "IN": ".NS",
    }
    if exchange_country in suffix_by_country:
        return clean + suffix_by_country[exchange_country]

    exch_text = " ".join(exchanges).lower()
    if "stockholm" in exch_text:  return clean + ".ST"
    if "london" in exch_text:     return clean + ".L"
    if "xetra" in exch_text or "frankfurt" in exch_text: return clean + ".DE"

    return clean  # last resort


# ----------------- Yahoo fetch with retries --------------------
def fetch_with_retries(ticker: str, **history_kwargs) -> pd.DataFrame:
    attempt = 0
    last_exc = None
    while attempt <= MAX_RETRIES:
        try:
            df = yf.Ticker(ticker).history(**history_kwargs, auto_adjust=AUTO_ADJUST)
            if not df.empty:
                df.index = normalize_dt_index(df.index)
            return df
        except Exception as e:
            last_exc = e
            log(f"❌ Error fetching {ticker} ({history_kwargs}) attempt {attempt+1}/{MAX_RETRIES+1}: {e}")
        attempt += 1
        time.sleep(SLEEP_BETWEEN_CALLS)
    if last_exc:
        traceback.print_exception(type(last_exc), last_exc, last_exc.__traceback__)
    return pd.DataFrame()


# ----------------- building the base (daily MAX) ---------------
def ensure_daily_max(isin: str, ticker: str, out_path: Path) -> pd.DataFrame:
    """
    If CSV doesn't exist -> fetch daily max and save.
    If it exists -> just load and return.
    """
    if out_path.exists():
        log(f"   • Found existing CSV for {isin} → {out_path.name}")
        return read_csv_normalized(out_path)

    log(f"   • No CSV for {isin}. Fetching daily MAX for {ticker} …")
    df = fetch_with_retries(ticker, period="max", interval="1d")
    if df.empty:
        log(f"   • FAILED: No daily data for {ticker}")
        return pd.DataFrame()

    save_csv_normalized(df, out_path)
    log(f"   • Saved {len(df):,} daily rows → {out_path.name}")
    return df


# ----------------- stitching hourly onto the tail --------------
def stitch_hourly(existing: pd.DataFrame, hourly: pd.DataFrame) -> pd.DataFrame:
    """
    Replace overlapping tail of 'existing' with 'hourly'. Avoids NaT/date compares.
    Cutoff = floor('D') of first hourly timestamp; keep existing strictly before cutoff.
    """
    if hourly.empty:
        return existing

    existing = existing.copy()
    hourly = hourly.copy()

    # Normalize & drop NaT rows if any
    existing.index = normalize_dt_index(existing.index)
    hourly.index = normalize_dt_index(hourly.index)
    existing = existing[existing.index.notna()]
    hourly = hourly[hourly.index.notna()]
    if hourly.empty:
        return existing

    cutoff = hourly.index.min().floor('D')  # midnight of first hourly date
    keep = existing.loc[existing.index < cutoff]

    combined = pd.concat([keep, hourly]).sort_index()
    combined = combined[~combined.index.duplicated(keep="last")]

    cols = [c for c in ["Open","High","Low","Close","Adj Close","Volume","Dividends","Stock Splits"] if c in combined.columns]
    return combined[cols] if cols else combined

    existing = existing.copy()
    hourly = hourly.copy()

    # Normalize & drop NaT rows if any
    existing.index = normalize_dt_index(existing.index)
    hourly.index = normalize_dt_index(hourly.index)
    existing = existing[existing.index.notna()]
    hourly = hourly[hourly.index.notna()]

    if hourly.empty:
        return existing

    # Compute cutoff as midnight of first hourly date (tz-naive)
    cutoff = hourly.index.min().normalize()

    # Keep all existing rows strictly before cutoff, then append hourly
    keep = existing.loc[existing.index < cutoff]

    combined = pd.concat([keep, hourly]).sort_index()
    combined = combined[~combined.index.duplicated(keep="last")]

    cols = [c for c in ["Open","High","Low","Close","Adj Close","Volume","Dividends","Stock Splits"] if c in combined.columns]
    return combined[cols] if cols else combined


def update_incremental_hourly(isin: str, ticker: str, out_path: Path) -> bool:
    """
    Read existing CSV, fetch hourly since the last timestamp - 1 day (overlap),
    stitch, and save. Returns True on success (even if nothing new).
    """
    if not out_path.exists():
        log(f"   • No base CSV exists for {isin} to update hourly.")
        return False

    df = read_csv_normalized(out_path)
    if df.empty:
        log(f"   • Existing CSV is empty for {isin}. Skipping hourly update.")
        return False

    last_ts = df.index.max()
    log(f"   • Last saved timestamp for {isin}: {last_ts}")

    # start a bit earlier to cover any gaps; we'll dedupe on stitch
    start_dt = last_ts - timedelta(days=1)
    log(f"   • Fetching hourly from {start_dt} for {ticker} …")

    hourly = fetch_with_retries(ticker, start=start_dt, interval=INTRADAY_INTERVAL)
    if hourly.empty:
        log(f"   • No new hourly data for {ticker}.")
        return True

    combined = stitch_hourly(df, hourly)

    added = len(combined) - len(df)
    if added <= 0:
        log("   • No incremental rows after stitching.")
    else:
        log(f"   • Added {added} new row(s).")

    save_csv_normalized(combined, out_path)
    log(f"   • Saved updated CSV → {out_path.name}")
    return True


# ----------------- main loop over JSON -------------------------
def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    log(f"Loading JSON from {JSON_PATH} …")
    data = json.loads(Path(JSON_PATH).read_text(encoding="utf-8"))
    results = data.get("results", [])
    if not results:
        log("No results found in JSON. Exiting.")
        return

    total = len(results)
    log(f"Found {total} instruments. Starting …")

    successes = 0
    failures = 0
    skipped = 0

    for idx, item in enumerate(results, start=1):
        info   = item.get("instrument_info", {})
        exinfo = item.get("exchange_info", {})
        symbol = info.get("symbol")
        isin   = info.get("isin")
        country   = exinfo.get("exchange_country", "")
        exchanges = exinfo.get("exchanges", [])

        if not symbol:
            log(f"[{idx}/{total}] Skipping: missing symbol (ISIN={isin})")
            skipped += 1
            continue

        ticker = guess_yahoo_ticker(symbol, country, exchanges)
        out_name = safe_filename(f"{isin}.csv")  # one CSV per ISIN
        out_path = OUT_DIR / out_name

        log(f"[{idx}/{total}] ISIN={isin} | symbol='{symbol}' | country={country} → ticker={ticker}")

        # 1) Ensure base daily max exists (or load it)
        base_df = ensure_daily_max(isin, ticker, out_path)
        if base_df.empty and not out_path.exists():
            log(f"   • FAILED to create base for {ticker}; skipping hourly update.")
            failures += 1
            continue

        # 2) Incremental hourly update (stitches onto tail)
        ok = update_incremental_hourly(isin, ticker, out_path)
        if ok:
            successes += 1
        else:
            failures += 1

        time.sleep(SLEEP_BETWEEN_CALLS)

    log("—" * 60)
    log(f"Done. Success: {successes}, Failed: {failures}, Skipped: {skipped}, Total: {total}")
    log(f"CSV files in: {OUT_DIR.resolve()}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        log("Fatal error:")
        traceback.print_exc()
        sys.exit(1)
