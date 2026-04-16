import json
import os
from datetime import datetime
import pandas as pd

_df: pd.DataFrame = None

DATA_PATH = os.path.join(os.path.dirname(__file__), "data.json")


def load_data() -> pd.DataFrame:
    global _df
    if _df is not None:
        return _df

    with open(DATA_PATH, "r", encoding="utf-8") as f:
        records = json.load(f)

    df = pd.DataFrame(records)
    df["created_at"] = pd.to_datetime(df["created_at"])
    df["engagement"] = df["likes"] + df["boosts"]
    df["date"] = df["created_at"].dt.date.astype(str)
    df["hour"] = df["created_at"].dt.hour
    df["month"] = df["created_at"].dt.to_period("M").astype(str)

    _df = df
    print(f"[DataLoader] Loaded {len(df)} posts from {DATA_PATH}")
    return _df


def get_df() -> pd.DataFrame:
    return load_data()


def reload_data():
    global _df
    _df = None
    return load_data()
