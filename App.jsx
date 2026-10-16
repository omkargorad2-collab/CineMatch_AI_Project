import { useEffect, useMemo, useState } from 'react'
import { Search, Sparkles, Film, Play, ExternalLink, Clapperboard, Languages, CalendarDays, Star, Heart, X, LoaderCircle, SlidersHorizontal } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
const LANGS = [
  ['all','All languages'], ['en','English / Hollywood'], ['hi','Hindi / Bollywood'],
  ['mr','Marathi'], ['ta','Tamil'], ['te','Telugu'], ['ml','Malayalam'],
  ['kn','Kannada'], ['bn','Bengali'], ['ko','Korean'], ['ja','Japanese']
]
const YEAR_OPTIONS = [['all','Any year'],['2026','2026 releases'],['2025','2025 releases'],['2024','2024 releases'],['2023','2023 releases']]
const SUGGESTIONS = [
  'Mind-bending sci-fi with a shocking twist',
  'A Marathi mystery thriller with a dark atmosphere',
  'Feel-good Hindi comedy about friendship',
  'Recent English space adventures released after 2024'
]
const FALLBACK = [
  {id:4,title:'Dune: Part Two',overview:'An epic desert science-fiction saga of destiny, politics and survival.',release_date:'2024-02-27',original_language:'en',genre_names:['Science Fiction','Adventure'],vote_average:8.2},
  {id:5,title:'Laapataa Ladies',overview:'Two brides get separated on a train journey in rural India in a funny and heartfelt story.',release_date:'2024-03-01',original_language:'hi',genre_names:['Comedy','Drama'],vote_average:8.0},
  {id:6,title:'Stree 2',overview:'A town faces a supernatural threat in a horror comedy inspired by folklore.',release_date:'2024-08-15',original_language:'hi',genre_names:['Horror','Comedy'],vote_average:7.2},
  {id:10,title:'The Wild Robot',overview:'A stranded robot learns to survive and care for an orphaned gosling on a remote island.',release_date:'2024-09-12',original_language:'en',genre_names:['Animation','Family'],vote_average:8.2},
  {id:1,title:'Interstellar',overview:'A team travels through a wormhole to find a new home for humanity.',release_date:'2014-11-07',original_language:'en',genre_names:['Science Fiction','Drama'],vote_average:8.7},
  {id:3,title:'Shutter Island',overview:'A marshal investigates a disappearance at an isolated hospital and uncovers disturbing secrets.',release_date:'2010-02-19',original_language:'en',genre_names:['Mystery','Thriller'],vote_average:8.2}
]
const yearOf = m => (m.release_date || '').slice(0,4) || '—'
const langName = code => ({en:'English',hi:'Hindi',mr:'Marathi',ta:'Tamil',te:'Telugu',ml:'Malayalam',kn:'Kannada',bn:'Bengali',ko:'Korean',ja:'Japanese'}[code] || (code || 'Unknown').toUpperCase())
const poster = m => m.poster_path || `https://placehold.co/400x600/171b25/e9edf7?text=${encodeURIComponent(m.title || 'Movie')}`

function MovieCard({ movie, onOpen, saved, onSave }) {
  return <article className="movie-card">
    <button className="poster-button" onClick={() => onOpen(movie)} aria-label={`Open ${movie.title}`}>
      <img className="poster" src={poster(movie)} alt={`${movie.title} poster`} loading="lazy" />
      <span className="poster-overlay"><Play size={22} fill="currentColor"/> Details</span>
    </button>
    <div className="movie-info">
      <div className="movie-title-line"><h3>{movie.title}</h3><button className={`save-btn ${saved ? 'saved' : ''}`} onClick={() => onSave(movie)} title="Save favourite"><Heart size={16} fill={saved ? 'currentColor' : 'none'}/></button></div>
      <div className="meta"><span>{yearOf(movie)}</span><span>·</span><span>{langName(movie.original_language)}</span>{movie.vote_average > 0 && <><span>·</span><span className="rating"><Star size={12} fill="currentColor"/>{Number(movie.vote_average).toFixed(1)}</span></>}</div>
      <p>{movie.overview || 'Synopsis is not available yet.'}</p>
      <div className="genres">{(movie.genre_names || []).slice(0,3).map(g => <span key={g}>{g}</span>)}</div>
    </div>
  </article>
}

