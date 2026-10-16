import re

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


GENRES = [
    "action", "adventure", "animation", "comedy",
    "crime", "documentary", "drama", "family",
    "fantasy", "history", "horror", "music",
    "mystery", "romance", "science fiction",
    "thriller", "war", "western"
]

GENRE_ALIASES = {
    "scifi": "science fiction",
    "sci-fi": "science fiction",
    "romantic": "romance",
    "funny": "comedy",
    "scary": "horror",
    "suspense": "thriller",
}


def movie_text(movie):
    genres = movie.get("genre_names") or []
    keywords = movie.get("keywords") or []

    return " ".join([
        str(movie.get("title") or ""),
        str(movie.get("overview") or ""),
        " ".join(genres) * 3,
        " ".join(keywords),
        str(movie.get("original_language") or ""),
    ])


def detect_genres(query):
    text = query.lower()
    found = []

    for alias, genre in GENRE_ALIASES.items():
        if re.search(r"\b" + re.escape(alias) + r"\b", text):
            found.append(genre)

    for genre in GENRES:
        if re.search(r"\b" + re.escape(genre) + r"\b", text):
            found.append(genre)

    return list(set(found))


def recommend(query, movies, limit=12):
    if not movies:
        return []

    requested_genres = detect_genres(query)

    if requested_genres:
        movies = [
            movie for movie in movies
            if any(
                genre.lower() in requested_genres
                for genre in movie.get("genre_names", [])
            )
        ]

    if not movies:
        return []

    corpus = [movie_text(movie) for movie in movies]

    vectorizer = TfidfVectorizer(
        stop_words="english",
        ngram_range=(1, 2),
        max_features=30000
    )

    matrix = vectorizer.fit_transform(corpus + [query])

    scores = cosine_similarity(
        matrix[-1],
        matrix[:-1]
    ).ravel()

    ranked = sorted(
        enumerate(scores),
        key=lambda pair: pair[1],
        reverse=True
    )

    results = []

    for idx, score in ranked:
        if score <= 0:
            continue

        item = dict(movies[idx])
        item["match_score"] = round(float(score), 4)
        results.append(item)

        if len(results) >= limit:
            break

    return results
