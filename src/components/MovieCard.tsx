"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Play, Plus, Check, LoaderCircle } from "lucide-react";

export type Item = {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  media_type?: "movie" | "tv";
};

type MovieCardProps = {
  item: Item;
  isSaved?: boolean;
  onSavedChange?: (saved: boolean) => void;
};

export default function MovieCard({ item, isSaved = false, onSavedChange }: MovieCardProps) {
  const [saved, setSaved] = useState(isSaved);
  const [pending, setPending] = useState(false);
  const type = item.media_type === "tv" ? "tv" : "movie";
  const title = item.title || item.name || "Untitled";
  const poster = item.poster_path ? "https://image.tmdb.org/t/p/w500" + item.poster_path : null;

  useEffect(() => {
    setSaved(isSaved);
  }, [isSaved]);

  async function toggleWatchlist() {
    if (pending) return;
    const nextSaved = !saved;
    setPending(true);
    try {
      const response = await fetch("/api/watchlist", {
        method: nextSaved ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: item.id,
          mediaType: type,
          title,
          posterPath: item.poster_path,
          releaseDate: item.release_date || item.first_air_date
        })
      });

      if (response.status === 401) {
        location.href = "/login";
        return;
      }
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Could not update watchlist.");
      }

      setSaved(nextSaved);
      onSavedChange?.(nextSaved);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not update watchlist.");
    } finally {
      setPending(false);
    }
  }

  return (
    <article className="movie-card">
      <Link className="poster-link" href={"/title/" + item.id + "?type=" + type}>
        <div className="poster-frame">
          {poster ? (
            <img src={poster} alt={title + " poster"} loading="lazy" />
          ) : (
            <div className="poster-fallback">DHANU<br />STREAM</div>
          )}
          <span className="poster-play"><Play size={19} fill="currentColor" /></span>
          {item.vote_average ? <span className="poster-rating">★ {item.vote_average.toFixed(1)}</span> : null}
        </div>
      </Link>
      <div className="movie-card-meta">
        <Link href={"/title/" + item.id + "?type=" + type} className="movie-card-title">{title}</Link>
        <div className="movie-card-sub">
          <span>{(item.release_date || item.first_air_date || "").slice(0, 4) || "New"}</span>
          <button
            type="button"
            onClick={toggleWatchlist}
            disabled={pending}
            aria-label={saved ? "Remove from watchlist" : "Add to watchlist"}
            aria-pressed={saved}
            title={saved ? "Remove from watchlist" : "Add to watchlist"}
          >
            {pending ? <LoaderCircle className="spin" size={16} /> : saved ? <Check size={16} /> : <Plus size={16} />}
          </button>
        </div>
      </div>
    </article>
  );
}
