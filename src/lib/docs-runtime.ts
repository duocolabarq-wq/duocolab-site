// Script injetado no começo de cada documento servido pelo portal.
//
// Os documentos foram feitos como artefatos no Claude e alguns usam recursos de lá:
// `claude.use("db")` para guardar marcações (tarefas do painel, respostas do cliente,
// registros de visita) e `claude.use("user")` para saber quem está vendo. No portal
// eles abrem num quadro isolado, sem acesso ao login. Este script recria essas funções
// conversando com a página do portal (postMessage), que grava no Supabase com as
// permissões de quem está logado. Também:
// - guarda o localStorage do documento no navegador da pessoa (o quadro isolado não tem);
// - abre links externos numa nova aba;
// - leva links de outros documentos do projeto para a página certa do portal.
export const RUNTIME_DOCS = `<script>(function(){
var P=window.parent,dentro=P&&P!==window,seq=0,pend={},ouvintes=[];
function rpc(op,a){return new Promise(function(res,rej){if(!dentro)return rej(new Error("indisponivel"));var id=++seq;pend[id]={res:res,rej:rej};P.postMessage({duo:1,id:id,op:op,a:a||{}},"*");});}
window.addEventListener("message",function(e){if(e.source!==P)return;var m=e.data;if(!m||m.duo!==2)return;var p=pend[m.id];if(!p)return;delete pend[m.id];if(m.erro){var er=new Error(m.erro);er.code=m.code;p.rej(er);}else p.res(m.r);});
var mem={};try{var n=window.name;if(n&&n.indexOf("duo:")===0)mem=JSON.parse(n.slice(4))||{};}catch(e){}
var t=null;function salva(){clearTimeout(t);t=setTimeout(function(){if(dentro)P.postMessage({duo:1,id:0,op:"ls",a:{v:mem}},"*");},200);}
var ls={getItem:function(k){return Object.prototype.hasOwnProperty.call(mem,k)?mem[k]:null},setItem:function(k,v){mem[k]=String(v);salva()},removeItem:function(k){delete mem[k];salva()},clear:function(){mem={};salva()},key:function(i){return Object.keys(mem)[i]||null}};
Object.defineProperty(ls,"length",{get:function(){return Object.keys(mem).length}});
try{Object.defineProperty(window,"localStorage",{value:ls,configurable:true});}catch(e){}
document.addEventListener("click",function(e){var a=e.target&&e.target.closest?e.target.closest("a[href]"):null;if(!a)return;
var h=a.getAttribute("href")||"";if(!h||h.charAt(0)==="#"||/^(javascript|mailto|tel|data|blob):/i.test(h))return;
var u;try{u=new URL(h,location.href)}catch(x){return}
if(u.host===location.host&&u.pathname===location.pathname)return;
if(dentro&&/(^|\\.)claude\\.ai$/.test(u.hostname)&&/\\/artifact\\//.test(u.pathname)){e.preventDefault();P.postMessage({duo:1,id:0,op:"artefato",a:{url:u.href}},"*");return}
if(!a.target||a.target==="_self"||a.target==="_top"||a.target==="_parent"){a.target="_blank";a.rel="noopener";}
},true);
if(!dentro)return;
function snap(l){return{docs:l.map(function(x){return{id:x.chave,exists:true,data:function(){return x.dados}}}),size:l.length,empty:!l.length,metadata:{fromCache:false,hasPendingWrites:false}}}
function avisa(r){ouvintes.forEach(function(f){f()});return r}
function ref(c,k){return{id:k,
get:function(){return rpc("db.get",{c:c,k:k}).then(function(x){return{id:k,exists:!!x,data:function(){return x?x.dados:undefined}}})},
set:function(d,o){return rpc("db.set",{c:c,k:k,d:d,merge:!!(o&&o.merge)}).then(avisa)},
update:function(d){return rpc("db.set",{c:c,k:k,d:d,merge:true}).then(avisa)},
delete:function(){return rpc("db.del",{c:c,k:k}).then(avisa)},
onSnapshot:function(cb,err){var vivo=true;function puxa(){this_get().then(function(s){if(vivo)cb(s)},function(e){if(vivo&&err)err(e)})}
function this_get(){return rpc("db.get",{c:c,k:k}).then(function(x){return{id:k,exists:!!x,data:function(){return x?x.dados:undefined}}})}
puxa();var it=setInterval(puxa,8000);ouvintes.push(puxa);return function(){vivo=false;clearInterval(it)}}}}
function col(c){return{
doc:function(k){return ref(c,k==null?"d"+Date.now().toString(36)+Math.random().toString(36).slice(2,7):String(k))},
get:function(){return rpc("db.lista",{c:c}).then(snap)},
onSnapshot:function(cb,err){var vivo=true;function puxa(){rpc("db.lista",{c:c}).then(function(l){if(vivo)cb(snap(l))},function(e){if(vivo&&err)err(e)})}
puxa();var it=setInterval(puxa,8000);ouvintes.push(puxa);return function(){vivo=false;clearInterval(it)}}}}
var db={collection:col,doc:function(p){var i=String(p).indexOf("/");return ref(p.slice(0,i),p.slice(i+1))}};
var user={id:function(){return rpc("user.id")},name:function(){return rpc("user.nome")},can:function(s){return rpc("user.can",{s:s})},profiles:function(ids){return rpc("user.perfis",{ids:ids||[]})}};
window.claude={use:function(n){if(n==="db")return rpc("db.ok").then(function(){return db});if(n==="user")return rpc("user.id").then(function(){return user});return Promise.reject(new Error("Recurso indisponivel no portal"))}};
})();</script>`;

/** Põe o script logo no começo do documento, antes de qualquer outro script. */
export function injetarRuntime(html: string) {
  const m = /<head[^>]*>/i.exec(html);
  if (m) return html.slice(0, m.index + m[0].length) + RUNTIME_DOCS + html.slice(m.index + m[0].length);
  const d = /<!doctype[^>]*>/i.exec(html);
  if (d) return html.slice(0, d.index + d[0].length) + RUNTIME_DOCS + html.slice(d.index + d[0].length);
  return RUNTIME_DOCS + html;
}
