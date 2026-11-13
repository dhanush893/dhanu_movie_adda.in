import crypto from 'node:crypto';
const cookieName='dma_admin';
const sign=value=>crypto.createHmac('sha256',process.env.ADMIN_SESSION_SECRET||'development-only-secret').update(value).digest('hex');
export function createSession(res) {
  const payload=Buffer.from(JSON.stringify({u:process.env.ADMIN_USERNAME||'admin',exp:Date.now()+8*60*60*1000})).toString('base64url');
  const value=payload+'.'+sign(payload);
  res.cookie(cookieName,value,{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',maxAge:8*60*60*1000,path:'/'});
}
export function clearSession(res){res.clearCookie(cookieName,{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/'});}
export function requireAdmin(req,res,next){
  try {
    const value=req.cookies?.[cookieName]||'', [payload,signature]=value.split('.');
    if(!payload||!signature||!crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(sign(payload)))) return res.status(401).json({error:'Admin sign-in required.'});
    const data=JSON.parse(Buffer.from(payload,'base64url').toString());
    if(data.exp<Date.now()||data.u!==(process.env.ADMIN_USERNAME||'admin')) return res.status(401).json({error:'Session expired.'});
    next();
  } catch { return res.status(401).json({error:'Admin sign-in required.'}); }
}
