from playwright.sync_api import sync_playwright
from pathlib import Path
import json,base64,os,shutil
root=Path(__file__).resolve().parents[1]
def data_url(code):return 'data:text/javascript;base64,'+base64.b64encode(code.encode()).decode()
client_url=data_url((root/'neon-public-client.js').read_text())
wrapper_url=data_url('import {createPublicClient as real} from '+json.dumps(client_url)+'; export const createPublicClient=(base)=>real(base,{origin:"https://fixture.invalid",fetchImpl:window.__fixtureFetch});')
fixture=r'''window.__requests=[];window.__failure=false;window.__fixtureFetch=async function(url){window.__requests.push(url);if(window.__failure)return new Response('{}',{status:502});const u=new URL(url);const p={id:'12345678-1234-4234-8234-123456789abc',titulo:'Titulo <seguro>',resumo:'Resumo recuperado',autor_nome:'Autor Teste',status:'publicado',tipo:'publicacao',publicado_em:'2026-10-01T12:00:00Z',conteudo:'<img src=x onerror="window.__xss=1"><p>Texto recuperado</p>'};return Response.json(u.pathname.endsWith('/publication')?{publication:p}:{publications:[p]});};'''
results=[]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE') or shutil.which('chromium'),headless=True,args=['--no-sandbox'])
    def render(path,host_ids,script='portal.js',failure=False,legacy=False):
        page=browser.new_page()
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body>'+''.join('<div id="'+h+'">Carregando</div>' for h in host_ids)+'</body></html>')
        page.add_script_tag(content=fixture)
        if failure:page.evaluate('window.__failure=true')
        if legacy:
            page.add_script_tag(content='window.ENTRE_SABERES_CONFIG={supabaseUrl:"https://test.invalid",supabasePublishableKey:"example"};window.supabase={createClient(){window.__legacy=true;return {from(){return {select(){return this},order(){return this},limit(){return Promise.resolve({data:[{id:"legacy",titulo:"Modo legado",status:"publicado"}],error:null})}}}}}};')
        else:
            page.add_script_tag(content='window.ENTRE_SABERES_CONFIG={publicApiBase:"/api/public"};window.supabase={createClient(){throw Error("Supabase nao deve ser chamado")}};')
        source=(root/script).read_text().replace("import('./neon-public-client.js')",'import('+json.dumps(wrapper_url)+')')
        location={'origin':'https://fixture.invalid','search':'?'+path.split('?',1)[1] if '?' in path else ''}
        # Offline loader only. The production source and actual client execute in Chromium;
        # the external HTTP boundary is an explicit fixture, not a live-site test.
        page.add_script_tag(content='(function(location){'+source+'})('+json.dumps(location)+');')
        return page,errors
    for path,host in [('index.html','latestPublications'),('biblioteca.html','libraryPublications')]:
        page,errors=render(path,[host])
        page.wait_for_selector('.portal-post-card')
        assert 'Titulo <seguro>' in page.locator('.portal-post-card').inner_text()
        assert not errors,errors
        results.append(path+': publicacao renderizada');page.close()
    page,errors=render('article.html?id=12345678-1234-4234-8234-123456789abc',['articleHost','crumbCurrent'],'cms-public.js')
    page.wait_for_selector('.rich-body pre')
    assert 'Texto recuperado' in page.locator('.rich-body').inner_text()
    assert page.evaluate('window.__xss === undefined')
    results.append('artigo: texto exibido sem executar HTML inseguro')
    assert 'V\u00ednculo institucional n\u00e3o informado' in page.locator('.scientific-id-line').inner_text(), 'missing institutional metadata must not imply independent researcher'
    assert not errors,errors
    results.append('artigo: sem vinculo institucional inventado');page.close()
    page,errors=render('article.html?id=12345678-1234-4234-8234-123456789abc&preview=1',['articleHost'],'cms-public.js')
    page.wait_for_selector('.article-load-error')
    assert 'editorial' in page.locator('#articleHost').inner_text()
    assert page.evaluate('window.__requests.length')==0
    results.append('preview editorial bloqueado antes da consulta');page.close()
    page,errors=render('categoria.html?slug=educacao',['categoryPublications'])
    page.wait_for_selector('.empty-state')
    assert 'Biblioteca' in page.locator('.empty-state').inner_text()
    results.append('classificacao pendente: aviso sem carregamento infinito');page.close()
    page,errors=render('index.html',['latestPublications'],failure=True)
    page.wait_for_selector('.empty-state')
    assert 'consultar' in page.locator('#latestPublications').inner_text()
    results.append('erro de banco nao vira acervo vazio');page.close()
    page,errors=render('legacy.html',['latestPublications'],legacy=True)
    page.wait_for_selector('.portal-post-card')
    assert page.evaluate('window.__legacy === true')
    assert 'Modo legado' in page.locator('#latestPublications').inner_text()
    assert page.evaluate('window.__requests.length')==0
    assert not errors,errors
    results.append('modo legado preservado sem chamada ao Neon');page.close()
    browser.close()
print(json.dumps({'passed':len(results),'type':'Chromium offline; network/database fixtures','checks':results},ensure_ascii=False,indent=2))
