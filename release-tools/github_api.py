"""Small GitHub client. Tokens never enter page data or redirect requests."""
import json
from pathlib import Path
import urllib.error
import urllib.parse
import urllib.request

class SafeRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        redirected=super().redirect_request(req,fp,code,msg,headers,newurl)
        if urllib.parse.urlsplit(newurl).netloc != urllib.parse.urlsplit(req.full_url).netloc:
            redirected.remove_header('Authorization')
        if urllib.parse.urlsplit(newurl).scheme != 'https': raise ValueError('Insecure download redirect')
        return redirected

class GitHub:
    def __init__(self, token):
        self.token=token
        self.opener=urllib.request.build_opener(SafeRedirect())

    def request(self, path, method='GET', data=None, accept='application/vnd.github+json', content_type=None):
        url=path if path.startswith('https://') else 'https://api.github.com/'+path.lstrip('/')
        if urllib.parse.urlsplit(url).netloc not in ('api.github.com','uploads.github.com'): raise ValueError('Unexpected GitHub host')
        headers={'Accept':accept,'X-GitHub-Api-Version':'2022-11-28','User-Agent':'AastroAstra-release-hub', 'Authorization':'Bearer '+self.token}
        if isinstance(data,(dict,list)): data=json.dumps(data).encode(); content_type='application/json'
        if content_type: headers['Content-Type']=content_type
        return self.opener.open(urllib.request.Request(url,data=data,headers=headers,method=method),timeout=240)

    def json(self,path,method='GET',data=None):
        with self.request(path,method,data) as response:
            raw=response.read()
            return json.loads(raw) if raw else None

    def pages(self,path):
        page=1
        while True:
            rows=self.json(path+('&' if '?' in path else '?')+f'per_page=100&page={page}')
            yield from rows
            if len(rows)<100:break
            page+=1

    def download(self,repo,asset,path,limit=300_000_000):
        if asset['size']>limit:raise ValueError('Asset exceeds size limit')
        count=0
        with self.request(f'repos/{repo}/releases/assets/{asset["id"]}',accept='application/octet-stream') as response, Path(path).open('wb') as stream:
            while block:=response.read(1024*1024):
                count+=len(block)
                if count>limit:raise ValueError('Asset exceeds size limit')
                stream.write(block)
        if count!=asset['size']:raise ValueError('Truncated release asset')

    def upload(self,release,path,name=None):
        path=Path(path);name=name or path.name
        url=release['upload_url'].split('{')[0]+'?name='+urllib.parse.quote(name,safe='')
        with self.request(url,'POST',path.read_bytes(),content_type='application/octet-stream') as response:return json.load(response)

    def tag_sha(self,repo,tag):
        value=self.json(f'repos/{repo}/git/ref/tags/'+urllib.parse.quote(tag,safe=''))['object']
        for _ in range(8):
            if value['type']=='commit':return value['sha']
            if value['type']!='tag':break
            value=self.json(f'repos/{repo}/git/tags/'+value['sha'])['object']
        raise ValueError('Tag does not resolve to a commit')
