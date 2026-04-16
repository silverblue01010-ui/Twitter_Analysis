import pandas as pd
from typing import Optional
from data_loader import get_df


def _filter(df: pd.DataFrame, start: Optional[str], end: Optional[str]) -> pd.DataFrame:
    if start:
        df = df[df["created_at"] >= pd.Timestamp(start)]
    if end:
        df = df[df["created_at"] <= pd.Timestamp(end + "T23:59:59")]
    return df


# ── Summary ────────────────────────────────────────────────
def get_summary(start=None, end=None) -> dict:
    df = _filter(get_df().copy(), start, end)
    if df.empty:
        return {
            "total_posts": 0, "total_likes": 0, "total_boosts": 0,
            "avg_engagement": 0, "sentiment": {"positive": 0, "neutral": 0, "negative": 0},
            "sentiment_score": 50
        }

    s = df["sentiment"].value_counts().to_dict()
    total = len(df)
    pos = s.get("positive", 0)
    neg = s.get("negative", 0)
    score = round(((pos - neg) / max(total, 1) + 1) / 2 * 100, 1)

    return {
        "total_posts": total,
        "total_likes": int(df["likes"].sum()),
        "total_boosts": int(df["boosts"].sum()),
        "avg_engagement": round(float(df["engagement"].mean()), 2),
        "sentiment": {
            "positive": int(s.get("positive", 0)),
            "neutral": int(s.get("neutral", 0)),
            "negative": int(s.get("negative", 0)),
        },
        "sentiment_score": score,
    }


# ── Influencers ────────────────────────────────────────────
def get_influencers(limit: int = 25, start=None, end=None) -> list:
    df = _filter(get_df().copy(), start, end)
    if df.empty:
        return []

    grp = df.groupby("username").agg(
        mentions=("id", "count"),
        followers=("followers", "max"),
        location=("location", "first"),
        total_likes=("likes", "sum"),
        total_boosts=("boosts", "sum"),
        total_engagement=("engagement", "sum"),
    ).reset_index()

    grp["impact"] = (
        grp["total_engagement"] * 0.4
        + grp["followers"] * 0.0001
        + (grp["total_engagement"] / grp["followers"].clip(lower=1)) * 50
    ).clip(upper=100).round(2)

    grp = grp.sort_values(["followers", "total_engagement"], ascending=False).head(limit)

    return [
        {
            "username": row["username"],
            "location": row["location"],
            "mentions": int(row["mentions"]),
            "followers": int(row["followers"]),
            "total_likes": int(row["total_likes"]),
            "total_boosts": int(row["total_boosts"]),
            "engagement": int(row["total_engagement"]),
            "impact": float(row["impact"]),
        }
        for _, row in grp.iterrows()
    ]


# ── Hashtags ───────────────────────────────────────────────
def get_hashtags(limit: int = 20, start=None, end=None) -> list:
    df = _filter(get_df().copy(), start, end)
    if df.empty:
        return []

    tag_rows = []
    for _, row in df.iterrows():
        tags = row["hashtags"] if isinstance(row["hashtags"], list) else []
        for tag in tags:
            tag_rows.append({"tag": str(tag).lower(), "engagement": row["engagement"], "likes": row["likes"]})

    if not tag_rows:
        return []

    tdf = pd.DataFrame(tag_rows)
    grp = tdf.groupby("tag").agg(
        count=("tag", "count"),
        total_engagement=("engagement", "sum"),
        total_likes=("likes", "sum"),
    ).reset_index().sort_values("count", ascending=False).head(limit)

    return [
        {"tag": row["tag"], "count": int(row["count"]),
         "engagement": int(row["total_engagement"]), "likes": int(row["total_likes"])}
        for _, row in grp.iterrows()
    ]


# ── Timeline ───────────────────────────────────────────────
def get_timeline(start=None, end=None) -> list:
    df = _filter(get_df().copy(), start, end)
    if df.empty:
        return []

    grp = df.groupby("date").agg(
        posts=("id", "count"),
        likes=("likes", "sum"),
        boosts=("boosts", "sum"),
        engagement=("engagement", "sum"),
    ).reset_index().sort_values("date")

    return [
        {
            "date": row["date"],
            "posts": int(row["posts"]),
            "likes": int(row["likes"]),
            "boosts": int(row["boosts"]),
            "engagement": int(row["engagement"]),
        }
        for _, row in grp.iterrows()
    ]


# ── Sentiment Timeline ─────────────────────────────────────
def get_sentiment_timeline(start=None, end=None) -> list:
    df = _filter(get_df().copy(), start, end)
    if df.empty:
        return []

    grp = df.groupby(["date", "sentiment"]).size().unstack(fill_value=0).reset_index()
    for col in ["positive", "neutral", "negative"]:
        if col not in grp.columns:
            grp[col] = 0

    return [
        {"date": row["date"], "positive": int(row["positive"]),
         "neutral": int(row["neutral"]), "negative": int(row["negative"])}
        for _, row in grp.sort_values("date").iterrows()
    ]


# ── Posts Feed ─────────────────────────────────────────────
def get_posts(
    keyword: Optional[str] = None,
    hashtag: Optional[str] = None,
    sentiment: Optional[str] = None,
    start: Optional[str] = None,
    end: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> dict:
    df = _filter(get_df().copy(), start, end)

    if keyword:
        df = df[df["text"].str.contains(keyword, case=False, na=False)]
    if hashtag:
        tag = hashtag.lower().lstrip("#")
        df = df[df["hashtags"].apply(lambda tags: tag in [t.lower() for t in (tags if isinstance(tags, list) else [])])]
    if sentiment:
        df = df[df["sentiment"] == sentiment]

    total = len(df)
    df = df.sort_values("created_at", ascending=False).iloc[offset: offset + limit]

    records = []
    for _, row in df.iterrows():
        records.append({
            "id": int(row["id"]),
            "text": row["text"],
            "username": row["username"],
            "location": row["location"],
            "followers": int(row["followers"]),
            "likes": int(row["likes"]),
            "boosts": int(row["boosts"]),
            "engagement": int(row["engagement"]),
            "sentiment": row["sentiment"],
            "hashtags": row["hashtags"] if isinstance(row["hashtags"], list) else [],
            "created_at": row["created_at"].isoformat(),
            "date": row["date"],
        })
    return {"total": total, "offset": offset, "limit": limit, "posts": records}


# ── Geography ──────────────────────────────────────────────
def get_geography(start=None, end=None) -> list:
    df = _filter(get_df().copy(), start, end)
    if df.empty:
        return []

    grp = df.groupby("location").agg(
        count=("id", "count"),
        engagement=("engagement", "sum"),
    ).reset_index().sort_values("count", ascending=False).head(20)

    return [
        {"location": row["location"], "count": int(row["count"]), "engagement": int(row["engagement"])}
        for _, row in grp.iterrows()
    ]
