from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import Optional
import os

from data_loader import load_data
import analytics as al

app = FastAPI(title="Twitter Analytics API", version="2.0.0", description="Excel/JSON-based Twitter Analytics")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pre-load data at startup
@app.on_event("startup")
def startup():
    load_data()
    print("[API] Data loaded and ready.")


@app.get("/")
def root():
    return {"message": "Twitter Analytics API", "status": "running", "posts": len(load_data())}


@app.get("/health")
def health():
    df = load_data()
    return {"status": "ok", "total_posts": len(df), "date_range": {
        "start": str(df["created_at"].min().date()),
        "end": str(df["created_at"].max().date()),
    }}


@app.get("/analytics/summary")
def summary(start: Optional[str] = None, end: Optional[str] = None):
    return al.get_summary(start, end)


@app.get("/analytics/influencers")
def influencers(
    limit: int = Query(25, ge=1, le=100),
    start: Optional[str] = None,
    end: Optional[str] = None,
):
    return al.get_influencers(limit, start, end)


@app.get("/analytics/hashtags")
def hashtags(
    limit: int = Query(20, ge=1, le=50),
    start: Optional[str] = None,
    end: Optional[str] = None,
):
    return al.get_hashtags(limit, start, end)


@app.get("/analytics/timeline")
def timeline(start: Optional[str] = None, end: Optional[str] = None):
    return al.get_timeline(start, end)


@app.get("/analytics/sentiment-timeline")
def sentiment_timeline(start: Optional[str] = None, end: Optional[str] = None):
    return al.get_sentiment_timeline(start, end)


@app.get("/analytics/geography")
def geography(start: Optional[str] = None, end: Optional[str] = None):
    return al.get_geography(start, end)


@app.get("/analytics/posts")
def posts(
    keyword: Optional[str] = None,
    hashtag: Optional[str] = None,
    sentiment: Optional[str] = None,
    start: Optional[str] = None,
    end: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    return al.get_posts(keyword, hashtag, sentiment, start, end, limit, offset)
