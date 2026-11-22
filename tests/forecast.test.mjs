import test from 'node:test'
import assert from 'node:assert/strict'
import {summarize,dateInJapan} from '../src/model.ts'
const date='2026-01-03'
function hours(){
 const time=Array.from({length:72},(_,i)=>new Date(Date.UTC(2026,0,1,i)).toISOString().slice(0,16))
 return {time,temperature_2m:time.map(()=>-7),snowfall:time.map(()=>0),rain:time.map(()=>0),showers:time.map(()=>0),wind_speed_10m:time.map(()=>2),snow_depth:time.map(()=>1.2),weather_code:time.map(()=>3)}
}
test('cold dry snowfall honors both boundaries',()=>{
 for(const [amount,quality] of [[0,'packed'],[9.9,'packed'],[10,'powder'],[30,'deep']]){
  const h=hours();h.snowfall[57]=amount
  assert.equal(summarize(h,date).quality,quality)
 }
})
test('rain before and after snowfall changes the surface',()=>{
 const h=hours();h.snowfall[49]=35;h.rain[54]=2;h.temperature_2m.fill(3,54,58)
 assert.equal(summarize(h,date).quality,'slush')
 h.temperature_2m.fill(-7,55,58);assert.equal(summarize(h,date).quality,'ice')
 h.snowfall[57]=35;assert.equal(summarize(h,date).quality,'deep')
})
test('wind, missing observations, dates and units',()=>{
 const h=hours();h.snowfall[53]=31;h.wind_speed_10m.fill(10,53,55)
 assert.equal(summarize(h,date).quality,'powder')
 h.rain[48]=null;assert.equal(summarize(h,date).quality,'unknown')
 assert.equal(summarize(h,date).depth,120)
 assert.equal(dateInJapan(Date.parse('2026-01-02T15:01:00Z')),'2026-01-03')
})
