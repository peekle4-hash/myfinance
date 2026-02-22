// 재테크 관리 - 로컬 저장(브라우저) 버전
// 데이터는 localStorage에 저장됩니다.

const LS_KEY = "financeTabs.v1";

const PRESET_PURPOSES = [
  "비상금","교통비","월급수령","통신비","보험료","생활비","투자대기자금",
  "투자금","예금","주택청약저축","교육비","카드값","여행","취미","기타"
];

function nowDateISO(){
  const d = new Date();
  const tz = new Date(d.getTime() - d.getTimezoneOffset()*60000);
  return tz.toISOString().slice(0,10);
}

function uid(){
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

function formatKRW(n){
  const num = Number(n || 0);
  return new Intl.NumberFormat("ko-KR", { style:"currency", currency:"KRW", maximumFractionDigits:0 }).format(num);
}

function loadState(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch(e){
    console.warn("loadState failed", e);
    return null;
  }
}

function saveState(state){
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function defaultState(){
  return {
    todosByDate: {},      // { "YYYY-MM-DD": [ {id,text,done} ] }
    memo: "",
    quote: "",
    accounts: [],         // [{id,name,buckets:[{id,purpose,balance}]}]
    tx: []                // [{id,ts,accountId,bucketId,type,amount,note}]
  };
}

let STATE = loadState() || defaultState();

// ---------------- Tabs ----------------
const tabButtons = document.querySelectorAll(".tab");
const panels = {
  todo: document.getElementById("tab-todo"),
  assets: document.getElementById("tab-assets"),
  help: document.getElementById("tab-help"),
};

tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    tabButtons.forEach(b => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    const key = btn.dataset.tab;

    Object.values(panels).forEach(p => p.classList.remove("is-active"));
    document.getElementById("tab-" + key).classList.add("is-active");

    tabButtons.forEach(b => b.setAttribute("aria-selected", String(b === btn)));

    // assets 탭 들어갈 때 드롭다운 최신화
    if(key === "assets"){
      refreshAccountDropdowns();
      renderAccounts();
      renderTx();
      renderKPIs();
    }
  });
});

// ---------------- TODO ----------------
const todoDate = document.getElementById("todoDate");
const todoText = document.getElementById("todoText");
const addTodoBtn = document.getElementById("addTodoBtn");
const todoList = document.getElementById("todoList");
const todoEmpty = document.getElementById("todoEmpty");
const clearDoneBtn = document.getElementById("clearDoneBtn");
const clearDateBtn = document.getElementById("clearDateBtn");

todoDate.value = nowDateISO();

function getTodosForDate(dateStr){
  if(!STATE.todosByDate[dateStr]) STATE.todosByDate[dateStr] = [];
  return STATE.todosByDate[dateStr];
}

function renderTodos(){
  const dateStr = todoDate.value;
  const todos = getTodosForDate(dateStr);
  todoList.innerHTML = "";
  todoEmpty.style.display = todos.length ? "none" : "block";

  // 번호순: ol + 추가 순서대로
  todos.forEach((t) => {
    const li = document.createElement("li");
    li.className = "todoItem" + (t.done ? " is-done" : "");

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!t.done;
    cb.addEventListener("change", () => {
      t.done = cb.checked;
      saveState(STATE);
      renderTodos();
    });

    const span = document.createElement("div");
    span.className = "todoText";
    span.textContent = t.text;

    const del = document.createElement("button");
    del.className = "btn ghost";
    del.textContent = "삭제";
    del.addEventListener("click", () => {
      const idx = todos.findIndex(x => x.id === t.id);
      if(idx >= 0) todos.splice(idx, 1);
      saveState(STATE);
      renderTodos();
    });

    li.appendChild(cb);
    li.appendChild(span);
    li.appendChild(del);
    todoList.appendChild(li);
  });
}

function addTodo(){
  const dateStr = todoDate.value;
  const text = (todoText.value || "").trim();
  if(!text) return;

  const todos = getTodosForDate(dateStr);
  todos.push({ id: uid(), text, done:false });
  todoText.value = "";
  saveState(STATE);
  renderTodos();
}

