export const labels={aligned:'Aligned in source',gap:'Known difference',intentional:'Intentional difference',review:'Needs review'};
export function selectFeatures(rows,{q='',area='all',status='all'}={}) {
 const query=q.toLocaleLowerCase().trim();
 return rows.filter(r=>(area==='all'||r.area===area)&&(status==='all'||r.status===status)&&(!query||JSON.stringify(r).toLocaleLowerCase().includes(query)))
 .sort((a,b)=>({gap:0,review:1,intentional:2,aligned:3}[a.status]-{gap:0,review:1,intentional:2,aligned:3}[b.status])||a.area.localeCompare(b.area)||a.title.localeCompare(b.title));
}
export function counts(rows){return rows.reduce((a,r)=>{a[r.status]=(a[r.status]||0)+1;return a},{all:rows.length,aligned:0,gap:0,intentional:0,review:0});}
export function github(repo,kind,value){if(!/^aastroastra\/aastroastra-(ios|android)$/.test(repo))return null;return `https://github.com/${repo}/${kind}/${value.split('/').map(encodeURIComponent).join('/')}`;}
