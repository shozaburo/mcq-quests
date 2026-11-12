(function(g){'use strict';
 const areas='ABCDEFGH'.split(''),positions=['F','C','G','B',null,'D','E','A','H'],slots=[0,1,2,3,5,6,7,8];
 function summarize(cells){cells=cells||{};let done=0,city={},best=null;for(const a of areas){let n=0,next=null;for(let i=1;i<=8;i++){const q=a+i;if(Number(cells[q]?.pct)>=100)n++;else if(!next)next=q;}city[a]={done:n,total:8};done+=n;if(n<8&&(!best||n>best.done))best={qid:next,done:n};}return {done,total:64,percent:Math.round(done/64*100),areas:city,cells,today:best?.qid||null};}
 function demo(kind){let cells={};const count=kind==='all'?64:kind==='town'?8:0;for(let n=0;n<count;n++)cells[areas[Math.floor(n/8)]+(n%8+1)]={pct:100};return summarize(cells);}
 g.MandalaCore={areas,positions,slots,summarize,demo};
})(typeof window==='undefined'?globalThis:window);
