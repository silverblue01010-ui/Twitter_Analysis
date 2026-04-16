# 📊 Twitter Analytics Dashboard (Excel/JSON Demo)

Full-stack analytics dashboard using **500 pre-generated posts** — no database needed.

## 🗂️ Project Structure

```
twitter-analytics/
├── backend/
│   ├── main.py           ← FastAPI app
│   ├── data_loader.py    ← Loads JSON into Pandas DataFrame
│   ├── analytics.py      ← All analytics logic
│   ├── data.json         ← 500 sample posts (auto-generated)
│   ├── generate_data.py  ← Dataset generator (already run)
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── styles.css
    └── script.js
```

## 🚀 Run It

### Backend
```bash
cd backend
pip install fastapi uvicorn pandas openpyxl
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
python3 -m http.server 3000
# open http://localhost:3000
```

## 📡 API Endpoints

| Endpoint | Description |
|---|---|
| `GET /analytics/summary` | Total posts, likes, boosts, sentiment |
| `GET /analytics/influencers` | Top users by followers/engagement |
| `GET /analytics/hashtags` | Tag frequency + engagement |
| `GET /analytics/timeline` | Posts per day |
| `GET /analytics/sentiment-timeline` | Sentiment breakdown by day |
| `GET /analytics/geography` | Posts by city |
| `GET /analytics/posts` | Full feed with search/filter/pagination |

### All endpoints support: `?start=YYYY-MM-DD&end=YYYY-MM-DD`

### `/analytics/posts` also supports:
- `?keyword=python`
- `?hashtag=ai`
- `?sentiment=positive`
- `?limit=100&offset=0`

## 📊 Dashboard Features

- **Summary**: 4 KPI cards + timeline + sentiment donut + stacked sentiment + mini hashtag chart
- **Influencers**: Bubble scatter map + sortable table (click column headers to sort)
- **Hashtags**: Frequency bar + engagement bar + interactive tag cloud (click to filter feed)
- **Geography**: Horizontal bar chart + ranked location list
- **Tweet Feed**: Paginated table with keyword/hashtag/sentiment/date filters + Load More

## 🔄 Regenerate Data

```bash
cd backend
python3 generate_data.py
```