export default function App() {
  const [query, setQuery] = useState('')
  const [language, setLanguage] = useState('all')
  const [year, setYear] = useState('all')
  const [movies, setMovies] = useState(FALLBACK)
  const [mode, setMode] = useState('trending')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [usingTmdb, setUsingTmdb] = useState(false)
  const [selected, setSelected] = useState(null)
  const [saved, setSaved] = useState(() => { try { return JSON.parse(localStorage.getItem('cinematch-favs') || '[]') } catch { return [] } })
  const [localUrl, setLocalUrl] = useState('')
  const [localName, setLocalName] = useState('')
  const [showLocal, setShowLocal] = useState(false)

  const shownMovies = useMemo(() => {
    if (mode === 'saved') return saved
    return movies
  }, [mode, movies, saved])

  useEffect(() => { loadMovies() }, [language, year])

  async function loadMovies() {
    setBusy(true); setError('')
    try {
      const params = new URLSearchParams()
      if (language !== 'all') params.set('language', language)
      if (year !== 'all') params.set('year', year)
      const res = await fetch(`${API}/api/movies?${params}`)
      if (!res.ok) throw new Error('API returned an error')
      const data = await res.json()
      setMovies(data.results?.length ? data.results : [])
      setUsingTmdb(Boolean(data.using_tmdb))
    } catch {
      let fallback = [...FALLBACK]
      if (language !== 'all') fallback = fallback.filter(m => m.original_language === language)
      if (year !== 'all') fallback = fallback.filter(m => yearOf(m) === year)
      setMovies(fallback)
      setUsingTmdb(false)
      setError('Backend is not connected. Showing demo movies; start the FastAPI server for live catalogue data.')
    } finally { setBusy(false) }
  }

  async function searchRecommendations(text = query) {
    if (!text.trim()) { setError('Type a movie mood, plot idea, genre or a title first.'); return }
    setBusy(true); setError(''); setMode('recommendations')
    try {
      const params = new URLSearchParams({ q: text.trim(), limit: '18' })
      if (language !== 'all') params.set('language', language)
      if (year !== 'all') params.set('year', year)
      const res = await fetch(`${API}/api/recommend?${params}`)
      if (!res.ok) throw new Error('Recommendation API failed')
      const data = await res.json()
      setMovies(data.results || [])
      setUsingTmdb(Boolean(data.using_tmdb))
      if (!data.results?.length) setError('No matching movies found for those filters. Try another language or year.')
    } catch {
      const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2)
      const ranked = FALLBACK.map(m => ({...m, match_score: words.filter(w => `${m.title} ${m.overview} ${(m.genre_names||[]).join(' ')}`.toLowerCase().includes(w)).length}))
        .filter(m => (language === 'all' || m.original_language === language) && (year === 'all' || yearOf(m) === year))
        .sort((a,b) => b.match_score-a.match_score)
      setMovies(ranked)
      setUsingTmdb(false)
      setError('Backend is offline. These are basic demo matches, not full NLP recommendations.')
    } finally { setBusy(false) }
  }

  function toggleSave(movie) {
    setSaved(old => {
      const next = old.some(m => m.id === movie.id) ? old.filter(m => m.id !== movie.id) : [movie, ...old]
      localStorage.setItem('cinematch-favs', JSON.stringify(next))
      return next
    })
  }
  function openMovie(movie) { setSelected(movie); setLocalUrl(''); setLocalName('') }
  function playLocal(file) {
    if (localUrl) URL.revokeObjectURL(localUrl)
    if (file) { setLocalName(file.name); setLocalUrl(URL.createObjectURL(file)) }
  }
  const selectedSaved = selected && saved.some(m => m.id === selected.id)
  const trailerUrl = m => m.trailer_url || `https://www.youtube.com/results?search_query=${encodeURIComponent(`${m.title} official trailer`) }`
  const watchUrl = m => `https://www.justwatch.com/in/search?q=${encodeURIComponent(m.title)}`

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#" onClick={e => {e.preventDefault(); setMode('trending'); loadMovies()}}><span className="brand-icon"><Clapperboard size={22}/></span><span>CineMatch<span className="brand-ai"> AI</span><small>YOUR NEXT FAVOURITE FILM</small></span></a>
      <nav><button className={mode==='trending'?'nav-active':''} onClick={() => {setMode('trending'); loadMovies()}}>Discover</button><button className={mode==='saved'?'nav-active':''} onClick={() => setMode('saved')}>My List <span className="list-count">{saved.length}</span></button></nav>
      <div className="status-pill"><span className={`status-dot ${usingTmdb?'live':''}`}></span>{usingTmdb ? 'Live catalogue' : 'Demo mode'}</div>
    </header>

    <main>
      <section className="hero">
        <div className="hero-copy"><div className="eyebrow"><Sparkles size={14}/> AI-POWERED MOVIE DISCOVERY</div>
          <h1>Tell us your mood.<br/><span>We’ll find the movie.</span></h1>
          <p>Search in your own words. Discover Hollywood, Bollywood, Marathi cinema and stories from around the world.</p>
          <form className="searchbar" onSubmit={e => {e.preventDefault(); searchRecommendations()}}>
            <Search size={20}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="A mind-bending thriller with a twist..." aria-label="Describe a movie"/>
            <button type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={18}/> : 'Find movies'}</button>
          </form>
          <div className="suggestions"><span>TRY:</span>{SUGGESTIONS.slice(0,3).map(s => <button key={s} onClick={() => {setQuery(s); searchRecommendations(s)}}>{s}</button>)}</div>
        </div>
        <div className="hero-art" aria-hidden="true"><div className="orb orb-one"></div><div className="orb orb-two"></div><div className="art-poster poster-a"><div className="art-sun"></div><span>THE UNKNOWN</span></div><div className="art-poster poster-b"><div className="art-moon"></div><span>BEYOND TIME</span></div><div className="art-poster poster-c"><div className="art-city"></div><span>AFTER DARK</span></div><div className="art-glow"></div></div>
      </section>

      <section className="filter-row">
        <div className="section-label"><SlidersHorizontal size={16}/><span>Refine discovery</span></div>
        <label><Languages size={15}/><select value={language} onChange={e => {setLanguage(e.target.value); setMode('trending')}}>{LANGS.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>
        <label><CalendarDays size={15}/><select value={year} onChange={e => {setYear(e.target.value); setMode('trending')}}>{YEAR_OPTIONS.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>
        <span className="filter-note">2024 · 2025 · 2026 & beyond</span>
      </section>

      {error && <div className="notice"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss"><X size={16}/></button></div>}

      <section className="catalogue">
        <div className="section-heading"><div><div className="eyebrow">{mode==='saved'?'YOUR COLLECTION':mode==='recommendations'?'PERSONALISED FOR YOUR PROMPT':'HANDPICKED FOR YOUR NEXT WATCH'}</div><h2>{mode==='saved'?'My Watchlist':mode==='recommendations'?'Your recommendations':'Discover movies'}</h2><p>{mode==='recommendations'?'Ranked by text relevance using the NLP recommendation engine.':'Explore films by language, release year and vibe.'}</p></div><div className="result-count">{busy ? 'Loading…' : `${shownMovies.length} titles`}</div></div>
        {busy && <div className="loading-line"><span></span></div>}
        {!busy && shownMovies.length === 0 ? <div className="empty-state"><Film size={32}/><h3>No movies here yet</h3><p>Try another filter or search for a different vibe.</p><button className="secondary-btn" onClick={() => {setMode('trending');setLanguage('all');setYear('all')}}>Reset filters</button></div> :
          <div className="movie-grid">{shownMovies.map(m => <MovieCard key={m.id || m.title} movie={m} onOpen={openMovie} saved={saved.some(s => s.id===m.id)} onSave={toggleSave}/>)}</div>}
      </section>

      <section className="how-it-works"><div className="eyebrow">UNDER THE HOOD</div><h2>More than just matching genres.</h2><div className="steps"><div><span>01</span><h3>Understand</h3><p>Your description is compared with movie plots, genres and keywords.</p></div><div><span>02</span><h3>Rank</h3><p>TF-IDF and cosine similarity rank the most relevant matches.</p></div><div><span>03</span><h3>Discover</h3><p>Explore details, trailers, legal viewing options and your own watchlist.</p></div></div></section>
    </main>

    <footer><a className="brand footer-brand" href="#"><span className="brand-icon"><Clapperboard size={18}/></span><span>CineMatch<span className="brand-ai"> AI</span></span></a><p>Made for movie lovers. Metadata powered by TMDB when configured.</p><p className="tmdb-note">This product uses the TMDB API but is not endorsed or certified by TMDB.</p></footer>

    {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><section className="detail-modal" onClick={e => e.stopPropagation()}>
      <button className="modal-close" onClick={() => setSelected(null)} aria-label="Close"><X/></button>
      <img className="detail-poster" src={poster(selected)} alt={`${selected.title} poster`}/>
      <div className="detail-content"><div className="eyebrow">MOVIE DETAILS</div><h2>{selected.title}</h2><div className="meta detail-meta"><span>{yearOf(selected)}</span><span>·</span><span>{langName(selected.original_language)}</span>{selected.vote_average>0 && <span className="rating"><Star size={13} fill="currentColor"/>{Number(selected.vote_average).toFixed(1)}</span>}</div><div className="genres">{(selected.genre_names||[]).map(g=><span key={g}>{g}</span>)}</div><p>{selected.overview || 'No synopsis is available.'}</p>
        <div className="action-buttons"><a className="primary-action" href={trailerUrl(selected)} target="_blank" rel="noreferrer"><Play size={16} fill="currentColor"/> Watch trailer <ExternalLink size={14}/></a><a className="secondary-action" href={watchUrl(selected)} target="_blank" rel="noreferrer">Find legal streaming <ExternalLink size={14}/></a><button className="secondary-action" onClick={() => toggleSave(selected)}><Heart size={16} fill={selectedSaved?'currentColor':'none'}/>{selectedSaved?'Saved to list':'Add to list'}</button></div>
        <div className="local-player"><div className="local-player-title"><Play size={15}/> Play a local video file</div><p>Choose a video file you own or are authorized to play. The file stays in your browser.</p><label className="file-pick">Choose video<input type="file" accept="video/*" onChange={e => playLocal(e.target.files?.[0])}/></label>{localName && <span className="file-name">{localName}</span>}{localUrl && <video controls className="video-player" src={localUrl}>Your browser does not support this video.</video>}</div>
      </div>
    </section></div>}
  </div>
}