addTodoBtn.addEventListener("click", addTodo);
todoText.addEventListener("keydown", (e) => {
  if(e.key === "Enter") addTodo();
});
todoDate.addEventListener("change", renderTodos);

clearDoneBtn.addEventListener("click", () => {
  const dateStr = todoDate.value;
  const todos = getTodosForDate(dateStr);
  STATE.todosByDate[dateStr] = todos.filter(t => !t.done);
  saveState(STATE);
  renderTodos();
});

clearDateBtn.addEventListener("click", () => {
  const dateStr = todoDate.value;
  delete STATE.todosByDate[dateStr];
  saveState(STATE);
  renderTodos();
});

// memo
const quickMemo = document.getElementById("quickMemo");
quickMemo.value = STATE.memo || "";
quickMemo.addEventListener("input", () => {
  STATE.memo = quickMemo.value;
  saveState(STATE);
});

// quote
const dailyQuote = document.getElementById("dailyQuote");
const saveQuoteBtn = document.getElementById("saveQuoteBtn");
const quotePreview = document.getElementById("quotePreview");

function renderQuote(){
  const q = (STATE.quote || "").trim();
  quotePreview.textContent = q ? "“ " + q + " ”" : "아직 저장된 문장이 없어요.";
}
dailyQuote.value = STATE.quote || "";
saveQuoteBtn.addEventListener("click", () => {
  STATE.quote = (dailyQuote.value || "").trim();
  saveState(STATE);
  renderQuote();
});
renderQuote();

// ---------------- Assets ----------------
const newAccountName = document.getElementById("newAccountName");
const addAccountBtn = document.getElementById("addAccountBtn");
const accountsWrap = document.getElementById("accountsWrap");
const totalAssets = document.getElementById("totalAssets");
const totalBuckets = document.getElementById("totalBuckets");

const txAccount = document.getElementById("txAccount");
const txBucket = document.getElementById("txBucket");
const txType = document.getElementById("txType");
const txAmount = document.getElementById("txAmount");
const txNote = document.getElementById("txNote");
const addTxBtn = document.getElementById("addTxBtn");
const txTableBody = document.getElementById("txTableBody");
const txEmpty = document.getElementById("txEmpty");

function accountTotal(acc){
  return (acc.buckets || []).reduce((s,b)=> s + Number(b.balance||0), 0);
}

function renderKPIs(){
  const total = STATE.accounts.reduce((s,a)=> s + accountTotal(a), 0);
  const bcount = STATE.accounts.reduce((s,a)=> s + (a.buckets?.length||0), 0);
  totalAssets.textContent = formatKRW(total);
  totalBuckets.textContent = String(bcount);
}

function addAccount(){
  const name = (newAccountName.value || "").trim();
  if(!name) return;
  STATE.accounts.push({ id: uid(), name, buckets: [] });
  newAccountName.value = "";
  saveState(STATE);
  refreshAccountDropdowns();
  renderAccounts();
  renderKPIs();
}

addAccountBtn.addEventListener("click", addAccount);
newAccountName.addEventListener("keydown", (e)=>{ if(e.key==="Enter") addAccount(); });

function removeAccount(accountId){
  STATE.accounts = STATE.accounts.filter(a => a.id !== accountId);
  // 관련 tx도 제거
  STATE.tx = STATE.tx.filter(t => t.accountId !== accountId);
  saveState(STATE);
  refreshAccountDropdowns();
  renderAccounts();
  renderTx();
  renderKPIs();
}

function addBucket(accountId, purpose, amount){
  const acc = STATE.accounts.find(a => a.id === accountId);
  if(!acc) return;
  acc.buckets.push({ id: uid(), purpose, balance: Number(amount||0) });
  saveState(STATE);
  refreshAccountDropdowns();
  renderAccounts();
  renderKPIs();
}

