const mdmTiles = document.getElementById("mdmTiles");
const activeToolBig = document.getElementById("activeToolBig");
const activeSpoolName = document.getElementById("activeSpoolName");
const activeSpoolId = document.getElementById("activeSpoolId");
const printingTime = document.getElementById("printingTime");
const layerText = document.getElementById("layerText");
const progressText = document.getElementById("progressText");
const progressMini = document.getElementById("progressMini");
const usageActiveTool = document.getElementById("usageActiveTool");
const mdmStatusBadge = document.getElementById("mdmStatusBadge");
const mdmStatusText = document.getElementById("mdmStatusText");
const thisPrintM = document.getElementById("thisPrintM");
const thisPrintG = document.getElementById("thisPrintG");
const printStartM = document.getElementById("printStartM");
const printStartG = document.getElementById("printStartG");
const printRate = document.getElementById("printRate");
const printRateG = document.getElementById("printRateG");
const totalUsedM = document.getElementById("totalUsedM");
const totalUsedG = document.getElementById("totalUsedG");
const materialProfile = document.getElementById("materialProfile");
const remainingDonut = document.getElementById("remainingDonut");
const remainingPercent = document.getElementById("remainingPercent");
const remainingMeters = document.getElementById("remainingMeters");
const remainingGrams = document.getElementById("remainingGrams");
const totalMeters = document.getElementById("totalMeters");
const totalGrams = document.getElementById("totalGrams");
const usedMeters = document.getElementById("usedMeters");
const usedGrams = document.getElementById("usedGrams");
const estimatedEnd = document.getElementById("estimatedEnd");
const usageGraph = document.getElementById("usageGraph");
const toolSelect = document.getElementById("toolSelect");
const spoolTableBody = document.getElementById("spoolTableBody");
const assignSpoolOpen = document.getElementById("assignSpoolOpen");
const assignModal = document.getElementById("assignModal");
const assignModalClose = document.getElementById("assignModalClose");
const assignToolSelect = document.getElementById("assignToolSelect");
const assignSpoolSelect = document.getElementById("assignSpoolSelect");
const assignSave = document.getElementById("assignSave");
const assignStatus = document.getElementById("assignStatus");

const DEFAULT_SPOOLS = {
  0:{id:100,material:"PLA",color:"White",hex:"#f5f5f5",total_m:400,remaining_m:312,g_per_m:2.955},
  1:{id:101,material:"ABS",color:"Black",hex:"#050505",total_m:400,remaining_m:198,g_per_m:2.55},
  2:{id:102,material:"PETG",color:"Orange",hex:"#ff9632",total_m:400,remaining_m:286,g_per_m:3.05},
  3:{id:103,material:"TPU95A",color:"Clear",hex:"#aeb4b8",total_m:400,remaining_m:324,g_per_m:2.91},
  4:{id:104,material:"PLA",color:"Blue",hex:"#199ce8",total_m:400,remaining_m:150,g_per_m:2.967},
  5:{id:105,material:"PLA",color:"Red",hex:"#ff3030",total_m:400,remaining_m:98,g_per_m:2.959}
};

let currentData = null;
let currentSpoolList = [];

function n(v,d=0){const x=Number(v);return Number.isFinite(x)?x:d}
function clean(v,d="--"){return v==null||v===""?d:v}
function esc(v){return String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]))}
function m(v){return `${n(v).toFixed(1)} m`}
function g(v){return `(${n(v).toFixed(1)} g)`}
function wholeM(v){return `${Math.round(n(v))} m`}
function wholeG(v){return `(${Math.round(n(v))} g)`}

function getToolId(data){
  const at = data?.status?.active_tool;
  if(at !== undefined && at !== null && at !== "") return Number(at);
  return 0;
}
function getTool(data,id){return (data.tools||[]).find(t=>Number(t.id)===Number(id)) || {id}}
function getSpool(data,id){
  const t = getTool(data,id);
  const sid = t.spool_id;
  const spools = data.spools || {};
  const found = spools[`tool_${id}`] || spools[sid] || spools[String(sid)] || spools[id] || spools[String(id)];
  return {...DEFAULT_SPOOLS[id], ...(found||{}), id: found?.id ?? sid ?? DEFAULT_SPOOLS[id]?.id};
}
function isDisabledTool(t,id){
  const s = String(t.state||t.mdm_state||"").toLowerCase();
  return s.includes("disable") || (!t.mdm_sensor && id >= 4);
}
function isMoving(t,id,active){
  const s = String(t.mdm_state||t.state||"").toLowerCase();
  return Number(id)===Number(active) && (s.includes("moving") || s.includes("active") || s.includes("printing") || s==="");
}

