import assert from 'node:assert/strict';
import {calculate as generator} from '../site/assets/experiments/generator.js';
import {calculate as induction} from '../site/assets/experiments/induktion.js';
import {calculate as core} from '../site/assets/experiments/magnetfeld-eisenkern.js';
import {calculate as transformer} from '../site/assets/experiments/transformator.js';
import {calculate as transmission} from '../site/assets/experiments/hochspannungsleitungen.js';
const near = (actual, expected, epsilon = 1e-8) => assert.ok(Math.abs(actual - expected) < epsilon, `${actual} != ${expected}`);
const g = {speed:30,turns:100,field:.5};
near(generator(g,.5).voltage, Math.PI);
near(generator(g,1).voltage,0);
near(generator({...g,speed:0},12).voltage,0);
near(generator({...g,field:0},.5).voltage,0);
near(generator({...g,turns:200},.5).peak,2*generator(g,.5).peak);
// Faraday's law independently from the finite difference of the magnetic flux.
for (const time of [.1,.3,.7,1.3]) {
  const h = 1e-5;
  near(generator(g,time).voltage,-g.turns*(generator(g,time+h).flux-generator(g,time-h).flux)/(2*h));
  const s={speed:1.25,turns:300,strength:1.5};
  near(induction(s,time).voltage,-s.turns*(induction(s,time+h).flux-induction(s,time-h).flux)/(2*h));
  near(induction({...s,reverse:true},time).voltage,-induction(s,time).voltage);
  near(induction({...s,speed:0},time).voltage,0);
}
near(core({current:.5,core:false}).airField,Math.PI*.0004);
near(core({current:-.5,core:true}).airField,-core({current:.5,core:true}).airField);
near(core({current:0,core:true}).alignment,0);
// Changing turns transforms voltage, not power in the ideal model.
for (const primary of [100,400,800]) for(const secondary of [100,200,800]) {
  const s={primary,secondary,voltage:12,load:20};
  const t=transformer(s,.4);
  near(t.voltage,12*secondary/primary);
  near(t.primaryCurrent*12,t.power);
  near(t.current*20,t.voltage);
  const dc=transformer({...s,dc:true},1);
  near(dc.voltage,0); near(dc.power,0); assert.equal(dc.primaryCurrent,null);
}
const p={voltage:100,power:10,resistance:10};
const a=transmission(p), b=transmission({...p,voltage:10});
near(a.current,100); near(a.loss,100000); near(a.received,9900000);
near(b.current,10*a.current); near(b.loss,100*a.loss);
assert.equal(b.shortCircuit,true); near(b.received,0);
assert.equal(transmission({voltage:10,power:20,resistance:20}).impossible,true);
for (const voltage of [10,20,100,400]) for(const power of [1,10,20]) for(const resistance of [1,10,20]) {
  const t=transmission({voltage,power,resistance});
  near(t.loss+t.received,t.sending,1e-5);
  assert.equal(t.feasible,t.received>0);
  for(const value of Object.values(t)) if(typeof value==='number') assert.ok(Number.isFinite(value));
}
console.log('Electromagnetism: Faraday, polarity, standstill, transformer energy balance and transmission limits passed.');
