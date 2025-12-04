import re
import time
from typing import Dict, Any

import requests


def _normalize_symbol(symbol: str) -> str:
    s = symbol.strip().lower()
    m = re.match(r"^(sh|sz)\d{6}$", s)
    if m:
        return s
    m = re.match(r"^(\d{6})$", s)
    if m:
        code = m.group(1)
        prefix = "sh" if code.startswith("6") or code.startswith("9") else "sz"
        return f"{prefix}{code}"
    raise ValueError("symbol格式不正确")


def _round_price(v: float) -> float:
    return float(f"{v:.2f}")


def _limit_rate(code: str, name: str) -> float:
    n = name.upper()
    if n.startswith("*ST") or n.startswith("ST"):
        return 0.05
    if code.startswith("300") or code.startswith("301") or code.startswith("688"):
        return 0.20
    return 0.10


def get_quote(symbol: str) -> Dict[str, Any]:
    sym = _normalize_symbol(symbol)
    resp = requests.get("http://hq.sinajs.cn/list=" + sym, timeout=5, headers={"Referer": "https://finance.sina.com.cn/"})
    if resp.status_code != 200:
        raise ValueError("行情接口请求失败")
    txt = resp.text
    m = re.search(r'"([^"]*)"\s*;', txt)
    if not m:
        raise ValueError("未获取到行情数据")
    parts = m.group(1).split(",")
    if len(parts) < 32:
        raise ValueError("行情数据格式错误")
    name = parts[0]
    open_price = float(parts[1]) if parts[1] else 0.0
    prev_close = float(parts[2]) if parts[2] else open_price
    price = float(parts[3]) if parts[3] else prev_close
    high = float(parts[4]) if parts[4] else price
    low = float(parts[5]) if parts[5] else price
    dt = parts[30] + " " + parts[31]
    change_amount = price - prev_close
    change_percent = (change_amount / prev_close * 100) if prev_close else 0.0
    code = sym[2:]
    return {
        "code": code,
        "name": name,
        "price": _round_price(price),
        "change_percent": _round_price(change_percent),
        "change_amount": _round_price(change_amount),
        "open": _round_price(open_price),
        "high": _round_price(high),
        "low": _round_price(low),
        "prev_close": _round_price(prev_close),
        "time": dt,
    }


def get_limit_status(symbol: str) -> Dict[str, Any]:
    q = get_quote(symbol)
    rate = _limit_rate(q["code"], q["name"])
    up = _round_price(q["prev_close"] * (1 + rate))
    down = _round_price(q["prev_close"] * (1 - rate))
    is_up = q["price"] >= up - 1e-6
    is_down = q["price"] <= down + 1e-6
    return {
        "code": q["code"],
        "name": q["name"],
        "price": q["price"],
        "limit_up_price": up,
        "limit_down_price": down,
        "is_limit_up": bool(is_up),
        "is_limit_down": bool(is_down),
        "limit_rate": rate,
    }