function updateBucket(accountId, bucketId, newBal){
  const acc = STATE.accounts.find(a => a.id === accountId);
  if(!acc) return;
  const b = acc.buckets.find(x => x.id === bucketId);
  if(!b) return;
  b.balance = Number(newBal||0);
  saveState(STATE);
  renderAccounts();
  renderKPIs();
}

function removeBucket(accountId, bucketId){
  const acc = STATE.accounts.find(a => a.id === accountId);
  if(!acc) return;
  acc.buckets = acc.buckets.filter(b => b.id !== bucketId);
  STATE.tx = STATE.tx.filter(t => t.bucketId !== bucketId); // bucket 관련 기록도 제거
  saveState(STATE);
  refreshAccountDropdowns();
  renderAccounts();
  renderTx();
  renderKPIs();
}

function renderAccounts(){
  accountsWrap.innerHTML = "";
  if(STATE.accounts.length === 0){
    const div = document.createElement("div");
    div.className = "emptyState";
    div.textContent = "계좌가 아직 없어요. 왼쪽 위에서 계좌를 추가하세요.";
    accountsWrap.appendChild(div);
    return;
  }

  STATE.accounts.forEach(acc => {
    const wrap = document.createElement("div");
    wrap.className = "account";

    const header = document.createElement("div");
    header.className = "accountHeader";

    const left = document.createElement("div");
    left.innerHTML = `<div class="accountName">${escapeHtml(acc.name)}</div>`;

    const meta = document.createElement("div");
    meta.className = "accountMeta";
    const total = accountTotal(acc);
    const badge = document.createElement("div");
    badge.className = "badge" + (total < 0 ? " negative" : "");
    badge.textContent = "합계 " + formatKRW(total);
    const cnt = document.createElement("div");
    cnt.className = "badge";
    cnt.textContent = "버킷 " + (acc.buckets?.length || 0) + "개";
    meta.appendChild(badge);
    meta.appendChild(cnt);

    const right = document.createElement("div");
    right.className = "row";
    right.style.gap = "8px";
    right.style.alignItems = "center";

    const delBtn = document.createElement("button");
    delBtn.className = "btn danger ghost";
    delBtn.textContent = "계좌 삭제";
    delBtn.addEventListener("click", () => removeAccount(acc.id));

    right.appendChild(delBtn);

    header.appendChild(left);
    header.appendChild(meta);
    header.appendChild(right);

    wrap.appendChild(header);

    // add bucket UI
    const addRow = document.createElement("div");
    addRow.className = "row";
    addRow.style.marginTop = "10px";

    const purposeField = document.createElement("label");
    purposeField.className = "field grow";
    purposeField.innerHTML = `<span>새 버킷(용도)</span>`;
    const sel = document.createElement("select");
    PRESET_PURPOSES.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p; opt.textContent = p;
      sel.appendChild(opt);
    });
    purposeField.appendChild(sel);

    const amtField = document.createElement("label");
    amtField.className = "field grow";
    amtField.innerHTML = `<span>초기 금액</span>`;
    const amt = document.createElement("input");
    amt.type = "number";
    amt.min = "0";
    amt.step = "100";
    amt.placeholder = "예: 300000";
    amtField.appendChild(amt);

    const addBtn = document.createElement("button");
    addBtn.className = "btn primary";
    addBtn.textContent = "버킷 추가";
    addBtn.addEventListener("click", () => {
      const purpose = sel.value;
      const amount = Number(amt.value || 0);
      addBucket(acc.id, purpose, amount);
      amt.value = "";
    });

    const quickPresetBtn = document.createElement("button");
    quickPresetBtn.className = "btn";
    quickPresetBtn.textContent = "추천 버킷 9개 생성";
    quickPresetBtn.title = "비상금/교통비/생활비/통신비/보험료/투자대기자금/투자금/예금/주택청약저축 (0원)";
    quickPresetBtn.addEventListener("click", () => {
      const list = ["비상금","교통비","생활비","통신비","보험료","투자대기자금","투자금","예금","주택청약저축"];
      const existing = new Set((acc.buckets||[]).map(b=>b.purpose));
      list.forEach(p => {
        if(!existing.has(p)) acc.buckets.push({ id: uid(), purpose:p, balance:0 });
      });
      saveState(STATE);
      refreshAccountDropdowns();
      renderAccounts();
      renderKPIs();
    });

    addRow.appendChild(purposeField);
    addRow.appendChild(amtField);
    addRow.appendChild(addBtn);
    addRow.appendChild(quickPresetBtn);

    wrap.appendChild(addRow);

    const blist = document.createElement("div");
    blist.className = "bucketList";

    if((acc.buckets||[]).length === 0){
      const empty = document.createElement("div");
      empty.className = "emptyState";
      empty.textContent = "아직 버킷이 없어요. 위에서 용도를 추가하세요.";
      blist.appendChild(empty);
    } else {
      acc.buckets.forEach(b => {
        const row = document.createElement("div");
        row.className = "bucket";

        const name = document.createElement("div");
        name.className = "bucketName";
        name.textContent = b.purpose;

        const balWrap = document.createElement("div");
        const balInput = document.createElement("input");
        balInput.type = "number";
        balInput.step = "100";
        balInput.value = String(Number(b.balance||0));
        balInput.addEventListener("change", () => updateBucket(acc.id, b.id, balInput.value));
        if(Number(b.balance||0) < 0){
          balInput.style.borderColor = "rgba(255, 137, 137, .70)";
        }
        balWrap.appendChild(balInput);

        const actions = document.createElement("div");
        actions.className = "bucketActions";
        const del = document.createElement("button");
        del.className = "btn danger ghost";
        del.textContent = "삭제";
        del.addEventListener("click", () => removeBucket(acc.id, b.id));
        actions.appendChild(del);

        row.appendChild(name);
        row.appendChild(balWrap);
        row.appendChild(actions);

        blist.appendChild(row);
      });
    }

    wrap.appendChild(blist);
    accountsWrap.appendChild(wrap);
  });
}

