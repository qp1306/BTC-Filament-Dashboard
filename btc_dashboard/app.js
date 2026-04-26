const toolGrid = document.getElementById("toolGrid");
const historyList = document.getElementById("historyList");
const activeToolEl = document.getElementById("activeTool");
const lastEventEl = document.getElementById("lastEvent");
const updatedAtEl = document.getElementById("updatedAt");

function clean(v, d="--"){return v==null||v==""?d:v}

function renderTools(data){
  const tools = data.tools || [];
  toolGrid.innerHTML = tools.map(t=>`<div class="tool-card">
    <div class="tool-header">
      <div class="tool-name">T${t.id}</div>
      <div class="badge">${clean(t.state)}</div>
    </div>
  </div>`).join("");
}

function renderHistory(data){
  const h = data.history || [];
  historyList.innerHTML = h.slice(0,10).map(r=>`<div class="history-row">
    <strong>${r.time}</strong>
    <span>T${r.tool}</span>
    <span>${r.event}</span>
    <span>${clean(r.message)}</span>
  </div>`).join("");
}

async function load(){
  const r=await fetch('/api/status');
  const d=await r.json();
  activeToolEl.textContent = d.status.active_tool==null?"--":"T"+d.status.active_tool;
  lastEventEl.textContent = clean(d.status.last_event);
  updatedAtEl.textContent = clean(d.updated_at);
  renderTools(d);
  renderHistory(d);
}

setInterval(load,2000);
load();
