import {normalize,events,dateKey,addDays,monday,weekday} from './schedule.mjs';
const $=id=>document.getElementById(id);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pretty=d=>d?.split('-').reverse().join('/') || '—';
const KEY='tlu-schedule-v1';
let model=null, allEvents=[], view='week', connected=false, busy=false;
let selected=monday(dateKey(Date.now()));
const say=(text,error=false)=>{$('notice').textContent=text;$('notice').classList.toggle('error',error);};
function storage(action,key,value){try{return action==='get'?localStorage.getItem(key):action==='set'?localStorage.setItem(key,value):localStorage.removeItem(key);}catch{return null;}}
function persist(){if($('save').checked && model && !model.demo) {storage('set',KEY,JSON.stringify(model));} else storage('remove',KEY);}
async function api(path,data={}) {
 const response=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json','X-TLU-App':'local-v1'},body:JSON.stringify(data)});
 const payload=await response.json();
 if(!response.ok){if(response.status===401)setConnected(false);throw new Error(payload.error || 'Không thực hiện được yêu cầu.');}
 return payload;
}
function setConnected(value){connected=value;$('connect').hidden=value;$('logout').hidden=!value;$('semester').disabled=!value;$('sync').disabled=!value||busy;}
function setBusy(value){busy=value;$('sync').disabled=!connected||value;$('semester').disabled=!connected||value;$('logout').disabled=value;$('login-submit').disabled=value;$('demo').disabled=value;$('clear').disabled=value;$('close-login').disabled=value;}
function setModel(value){model=value;allEvents=events(model);const today=dateKey(Date.now());selected=monday(allEvents.find(e=>e.date>=today)?.date || allEvents[0]?.date || today);render();}
function lesson(e){return `<article class="lesson"><div class="lesson-time">${escape(e.startTime || '?')} – ${escape(e.endTime || '?')}</div><h3>${escape(e.name)}</h3><p>${escape(e.periods)}</p><p>${escape(e.label)}</p><span class="room">⌖ ${escape(e.room)}</span></article>`;}
function render(){
 $('week').value=selected;
 $('view-week').classList.toggle('selected',view==='week');$('view-all').classList.toggle('selected',view==='all');
 $('nav-week').classList.toggle('active',view==='week');$('nav-all').classList.toggle('active',view==='all');
 $('calendar').hidden=view!=='week';$('all-courses').hidden=view!=='all';$('week-tools').hidden=view!=='week';
 document.querySelector('.panel-top h2').textContent=view==='week'?'Một tuần, thật rõ ràng':'Toàn bộ học kỳ của bạn';
 const query=$('search').value.trim().toLocaleLowerCase('vi');
 const match=e=>[e.name,e.room,e.label].join(' ').toLocaleLowerCase('vi').includes(query);
 const weekEvents=allEvents.filter(e=>e.date>=selected && e.date<=addDays(selected,6));
 $('stat-courses').textContent=model?.courses.length??'—';$('stat-events').textContent=model?allEvents.length:'—';$('stat-week').textContent=model?weekEvents.length:'—';
 $('semester-label').textContent=model?`Học kỳ ${model.semester.name}${model.demo?' · DỮ LIỆU MẪU':''}`:'Chọn học kỳ sau khi đăng nhập';
 $('stat-updated').textContent=model?.demo?'Chế độ xem thử':model?new Date(model.updatedAt).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'}):'Chưa tải lịch';
 $('source-label').textContent=model?.demo?'Một môn mẫu, không phải toàn bộ lịch':model?'Bản lịch tại thời điểm tải':'Sẵn sàng khi bạn sẵn sàng';
 $('range').textContent=model?`${pretty(selected)} — ${pretty(addDays(selected,6))} · ${weekEvents.length} buổi`:'Chưa có dữ liệu lịch học';
 if(!model){const empty='<div class="empty"><div class="empty-symbol">▦</div><h2>Lịch học đang chờ bạn</h2><p>Kết nối tài khoản TLU để tải lịch cả kỳ và bắt đầu sắp xếp tuần học của mình.</p><button class="button primary empty-connect">Kết nối tài khoản →</button><button class="text-button empty-demo">Khám phá với dữ liệu mẫu</button></div>';$('calendar').innerHTML=empty;$('all-courses').innerHTML=empty;document.querySelectorAll('.empty-connect').forEach(b=>b.onclick=openLogin);document.querySelectorAll('.empty-demo').forEach(b=>b.onclick=demo);return;}
 $('calendar').innerHTML=`<div class="week-grid">${Array.from({length:7},(_,i)=>{const day=addDays(selected,i);const entries=weekEvents.filter(e=>e.date===day&&match(e));return `<section class="day ${day===dateKey(Date.now())?'today':''}"><div class="day-heading"><span>${weekday(i+2).toUpperCase()}</span><strong>${day.slice(8)}</strong></div>${entries.map(lesson).join('') || `<p class="free">${query?'Không khớp tìm kiếm':'Không có lịch'}</p>`}</section>`;}).join('')}</div>`;
 const courses=model.courses.filter(c=>c.name.toLocaleLowerCase('vi').includes(query)||model.schedules.some(s=>s.courseKey===c.key&&match(s)));
 $('all-courses').innerHTML=`<div class="course-list">${courses.map(c=>`<article class="course-row"><h3>${escape(c.name)}</h3><p class="muted small">${escape(c.label)}</p>${model.schedules.filter(s=>s.courseKey===c.key).map(s=>`<div class="session-line"><strong>${weekday(s.day)} · ${escape(s.startTime||'?')}–${escape(s.endTime||'?')} · ${escape(s.room)}</strong><br><span>${escape(s.periods)} · ${pretty(s.start)} → ${pretty(s.end)}${s.fromWeek!=null?` · Tuần ${escape(s.fromWeek)}–${escape(s.toWeek)}`:''}<br>Giảng viên: ${escape(s.teacher)}</span></div>`).join('')||'<p class="muted small">Chưa có lịch hợp lệ từ trường.</p>'}</article>`).join('')||'<div class="empty"><h2>Không có môn phù hợp</h2><p>Học kỳ chưa có dữ liệu hoặc không có kết quả tìm kiếm.</p></div>'}</div>`;
}
function openLogin(){$('login-error').textContent='';$('login-dialog').showModal();}
function demo(){
 if(connected){say('Bạn đang kết nối tài khoản thật. Hãy ngắt kết nối trước khi xem mẫu.');return;}
 const rows=[{subjectName:'Lập trình Java',courseSubject:{id:58251,displayName:'Lập trình Java-1-26 (66KTPM1)',timetables:[{id:447278,weekIndex:2,roomName:'429-A2',startDate:1788134400000,endDate:1792886400000,fromWeek:1,toWeek:8,startHour:{name:'Tiết 3',startString:'08:50'},endHour:{name:'Tiết 4',endString:'10:35'}},{id:447279,weekIndex:5,roomName:'425-A2',startDate:1788134400000,endDate:1792886400000,fromWeek:1,toWeek:8,startHour:{name:'Tiết 3',startString:'08:50'},endHour:{name:'Tiết 4',endString:'10:35'}}]}}];
 setModel({...normalize(rows),semester:{id:15,name:'1_2026_2027 · minh họa'},updatedAt:new Date().toISOString(),demo:true});
 $('login-dialog').close();say('ĐANG XEM MẪU · Chỉ gồm hai lịch Java bạn cung cấp; chưa kết nối tài khoản và chưa kiểm tra trực tiếp với TLU.');
}
async function loadSemesters(){const data=await api('semesters');$('semester').replaceChildren(...data.semesters.map(s=>new Option(s.name,s.id)));if(data.current && data.semesters.some(s=>s.id===data.current))$('semester').value=data.current;setConnected(true);if(!data.semesters.length){$('sync').disabled=true;say('TLU chưa trả học kỳ nào.');}}
async function sync(){if(busy)return;setBusy(true);say('Đang tải toàn bộ lịch học kỳ từ TLU…');try{const data=await api('schedule',{semesterId:$('semester').value});setModel(data);persist();say(data.warnings.length?`Đã tải lịch. ${data.warnings.join(' ')}`:`Đã tải ${data.courses.length} môn, ${allEvents.length} buổi theo dữ liệu hiện có của trường.`,!!data.warnings.length);}catch(e){say(e.message+' Bản lịch đã tải trước đó vẫn được giữ.',true);}finally{setBusy(false);}}
async function logout(){if(busy)return;setBusy(true);try{await api('logout');setConnected(false);$('semester').replaceChildren(new Option('Chưa kết nối',''));model=null;allEvents=[];storage('remove',KEY);$('save').checked=false;render();say('Đã ngắt phiên của app và xóa lịch trên trình duyệt này. Phiên trên website trường được quản lý riêng.');}catch(e){say(e.message,true);}finally{setBusy(false);}}
for(const [id,mode] of [['view-week','week'],['view-all','all'],['nav-week','week'],['nav-all','all']])$(id).onclick=()=>{view=mode;render();};
 $('connect').onclick=openLogin;$('close-login').onclick=()=>{$('password').value='';$('login-dialog').close();};$('login-dialog').addEventListener('cancel',e=>{if(busy)e.preventDefault();else $('password').value='';});
 $('demo').onclick=demo;$('sync').onclick=sync;$('logout').onclick=logout;
 $('prev').onclick=()=>{selected=addDays(selected,-7);render();};$('next').onclick=()=>{selected=addDays(selected,7);render();};$('today').onclick=()=>{selected=monday(dateKey(Date.now()));render();};$('week').onchange=()=>{if($('week').value){selected=monday($('week').value);render();}};$('search').oninput=render;
 $('save').onchange=()=>{persist();say($('save').checked?'Lịch thật sau khi tải sẽ được lưu trên trình duyệt này. Không lưu mật khẩu hoặc token.':'Đã tắt lưu lịch và xóa bản lưu trên trình duyệt.');};
 $('clear').onclick=()=>{storage('remove',KEY);model=null;allEvents=[];$('save').checked=false;render();say('Đã xóa lịch trên máy. Bạn có thể tải lại khi cần.');};
 document.querySelectorAll('[data-theme]').forEach(b=>b.onclick=()=>setTheme(b.dataset.theme));
 function setTheme(theme){if(!['mint','milk','night'].includes(theme))theme='mint';document.body.dataset.theme=theme;storage('set','tlu-theme',theme);document.querySelectorAll('[data-theme]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.theme===theme)));}
 $('login-form').onsubmit=async e=>{e.preventDefault();if(busy)return;setBusy(true);$('login-error').textContent='';$('login-submit').textContent='Đang kết nối…';try{await api('login',{username:$('username').value,password:$('password').value});$('password').value='';model=null;allEvents=[];storage('remove',KEY);setConnected(true);await loadSemesters();$('login-dialog').close();render();say('Đã kết nối. Chọn học kỳ rồi bấm “Tải lịch cả kỳ”.');}catch(e){$('login-error').textContent=e.message;}finally{$('password').value='';setBusy(false);$('login-submit').textContent='Đăng nhập & chọn học kỳ →';}};
 setTheme(storage('get','tlu-theme')||'mint');
 try{const cached=JSON.parse(storage('get',KEY)||'null');if(cached&&Array.isArray(cached.courses)&&Array.isArray(cached.schedules)&&cached.semester&&!cached.demo){setModel(cached);$('save').checked=true;say('Đang xem bản lịch đã lưu. Kết nối và tải lại để nhận thay đổi mới nhất.');}}catch{storage('remove',KEY);}
 render();
 // Local session survives a page reload; no school credentials are exposed to the browser.
 loadSemesters().then(()=>{if(!model)say('Phiên của app vẫn còn. Chọn học kỳ và tải lịch.');}).catch(()=>{});