function refreshAccountDropdowns(){
  // account dropdown
  txAccount.innerHTML = "";
  STATE.accounts.forEach(a => {
    const opt = document.createElement("option");
    opt.value = a.id; opt.textContent = a.name;
    txAccount.appendChild(opt);
  });

  if(STATE.accounts.length === 0){
    const opt = document.createElement("option");
    opt.value = ""; opt.textContent = "계좌 없음";
    txAccount.appendChild(opt);
    txBucket.innerHTML = "";
    const opt2 = document.createElement("option");
    opt2.value = ""; opt2.textContent = "버킷 없음";
    txBucket.appendChild(opt2);
    return;
  }

  // bucket dropdown
  fillBucketDropdown();
}

function fillBucketDropdown(){
  txBucket.innerHTML = "";
  const accId = txAccount.value;
  const acc = STATE.accounts.find(a => a.id === accId) || STATE.accounts[0];
  if(!acc){
    const opt = document.createElement("option");
    opt.value = ""; opt.textContent = "버킷 없음";
    txBucket.appendChild(opt);
    return;
  }
  (acc.buckets || []).forEach(b => {
    const opt = document.createElement("option");
    opt.value = b.id; opt.textContent = b.purpose;
    txBucket.appendChild(opt);
  });
  if((acc.buckets||[]).length === 0){
    const opt = document.createElement("option");
    opt.value = ""; opt.textContent = "버킷 없음";
    txBucket.appendChild(opt);
  }
}

txAccount.addEventListener("change", fillBucketDropdown);

