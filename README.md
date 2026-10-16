# CineMatch AI — NLP Movie Recommendation & Discovery

A runnable starter project with:
- React + Vite + Tailwind-style custom CSS frontend
- Python FastAPI backend
- NLP recommendations using TF-IDF + cosine similarity
- Natural-language query search across movie descriptions
- TMDB API integration for current movie metadata (optional but recommended)
- Filters for language, release year, genre and movie title
- Trailer links and legitimate streaming-provider discovery links
- Optional local video playback for files you have permission to play

## Important
TMDB provides movie metadata, posters and discovery data—not full movies. The app does not scrape or host copyrighted films. "Watch options" open official/legitimate discovery links. Full playback is available only for a local video file you own or are authorized to play.

## Requirements
- Python 3.10+
- Node.js 18+
- (Optional) TMDB API Read Access Token from https://www.themoviedb.org/settings/api

## 1. Configure the backend
Open a terminal in `backend/`:

Windows PowerShell:
```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Open `.env` and paste your TMDB API Read Access Token:
```env
TMDB_BEARER_TOKEN=your_tmdb_read_access_token_here
```
You can run without a token; the app will use the bundled demo dataset.

Start the API:
```powershell
uvicorn app.main:app --reload
```
API docs: http://127.0.0.1:8000/docs

## 2. Start the frontend
Open a second terminal in `frontend/`:
```powershell
npm install
npm run dev
```
Open the URL printed by Vite, normally http://localhost:5173

## Supported language filters
English, Hindi, Marathi, Tamil, Telugu, Malayalam, Kannada, Bengali, Korean, Japanese and more.
TMDB language filters use ISO 639-1 codes (for example English=en, Hindi=hi, Marathi=mr).

## How NLP works
1. Movie overview, genres, keywords and title are combined into text.
2. `TfidfVectorizer` converts the text to numerical vectors.
3. Cosine similarity ranks movies against the user's natural-language prompt.
4. The backend returns the highest-scoring matches.

This is a transparent baseline, suitable for explaining in a DSAI project viva. It is not a generative chatbot; semantic embeddings can be added as an extension.

## Recent movies
The app queries TMDB dynamically when a token is configured, so it can discover current records and filter by years including 2024, 2025 and 2026. Release dates and regional availability depend on TMDB data. Without a token, it uses a small demo dataset.

## Playback
- **Trailer**: opens a YouTube search for the title + trailer (does not guarantee an official trailer is available).
- **Watch options**: opens a JustWatch India search to find legal providers; availability and subscriptions vary.
- **Play local file**: choose a local video file you have the right to play. Browser format support varies.

## Project structure
```text
CineMatch_AI/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── recommender.py
│   │   └── demo_data.py
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── styles.css
    ├── index.html
    ├── package.json
    └── vite.config.js
```
