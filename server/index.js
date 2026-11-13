import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { tmdb } from './tmdb.js';
import { createSession,clearSession,requireAdmin } from './auth.js';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const app=express();
app.set('trust proxy',1);
app.use(cors({origin:process.env.APP_ORIGIN?.split(',')||true,credentials:true}));
app.use(express.json({limit:'100kb'}));
app.use(cookieParser());
app.use('/api',rateLimit({windowMs:60_000,limit:100,standardHeaders:true,legacyHeaders:false}));
const wrap=fn=>(req,res)=>Promise.resolve(fn(req,res)).catch(e=>res.status(e.status||500).json({error:e.message||'Unexpected server error.'}));
const configPath=path.join(__dirname,'../data/site-config.json');
async function getConfig(){try{return JSON.parse(await fs.readFile(configPath,'utf8'));}catch{return {announcement:'',featured:[],sections:[]};}}
async function saveConfig(value){await fs.mkdir(path.dirname(configPath),{recursive:true});await fs.writeFile(configPath,JSON.stringify(value,null,2));}
app.get('/api/health',(req,res)=>res.json({ok:true,tmdbConfigured:!!process.env.TMDB_ACCESS_TOKEN,watchmodeConfigured:!!process.env.WATCHMODE_API_KEY}));
app.get('/api/home',wrap(async(req,res)=>{
 const config=await getConfig();
 const requests=[
  ['trending', '/trending/all/week',{language:'en-IN'}],
  ['popular','/movie/popular',{region:'IN',language:'en-IN'}],
  ['latest','/movie/now_playing',{region:'IN',language:'en-IN'}],
  ['upcoming','/movie/upcoming',{region:'IN',language:'en-IN'}],
  ['kannada','/discover/movie',{with_original_language:'kn',sort_by:'popularity.desc',region:'IN'}],
  ['telugu','/discover/movie',{with_original_language:'te',sort_by:'popularity.desc',region:'IN'}],
  ['tamil','/discover/movie',{with_original_language:'ta',sort_by:'popularity.desc',region:'IN'}],
  ['malayalam','/discover/movie',{with_original_language:'ml',sort_by:'popularity.desc',region:'IN'}],
  ['hindi','/discover/movie',{with_original_language:'hi',sort_by:'popularity.desc',region:'IN'}],
  ['series','/tv/popular',{language:'en-IN',region:'IN'}]
 ];
 const results=await Promise.allSettled(requests.map(async([key,url,params])=>[key,await tmdb(url,{...params,page:1})]));
 const data={config};
 for(const item of results) if(item.status==='fulfilled') data[item.value[0]]=item.value[1].results||[];
 const failed=results.filter(x=>x.status==='rejected');
 if(!Object.keys(data).some(k=>Array.isArray(data[k])&&data[k].length)) throw failed[0]?.reason||new Error('No movie data available.');
 res.json(data);
}));
app.get('/api/search',wrap(async(req,res)=>{
 const q=String(req.query.q||'').trim(); if(q.length<2)return res.json({results:[]});
 const data=await tmdb('/search/multi',{query:q,include_adult:false,language:'en-IN',page:1});
 res.json({results:(data.results||[]).filter(x=>['movie','tv'].includes(x.media_type)).slice(0,12)});
}));
app.get('/api/movie/:id',wrap(async(req,res)=>{
 const id=Number(req.params.id); if(!Number.isInteger(id))return res.status(400).json({error:'Invalid movie ID.'});
 const [details,credits,videos,similar,recommendations]=await Promise.all([
  tmdb(`/movie/${id}`,{append_to_response:'release_dates'}),
  tmdb(`/movie/${id}/credits`),
  tmdb(`/movie/${id}/videos`),
  tmdb(`/movie/${id}/similar`,{page:1}),
  tmdb(`/movie/${id}/recommendations`,{page:1})
 ]);
 let streaming=null;
 if(process.env.WATCHMODE_API_KEY){
  try{const r=await fetch(`https://api.watchmode.com/v1/title/${id}/sources/?apiKey=${process.env.WATCHMODE_API_KEY}&regions=IN`);if(r.ok)streaming=await r.json();}catch{}
 }
 res.json({details,credits,videos,similar:similar.results||[],recommendations:recommendations.results||[],streaming});
}));
app.get('/api/tv/:id',wrap(async(req,res)=>{
 const id=Number(req.params.id);
 const [details,credits,videos,similar]=await Promise.all([
  tmdb(`/tv/${id}`),tmdb(`/tv/${id}/credits`),tmdb(`/tv/${id}/videos`),tmdb(`/tv/${id}/similar`)
 ]);
 res.json({details,credits,videos,similar:similar.results||[],recommendations:[],streaming:null});
}));
app.get('/api/genres',wrap(async(req,res)=>{
 const [movies,tv]=await Promise.all([tmdb('/genre/movie/list',{language:'en'}),tmdb('/genre/tv/list',{language:'en'})]);
 res.json({movies:movies.genres,tv:tv.genres});
}));
app.get('/api/discover',wrap(async(req,res)=>{
 const page=Math.max(1,Math.min(500,Number(req.query.page)||1));
 const type=req.query.type==='tv'?'tv':'movie';
 const params={page,sort_by:req.query.sort||'popularity.desc',with_original_language:req.query.language||undefined,with_genres:req.query.genre||undefined,'primary_release_year':req.query.year||undefined,'vote_average.gte':req.query.rating||undefined,region:'IN'};
 const data=await tmdb(type==='tv'?'/discover/tv':'/discover/movie',params);res.json(data);
}));
app.post('/api/admin/login',wrap(async(req,res)=>{
 const {username,password}=req.body||{};
 if(!process.env.ADMIN_PASSWORD||!process.env.ADMIN_SESSION_SECRET)return res.status(503).json({error:'Configure ADMIN_PASSWORD and ADMIN_SESSION_SECRET on the server first.'});
 if(username!== (process.env.ADMIN_USERNAME||'admin') || password!==process.env.ADMIN_PASSWORD)return res.status(401).json({error:'Incorrect username or password.'});
 createSession(res);res.json({ok:true});
}));
app.post('/api/admin/logout',(req,res)=>{clearSession(res);res.json({ok:true});});
app.get('/api/admin/me',requireAdmin,(req,res)=>res.json({ok:true}));
app.get('/api/admin/config',requireAdmin,wrap(async(req,res)=>res.json(await getConfig())));
app.put('/api/admin/config',requireAdmin,wrap(async(req,res)=>{
 const {announcement='',featured=[],sections=[]}=req.body||{};
 if(typeof announcement!=='string'||!Array.isArray(featured)||!Array.isArray(sections))return res.status(400).json({error:'Invalid configuration format.'});
 const config={announcement:announcement.slice(0,240),featured:featured.slice(0,30),sections:sections.slice(0,20)};
 await saveConfig(config);res.json({ok:true,config});
}));
const dist=path.join(__dirname,'../dist');
app.use(express.static(dist));
app.get('*',(req,res)=>res.sendFile(path.join(dist,'index.html'),err=>{if(err)res.status(404).send('Build the frontend with npm run build first.');}));
const port=process.env.PORT||8787;
app.listen(port,()=>console.log(`DHANU MOVIE ADDA server listening on ${port}`));
