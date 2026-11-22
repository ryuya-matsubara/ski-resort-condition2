import {dateInJapan, summarize} from './model'
import type {Forecast,Hourly,Resort} from './model'

export const cacheKey=(r:Resort)=>'yukimiru:weather:1:'+r.id+':'+[r.forecastPoint.lat,r.forecastPoint.lon,r.forecastPoint.elevationM].join(',')
export function cached(r:Resort):Forecast|undefined{
  try{
    const v=JSON.parse(localStorage.getItem(cacheKey(r))||'null')
    if(Number.isFinite(v?.updated)&&Array.isArray(v?.days)&&v.days.every((d:Record<string,unknown>)=>typeof d.date==='string'))return v
  }catch{ /* Storage may be unavailable in private browsing. */ }
}
export const fresh=(f:Forecast|undefined,today:string)=>!!f&&Date.now()-f.updated<3*3600000&&f.days[0]?.date===today
export async function fetchBatch(resorts:Resort[],signal:AbortSignal){
  const values=(field:'lat'|'lon'|'elevationM')=>resorts.map(r=>r.forecastPoint[field]).join(',')
  const q=new URLSearchParams({latitude:values('lat'),longitude:values('lon'),elevation:values('elevationM'),timezone:'Asia/Tokyo',forecast_days:'8',past_days:'2',wind_speed_unit:'ms',hourly:'temperature_2m,snowfall,rain,showers,wind_speed_10m,snow_depth,weather_code'})
  const res=await fetch('https://api.open-meteo.com/v1/forecast?'+q,{signal,cache:'no-store'})
  if(!res.ok)throw Error(res.status===429?'予報サービスが混み合っています。しばらく後に更新してください。':'予報を取得できませんでした。')
  const raw=await res.json()
  const locations=Array.isArray(raw)?raw:[raw]
  if(locations.length!==resorts.length)throw Error('地点の予報が不足しています。')
  const now=Date.now()
  return locations.map((data:{hourly:Hourly},j)=>{
    if(!data.hourly?.time?.length)throw Error('時間別の予報がありません。')
    const forecast:Forecast={updated:now,days:Array.from({length:8},(_,i)=>summarize(data.hourly,dateInJapan(now,i)))}
    try{localStorage.setItem(cacheKey(resorts[j]),JSON.stringify(forecast))}catch{ /* In-memory results remain usable. */ }
    return forecast
  })
}
