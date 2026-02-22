let todos = JSON.parse(localStorage.getItem('todos')) || [];
let assets = JSON.parse(localStorage.getItem('assets')) || [];
let expenses = JSON.parse(localStorage.getItem('expenses')) || [];

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('todoDate').valueAsDate = new Date();
    renderAll();
});

function saveAndRender() {
    localStorage.setItem('todos', JSON.stringify(todos));
    localStorage.setItem('assets', JSON.stringify(assets));
    localStorage.setItem('expenses', JSON.stringify(expenses));
    renderAll();
}

function openTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    event.currentTarget.classList.add('active');
}

// 단위 변환 함수 (0 붙이기)
function convertUnit(inputId, unitId) {
    const input = document.getElementById(inputId);
    const unitSelect = document.getElementById(unitId);
    const multiplier = parseInt(unitSelect.value);
    if (input.value && multiplier > 1) {
        input.value = parseFloat(input.value) * multiplier;
        unitSelect.value = "1";
    }
}

// "기타" 입력 필드 토글
function toggleOther(selectId, otherId) {
    const s = document.getElementById(selectId);
    const o = document.getElementById(otherId);
    o.style.display = (s.value === '기타') ? 'block' : 'none';
}

// 1. 할 일 관리
function addTodo() {
    const input = document.getElementById('todoInput');
    const date = document.getElementById('todoDate').value;
    if(input.value) {
        todos.push({ text: input.value, completed: false, date: date });
        input.value = '';
        saveAndRender();
    }
}

function renderTodos() {
    const list = document.getElementById('todoList');
    const selectedDate = document.getElementById('todoDate').value;
    list.innerHTML = '';
    todos.filter(t => t.date === selectedDate).forEach((todo) => {
        const realIdx = todos.indexOf(todo);
        const li = document.createElement('li');
        li.innerHTML = `
            <input type="checkbox" ${todo.completed ? 'checked' : ''} onchange="todos[${realIdx}].completed = !todos[${realIdx}].completed; saveAndRender();">
            <span style="text-decoration: ${todo.completed ? 'line-through' : 'none'}; flex:1;">${todo.text}</span>
            <button class="delete-btn" onclick="todos.splice(${realIdx},1); saveAndRender();">삭제</button>
        `;
        list.appendChild(li);
    });
}

// 2. 자산 관리
function addAsset() {
    const bankVal = document.getElementById('bankSelect').value;
    const bank = (bankVal === '기타') ? document.getElementById('bankOther').value : bankVal;
    
    const typeVal = document.getElementById('typeSelect').value;
    const type = (typeVal === '기타') ? document.getElementById('typeOther').value : typeVal;
    
    const balance = parseInt(document.getElementById('accBalance').value) || 0;
    const target = parseInt(document.getElementById('accTarget').value) || 0;
    
    let purposes = [];
    document.querySelectorAll('#purposeChecklist input[type="checkbox"]:checked').forEach(cb => {
        if(cb.id === 'purposeOtherCheck') {
            const otherText = document.getElementById('purposeOtherText').value;
            if(otherText) purposes.push(otherText);
        } else {
            purposes.push(cb.value);
        }
    });

    if(!bank || !type || purposes.length === 0) {
        alert("은행, 종류, 용도를 입력해주세요.");
        return;
    }

    assets.push({ 
        id: Date.now(), bank, type, balance, target, 
        purpose: purposes.join(', '), 
        planned: [] 
    });
    
    // 입력창 초기화
    document.getElementById('accBalance').value = '';
    document.getElementById('accTarget').value = '';
    document.getElementById('bankOther').value = '';
    document.getElementById('typeOther').value = '';
    document.getElementById('purposeOtherText').value = '';
    document.querySelectorAll('#purposeChecklist input').forEach(cb => cb.checked = false);
    
    saveAndRender();
}