function addTransaction(){
  const accountId = txAccount.value;
  const bucketId = txBucket.value;
  const type = txType.value;
  const amount = Number(txAmount.value || 0);
  const note = (txNote.value || "").trim();

  if(!accountId) return;
  if(!bucketId) {
    alert("버킷(용도)을 먼저 만들어야 기록할 수 있어요!");
    return;
  }
  if(!amount || amount < 0) return;

  const acc = STATE.accounts.find(a => a.id === accountId);
  const b = acc?.buckets?.find(x => x.id === bucketId);
  if(!acc || !b) return;

  if(type === "expense") b.balance = Number(b.balance||0) - amount;
  else b.balance = Number(b.balance||0) + amount;

  STATE.tx.unshift({
    id: uid(),
    ts: Date.now(),
    accountId,
    bucketId,
    type,
    amount,
    note
  });

  txAmount.value = "";
  txNote.value = "";
  saveState(STATE);
  renderAccounts();
  renderTx();
  renderKPIs();
}

addTxBtn.addEventListener("click", addTransaction);
txNote.addEventListener("keydown", (e)=>{ if(e.key==="Enter") addTransaction(); });

function renderTx(){
  txTableBody.innerHTML = "";
  txEmpty.style.display = STATE.tx.length ? "none" : "block";

  const rows = STATE.tx.slice(0, 50);
  rows.forEach(t => {
    const tr = document.createElement("tr");

    const d = new Date(t.ts);
    const date = d.toLocaleDateString("ko-KR", { year:"2-digit", month:"2-digit", day:"2-digit" });

    const acc = STATE.accounts.find(a => a.id === t.accountId);
    const bucket = acc?.buckets?.find(b => b.id === t.bucketId);

    tr.innerHTML = `
      <td>${escapeHtml(date)}</td>
      <td>${escapeHtml(acc?.name || "-")}</td>
      <td>${escapeHtml(bucket?.purpose || "-")}</td>
      <td>${t.type === "expense" ? "지출" : "수입"}</td>
      <td class="right">${formatKRW((t.type === "expense" ? -1 : 1) * t.amount)}</td>
      <td>${escapeHtml(t.note || "")}</td>
      <td class="right"><button class="btn ghost" data-del="${t.id}">삭제</button></td>
    `;

    txTableBody.appendChild(tr);
  });

  // delete handlers
  txTableBody.querySelectorAll("button[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-del");
      deleteTransaction(id);
    });
  });
}

function deleteTransaction(txId){
  const t = STATE.tx.find(x => x.id === txId);
  if(!t) return;

  // rollback bucket balance
  const acc = STATE.accounts.find(a => a.id === t.accountId);
  const b = acc?.buckets?.find(x => x.id === t.bucketId);
  if(acc && b){
    if(t.type === "expense") b.balance = Number(b.balance||0) + Number(t.amount||0);
    else b.balance = Number(b.balance||0) - Number(t.amount||0);
  }

  STATE.tx = STATE.tx.filter(x => x.id !== txId);
  saveState(STATE);
  renderAccounts();
  renderTx();
  renderKPIs();
}

// export / reset
document.getElementById("exportBtn").addEventListener("click", () => {
  const data = JSON.stringify(STATE, null, 2);
  const blob = new Blob([data], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "finance-data.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

document.getElementById("resetBtn").addEventListener("click", () => {
  const ok = confirm("정말 전체 데이터를 초기화할까요? (되돌릴 수 없음)");
  if(!ok) return;
  STATE = defaultState();
  saveState(STATE);
  // reset UI
  quickMemo.value = "";
  dailyQuote.value = "";
  todoDate.value = nowDateISO();
  refreshAccountDropdowns();
  renderTodos();
  renderAccounts();
  renderTx();
  renderKPIs();
  renderQuote();
});

// help preset chips
const presetChips = document.getElementById("presetChips");
PRESET_PURPOSES.forEach(p => {
  const div = document.createElement("div");
  div.className = "chip";
  div.textContent = p;
  presetChips.appendChild(div);
});

// footer
document.getElementById("scrollTop").addEventListener("click", (e) => {
  e.preventDefault();
  window.scrollTo({top:0, behavior:"smooth"});
});

// utils
function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// initial render
refreshAccountDropdowns();
renderTodos();
renderAccounts();
renderTx();
renderKPIs();
