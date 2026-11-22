#!/usr/bin/env python3
"""Build a small metadata-only RSS index for a static, personal reading dashboard."""
import concurrent.futures
import datetime as dt
import email.utils
import html
import json
import os
import re
import urllib.request
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'data.json'
FEEDS = [
    ('world','BBC World','https://feeds.bbci.co.uk/news/world/rss.xml'),
    ('world','Guardian World','https://www.theguardian.com/world/rss'),
    ('india','Google News India','https://news.google.com/rss/search?q=India+politics+when%3A3d&hl=en-IN&gl=IN&ceid=IN:en'),
    ('uk-us','BBC UK','https://feeds.bbci.co.uk/news/uk/rss.xml'),
    ('uk-us','BBC US','https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml'),
    ('business','BBC Business','https://feeds.bbci.co.uk/news/business/rss.xml'),
    ('business','Guardian Business','https://www.theguardian.com/business/rss'),
    ('ai-tech','BBC Technology','https://feeds.bbci.co.uk/news/technology/rss.xml'),
    ('ai-tech','arXiv AI','https://rss.arxiv.org/rss/cs.AI'),
    ('startups','TechCrunch','https://techcrunch.com/feed/'),
    ('sports','BBC Sport','https://feeds.bbci.co.uk/sport/rss.xml'),
    ('science','BBC Science','https://feeds.bbci.co.uk/news/science_and_environment/rss.xml'),
    ('science','arXiv Robotics','https://rss.arxiv.org/rss/cs.RO'),
    ('culture','Guardian Culture','https://www.theguardian.com/culture/rss'),
    ('culture','BBC Entertainment','https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml'),
    ('learning','Smithsonian Magazine','https://www.smithsonianmag.com/rss/latest_articles/'),
    ('learning','NASA','https://www.nasa.gov/feed/'),
    ('women','Guardian Women','https://www.theguardian.com/lifeandstyle/women/rss'),
    ('women','Google News Women Innovation','https://news.google.com/rss/search?q=women+innovators+design+technology+when%3A7d&hl=en-US&gl=US&ceid=US:en'),
]

def text_of(node, tag):
    x = node.find(tag)
    return ''.join(x.itertext()).strip() if x is not None else ''

def stripped(value):
    value = re.sub(r'<[^>]*>', ' ', value or '')
    return re.sub(r'\s+', ' ', html.unescape(value)).strip()

def timestamp(value):
    try:
        z = email.utils.parsedate_to_datetime(value)
        return z.astimezone(dt.timezone.utc).isoformat()
    except Exception:
        try:
            return dt.datetime.fromisoformat(value.replace('Z','+00:00')).astimezone(dt.timezone.utc).isoformat()
        except Exception: return ''

def get_feed(info):
    category, source, url = info
    try:
        req=urllib.request.Request(url,headers={'User-Agent':'PersonalNewsDashboard/1.0 (RSS-reader; personal use)','Accept':'application/rss+xml, application/atom+xml, text/xml, application/xml'})
        with urllib.request.urlopen(req, timeout=14) as resp:
            raw=resp.read(1800000)
        root=ET.fromstring(raw)
        items=[]
        if root.tag.endswith('feed'):
            atom='{http://www.w3.org/2005/Atom}'
            for x in root.findall(atom+'entry')[:24]:
                title=text_of(x,atom+'title')
                desc=text_of(x,atom+'summary') or text_of(x,atom+'content')
                date=text_of(x,atom+'published') or text_of(x,atom+'updated')
                link=next((a.attrib.get('href','') for a in x.findall(atom+'link') if a.attrib.get('rel','alternate') in ('alternate','')), '')
                items.append((title,desc,date,link,''))
        else:
            for x in root.findall('.//item')[:26]:
                title=text_of(x,'title')
                desc=text_of(x,'description')
                date=text_of(x,'pubDate')
                link=text_of(x,'link')
                image=''
                # Use an explicitly supplied feed thumbnail; no webpage scraping.
                for child in x:
                    if child.tag.lower().endswith('thumbnail') and child.attrib.get('url'):
                        image=child.attrib['url']; break
                items.append((title,desc,date,link,image))
        out=[]
        for title,desc,date,link,image in items:
            title=stripped(title)[:220]; description=stripped(desc)[:260]
            if not title or not link.startswith(('http://','https://')): continue
            # Google News feed descriptions are often HTML collections; avoid pretending these are summaries.
            if 'Google News' in source: description='Open the source to read the full story.'
            if description.lower().startswith(title.lower()[:35]): description=description[len(title):].strip(' .–—:-')
            out.append({'category':category,'source':source,'title':title,'summary':description[:230],
                        'url':link,'date':timestamp(date),'image':image if image.startswith('https://') else ''})
        return source,out,None
    except Exception as e:
        return source,[],str(e)[:140]

def main():
    old=[]
    if OUTPUT.exists():
        try: old=json.loads(OUTPUT.read_text()).get('articles',[])
        except Exception: pass
    collected=[]; errors=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=7) as pool:
        for source,items,err in pool.map(get_feed,FEEDS):
            collected.extend(items)
            if err: errors.append(f'{source}: {err}')
    # Keep previously fetched stories if transient upstream errors occur.
    collected.extend(old)
    unique={}
    for item in collected:
        key=re.sub(r'\W+','',item['title'].lower())[:130]
        if key and key not in unique:unique[key]=item
    articles=list(unique.values())
    articles.sort(key=lambda a:a.get('date') or '',reverse=True)
    cutoff=(dt.datetime.now(dt.timezone.utc)-dt.timedelta(days=10)).isoformat()
    articles=[x for x in articles if not x.get('date') or x['date']>=cutoff]
    # Preserve representation of all sections in small JSON.
    final=[]
    for cat in dict.fromkeys(x[0] for x in FEEDS):
        final.extend([a for a in articles if a['category']==cat][:30])
    final.sort(key=lambda a:a.get('date') or '',reverse=True)
    payload={'updatedAt':dt.datetime.now(dt.timezone.utc).isoformat(),'articles':final,'feedErrors':errors,'feedCount':len(FEEDS)}
    OUTPUT.write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
    print(f'Saved {len(final)} stories; {len(errors)} source errors.')
    if errors: print('\n'.join(errors))

if __name__=='__main__':main()
