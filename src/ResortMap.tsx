import {useEffect,useRef} from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type {Resort,Quality} from './model'
import {nameOf,qualities} from './model'
interface Props {resorts:Resort[]; quality?:(id:string)=>Quality; onSelect?:(r:Resort)=>void; onPick?:(lat:number,lon:number)=>void; chosen?:[number,number]|null}
export default function ResortMap({resorts,quality,onSelect,onPick,chosen}:Props){
 const host=useRef<HTMLDivElement>(null), map=useRef<L.Map|null>(null), pins=useRef<L.LayerGroup|null>(null)
 const pickRef=useRef(onPick);pickRef.current=onPick
 const selectRef=useRef(onSelect);selectRef.current=onSelect
 const keys=resorts.map(r=>r.id).join('|')
 useEffect(()=>{
  const m=L.map(host.current!,{zoomControl:false,minZoom:4,maxZoom:17}).setView([37,138.4],5)
  map.current=m;m.attributionControl.setPrefix(false)
  L.control.zoom({position:'topright',zoomInTitle:'拡大',zoomOutTitle:'縮小'}).addTo(m)
  m.createPane('land');m.getPane('land')!.style.zIndex='190'
  const controller=new AbortController()
  fetch('./data/japan-land.geojson',{signal:controller.signal}).then(r=>r.json()).then(data=>{
   if(!controller.signal.aborted)L.geoJSON(data,{pane:'land',interactive:false,style:{fillColor:'#f6f7ed',color:'#98b5ad',fillOpacity:1,weight:1}}).addTo(m)
  }).catch(()=>{})
  L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png',{maxNativeZoom:18,minNativeZoom:5,attribution:'<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noreferrer">地理院タイル</a>'}).addTo(m)
  pins.current=L.layerGroup().addTo(m);m.on('click',e=>pickRef.current?.(e.latlng.lat,e.latlng.lng))
  const resize=new ResizeObserver(()=>m.invalidateSize());resize.observe(host.current!)
  return ()=>{controller.abort();resize.disconnect();m.remove();map.current=null;pins.current=null}
 },[])
 useEffect(()=>{
  const m=map.current;if(!m)return
  const points=resorts.map(r=>L.latLng(r.forecastPoint.lat,r.forecastPoint.lon))
  if(points.length)m.fitBounds(L.latLngBounds(points),{padding:[42,42],maxZoom:11,animate:false})
 },[keys])
 useEffect(()=>{
  const layer=pins.current;if(!layer)return
  layer.clearLayers()
  for(const r of resorts){
   const q=quality?.(r.id)??'unknown'
   const el=document.createElement('span');el.className='mappin '+q;el.textContent=qualities[q].mark
   const title=nameOf(r)+'・'+qualities[q].label
   const pin=L.marker([r.forecastPoint.lat,r.forecastPoint.lon],{icon:L.divIcon({html:el,className:'pinwrap',iconSize:[38,42],iconAnchor:[19,41]}),title,alt:title}).addTo(layer)
   const label=document.createElement('b');label.textContent=nameOf(r)
   pin.bindTooltip(label,{direction:'top',offset:[0,-36]});pin.on('click',()=>selectRef.current?.(r))
  }
  if(chosen)L.circleMarker(chosen,{radius:9,color:'#fff',weight:3,fillColor:'#c35731',fillOpacity:1}).addTo(layer)
 },[resorts,quality,chosen])
 return <div ref={host} className="map-canvas" aria-label={onPick?'タップして登録地点を選ぶ地図':'登録したゲレンデの雪質マップ'}/>
}
