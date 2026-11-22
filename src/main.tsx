import {useEffect,useMemo,useRef,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {dateInJapan,dayLabel,nameOf,qualities,weatherLabel} from './model'
import type {Day,Forecast,Quality,Resort} from './model'
import {cached,fetchBatch,fresh,cacheKey} from './weather'
import {Dialog,Icon,QualityMark,Ridges} from './ui'
import {Picker} from './Picker'
import ResortMap from './ResortMap'
import './style.css'

const savedKey='yukimiru:my-resorts:1'
interface Saved {ids:string[];custom:Resort[]}
function readSaved():Saved{
 try{const s=JSON.parse(localStorage.getItem(savedKey)||'null')
  if(Array.isArray(s?.ids)&&Array.isArray(s?.custom))return {ids:s.ids.filter((a:unknown)=>typeof a==='string'),custom:s.custom.filter((r:Resort)=>r?.id?.startsWith('custom-')&&typeof r.name==='string'&&Number.isFinite(r.forecastPoint?.elevationM))}
 }catch{/* First visit or unavailable storage. */}
 return {ids:[],custom:[]}
}
const cm=(n:number|null|undefined)=>n==null?'—':Math.round(n)+' cm'
const degrees=(n:number|null|undefined)=>n==null?'—':n+'°'
function useForecasts(resorts:Resort[],today:string,refresh:number,check:number){
 const [forecasts,setForecasts]=useState<Record<string,Forecast>>({}),[errors,setErrors]=useState<Record<string,string>>({}),[loading,setLoading]=useState(false)
 const lastRefresh=useRef(refresh)
 useEffect(()=>{
  const ac=new AbortController(),saved:Record<string,Forecast>={}
  for(const r of resorts){const hit=cached(r);if(hit)saved[r.id]=hit}
  setForecasts(prev=>({...prev,...saved}));setErrors({})
  const force=lastRefresh.current!==refresh;lastRefresh.current=refresh
  const queue=resorts.filter(r=>force||!fresh(saved[r.id],today))
  setLoading(!!queue.length)
  async function run(){
   for(let i=0;i<queue.length&&!ac.signal.aborted;i+=5){
    const batch=queue.slice(i,i+5)
    try{
     const data=await fetchBatch(batch,AbortSignal.any([ac.signal,AbortSignal.timeout(25000)]))
     if(!ac.signal.aborted)setForecasts(prev=>({...prev,...Object.fromEntries(batch.map((r,j)=>[r.id,data[j]]))}))
    }catch(err){if(!ac.signal.aborted)setErrors(prev=>({...prev,...Object.fromEntries(batch.map(r=>[r.id,err instanceof Error&&err.message.startsWith('予報')?err.message:'通信できませんでした。接続後に更新してください。']))}))}
   }
   if(!ac.signal.aborted)setLoading(false)
  }
  void run();return ()=>ac.abort()
 },[resorts,today,refresh,check])
 return {forecasts,errors,loading}
}
function App(){
 const [catalog,setCatalog]=useState<Resort[]>([]),[catalogError,setCatalogError]=useState(false),[catalogTry,retryCatalog]=useState(0)
 const [saved,setSaved]=useState<Saved>(readSaved),[tab,setTab]=useState<'list'|'map'>('list'),[picker,setPicker]=useState<string|null>(null),[detail,setDetail]=useState<{r:Resort;date:string}|null>(null),[about,setAbout]=useState(false)
 const [today,setToday]=useState(dateInJapan()),[mapDate,setMapDate]=useState(today),[refresh,setRefresh]=useState(0),[check,setCheck]=useState(0),[storageIssue,setStorageIssue]=useState(false),[offline,setOffline]=useState(!navigator.onLine)
 useEffect(()=>{const ac=new AbortController();setCatalogError(false)
  fetch('./data/resorts.jp.json',{signal:ac.signal}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(v=>setCatalog(v.resorts)).catch(()=>{if(!ac.signal.aborted)setCatalogError(true)})
  return ()=>ac.abort()
 },[catalogTry])
 useEffect(()=>{const sync=()=>{if(!document.hidden)setToday(dateInJapan())};const id=setInterval(sync,60000)
  const checkCache=()=>{if(!document.hidden){sync();setCheck(n=>n+1)}};const cacheTimer=setInterval(checkCache,15*60000);document.addEventListener('visibilitychange',checkCache)
  const changed=(e:StorageEvent)=>{if(e.key===savedKey)setSaved(readSaved())};window.addEventListener('storage',changed)
  const online=()=>{setOffline(false);setCheck(n=>n+1)};const disconnected=()=>setOffline(true);window.addEventListener('online',online);window.addEventListener('offline',disconnected)
  return ()=>{clearInterval(id);clearInterval(cacheTimer);document.removeEventListener('visibilitychange',checkCache);window.removeEventListener('storage',changed);window.removeEventListener('online',online);window.removeEventListener('offline',disconnected)}
 },[])
 const resorts=useMemo(()=>{const byId=new Map([...catalog,...saved.custom].map(r=>[r.id,r]));return saved.ids.map(id=>byId.get(id)).filter((r):r is Resort=>!!r)},[catalog,saved])
 const {forecasts,errors,loading}=useForecasts(resorts,today,refresh,check)
 const days=Array.from({length:8},(_,i)=>new Date(Date.parse(today+'T00:00:00Z')+i*86400000).toISOString().slice(0,10))
 const chosenDate=days.includes(mapDate)?mapDate:today
 function persist(next:Saved){setSaved(next);try{localStorage.setItem(savedKey,JSON.stringify(next));setStorageIssue(false)}catch{setStorageIssue(true)}}
 function add(r:Resort){if(saved.ids.includes(r.id))return;persist({ids:[...saved.ids,r.id],custom:r.id.startsWith('custom-')?[...saved.custom,r]:saved.custom})}
 function remove(r:Resort){persist({ids:saved.ids.filter(id=>id!==r.id),custom:saved.custom.filter(v=>v.id!==r.id)});setDetail(null);try{localStorage.removeItem(cacheKey(r))}catch{}}
 const getDay=(id:string,date:string)=>forecasts[id]?.days.find(d=>d.date===date)
 const selectTab=(t:'list'|'map')=>{setTab(t);window.scrollTo(0,0)}
 const detailDay=detail&&getDay(detail.r.id,detail.date)
 const stamps=resorts.map(r=>forecasts[r.id]?.updated).filter((n):n is number=>!!n)
 const fetched=stamps.length?new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(Math.min(...stamps)):null
 return <>
 <header className="top"><div className="frame top-inner"><a href="./" className="brand" aria-label="雪みる ホーム"><img src="./icons/favicon.svg" alt=""/><b>雪みる</b></a><button className="add-btn" onClick={()=>setPicker('')}><Icon name="plus"/>ゲレンデ追加</button></div></header>
 <main className="frame">
 <section className="hero"><Ridges/><div className="hero-copy"><div className="hero-date"><Icon name="calendar" size={16}/>{dayLabel(today,{year:'numeric',month:'long',day:'numeric',weekday:'short'})}</div><h1>{tab==='list'?'今日と明日':'週間雪質マップ'}</h1><p>朝9時のゲレンデ雪質予想</p></div></section>
 {catalogError&&<p className="notice">ゲレンデ一覧を読み込めませんでした。 <button onClick={()=>retryCatalog(c=>c+1)}>再読み込み</button></p>}
 {offline&&<p className="notice">オフラインです。取得済みの予報を利用できます。</p>}
 {storageIssue&&<p className="notice">この端末では登録内容を保存できません。現在の画面では利用できます。</p>}
 <div className="section-head"><h2><Icon name={tab==='list'?'mountain':'map'}/>{tab==='list'?'マイゲレンデ':'日付を選択'}{tab==='list'&&<small>{resorts.length}</small>}</h2>{resorts.length>0&&<button className="text-button" disabled={loading} onClick={()=>setRefresh(v=>v+1)}><Icon name="refresh" size={16}/>{loading?'取得中':'予報を更新'}</button>}</div>
 {tab==='list'?<>
 {!resorts.length?<section className="empty"><span className="empty-symbol"><Icon name="mountain" size={36}/></span><h2>最初のゲレンデを登録</h2><p>よく滑るスキー場を選ぶと、今日と明日の雪質を比較できます。</p><button className="primary" onClick={()=>setPicker('')}><Icon name="search"/>ゲレンデを探す</button><div className="quick"><small>エリアから探す</small>{['北海道','新潟県','長野県'].map(p=><button key={p} onClick={()=>setPicker(p)}>{p}</button>)}</div></section>:
 <div className="cards">{resorts.map(r=><article className="card" key={r.id}><div className="card-head"><small><Icon name="pin" size={14}/>{r.prefectures.join('・')}　標高 {Math.round(r.forecastPoint.elevationM).toLocaleString()} m</small><h3>{nameOf(r)}</h3></div><div className="pair">{days.slice(0,2).map((d,i)=><button key={d} className="day-cell" onClick={()=>setDetail({r,date:d})}><span className="when">{i===0?'今日':'明日'} <small>{dayLabel(d,{month:'numeric',day:'numeric'})}</small></span><Readout d={getDay(r.id,d)} waiting={loading&&!errors[r.id]}/></button>)}</div>{errors[r.id]&&<p className="card-note">{forecasts[r.id]?'保存済みの予報を表示しています。 ':''}{errors[r.id]}</p>}</article>)}</div>}
 </>:<>
 <div className="dates" aria-label="予報日">{days.map((d,i)=><button key={d} className={chosenDate===d?'active':''} aria-pressed={d===chosenDate} onClick={()=>setMapDate(d)}><small>{i<2?['今日','明日'][i]:dayLabel(d,{weekday:'short'})}</small><b>{dayLabel(d,{month:'numeric',day:'numeric'})}</b></button>)}</div>
 <section className="map-box"><ResortMap resorts={resorts} quality={id=>getDay(id,chosenDate)?.quality??'unknown'} onSelect={r=>setDetail({r,date:chosenDate})}/><div className="legend">{(Object.keys(qualities) as Quality[]).filter(q=>q!=='unknown'||resorts.some(r=>!getDay(r.id,chosenDate)||getDay(r.id,chosenDate)?.quality==='unknown')).map(q=><span key={q}><QualityMark q={q}/>{qualities[q].label}</span>)}</div></section>
 {!resorts.length&&<button className="map-add" onClick={()=>setPicker('')}><Icon name="plus"/>比較するゲレンデを登録</button>}
 {Object.keys(errors).length>0&&<p className="notice">一部の予報を更新できませんでした。接続後に「予報を更新」を押してください。</p>}
 </>}
 <footer>{fetched&&<span>予報取得 {fetched} JST</span>}<a href="https://open-meteo.com/" target="_blank" rel="noreferrer">気象データ Open-Meteo</a><button onClick={()=>setAbout(true)}>出典・使い方</button></footer>
 </main>
 <nav className="bottom" aria-label="メインナビゲーション"><div>{(['list','map'] as const).map(t=><button key={t} className={t===tab?'selected':''} aria-current={t===tab?'page':undefined} onClick={()=>selectTab(t)}><Icon name={t==='list'?'list':'map'} size={22}/>{t==='list'?'今日・明日':'雪質マップ'}</button>)}</div></nav>
 {picker!==null&&<Picker catalog={catalog} ids={saved.ids} initial={picker} onAdd={add} onClose={()=>setPicker(null)}/>}
 {detail&&<Dialog title={nameOf(detail.r)} onClose={()=>setDetail(null)}><p className="muted">{dayLabel(detail.date,{month:'long',day:'numeric',weekday:'short'})}　朝9時・標高 {Math.round(detail.r.forecastPoint.elevationM)} m</p>
 <div className="detail-weather"><Readout d={detailDay||undefined} waiting={loading}/></div><p>{detailDay?.reason||errors[detail.r.id]||'この日の予報はまだ取得できていません。'}</p><p className="muted">新雪は前日16時から当日9時までの予想降雪量です。圧雪は整備コース、パウダーは未圧雪部分を想定します。</p>
 {detail.r.websiteUrls[0]&&<a className="official" href={detail.r.websiteUrls[0]} target="_blank" rel="noreferrer">スキー場のウェブサイト</a>}<button className="remove" onClick={()=>remove(detail.r)}><Icon name="trash" size={15}/>登録から外す</button></Dialog>}
 {about&&<Dialog title="出典・使い方" onClose={()=>setAbout(false)}><p>朝9時の雪質を気温・雨・新雪・風の経過から推定します。「極上パウダー」は乾いた新雪30 cm以上、「パウダー」は10 cm以上が目安です。予報は3時間を目安に再取得します。</p><p>スマホのブラウザーのメニューから「ホーム画面に追加」を選ぶと、アプリとして開けます。登録と取得済み予報はこの端末に保存されます。</p><p>気象予報 <a href="https://open-meteo.com/">Open-Meteo</a>（<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>）。雪質の分類は雪みるによる推定です。</p><p>ゲレンデデータ <a href="https://www.openskidata.org/">OpenSkiData / OpenSkiMap.org</a>、© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>（ODbL）、Skimap.org、Who's On First、© Mapterhorn。加工済みの<a href="./data/resorts.jp.json">国内499件のデータ</a>は<a href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL 1.0</a>で提供します。</p><p>背景地図 <a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>。海岸線は Natural Earth を使用しています。</p></Dialog>}
 </>
}
function Readout({d,waiting}:{d?:Day;waiting:boolean}){
 const q=d?.quality??'unknown'
 return <><strong className={'quality '+q}><QualityMark q={q}/>{d?qualities[q].label:waiting?'取得中…':'未取得'}</strong>
 <span className="snowline">夜間新雪 <b>{cm(d?.snow)}</b></span><span className="meteo">{weatherLabel(d?.weather??null)}　{degrees(d?.low)} / {degrees(d?.high)}</span><span className="depth">推定積雪 {cm(d?.depth)}</span></>
}
createRoot(document.getElementById('root')!).render(<App/>)
if(import.meta.env.PROD&&'serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}))
