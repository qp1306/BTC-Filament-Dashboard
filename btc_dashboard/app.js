async function load(){
 const r=await fetch('/api/status');
 const d=await r.json();
 document.getElementById('activeTool').textContent=d.status.active_tool;
}
setInterval(load,2000);
load();
