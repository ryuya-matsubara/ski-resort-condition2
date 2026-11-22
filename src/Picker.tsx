import {useEffect,useMemo,useState} from 'react'
import type {Resort} from './model'
import {nameOf} from './model'
import {Dialog,Icon} from './ui'
import ResortMap from './ResortMap'
const fold=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96)).replace(/[\s・-]/g,'')
export function Picker({catalog,ids,onAdd,onClose,initial=''}:{catalog:Resort[];ids:string[];onAdd:(r:Resort)=>void;onClose:()=>void;initial?:string}){
 const [query,setQuery]=useState(initial),[limit,setLimit]=useState(35),[custom,setCustom]=useState(false)
 const [chosen,setChosen]=useState<[number,number]|null>(null),[name,setName]=useState(''),[alt,setAlt]=useState(''),[altHint,setAltHint]=useState('')
 const matches=useMemo(()=>catalog.filter(r=>fold([r.name,...r.aliases,...r.prefectures].join(' ')).includes(fold(query))),[catalog,query])
 useEffect(()=>{
  if(!chosen)return
  const ac=new AbortController()
  setAlt('');setAltHint('標高を取得中…')
  const timeout=window.setTimeout(()=>ac.abort(),10000)
  let live=true
  fetch('https://cyberjapandata2.gsi.go.jp/general/dem/scripts/getelevation.php?outtype=JSON&lat='+chosen[0]+'&lon='+chosen[1],{signal:ac.signal}).then(r=>r.json()).then(data=>{
   if(!live)return
   if(typeof data.elevation!=='number')throw Error()
   setAlt(String(Math.round(data.elevation)));setAltHint('国土地理院の標高値')
  }).catch(()=>{if(live)setAltHint('標高を入力してください。')})
  return ()=>{live=false;clearTimeout(timeout);ac.abort()}
 },[chosen])
 const valid=chosen&&name.trim()&&alt.trim()&&Number.isFinite(Number(alt))&&Number(alt)>=-20&&Number(alt)<=3776
 return <Dialog title={custom?'手動登録':'ゲレンデを追加'} onClose={onClose}>{custom?<div className="custom">
  <p className="muted">地図を拡大して、いつも滑る斜面をタップしてください。</p>
  <ResortMap resorts={[]} chosen={chosen} onPick={(lat,lon)=>{if(lat<24||lat>46.5||lon<122||lon>150){setAltHint('日本国内の地点を選んでください。');return}setChosen([lat,lon])}}/>
  <label>ゲレンデ名<input value={name} maxLength={80} onChange={e=>setName(e.target.value)} placeholder="例：いつもの北斜面"/></label>
  <label>予報地点の標高（m）<input type="number" value={alt} onChange={e=>setAlt(e.target.value)} inputMode="decimal" step="any"/></label>
  <small>{altHint||'ピンを置くと標高を取得します。'}</small><button className="primary" disabled={!valid} onClick={()=>{if(!valid||!chosen)return;onAdd({id:'custom-'+crypto.randomUUID(),name:name.trim(),aliases:[],prefectures:['自分の地点'],forecastPoint:{lat:chosen[0],lon:chosen[1],elevationM:Number(alt)},websiteUrls:[]});onClose()}}>この地点を登録</button>
  <button className="text-button" onClick={()=>setCustom(false)}>候補の検索に戻る</button>
 </div>:<>
  <label className="searchbox"><Icon name="search"/><input autoFocus value={query} onChange={e=>{setQuery(e.target.value);setLimit(35)}} placeholder="スキー場名・都道府県で検索" aria-label="スキー場名・都道府県で検索"/></label>
  <div className="picker-meta"><span>{matches.length} 件の候補</span><button className="text-button" onClick={()=>setCustom(true)}><Icon name="pin" size={15}/>手動登録</button></div>
  <div className="results">{matches.slice(0,limit).map(r=><button className="result" key={r.id} onClick={()=>{onAdd(r);onClose()}} disabled={ids.includes(r.id)}><span><b>{nameOf(r)}</b><small>{r.prefectures.join('・')}　標高 {Math.round(r.forecastPoint.elevationM).toLocaleString()} m</small></span><span className="circle"><Icon name={ids.includes(r.id)?'check':'plus'}/></span></button>)}
  {!matches.length&&<p>一致するゲレンデがありません。</p>}{matches.length>limit&&<button className="more" onClick={()=>setLimit(limit+50)}>さらに表示</button>}</div>
 </>}</Dialog>
}
