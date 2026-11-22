export interface Point {lat:number; lon:number; elevationM:number}
export interface Resort {id:string; name:string|null; aliases:string[]; prefectures:string[]; forecastPoint:Point; websiteUrls:string[]}
export const qualities = {
  deep:{label:'極上パウダー',mark:'✥'}, powder:{label:'パウダー',mark:'❄'}, packed:{label:'圧雪',mark:'≋'},
  ice:{label:'アイスバーン',mark:'◆'}, slush:{label:'シャバ雪',mark:'◒'}, unknown:{label:'判定保留',mark:'—'}
} as const
export type Quality = keyof typeof qualities
export interface Day {date:string; quality:Quality; reason:string; snow:number|null; depth:number|null; low:number|null; high:number|null; weather:number|null}
export interface Forecast { updated:number; days:Day[] }
export interface Hourly {time:string[]; temperature_2m:(number|null)[]; snowfall:(number|null)[]; rain:(number|null)[]; showers?:(number|null)[]; wind_speed_10m:(number|null)[]; snow_depth?:(number|null)[]; weather_code?:(number|null)[]}
export const nameOf=(r:Resort)=>r.name || ('名称未登録（'+r.prefectures.join('・')+'）')
export function dateInJapan(now=Date.now(), offset=0){return new Date(now+9*3600000+offset*86400000).toISOString().slice(0,10)}
export const dayLabel=(iso:string, options:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat('ja-JP',{...options,timeZone:'Asia/Tokyo'}).format(new Date(iso+'T09:00:00+09:00'))
export function weatherLabel(n:number|null){
  if(n===null)return '—'
  if(n===0)return '快晴'
  if(n<=2)return '晴れ'
  if(n===3)return '曇り'
  if(n===45||n===48)return '霧'
  if([71,73,75,77,85,86].includes(n))return '雪'
  if(n>=95)return '雷雨'
  if(n>=51)return '雨'
  return '—'
}
const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n)
const numberAt=(arr:(number|null)[]|undefined,i:number)=>finite(arr?.[i])?arr![i] as number:null
export function summarize(h:Hourly,date:string):Day{
  const end=h.time.indexOf(date+'T09:00')
  const start=h.time.indexOf(date+'T00:00')
  const temps=start<0?[]:h.temperature_2m.slice(start,start+24).filter(finite)
  const z=numberAt(h.snow_depth,end)
  const out:Day={date,quality:'unknown',reason:'判定に必要な時間別データが不足しています。',snow:null,depth:z===null?null:Math.round(z*100),low:temps.length===24?Math.round(Math.min(...temps)):null,high:temps.length===24?Math.round(Math.max(...temps)):null,weather:numberAt(h.weather_code,end)}
  if(end<47)return out
  const nightStart=end-16  // 17 hourly amounts, from 16:00 to 09:00 JST.
  const night=h.snowfall.slice(nightStart,end+1)
  if(night.length===17&&night.every(finite))out.snow=Math.round(night.reduce((a,b)=>a+b,0)*10)/10
  let surface:'dry'|'wet'|'frozen'='dry',warm=0,cold=0,dry=0,weightedTemp=0,wetSnow=0,strong=0,windy=false,windMissing=false
  const recentRain:number[]=[]
  for(let i=end-47;i<=end;i++){
    const temp=h.temperature_2m[i],snow=h.snowfall[i],rain=h.rain[i],showers=h.showers?.[i]
    if(!finite(temp)||!finite(snow)||!finite(rain)||!finite(showers))return out
    const liquid=rain+showers
    recentRain.push(liquid)
    if(recentRain.length>3)recentRain.shift()
    warm=temp>=2?warm+1:0
    cold=temp<=-2?cold+1:0
    if(warm>=3||(temp>=0&&liquid>0&&recentRain.reduce((a,b)=>a+b,0)>=1)){
      surface='wet'; dry=0; weightedTemp=0; wetSnow=0; strong=0; windy=false; windMissing=false
    }
    if(surface==='wet'&&cold>=2)surface='frozen'
    if(i<nightStart)continue
    if(snow>0){
      if(temp<=-1&&liquid===0){dry+=snow;weightedTemp+=snow*temp;wetSnow=0}
      else {wetSnow+=snow; if(wetSnow>=2){dry=0;weightedTemp=0;strong=0;windy=false;windMissing=false}}
    }
    if(dry>0){
      const wind=h.wind_speed_10m[i]
      if(!finite(wind))windMissing=true
      strong=finite(wind)&&wind>=10?strong+1:0
      if(strong>=2)windy=true
    }
  }
  const result=(quality:Quality,reason:string):Day=>({...out,quality,reason})
  if(out.depth===0&&dry<10)return result('unknown','モデル上の自然積雪がほぼありません。人工雪の状況は現地情報をご確認ください。')
  if(dry>=10){
    const deep=dry>=30&&weightedTemp/dry<=-5&&!windy&&!windMissing
    const detail=surface==='frozen'?'下地は再凍結の傾向です。':windy?'強風で締まる可能性があります。':''
    return result(deep?'deep':'powder','朝までに乾いた新雪が約'+Math.round(dry)+' cm。降雪時の平均気温は'+Math.round(weightedTemp/dry)+'℃です。'+detail)
  }
  if(wetSnow>=10&&surface!=='wet')return result('unknown','湿った新雪が多く、朝の硬さを特定できません。')
  if(surface==='wet')return result('slush','雨または暖かい時間が続き、朝は雪面が緩む予想です。')
  if(surface==='frozen')return result('ice','一度濡れた雪面が冷え込み、上に積もった乾いた新雪も少ない予想です。')
  return result('packed','新雪は少なく、融解・再凍結の兆候も弱い予想です。整備コースを想定しています。')
}
