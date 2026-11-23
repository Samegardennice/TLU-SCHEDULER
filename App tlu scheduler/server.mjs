import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {normalize} from './public/schedule.mjs';

const BASE = 'https://sinhvien1.tlu.edu.vn/education/';
const PORT = Number(process.env.PORT || 4317);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const sessions = new Map();
const TTL = 2 * 60 * 60 * 1000;
class AppError extends Error { constructor(message, status=502) {super(message); this.status=status;} }
export class TluClient {
  constructor(transport=fetch) {this.transport=transport; this.token=null;}
  async request(path, {form, token}={}) {
    let response;
    try { response = await this.transport(BASE+path, {method:form?'POST':'GET', redirect:'error', signal:AbortSignal.timeout(20000), headers:{Accept:'application/json', ...(form?{'Content-Type':'application/x-www-form-urlencoded'}:{}), ...(token?{Authorization:`Bearer ${token}`}:{})}, body:form?new URLSearchParams(form):undefined}); }
    catch {throw new AppError('Không kết nối được tới TLU. Kiểm tra mạng và thử lại.');}
    if (!response.ok) {
      if ([400,401].includes(response.status)) throw new AppError(form?.grant_type === 'password' ? 'Đăng nhập không thành công. Kiểm tra tài khoản và mật khẩu.' : 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',401);
      if (response.status === 403) throw new AppError('Tài khoản không được phép truy cập dữ liệu này.',403);
      if (response.status === 429) throw new AppError('Trường đang giới hạn yêu cầu. Vui lòng chờ rồi thử lại.',429);
      throw new AppError(`Máy chủ TLU trả lỗi ${response.status}. Vui lòng thử lại sau.`);
    }
    try {return await response.json();} catch {throw new AppError('TLU trả dữ liệu không hợp lệ.');}
  }
  async grant(fields) {
    const result = await this.request('oauth/token', {form:{client_id:'education_client',client_secret:'password',...fields}});
    if (!result.access_token) throw new AppError('TLU không trả phiên đăng nhập hợp lệ.');
    this.token = {access:result.access_token, refresh:result.refresh_token, expires:Date.now()+Number(result.expires_in || 600)*1000};
  }
  async login(username,password) {await this.grant({grant_type:'password', username,password});}
  async get(path) {
    if (!this.token) throw new AppError('Vui lòng đăng nhập.',401);
    if (Date.now() >= this.token.expires-30000 && this.token.refresh) await this.grant({grant_type:'refresh_token',refresh_token:this.token.refresh});
    try {return await this.request(path,{token:this.token.access});}
    catch(e) {
      if(e.status!==401 || !this.token.refresh) throw e;
      await this.grant({grant_type:'refresh_token',refresh_token:this.token.refresh});
      return this.request(path,{token:this.token.access});
    }
  }
  async semesters() {
    const list = [];
    for(let page=1;page<=20;page++) {
      const data = await this.get(`api/semester/${page}/100`);
      if (!Array.isArray(data.content)) throw new AppError('Danh sách học kỳ không đúng định dạng.');
      list.push(...data.content);
      if (data.last !== false && !(Number(data.totalPages)>page)) break;
      if(page===20) throw new AppError('Danh sách học kỳ vượt giới hạn bản thử.');
    }
    return list;
  }
}
function sid(req) {return /(?:^|;\s*)tlu_local=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];}
function send(res,status,data,headers={}) {res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(data));}
async function body(req) {
  let bytes=0, chunks=[];
  for await (const chunk of req) { bytes+=chunk.length; if(bytes>16384) throw new AppError('Yêu cầu quá lớn.',413); chunks.push(chunk); }
  try {return JSON.parse(Buffer.concat(chunks).toString());} catch {throw new AppError('Yêu cầu không hợp lệ.',400);}
}
export function createApp(clientFactory=()=>new TluClient()) {
 return http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'");
  try {
    if(req.headers.host !== `127.0.0.1:${PORT}`) throw new AppError('Host không hợp lệ. Mở app bằng địa chỉ 127.0.0.1.',403);
    if(req.headers.origin && req.headers.origin !== ORIGIN) throw new AppError('Nguồn yêu cầu không hợp lệ.',403);
    const path = new URL(req.url,ORIGIN).pathname;
    if(path.startsWith('/api/')) {
      if(req.method !== 'POST') throw new AppError('Phương thức không hợp lệ.',405);
      if(req.headers.origin !== ORIGIN || req.headers['x-tlu-app'] !== 'local-v1' || !req.headers['content-type']?.startsWith('application/json')) throw new AppError('Yêu cầu không hợp lệ.',403);
      const data = await body(req);
      for(const [id,s] of sessions) if(Date.now()-s.created>TTL) sessions.delete(id);
      if(path==='/api/login') {
        if(typeof data.username!=='string' || !data.username.trim() || typeof data.password!=='string' || !data.password || data.username.length>200 || data.password.length>1000) throw new AppError('Nhập tài khoản và mật khẩu.',400);
        sessions.delete(sid(req));
        const client=clientFactory();
        await client.login(data.username.trim(),data.password);
        const id=randomBytes(32).toString('hex');
        sessions.set(id,{client,created:Date.now()});
        return send(res,200,{ok:true},{'Set-Cookie':`tlu_local=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=7200`});
      }
      if(path==='/api/logout') {sessions.delete(sid(req));return send(res,200,{ok:true},{'Set-Cookie':'tlu_local=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'});}
      const session=sessions.get(sid(req));
      if(!session) throw new AppError('Vui lòng đăng nhập lại để tải lịch.',401);
      if(path==='/api/semesters') {
        const semesters=await session.client.semesters(); session.semesters=semesters;
        let current=null;
        try {current=(await session.client.get('api/semester/semester_info'))?.id;} catch(e) {if(e.status===401) throw e;}
        return send(res,200,{semesters:semesters.map(s=>({id:s.id,name:s.semesterName||s.semesterCode})),current});
      }
      if(path==='/api/schedule') {
        const semester=session.semesters?.find(s=>String(s.id)===String(data.semesterId));
        if(!semester || !/^\d+$/.test(String(semester.id))) throw new AppError('Chọn một học kỳ trong danh sách.',400);
        const rows=await session.client.get(`api/StudentCourseSubject/studentLoginUser/${semester.id}`);
        return send(res,200,{...normalize(rows,semester),semester:{id:semester.id,name:semester.semesterName||semester.semesterCode},updatedAt:new Date().toISOString()});
      }
      throw new AppError('Không tìm thấy chức năng.',404);
    }
    if(req.method!=='GET') throw new AppError('Phương thức không hợp lệ.',405);
    const files={'/':['index.html','text/html'],'/app.mjs':['app.mjs','text/javascript'],'/schedule.mjs':['schedule.mjs','text/javascript'],'/style.css':['style.css','text/css']};
    if(!files[path]) throw new AppError('Không tìm thấy trang.',404);
    const [file,type]=files[path];
    res.writeHead(200,{'Content-Type':`${type}; charset=utf-8`,'Cache-Control':'no-store'});
    res.end(await readFile(new URL(`./public/${file}`,import.meta.url)));
  } catch(e) {send(res,e.status || 500,{error:e instanceof AppError?e.message:'Không xử lý được dữ liệu. Vui lòng thử lại.'});}
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url)) createApp().listen(PORT,'127.0.0.1',()=>console.log(`TLU Schedule: ${ORIGIN}`));
