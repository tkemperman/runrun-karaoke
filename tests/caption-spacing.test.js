const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const C = require('../src/core.js');
const source = fs.readFileSync('src/content.js', 'utf8');
const layout = source.slice(source.indexOf('  function separateCaptions()'), source.indexOf('  let lastCaption ='));
function arrange({ gap = 0, height = 800, original = {top:100,bottom:200}, translation = {top:180,bottom:240}, above = true, hidden = false } = {}) {
  const context = {overlay:{style:{transform:'old'},hidden},translationOverlay:{style:{transform:'old'},hidden:false},
    original:{textContent:'Original',bounds:original}, next:{textContent:'',hidden:true}, translated:{textContent:'Translation',bounds:translation},
    document:{createRange:()=>({selectNodeContents(node){this.node=node;},getBoundingClientRect(){return {...this.node.bounds,height:this.node.bounds.bottom-this.node.bounds.top};}})},
    position:{value:above?13:8},translationPosition:{value:above?8:13},captionGap:{value:gap},
    overlayHost:{getBoundingClientRect:()=>({height})}};
  vm.runInNewContext(layout+'\nseparateCaptions();',context);
  return context;
}
test('zero spacing fits text tightly even when preferred positions are farther apart', () => {
  assert.equal(arrange().overlay.style.transform,'translateY(-20px)');
  assert.equal(arrange({original:{top:100,bottom:180}}).overlay.style.transform,'');
  assert.equal(arrange({original:{top:100,bottom:150}}).overlay.style.transform,'translateY(30px)');
});
test('spacing scales with video height and works with either caption above', () => {
  assert.equal(arrange({gap:5}).overlay.style.transform,'translateY(-60px)');
  assert.equal(arrange({gap:5,height:400}).overlay.style.transform,'translateY(-40px)');
  const reverse=arrange({gap:5,above:false,original:{top:180,bottom:240},translation:{top:100,bottom:200}});
  assert.equal(reverse.translationOverlay.style.transform,'translateY(-60px)');
  assert.equal(reverse.overlay.style.transform,'');
  assert.equal(arrange({hidden:true,gap:5}).overlay.style.transform,'');
});
test('caption spacing defaults to zero, migrates and round trips without altering saved positions', () => {
  const p=C.project('abcdefghijk');delete p.display.captionGap;
  assert.equal(C.validate(p).display.captionGap,0);
  p.display.captionGap=3.5;
  const exported=C.exportProject(p);assert.equal(exported.display.captionGap,3.5);
  assert.equal(exported.display.position,13);assert.equal(exported.display.translationPosition,8);
  for(const value of [-30.5,31,Infinity,'5',null]) {
    p.display.captionGap=value;assert.throws(()=>C.validate(p),/spacing/);
  }
});

test('zero spacing does not introduce a pixel gap by rounding fractional caption bounds', () => {
  const result=arrange({original:{top:100,bottom:200.25},translation:{top:180.5,bottom:240}});
  assert.equal(result.overlay.style.transform,'translateY(-19.75px)');
});

test('each slider step changes the gap without a dead zone; legacy negatives migrate to zero', () => {
  for (const height of [400,800]) {
    for (const preferredBottom of [150,180,200]) {
      for (const gap of [0,0.5,1,2,30]) {
        const result=arrange({height,gap,original:{top:100,bottom:preferredBottom}});
        const shift=Number(result.overlay.style.transform.match(/translateY\(([-.\d]+)px\)/)?.[1] || 0);
        assert.equal(180-(preferredBottom+shift),height*gap/100);
      }
    }
  }
  const p=C.project('abcdefghijk');
  for (const gap of [-30,-0.5,0,30]) {
    p.display.captionGap=gap;
    assert.equal(C.validate(C.exportProject(p)).display.captionGap,Math.max(0,gap));
  }
});
