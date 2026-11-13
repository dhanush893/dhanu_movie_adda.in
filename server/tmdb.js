const BASE = 'https://api.themoviedb.org/3';
const cache = new Map();
const TTL = 5 * 60 * 1000;
export const image = (path, size='w500') => path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
export async function tmdb(path, params={}) {
  const token = process.env.TMDB_ACCESS_TOKEN;
  if (!token) { const e = new Error('TMDB is not configured. Add TMDB_ACCESS_TOKEN to the server environment.'); e.status=503; throw e; }
  const url = new URL(BASE + path);
  Object.entries(params).forEach(([k,v]) => v !== undefined && v !== '' && url.searchParams.set(k, String(v)));
  const key=url.toString(), hit=cache.get(key);
  if (hit && hit.expires>Date.now()) return hit.data;
  const response=await fetch(url,{headers:{Authorization:`Bearer ${token}`,Accept:'application/json'}});
  if (response.status===429) { const e=new Error('TMDB rate limit reached. Please try again shortly.'); e.status=429; throw e; }
  if (!response.ok) { const e=new Error(`TMDB request failed (${response.status}).`); e.status=response.status; throw e; }
  const data=await response.json();
  cache.set(key,{data,expires:Date.now()+TTL});
  if(cache.size>400) cache.delete(cache.keys().next().value);
  return data;
}
