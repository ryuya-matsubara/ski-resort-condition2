import {useEffect,useRef} from 'react'
import type {ReactNode} from 'react'
import {qualities} from './model'
import type {Quality} from './model'
const paths={plus:'M12 5v14M5 12h14',search:'M20 20l-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',list:'M4 4h16v6H4zM4 14h16v6H4z',map:'M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16m6-14v16',refresh:'M20 9a8 8 0 1 0 0 6M20 3v6h-6',close:'M6 6l12 12M18 6L6 18',check:'M4 12l5 5L20 6',pin:'M12 22s7-8 7-14a7 7 0 1 0-14 0c0 6 7 14 7 14zM14 8a2 2 0 1 1-4 0 2 2 0 1 1 4 0',mountain:'M2 20l8-14 5 8 3-4 5 10H2zM7 11l3 2 2-2',calendar:'M4 5h16v16H4zM4 10h16M8 3v4m8-4v4',trash:'M4 6h16M9 6V3h6v3m-9 0 1 15h10l1-15'} as const
export function Icon({name,size=19}:{name:keyof typeof paths;size?:number}){return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>}
export function QualityMark({q}:{q:Quality}){return <span className={'mark '+q} aria-hidden="true">{qualities[q].mark}</span>}
export function Dialog({title,children,onClose}:{title:string;children:ReactNode;onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null)
 useEffect(()=>{const d=ref.current!;d.showModal();return ()=>d.close()},[])
 return <dialog ref={ref} aria-label={title} onCancel={onClose} onClick={e=>{if(e.target===ref.current)onClose()}}><section className="sheet"><div className="sheet-title"><h2>{title}</h2><button className="icon-button" aria-label="閉じる" onClick={onClose}><Icon name="close"/></button></div>{children}</section></dialog>
}
export function Ridges(){return <svg className="ridges" viewBox="0 0 520 170" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><defs><pattern id="ridgegrid" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M26 0H0V26" fill="none" stroke="#80a6a5" strokeOpacity=".13"/></pattern></defs><path fill="url(#ridgegrid)" d="M0 0h520v170H0z"/><circle cx="383" cy="48" r="18" fill="#f58b64"/><path d="m0 157 78-65 26 11 49-48 52 57 58-45 27 16 78-65 49 56 35-22 68 66v52H0" fill="#37656a"/><path d="m258 102 110-84 49 56-36-24-10 5-11-19-19 24-8-1-28 30zM78 92l26 11 49-48 29 31-27-16-13 17-9-2-21 25z" fill="#cbdfd8"/><path d="m0 170 104-44 32 4 63-39 47 39 71-25 31 5 68-37 90 49 14-2v50z" fill="#255358"/><path d="m90 170 111-56 50 38 63-30 38 3 64-44 104 56" fill="none" stroke="#71a19d" strokeOpacity=".55"/><path d="m175 170 35-33 44 28 65-31 40 5 58-45 103 58" fill="none" stroke="#71a19d" strokeOpacity=".36"/></svg>}
