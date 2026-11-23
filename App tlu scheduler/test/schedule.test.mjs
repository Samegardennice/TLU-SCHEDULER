import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {normalize,events,dateKey,monday} from '../public/schedule.mjs';
import {TluClient,createApp} from '../server.mjs';
const timetable={id:1,weekIndex:2,startDate:1788134400000,endDate:1792886400000,fromWeek:1,toWeek:8,roomName:'429-A2',startHour:{name:'Tiết 3',startString:'08:50'},endHour:{name:'Tiết 4',endString:'10:35'}};
const row={subjectName:'Java',courseSubject:{id:10,timetables:[timetable]}};
test('Vietnam dates and weekday mappings preserve supplied Java schedule',()=>{
 assert.equal(dateKey(1788134400000),'2026-08-31');assert.equal(dateKey(1792886400000),'2026-10-25');
 const result=events(normalize([row]));assert.equal(result.length,8);assert.equal(result[0].date,'2026-08-31');assert.equal(result.at(-1).date,'2026-10-19');assert.equal(result[0].startTime,'08:50');
 assert.equal(monday('2026-10-25'),'2026-10-19');
});
test('cancelled courses, duplicate schedules and missing dates do not create false lessons',()=>{
 const result=normalize([row,row,{...row,subjectStatus:-4},{subjectName:'Bad',courseSubject:{timetables:[{weekIndex:5}]}}]);
 assert.equal(result.schedules.length,1);assert.equal(result.warnings.length,1);assert.equal(normalize([{...row,subjectStatus:-4}]).courses.length,0);
});
test('school-year week bounds, Sunday, and inclusive date range are respected',()=>{
 const model=normalize([{...row,courseSubject:{id:10,timetables:[{...timetable,weekIndex:8,fromWeek:2,toWeek:3}]}}],{schoolYear:{startDate:1788134400000}});
 assert.deepEqual(events(model).map(e=>e.date),['2026-09-13','2026-09-20']);
});
test('missing times stay unknown rather than using epoch timestamp',()=>{
 const model=normalize([{...row,courseSubject:{timetables:[{...timetable,startHour:{start:1563587446867},endHour:null}]}}]);assert.equal(model.schedules[0].startTime,'');
});
test('login uses documented OAuth form and refreshes expired token',async()=>{
 const calls=[];
 const client=new TluClient(async(url,init)=>{calls.push({url,init});return Response.json(url.endsWith('oauth/token')?{access_token:'mock-access',refresh_token:'mock-refresh',expires_in:1000}:{content:[],last:true});});
 await client.login('test-user','test-password');
 assert.equal(calls[0].url,'https://sinhvien1.tlu.edu.vn/education/oauth/token');assert.equal(calls[0].init.body.get('grant_type'),'password');assert.equal(calls[0].init.body.get('username'),'test-user');
 client.token.expires=0;await client.semesters();assert.equal(calls[1].init.body.get('grant_type'),'refresh_token');assert.equal(calls[2].init.headers.Authorization,'Bearer mock-access');
});
test('login errors are sanitized and no school response secrets leak',async()=>{
 const client=new TluClient(async()=>new Response('secret from upstream',{status:401}));
 await assert.rejects(client.login('test','test'),e=>e.status===401&&!e.message.includes('secret'));
});
test('local server protects API, serializes schedule only and destroys session on logout',async()=>{
 const fake={login:async()=>{},semesters:async()=>[{id:15,semesterName:'Test'}],get:async path=>path.includes('semester_info')?{id:15}:[row]};
 const server=createApp(()=>fake);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
 const base=`http://127.0.0.1:${server.address().port}`;
 const headers={Host:'127.0.0.1:4317',Origin:'http://127.0.0.1:4317','Content-Type':'application/json','X-TLU-App':'local-v1'};
 const localFetch=(url,options={})=>new Promise((resolve,reject)=>{const request=http.request(url,options,response=>{let text='';response.on('data',chunk=>text+=chunk);response.on('end',()=>resolve(new Response(text,{status:response.statusCode,headers:response.headers})));});request.on('error',reject);request.end(options.body);});
 const post=(path,data={},extra={})=>localFetch(base+'/api/'+path,{method:'POST',headers:{...headers,...extra},body:JSON.stringify(data)});
 assert.equal((await post('login',{username:'x',password:'y'},{Origin:'https://evil.example'})).status,403);
 assert.equal((await post('semesters')).status,401);
 assert.equal((await localFetch(base+'/',{headers:{Host:'evil.example'}})).status,403);
 const login=await post('login',{username:'test',password:'test'});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];assert.ok(login.headers.get('set-cookie').includes('HttpOnly'));
 const auth={Cookie:cookie};assert.equal((await post('semesters',{},auth)).status,200);
 const schedule=await (await post('schedule',{semesterId:15},auth)).json();assert.equal(schedule.schedules[0].room,'429-A2');assert.equal(schedule.token,undefined);
 assert.equal((await post('schedule',{semesterId:16},auth)).status,400);
 assert.equal((await post('logout',{},auth)).status,200);assert.equal((await post('semesters',{},auth)).status,401);
 } finally {await new Promise(r=>server.close(r));}
});
