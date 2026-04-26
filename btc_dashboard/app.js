const toolGrid = document.getElementById("toolGrid");
const historyList = document.getElementById("historyList");
const activeToolEl = document.getElementById("activeTool");
const lastEventEl = document.getElementById("lastEvent");
const updatedAtEl = document.getElementById("updatedAt");

function clean(v, d="--"){return v==null||v==""?d:v}

function badgeClass(state){
  const s = String(state||"").toLowerCase();
  if(s.includes("fault")||s.includes("error")) return "badge fault";
  if(s.includes("warn")) return "badge warning";
  if(s.includes("active")||s.includes("printing")) return "badge active";
  return "badge";
}

function renderTools(data){
  const tools = data.tools || [];
  const active = data?.status?.active_tool;

  toolGrid.innerHTML = tools.map(t=>{
    const isActive = String(active) === String(t.id);
    return `
    <div class="tool-card ${isActive?"active":""}">
      <div class="tool-header">
        <div class="tool-name">T${t.id}</div>
        <div class="${badgeClass(t.state)}">${clean(t.state)}</div>
      </div>
      <div class="tool-detail">
        <div class="detail-box"><span>MDM</span><strong>${clean(t.mdm_sensor)}</strong></div>
        <div class="detail-box"><span>Status</span><strong>${clean(t.mdm_state)}</strong></div>
        <div class="detail-box"><span>Spool</span><strong>${t.spool_id??"None"}</strong></div>
        <div class="detail-box"><span>Used</span><strong>${(t.filament_mm||0).toFixed(1)} mm</strong></div>
      </div>
    </div>`;
  }).join("");
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