function renderAssets() {
    const area = document.getElementById('assetDisplayArea');
    const select = document.getElementById('expAssetSelect');
    area.innerHTML = '';
    select.innerHTML = '<option value="">출금 계좌 선택</option>';
    
    let totalBal = 0, totalPlan = 0;

    assets.forEach((asset, i) => {
        const plannedSum = asset.planned.reduce((sum, p) => sum + p.amount, 0);
        const available = asset.balance - plannedSum;
        const progress = asset.target > 0 ? Math.min((asset.balance / asset.target) * 100, 100) : 0;
        
        totalBal += asset.balance;
        totalPlan += plannedSum;

        const card = document.createElement('div');
        card.className = 'card asset-card';
        card.innerHTML = `
            <div class="asset-header">
                <div class="asset-info">
                    <h4>${asset.bank} <small>(${asset.type})</small></h4>
                    <span>용도: ${asset.purpose}</span>
                </div>
                <button class="delete-btn" onclick="if(confirm('삭제할까요?')){assets.splice(${i},1); saveAndRender();}">삭제</button>
            </div>
            <div style="display:flex; justify-content:space-between;">
                <div>현재 잔액: <strong>${asset.balance.toLocaleString()}원</strong></div>
                <div style="color:var(--success)">가용 자금: <strong>${available.toLocaleString()}원</strong></div>
            </div>
            ${asset.target > 0 ? `
                <div style="margin-top:10px; font-size:0.85rem;">저축 목표: ${asset.target.toLocaleString()}원 (${progress.toFixed(1)}%)</div>
                <div class="progress-container"><div class="progress-bar" style="width:${progress}%"></div></div>
            ` : ''}
            <div class="planned-section">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong style="font-size:0.9rem;">📍 예정 지출 내역</strong>
                    <button onclick="addPlanned(${i})" style="font-size:0.7rem; cursor:pointer;">+ 추가</button>
                </div>
                ${asset.planned.map((p, pIdx) => `
                    <div class="planned-item">
                        <span>- ${p.memo}</span>
                        <span>${p.amount.toLocaleString()}원 <button onclick="assets[${i}].planned.splice(${pIdx},1); saveAndRender();" style="border:none; color:red; cursor:pointer;">x</button></span>
                    </div>
                `).join('')}
            </div>
        `;
        area.appendChild(card);
        select.innerHTML += `<option value="${asset.id}">${asset.bank} (${asset.balance.toLocaleString()}원)</option>`;
    });

    document.getElementById('totalAssets').innerText = totalBal.toLocaleString() + '원';
    document.getElementById('totalPlanned').innerText = totalPlan.toLocaleString() + '원';
    document.getElementById('availableCash').innerText = (totalBal - totalPlan).toLocaleString() + '원';
}

function addPlanned(assetIdx) {
    const memo = prompt("예정 지출 항목명:");
    const amount = parseInt(prompt("예정 금액 (숫자만):"));
    if(memo && !isNaN(amount)) {
        assets[assetIdx].planned.push({ memo, amount });
        saveAndRender();
    }
}

// 3. 실제 지출 관리
function addExpense() {
    const assetId = parseInt(document.getElementById('expAssetSelect').value);
    const memo = document.getElementById('expMemo').value;
    const amount = parseInt(document.getElementById('expAmount').value);
    const assetIdx = assets.findIndex(a => a.id === assetId);

    if(assetIdx === -1) return alert("출금할 계좌를 선택해주세요.");
    if(!memo || isNaN(amount)) return alert("내용과 금액을 입력해주세요.");

    if(assets[assetIdx].balance < amount) {
        if(!confirm("잔액이 부족합니다. 그래도 기록하시겠습니까?")) return;
    }

    assets[assetIdx].balance -= amount;
    expenses.unshift({ // 최신 지출이 위로 오도록
        date: new Date().toLocaleDateString(), 
        bank: assets[assetIdx].bank, 
        memo, amount, assetId 
    });
    
    document.getElementById('expMemo').value = '';
    document.getElementById('expAmount').value = '';
    saveAndRender();
}

function renderExpenses() {
    const body = document.getElementById('expenseBody');
    body.innerHTML = '';
    expenses.forEach((exp, i) => {
        body.innerHTML += `
            <tr>
                <td>${exp.date}</td><td>${exp.bank}</td><td>${exp.memo}</td>
                <td style="color:red">-${exp.amount.toLocaleString()}원</td>
                <td><button class="delete-btn" onclick="deleteExpense(${i})">취소</button></td>
            </tr>
        `;
    });
}

function deleteExpense(i) {
    const exp = expenses[i];
    const aIdx = assets.findIndex(a => a.id === exp.assetId);
    if(aIdx > -1) assets[aIdx].balance += exp.amount;
    expenses.splice(i, 1);
    saveAndRender();
}

function renderAll() {
    renderTodos();
    renderAssets();
    renderExpenses();
}
