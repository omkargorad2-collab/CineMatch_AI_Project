import os
from datetime import date
from typing import Optional
from urllib.parse import quote_plus

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from demo_data import DEMO_MOVIES
from recommender import recommend, detect_genres

load_dotenv()
TOKEN = os.getenv("TMDB_BEARER_TOKEN", "").strip()
TMDB_LANGUAGE = os.getenv("TMDB_LANGUAGE", "en-US")
TMDB_REGION = os.getenv("TMDB_REGION", "IN")
TMDB_BASE = "https://api.themoviedb.org/3"
IMAGE_BASE = "https://image.tmdb.org/t/p/w500"

app = FastAPI(title="CineMatch AI API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://cine-match-ai-project.vercel.app",
    "https://cine-match-ai-project-am8afuw62-omsanti.vercel.app"
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LANGUAGES = [
    {"code": "all", "label": "All languages"},
    {"code": "en", "label": "English / Hollywood"},
    {"code": "hi", "label": "Hindi / Bollywood"},
    {"code": "mr", "label": "Marathi"},
    {"code": "ta", "label": "Tamil"},
    {"code": "te", "label": "Telugu"},
    {"code": "ml", "label": "Malayalam"},
    {"code": "kn", "label": "Kannada"},
    {"code": "bn", "label": "Bengali"},
    {"code": "ko", "label": "Korean"},
    {"code": "ja", "label": "Japanese"},
]

def tmdb_get(path, params=None):
    if not TOKEN:
        return None
    headers = {"Authorization": f"Bearer {TOKEN}", "accept": "application/json"}
    query = {"language": TMDB_LANGUAGE, "region": TMDB_REGION}
    query.update(params or {})
    try:
        response = requests.get(f"{TMDB_BASE}{path}", headers=headers, params=query, timeout=12)
        response.raise_for_status()
        return response.json()
    except requests.RequestException:
        return None

def genre_map():
    data = tmdb_get("/genre/movie/list")
    return {g["id"]: g["name"] for g in (data or {}).get("genres", [])}

def normalize_tmdb(movie, genres=None):
    genres = genres or {}
    genre_names = movie.get("genre_names")
    if not genre_names:
        genre_names = [genres.get(gid, str(gid)) for gid in movie.get("genre_ids", [])]
    poster = movie.get("poster_path")
    return {
        "id": movie.get("id"),
        "title": movie.get("title") or movie.get("original_title") or "Untitled",
        "overview": movie.get("overview") or "",
        "release_date": movie.get("release_date") or "",
        "original_language": movie.get("original_language") or "",
        "genre_names": genre_names,
        "vote_average": movie.get("vote_average") or 0,
        "poster_path": f"{IMAGE_BASE}{poster}" if poster else None,
        "source": "tmdb",
    }

def discover_movies(year: Optional[int] = None, language: str = "all", page: int = 1, sort: str = "popularity.desc"):
    params = {"sort_by": sort, "page": page, "include_adult": "false", "vote_count.gte": 5}
    if year:
        params["primary_release_year"] = year
    if language and language != "all":
        params["with_original_language"] = language
    data = tmdb_get("/discover/movie", params)
    if data and "results" in data:
        genres = genre_map()
        return [normalize_tmdb(m, genres) for m in data["results"]]
    movies = list(DEMO_MOVIES)
    if year:
        movies = [m for m in movies if (m.get("release_date", "")[:4] == str(year))]
    if language and language != "all":
        movies = [m for m in movies if m.get("original_language") == language]
    return movies

@app.get("/")
def root():
    return {"name": "CineMatch AI", "status": "ok", "tmdb_configured": bool(TOKEN)}

@app.get("/api/languages")
def get_languages():
    return LANGUAGES

@app.get("/api/movies")
def get_movies(
    year: Optional[int] = Query(default=None, ge=1900, le=2100),
    language: str = "all",
    page: int = Query(default=1, ge=1, le=500),
    sort: str = "popularity.desc",
):
    movies = discover_movies(year=year, language=language, page=page, sort=sort)
    return {"results": movies, "using_tmdb": bool(TOKEN), "total": len(movies)}

@app.get("/api/recommend")
def get_recommendations(
    q: str = Query(min_length=2, max_length=500),
    year: Optional[int] = Query(default=None, ge=1900, le=2100),
    language: str = "all",
    limit: int = Query(default=12, ge=1, le=30),
):
    # Pull current metadata when TMDB is configured; demo data is fallback.
    movies = discover_movies(year=year, language=language, page=1, sort="popularity.desc")
    # Use several pages for a broader recommendation pool when available.
    if TOKEN and not year:
        for page in (2, 3):
            movies.extend(discover_movies(year=None, language=language, page=page))
    # Deduplicate by ID/title.
        unique = {}
    for m in movies:
        unique[m.get("id") or m.get("title")] = m

    # Fetch additional movies matching the requested genre
    requested_genres = detect_genres(q)

    if TOKEN and requested_genres:
        genre_data = tmdb_get("/genre/movie/list")

        genre_ids = [
            str(g["id"])
            for g in (genre_data or {}).get("genres", [])
            if g["name"].lower() in requested_genres
        ]

        if genre_ids:
            for page in (1, 2, 3):
                params = {
                    "with_genres": "|".join(genre_ids),
                    "sort_by": "popularity.desc",
                    "page": page,
                    "include_adult": "false",
                }

                if language != "all":
                    params["with_original_language"] = language

                if year:
                    params["primary_release_year"] = year

                data = tmdb_get("/discover/movie", params)

                if data:
                    genres = genre_map()

                    for movie in data.get("results", []):
                        normalized = normalize_tmdb(movie, genres)
                        unique[normalized["id"]] = normalized
    results = recommend(q, list(unique.values()), limit=limit)
    return {"query": q, "results": results, "using_tmdb": bool(TOKEN)}

@app.get("/api/movie/{movie_id}")
def movie_details(movie_id: int):
    data = tmdb_get(f"/movie/{movie_id}", {"append_to_response": "videos,watch/providers"})
    if data:
        genres = [g.get("name") for g in data.get("genres", [])]
        movie = normalize_tmdb({**data, "genre_names": genres})
        videos = data.get("videos", {}).get("results", [])
        trailer = next((v for v in videos if v.get("site") == "YouTube" and v.get("type") == "Trailer"), None)
        movie["trailer_url"] = f"https://www.youtube.com/watch?v={trailer['key']}" if trailer else None
        return movie
    match = next((m for m in DEMO_MOVIES if m["id"] == movie_id), None)
    if not match:
        return {"error": "Movie not found"}
    return match

@app.get("/api/watch-options")
def watch_options(title: str = Query(min_length=1, max_length=200)):
    # Provider catalogues and rights vary by region; this opens discovery links, not an embedded stream.
    q = quote_plus(title)
    return {
        "title": title,
        "trailer_search": f"https://www.youtube.com/results?search_query={q}+official+trailer",
        "legal_streaming_search": f"https://www.justwatch.com/in/search?q={q}",
        "note": "Availability varies by region and subscription. This API does not provide movie files."
    }
@app.get("/api/search")
def search_movies(
    q: str = Query(min_length=1, max_length=200),
    language: str = "all",
    year: Optional[int] = Query(default=None, ge=1900, le=2100),
):
    params = {
        "query": q,
        "include_adult": "false",
        "page": 1,
    }

    if year:
        params["year"] = year

    data = tmdb_get("/search/movie", params)

    if data and "results" in data:
        genres = genre_map()
        movies = [
            normalize_tmdb(m, genres)
            for m in data["results"]
        ]

        if language != "all":
            movies = [
                m for m in movies
                if m["original_language"] == language
            ]

        # Exact title matches appear first.
        movies.sort(
            key=lambda m: (
                m["title"].lower() != q.strip().lower(),
                -m["vote_average"]
            )
        )

        return {
            "results": movies,
            "using_tmdb": True
        }

    return {
        "results": [],
        "using_tmdb": False
    }
