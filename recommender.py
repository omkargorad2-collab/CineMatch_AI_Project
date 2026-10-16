from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def movie_text(movie):
    genres = movie.get("genre_names") or []
    keywords = movie.get("keywords") or []
    return " ".join([
        str(movie.get("title") or ""),
        str(movie.get("overview") or ""),
        " ".join(genres),
        " ".join(keywords),
        str(movie.get("original_language") or ""),
    ])

def recommend(query, movies, limit=12):
    if not movies:
        return []
    corpus = [movie_text(m) for m in movies]
    # Include the user query as the final document so it uses the same vocabulary.
    vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), max_features=30000)
    matrix = vectorizer.fit_transform(corpus + [query])
    scores = cosine_similarity(matrix[-1], matrix[:-1]).ravel()
    ranked = sorted(enumerate(scores), key=lambda pair: pair[1], reverse=True)
    results = []
    for idx, score in ranked[:limit]:
        item = dict(movies[idx])
        item["match_score"] = round(float(score), 4)
        results.append(item)
    return results
