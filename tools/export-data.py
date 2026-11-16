"""Create the default frontend snapshot from DATA_LOOKER."""
import json
import sys
from math import isfinite
from datetime import date, datetime
from pathlib import Path

from openpyxl import load_workbook


def clean(value):
    if isinstance(value, (date, datetime)):
        return value.isoformat()[:10]
    return value.strip() if isinstance(value, str) else value


def amount(value):
    if value in (None, "", "-", "—"):
        return None
    if isinstance(value, (int, float)) and not isinstance(value, bool) and isfinite(value):
        return value
    if isinstance(value, str):
        text = value.strip().replace(" ", "")
        # Vietnamese text amounts may use dot separators and a decimal comma.
        if "," in text or text.count(".") > 1 or (text.count(".") == 1 and len(text.split(".")[1]) == 3):
            text = text.replace(".", "").replace(",", ".")
        try:
            number = float(text)
            if isfinite(number):
                return number
        except ValueError:
            pass
    raise ValueError(f"Giá trị tiền không hợp lệ: {value!r}")


def payment_date(value):
    text = clean(value)
    if isinstance(text, str):
        for pattern in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
            try:
                return datetime.strptime(text, pattern).date().isoformat()
            except ValueError:
                continue
    return None


columns = dict(team=1, officer=2, accountant=3, stt=4, name=5, house=6,
               street=7, ward=9, map=10, parcel=11, area=14, notice=19,
               status=23, plan=24, approval=25, recovery=27, enforcement=28,
               handover=30, temporaryDecision=32, note=48)
workbook = load_workbook(sys.argv[1], data_only=True, read_only=True)
records = []
for line, row in enumerate(workbook["DATA_LOOKER"].iter_rows(min_row=2, max_col=48, values_only=True), 2):
    if row[4] is None or row[0] not in ("Tổ 1", "Tổ 2"):
        continue
    record = {key: clean(row[col - 1]) for key, col in columns.items()}
    record["id"] = f"M2-{line:04}"
    record["groups"] = [
        [amount(row[35]), amount(row[37]), amount(row[45]), payment_date(row[38])],
        [None, amount(row[41]), None, payment_date(row[42])],
        [amount(row[36]), amount(row[43]), amount(row[46]), payment_date(row[44])],
        [None, amount(row[39]), None, payment_date(row[40])],
    ]
    records.append(record)
output = Path(__file__).resolve().parents[1] / "data" / "metro2.js"
output.write_text("window.METRO_RECORDS = " + json.dumps(records, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")
