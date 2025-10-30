
(function () {
  'use strict';

  (function attachCSS(href) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  })('style.css');

  const KEY = 'todo_v_jslink_v1';
  const $ = (t, p={}, c=[]) => {
    const n = document.createElement(t);
    if (p.className) n.className = p.className;
    if (p.textContent !== undefined) n.textContent = p.textContent;
    if (p.attrs) for (const [k,v] of Object.entries(p.attrs)) n.setAttribute(k, v);
    if (p.on) for (const [ev,fn] of Object.entries(p.on)) n.addEventListener(ev, fn);
    for (const ch of c) n.appendChild(typeof ch === 'string' ? document.createTextNode(ch) : ch);
    return n;
  };
  const uid = () => 't_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  const save = (arr) => localStorage.setItem(KEY, JSON.stringify(arr));
  const load = () => {
    try { const a = JSON.parse(localStorage.getItem(KEY)||'[]'); return Array.isArray(a)?a:[]; }
    catch { return []; }
  };
  const fmt = (d) => d ? new Date(d+'T00:00:00').toLocaleDateString() : '';


  /** @type {Array<{id:string,title:string,due:string,done:boolean,order:number,created:string}>} */
  let tasks = load();
  tasks.forEach((t,i)=>{ if(typeof t.order!=='number') t.order = i; });
  const view = { search:'', filter:'all', sort:'manual' };

  function build() {
    const app = $('section', { className: 'app', attrs: { role:'application' } });

    const header = $('header', {}, [ $('span', { textContent: 'ToDo list' }) ]);

    const form = $('form', { className: 'add', attrs: { autocomplete:'off' } });
    const titleInput = $('input', { attrs: { type:'text', placeholder:'Задача', maxlength:'80', 'aria-label':'Название' } });
    const dateInput  = $('input', { attrs: { type:'date', 'aria-label':'Дата' } });
    const addBtn     = $('button', { className:'btn-primary', attrs:{ type:'submit'}}, ['Добавить']);
    form.append(titleInput, dateInput, addBtn);


    const controls = $('div', { className:'controls' });
    const search = $('input', { attrs:{ type:'text', placeholder:'Поиск', 'aria-label':'Поиск'}});
    const filter = $('select', {}, [
      $('option', { attrs:{ value:'all' }, textContent:'Все' }),
      $('option', { attrs:{ value:'active' }, textContent:'Активные' }),
      $('option', { attrs:{ value:'done' }, textContent:'Завершенные' })
    ]);
    const sort = $('select', {}, [
      $('option', { attrs:{ value:'manual' }, textContent:'Вручную' }),
      $('option', { attrs:{ value:'asc' }, textContent:'По дате ↑' }),
      $('option', { attrs:{ value:'desc' }, textContent:'По дате ↓' })
    ]);
    controls.append(search, filter, sort);

    const main = $('main');
    const list = $('ul', { attrs:{ role:'list' } });
    main.append(list);

    const footer = $('footer');

    app.append(header, form, controls, main, footer);
    document.body.append(app);

    form.addEventListener('submit', (e)=> {
      e.preventDefault();
      const title = (titleInput.value||'').trim();
      if (!title) return titleInput.focus();
      const due = (dateInput.value||'').trim();
      tasks.push({ id:uid(), title, due, done:false, order: tasks.length, created: new Date().toISOString() });
      save(tasks);
      titleInput.value=''; dateInput.value='';
      render();
    });

    search.addEventListener('input', ()=>{ view.search = search.value.toLowerCase(); render(); });
    filter.addEventListener('change', ()=>{ view.filter = filter.value; render(); });
    sort.addEventListener('change',   ()=>{ view.sort   = sort.value;   render(); });

    function render() {
      while (list.firstChild) list.removeChild(list.firstChild);

      let show = tasks.slice();
      if (view.search) show = show.filter(t => t.title.toLowerCase().includes(view.search));
      if (view.filter==='active') show = show.filter(t => !t.done);
      if (view.filter==='done')   show = show.filter(t => t.done);
      if (view.sort==='asc')  show.sort((a,b)=> (a.due||'').localeCompare(b.due||''));
      else if (view.sort==='desc') show.sort((a,b)=> (b.due||'').localeCompare(a.due||''));
      else show.sort((a,b)=> a.order - b.order);

      if (!show.length) { list.append($('li', { className:'task empty-message' }, ['Нет задач'])); return; }


      for (const t of show) {
        const li = $('li', { className:'task', dataset:{ id:t.id } });
        li.setAttribute('draggable','true');
        if (t.done) li.classList.add('completed');

        const cb = $('input', { attrs:{ type:'checkbox', 'aria-label':'Готово' } });
        cb.checked = t.done;
        cb.addEventListener('change', ()=>{ t.done = cb.checked; save(tasks); render(); });

        const title = $('span', { className:'task-title', textContent: t.title, attrs:{ title:t.title } });
        title.addEventListener('dblclick', ()=> startEdit(t, title));

        const date = $('span', { className:'task-date', textContent: fmt(t.due) });
        const del  = $('button', { className:'btn-danger', textContent:'Удалить', on:{ click: ()=> {
          tasks = tasks.filter(x=>x.id!==t.id);
          tasks.forEach((x,i)=> x.order=i);
          save(tasks); render();
        }}});

        const handle = $('span', { className:'handle', textContent:'⋮⋮', attrs:{ title:'Перетащите' } });

        // DnD
        li.addEventListener('dragstart', (e)=> {
          e.dataTransfer.setData('id', t.id);
          setTimeout(()=> li.style.opacity='0.6', 0);
        });
        li.addEventListener('dragend', ()=> li.style.opacity='');
        li.addEventListener('dragover', (e)=> { e.preventDefault(); li.classList.add('drag-over'); });
        li.addEventListener('dragleave', ()=> li.classList.remove('drag-over'));
        li.addEventListener('drop', (e)=> {
          e.preventDefault();
          li.classList.remove('drag-over');
          const fromId = e.dataTransfer.getData('id');
          if (!fromId || fromId===t.id) return;
          const fromIdx = tasks.findIndex(x=>x.id===fromId);
          const toIdx   = tasks.findIndex(x=>x.id===t.id);
          const moved   = tasks.splice(fromIdx,1)[0];
          tasks.splice(toIdx,0,moved);
          tasks.forEach((x,i)=> x.order=i);
          save(tasks); render();
        });

        li.append(cb, title, date, del, handle);
        list.append(li);
      }
    }

    function startEdit(task, titleEl) {
      const input = $('input', { attrs:{ type:'text', maxlength:'80' } });
      input.value = task.title;
      titleEl.replaceWith(input);
      input.focus();

      function finish(apply) {
        if (apply) {
          const v = input.value.trim();
          if (v) task.title = v;
          save(tasks);
        }
        render();
      }
      input.addEventListener('keydown', (e)=> {
        if (e.key==='Enter') finish(true);
        if (e.key==='Escape') finish(false);
      });
      input.addEventListener('blur', ()=> finish(true));
    }

    render();
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
