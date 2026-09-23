export const labels={aligned:'Aligned in source',gap:'Known difference',intentional:'Intentional difference',review:'Needs review'};
export function selectFeatures(rows,{q='',area='all',status='all'}={}) {
 const query=q.toLocaleLowerCase().trim();
 return rows.filter(r=>(area==='all'||r.area===area)&&(status==='all'||r.status===status)&&(!query||JSON.stringify(r).toLocaleLowerCase().includes(query)))
 .sort((a,b)=>({gap:0,review:1,intentional:2,aligned:3}[a.status]-{gap:0,review:1,intentional:2,aligned:3}[b.status])||a.area.localeCompare(b.area)||a.title.localeCompare(b.title));
}
export function counts(rows){return rows.reduce((a,r)=>{a[r.status]=(a[r.status]||0)+1;return a},{all:rows.length,aligned:0,gap:0,intentional:0,review:0});}
export function github(repo,kind,value){if(!/^aastroastra\/aastroastra-(ios|android)$/.test(repo))return null;return `https://github.com/${repo}/${kind}/${value.split('/').map(encodeURIComponent).join('/')}`;}
// Apply signed live push metadata while the full Git snapshot is rebuilding.
// Unknown/truncated chains invalidate all reviews rather than inventing parity.
export function withPushes(snapshot,events=[]) {
 const data=structuredClone(snapshot);
 for(const platform of ['ios','android']) {
  const source=data.platforms[platform];if(!source)continue;
  const pushes=events.filter(e=>e.platform===platform&&e.branch==='main'&&!e.deleted).sort((a,b)=>b.pushed_at.localeCompare(a.pushed_at));
  const latest=pushes[0];if(!latest)continue;
  source.latest_push={head:latest.after,date:latest.pushed_at};
  if(latest.after===source.head||source.commits.some(c=>c.sha===latest.after))continue;
  let cursor=latest.after;const files=new Set();let complete=true;const seen=new Set();
  while(cursor!==source.head){const push=pushes.find(e=>e.after===cursor);if(!push||seen.has(cursor)){complete=false;break;}seen.add(cursor);push.files.forEach(f=>files.add(f));if(!push.complete_files)complete=false;cursor=push.before;}
  const covered=new Set(data.features.flatMap(f=>f.platforms[platform]?.paths||[]));
  const unknownSource=[...files].some(f=>/\.(swift|kt)$/.test(f)&&!covered.has(f));
  const manifestChanged=files.has('.parity/features.json');
  source.awaiting_snapshot=true;
  for(const row of data.features){const r=row.platforms[platform];if(!r)continue;
   if(!complete||unknownSource||manifestChanged||r.paths.some(p=>files.has(p))){r.status='review';r.review_current=false;r.reason='A signed push changed this area. Awaiting the next full Git comparison; previous review shown below.';row.needs_review=true;}
   const states=Object.values(row.platforms).map(v=>v?.status||'review');row.status=states.includes('gap')?'gap':states.includes('review')?'review':states.includes('intentional')?'intentional':'aligned';
  }
 }
 data.live_events=events;return data;
}