function renderMdm(data){
  const active = getToolId(data);
  let ok = true;
  mdmTiles.innerHTML = [0,1,2,3,4,5].map(id=>{
    const t = getTool(data,id);
    const disabled = isDisabledTool(t,id);
    const moving = isMoving(t,id,active) && !disabled;
    if(String(t.state||"").toLowerCase().includes("fault")) ok = false;
    const state = disabled ? "DISABLED" : moving ? "MOVING" : "IDLE";
    const msg = disabled ? "Not configured" : moving ? "Filament moving" : "No movement";
    return `<div class="mdm-tile ${moving?"active":""} ${disabled?"disabled":""}">
      <div class="mdm-tool">T${id}</div>
      <div class="mdm-state">${state}</div>
      <div class="mdm-message">${msg}</div>
      <div class="dot ${moving?"green":""}"></div>
    </div>`;
  }).join("");
  mdmStatusBadge.textContent = ok ? "OK" : "FAULT";
  mdmStatusText.textContent = ok ? "All systems normal" : "Check tool sensors";
}

function renderActive(data){
  const id = getToolId(data);
  const t = getTool(data,id);
  const s = getSpool(data,id);
  const material = clean(s.material || t.material, "Unknown");
  const color = clean(s.color || t.color, "Spool");
  const progress = n(data.status?.progress, 0);
  const visibleProgress = Math.floor(Math.max(0, Math.min(100, progress)));
  activeToolBig.textContent = `T${id}`;
  activeSpoolName.textContent = `${material} - ${color}`;
  activeSpoolId.textContent = clean(s.id ?? t.spool_id, "--");
  printingTime.textContent = clean(data.status?.printing_time, "00:00:00");
  layerText.textContent = clean(data.status?.layer, "-- / --");
  progressText.textContent = `${visibleProgress}%`;
  progressMini.style.setProperty("--p", `${visibleProgress}%`);
  usageActiveTool.textContent = `T${id}`;
}

function renderUsage(data){
  const id = getToolId(data);
  const t = getTool(data,id);
  const s = getSpool(data,id);
  const gpm = n(s.g_per_m, n(t.g_per_m, 3.05));
  const totalUsed = n(t.filament_m, n(t.filament_mm, 186400)/1000);
  const thisPrint = n(data.status?.this_print_m, 14.8);
  const startUsed = n(data.status?.print_start_m, Math.max(0,totalUsed-thisPrint));
  const rate = n(data.status?.print_rate_mms, 6.2);
  thisPrintM.textContent = m(thisPrint); thisPrintG.textContent = g(thisPrint*gpm);
  printStartM.textContent = m(startUsed); printStartG.textContent = g(startUsed*gpm);
  printRate.textContent = `${rate.toFixed(1)} mm/s`; printRateG.textContent = `(${(rate*60/1000*gpm).toFixed(1)} g/min)`;
  totalUsedM.textContent = m(totalUsed); totalUsedG.textContent = g(totalUsed*gpm);
  materialProfile.textContent = `${clean(s.material,"--")} (${gpm.toFixed(2)} g/m)`;
}

function renderRemaining(data){
  const id = getToolId(data);
  const t = getTool(data,id);
  const s = getSpool(data,id);
  const gpm = n(s.g_per_m, 3.05);
  const total = n(s.total_m, 400);
  const remaining = n(s.remaining_m, Math.max(0,total - n(t.filament_mm,114000)/1000));
  const used = Math.max(0,total - remaining);
  const pct = total > 0 ? Math.round((remaining/total)*100) : 0;
  remainingDonut.style.setProperty("--p", pct);
  remainingPercent.textContent = `${pct}%`;
  remainingMeters.textContent = m(remaining); remainingGrams.textContent = g(remaining*gpm);
  totalMeters.textContent = m(total); totalGrams.textContent = g(total*gpm);
  usedMeters.textContent = m(used); usedGrams.textContent = g(used*gpm);
  estimatedEnd.textContent = clean(data.status?.estimated_end, "~ 14h 23m");
}

