const DAY = 86400000;
export function dateKey(value) {
  if (value == null) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year:'numeric', month:'2-digit', day:'2-digit' }).format(d);
}
export const addDays = (date, n) => new Date(Date.parse(date + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10);
export function monday(date) { const d = new Date(date + 'T00:00:00Z').getUTCDay(); return addDays(date, -((d + 6) % 7)); }
export const weekday = n => Number(n) === 8 ? 'Chủ nhật' : `Thứ ${n}`;
export function normalize(rows, semester = {}) {
  if (!Array.isArray(rows)) throw new Error('Dữ liệu môn học không đúng định dạng.');
  const schedules = [], courses = [], warnings = [], seen = new Set();
  for (const row of rows) {
    if (!row || Number(row.subjectStatus) === -4) continue;
    const course = row.courseSubject || {};
    const name = row.subjectName || course.semesterSubject?.subject?.subjectName || course.displayName || 'Môn chưa có tên';
    const courseKey = String(course.id ?? row.id ?? course.code ?? name);
    if (!courses.some(c => c.key === courseKey)) courses.push({key:courseKey, name, label:course.displayName || row.subjectCode || name});
    for (const t of course.timetables || []) {
      const start = dateKey(t.startDate), end = dateKey(t.endDate), day = Number(t.weekIndex);
      if (!start || !end || end < start || day < 2 || day > 8 || !Number.isInteger(day)) { warnings.push(`${name}: thiếu hoặc sai ngày/thứ, chưa đưa vào lịch tuần.`); continue; }
      if ((Date.parse(end)-Date.parse(start))/DAY>730) {warnings.push(`${name}: khoảng lịch quá dài, cần đối chiếu với trường.`);continue;}
      const key = `${courseKey}:${t.id ?? [day,start,end,t.startHour?.name,t.roomName].join(':')}`;
      if (seen.has(key)) continue;
      seen.add(key);
      schedules.push({key, courseKey, name, label:course.displayName || row.subjectCode || name, day, start, end,
        startTime:t.startHour?.startString || '', endTime:t.endHour?.endString || '',
        periods:`${t.startHour?.name || '?'} – ${t.endHour?.name || '?'}`,
        room:t.roomName || t.room?.name || 'Chưa cập nhật', teacher:t.teacherName || t.teacher?.displayName || 'Chưa cập nhật',
        fromWeek:t.fromWeek, toWeek:t.toWeek});
    }
  }
  return {courses, schedules, warnings:[...new Set(warnings)], schoolYearStart:dateKey(semester.schoolYear?.startDate)};
}
export function events(model) {
  const output = [];
  for (const s of model.schedules) {
    const days = (Date.parse(s.end) - Date.parse(s.start)) / DAY;
    if (days > 730) continue;
    for(let date = s.start; date <= s.end; date = addDays(date, 1)) {
      const jsDay = new Date(date + 'T00:00:00Z').getUTCDay();
      if ((jsDay === 0 ? 8 : jsDay + 1) !== s.day) continue;
      if (model.schoolYearStart && s.fromWeek != null && s.toWeek != null) {
        const week = Math.floor((Date.parse(date) - Date.parse(model.schoolYearStart)) / (7 * DAY)) + 1;
        if (week < s.fromWeek || week > s.toWeek) continue;
      }
      output.push({...s, date});
    }
  }
  return output.sort((a,b) => (a.date+a.startTime).localeCompare(b.date+b.startTime));
}
