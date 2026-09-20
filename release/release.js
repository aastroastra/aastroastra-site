'use strict';
const names={android:'Android',ios:'iOS',backend:'Backend',admin:'Admin',web:'Web',site:'Website'};
const state={rows:[],platform:'all',search:'',history:true,limit:30};
function el(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;}
function safeURL(value,install=false){
  try{const url=new URL(value,location.origin);if(url.protocol==='https:'||url.origin===location.origin&&url.protocol===location.protocol)return url.href;
    if(install&&url.protocol==='itms-services:'&&url.searchParams.get('action')==='download-manifest'){
      const manifest=new URL(url.searchParams.get('url'));if(manifest.protocol==='https:')return url.href;
    }
  }catch(_){}return null;
}
function link(text,url,className,install=false){const a=el('a',text,className);const href=safeURL(url,install);if(href){a.href=href;a.rel='noopener';}return a;}
function formatDate(value,options){const d=new Date(value);return Number.isNaN(d.getTime())?'Date not recorded':new Intl.DateTimeFormat('en',{timeZone:'UTC',...options}).format(d);}
function label(row){return row.kind==='source-history'?'Source history':row.status==='passed'?'Checks passed':row.status==='failed'?'Checks failed':row.status==='incomplete'?'Checks incomplete':row.kind==='published-build'?'Published download':'Checks not recorded';}
function downloadLinks(row,buttons){
  if(row.install_url)buttons.append(link('Install on iPhone ↗',row.install_url,'button primary',true));
  for(const d of row.downloads||[]){if(!d.url)continue;buttons.append(link(d.kind==='apk'?'Download APK ↓':d.kind==='ipa'?'Download IPA ↓':'Download',d.url,'button'+(d.kind==='apk'?' primary':'')));}
  if(row.testflight)buttons.append(link('TestFlight ↗',row.testflight,'button'));
}
function latest(){
  const target=document.querySelector('#downloads');target.replaceChildren();
  for(const platform of ['android','ios']){
    const row=state.rows.find(r=>r.platform===platform&&r.kind!=='source-history'&&(r.status==='passed'||r.kind==='published-build')&&(r.downloads||[]).some(d=>d.url));
    const card=el('article',undefined,'download-card');const top=el('div',undefined,'card-top');
    top.append(el('span',platform==='android'?'A':'i','platform-icon'),el('span',names[platform],'platform-name'));card.append(top);
    if(row){
      top.append(el('span',label(row),'badge '+row.status));const title=el('h3','v'+row.version);title.append(el('small','Build '+row.build));card.append(title);
      card.append(el('p','Published '+formatDate(row.published_at||row.date,{dateStyle:'medium'})+(platform==='ios'?' · Direct install requires a registered device.':'')));
      if(row.status!=='passed')card.append(el('p',row.validation_summary||'A regression result for these exact published bytes is not recorded.'));
      else card.append(el('p','Release checks passed. Open the report for scope and results.'));
      const buttons=el('div',undefined,'buttons');downloadLinks(row,buttons);card.append(buttons);
      if(row.report_url)card.append(link(row.report_label||'View regression report →',row.report_url,'muted'));
    }else{card.append(el('h3','No retained installer'),el('p','The next validated release will appear here.'));}
    target.append(card);
  }
}
function changeList(items,repo){const list=el('ul',undefined,'changes');for(const c of items){const li=el('li',c.subject);if(c.sha&&repo)li.append(link(c.sha.slice(0,7),'https://github.com/'+repo+'/commit/'+c.sha,'commit'));list.append(li);}return list;}
function entry(row){
  const article=el('article',undefined,'entry');const date=el('div',formatDate(row.published_at||row.date,{month:'short',day:'numeric'}),'date');date.append(el('span',formatDate(row.date,{year:'numeric'}),'year'));article.append(date);
  const body=el('div');const head=el('div',undefined,'entry-head');const title=el('h3',names[row.platform]||row.platform);
  title.append(el('span',row.version?'v'+row.version+(row.build?' · Build '+row.build:''):row.tag||'Source update'));
  head.append(title,el('span',label(row),'badge '+row.status));body.append(head);
  const source=el('div',undefined,'source');if(row.tag)source.append(el('span',row.tag));
  if(row.run_number)source.append(el('span','Workflow run #'+row.run_number));
  if(row.sha)source.append(link(row.sha.slice(0,8),'https://github.com/'+row.repo+'/commit/'+row.sha));
  if(row.deployment==='not_recorded'&&row.kind!=='source-history')source.append(el('span','Store/deployment status not recorded'));
  if(row.deployment==='website')source.append(el('span','Published on the website'));
  if(row.distribution?.play)source.append(el('span','Google Play '+row.distribution.play.track+': submitted (review/publication may be pending)'));
  body.append(source);
  if(row.note)body.append(el('p',row.note,'muted'));
  if(row.checks?.length||row.ui||row.endpoints){const metrics=el('div',undefined,'metrics');
    if(row.checks?.length){const passed=row.checks.filter(c=>c.status==='passed').length;metrics.append(el('span',passed+'/'+row.checks.length+' checks passed'));}
    for(const [key,name] of [['ui','app steps'],['endpoints','endpoint probes'],['unit_tests','unit tests']])if(row[key])metrics.append(el('span',row[key].passed+'/'+row[key].total+' '+name));body.append(metrics);}
  const changes=row.changes||[];body.append(changeList(changes.slice(0,4),row.repo));
  if(changes.length>4){const details=el('details');details.append(el('summary','Show '+(changes.length-4)+' more changes'),changeList(changes.slice(4),row.repo));body.append(details);}
  const buttons=el('div',undefined,'buttons');if(row.report_url)buttons.append(link(row.report_label||'Open regression report ↗',row.report_url,'button'));
  downloadLinks(row,buttons);if(row.run_url)buttons.append(link('GitHub Actions ↗',row.run_url));
  if(row.source_release)buttons.append(link('Source release ↗',row.source_release));body.append(buttons);article.append(body);return article;
}
function render(){
  const rows=state.rows.filter(r=>(state.platform==='all'||r.platform===state.platform)&&(state.history||r.kind!=='source-history')&&JSON.stringify([r.version,r.build,r.tag,r.platform,...(r.changes||[]).map(c=>c.subject)]).toLowerCase().includes(state.search));
  document.querySelector('#count').textContent=rows.length+' records';const timeline=document.querySelector('#timeline');timeline.replaceChildren();
  for(const row of rows.slice(0,state.limit))timeline.append(entry(row));
  if(!rows.length)timeline.append(el('p','No matching releases. Try another filter or include older source history.','notice'));
  document.querySelector('#more').hidden=rows.length<=state.limit;
}
document.querySelectorAll('[data-platform]').forEach(button=>button.addEventListener('click',()=>{state.platform=button.dataset.platform;state.limit=30;document.querySelectorAll('[data-platform]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));render();}));
document.querySelector('#search').addEventListener('input',event=>{state.search=event.target.value.trim().toLowerCase();state.limit=30;render();});
document.querySelector('#source-history').addEventListener('change',event=>{state.history=event.target.checked;state.limit=30;render();});
document.querySelector('#more').addEventListener('click',()=>{state.limit+=30;render();});
fetch('releases.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}).then(data=>{
  if(data.schema!==1||!Array.isArray(data.releases))throw new Error('Unexpected release data');state.rows=data.releases;
  document.querySelector('#updated').textContent='Last refreshed '+formatDate(data.updated,{dateStyle:'medium',timeStyle:'short'})+' UTC';
  if(data.sync?.errors?.length){const notice=document.querySelector('#notice');notice.hidden=false;notice.textContent='Some sources could not refresh. Previously retained releases remain available.';}
  latest();render();
}).catch(()=>{document.querySelector('#updated').textContent='Release history is temporarily unavailable.';document.querySelector('#downloads').replaceChildren(el('p','Downloads could not load. Please retry or visit the app home page.','notice'));document.querySelector('#timeline').replaceChildren(el('p','Could not load the release history. Please reload this page.','notice'));});