function renderGraph(data){
  const id = Number(toolSelect.value || getToolId(data));
  const t = getTool(data,id);
  const used = n(t.filament_m, n(t.filament_mm,114000)/1000);
  const pts = [0, 5, 16, 55, 72, used].map((y,i)=>({x:i*144,y}));
  const maxY = Math.max(200, used*1.2);
  const sx=x=>40+(x/720)*650;
  const sy=y=>210-(y/maxY)*170;
  const line = pts.map((p,i)=>`${i?"L":"M"}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(" ");
  let grid = "";
  [0,50,100,150,200].forEach(v=>{const y=sy(v);grid+=`<line x1="40" y1="${y}" x2="690" y2="${y}" class="grid-line"/><text x="8" y="${y+5}" class="axis-text">${v}</text>`});
  [40,257,473,690].forEach(x=>{grid+=`<line x1="${x}" y1="38" x2="${x}" y2="210" class="grid-line"/>`});
  usageGraph.innerHTML = `<style>.grid-line{stroke:rgba(255,255,255,.14);stroke-dasharray:3 3}.axis-text{fill:#e8edf2;font-size:15px}.usage-line{fill:none;stroke:#58d744;stroke-width:3}.end-label{fill:#58d744}.end-text{fill:#fff;font-size:15px;font-weight:800}</style>${grid}<path d="${line}" class="usage-line"/><rect x="650" y="${sy(used)-18}" rx="5" ry="5" width="68" height="30" class="end-label"/><text x="684" y="${sy(used)+2}" text-anchor="middle" class="end-text">${used.toFixed(1)} m</text>`;
}

function renderTable(data){
  const active = getToolId(data);
  toolSelect.innerHTML = [0,1,2,3,4,5].map(id=>{const s=getSpool(data,id);return `<option value="${id}" ${id===active?"selected":""}>T${id} (${esc(s.material)} - ${esc(s.color)})</option>`}).join("");
  spoolTableBody.innerHTML = [0,1,2,3,4,5].map(id=>{
    const t = getTool(data,id); const s = getSpool(data,id); const gpm = n(s.g_per_m,3); const rem=n(s.remaining_m,0);
    const disabled = isDisabledTool(t,id); const activeRow = id===active && !disabled;
    return `<tr><td>T${id}</td><td>${clean(s.id,"--")}</td><td>${esc(clean(s.material,"--"))}</td><td>${esc(clean(s.color,"--"))} <span class="color-dot" style="background:${s.hex||"#777"}"></span></td><td>${wholeM(rem)} ${wholeG(rem*gpm)}</td><td class="${disabled?"status-disabled":activeRow?"status-active":"status-ready"}">${disabled?"DISABLED":activeRow?"ACTIVE":"READY"}</td><td><button class="assign-row-button" type="button" data-tool="${id}">Assign</button></td></tr>`;
  }).join("");
}

async function load(){
  try{
    const r = await fetch('/api/status',{cache:'no-store'});
    const d = await r.json();
    currentData = d;
    renderActive(d); renderMdm(d); renderUsage(d); renderRemaining(d); renderTable(d); renderGraph(d);
  }catch(e){console.error(e)}
}

async function fetchSpoolList(){
  const r = await fetch('/api/spools',{cache:'no-store'});
  const d = await r.json();
  if(!d.ok) throw new Error(d.error || 'Could not load Spoolman spools');
  currentSpoolList = d.spools || [];
  return d;
}

function renderAssignSpoolOptions(selectedSpoolId){
  assignSpoolSelect.innerHTML = currentSpoolList.map(spool => {
    const selected = String(spool.id) === String(selectedSpoolId) ? 'selected' : '';
    const rem = spool.remaining_m != null ? ` - ${Math.round(Number(spool.remaining_m))} m` : '';
    return `<option value="${spool.id}" ${selected}>${esc(spool.label)}${esc(rem)}</option>`;
  }).join('');
}

async function openAssignModal(toolId){
  const tool = Number(toolId ?? getToolId(currentData || {}));
  const t = currentData ? getTool(currentData, tool) : {spool_id:''};
  assignToolSelect.value = String(tool);
  assignStatus.textContent = 'Loading Spoolman spools...';
  assignModal.hidden = false;
  try{
    await fetchSpoolList();
    renderAssignSpoolOptions(t.spool_id);
    assignStatus.textContent = `Assign a Spoolman spool to T${tool}.`;
  }catch(e){
    assignStatus.textContent = e.message;
  }
}

function closeAssignModal(){
  assignModal.hidden = true;
}

async function saveAssignment(){
  const tool = Number(assignToolSelect.value);
  const spoolId = Number(assignSpoolSelect.value);
  if(!Number.isFinite(tool) || !Number.isFinite(spoolId)){
    assignStatus.textContent = 'Select both a tool and a spool.';
    return;
  }
  assignSave.disabled = true;
  assignStatus.textContent = `Saving T${tool} -> Spool ${spoolId}...`;
  try{
    const r = await fetch('/api/assign_spool',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({tool, spool_id:spoolId})
    });
    const d = await r.json();
    if(!d.ok) throw new Error(d.error || 'Assignment failed');
    assignStatus.textContent = `Saved: T${tool} -> Spool ${spoolId}`;
    await load();
    setTimeout(closeAssignModal, 350);
  }catch(e){
    assignStatus.textContent = e.message;
  }finally{
    assignSave.disabled = false;
  }
}

toolSelect?.addEventListener("change",()=>load());
assignSpoolOpen?.addEventListener('click',()=>openAssignModal());
assignModalClose?.addEventListener('click',closeAssignModal);
assignSave?.addEventListener('click',saveAssignment);
assignToolSelect?.addEventListener('change',()=>{
  const t = currentData ? getTool(currentData, Number(assignToolSelect.value)) : {spool_id:''};
  renderAssignSpoolOptions(t.spool_id);
  assignStatus.textContent = `Assign a Spoolman spool to T${assignToolSelect.value}.`;
});
assignModal?.addEventListener('click',e=>{ if(e.target === assignModal) closeAssignModal(); });
spoolTableBody?.addEventListener('click',e=>{
  const btn = e.target.closest('.assign-row-button');
  if(btn) openAssignModal(btn.dataset.tool);
});

setInterval(load,2000);
load();
