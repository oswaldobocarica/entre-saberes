document.addEventListener('DOMContentLoaded',()=>{
  const input=document.querySelector('[data-search]');
  if(input){
    const items=[...document.querySelectorAll('[data-search-item]')];
    input.addEventListener('input',()=>{
      const q=input.value.trim().toLowerCase();
      items.forEach(el=>{el.hidden=q&&!el.textContent.toLowerCase().includes(q)});
    });
  }

  const headerNav=document.querySelector('.nav-links');
  if(headerNav && !headerNav.querySelector('a[href="buscar.html"]')){
    const a=document.createElement('a');a.href='buscar.html';a.className='nav-search';a.textContent='⌕ Pesquisar';a.title='Pesquisar no acervo';headerNav.appendChild(a);
  }

  const main=document.querySelector('main');
  const isHome=/\/(index\.html)?$/.test(location.pathname);
  const isSpecial=/\/(article|arquivo|buscar)\.html$/.test(location.pathname);
  if(main && !isHome && !document.querySelector('.breadcrumbs')){
    const wrap=document.createElement('div');wrap.className='container';
    const nav=document.createElement('nav');nav.className='breadcrumbs scientific-breadcrumb';nav.setAttribute('aria-label','Caminho de navegação');
    const label=(document.querySelector('h1')?.textContent||document.title.split('—')[0]).trim();
    nav.innerHTML=`<a href="index.html">Início</a><span>›</span><span>${label.replace(/[&<>"']/g,'')}</span>`;
    wrap.appendChild(nav);main.prepend(wrap);
  }

  if(main && !isHome && !isSpecial && !document.querySelector('.generic-citation')){
    const title=(document.querySelector('h1')?.textContent||document.title.split('—')[0]).trim();
    const year=new Date().getFullYear();
    const ref=`ENTRE SABERES. ${title}. Franca, ${year}. Disponível em: ${location.href.split('#')[0]}. Acesso em: ${new Date().toLocaleDateString('pt-BR')}.`;
    const box=document.createElement('section');box.className='container generic-citation';box.innerHTML=`<details><summary>Como citar esta página (ABNT)</summary><p>${ref}</p><button class="button" type="button">Copiar referência</button></details>`;
    box.querySelector('button').onclick=async e=>{try{await navigator.clipboard.writeText(ref);const b=e.currentTarget;b.textContent='Copiado!';setTimeout(()=>b.textContent='Copiar referência',1500)}catch{}};
    main.appendChild(box);
  }
});
