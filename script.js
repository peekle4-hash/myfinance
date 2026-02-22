// 탭 전환
function openTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    event.currentTarget.classList.add('active');
}

// "기타" 선택 시 입력창 표시
function toggleOtherInput(selectId, otherId) {
    const select = document.getElementById(selectId);
    const otherInput = document.getElementById(otherId);
    if (select.value === '기타') {
        otherInput.style.display = 'block';
    } else {
        otherInput.style.display = 'none';
    }
}

// --- 할 일 관리 ---
let todos = JSON.parse(localStorage.getItem('todos')) || [];

function renderTodos() {
    const list = document.getElementById('todoList');
    list.innerHTML = '';
    todos.forEach((todo, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${index + 1}.</span>
            <input type="checkbox" ${todo.completed ? 'checked' : ''} onchange="toggleTodo(${index})">
            <span class="todo-text ${todo.completed ? 'checked' : ''}">${todo.text}</span>
            <button onclick="deleteTodo(${index})" style="margin-left:auto; background:var(--danger); border:none; border-radius:5px; color:white; cursor:pointer; padding:5px 10px;">삭제</button>
        `;
        list.appendChild(li);
    });
    localStorage.setItem('todos', JSON.stringify(todos));
}

function addTodo() {
    const input = document.getElementById('todoInput');
    if (input.value) {
        todos.push({ text: input.value, completed: false });
        input.value = '';
        renderTodos();
    }
}

function toggleTodo(index) {
    todos[index].completed = !todos[index].completed;
    renderTodos();
}

function deleteTodo(index) {
    todos.splice(index, 1);
    renderTodos();
}

// --- 자산 관리 ---
let assets = JSON.parse(localStorage.getItem('assets')) || [];

function renderAssets() {
    const body = document.getElementById('assetBody');
    body.innerHTML = '';
    
    assets.forEach((asset, index) => {
        const yearlyInterest = Math.floor(asset.balance * (asset.rate / 100)); // 이자 계산
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${asset.bank}</strong><br><small>${asset.type}</small></td>
            <td>${asset.purpose}</td>
            <td style="color:#2d3436; font-weight:bold;">${Number(asset.balance).toLocaleString()}원</td>
            <td>${asset.rate}%</td>
            <td style="color:#0984e3;">+${yearlyInterest.toLocaleString()}원</td>
            <td style="color:#d63031;">${Number(asset.totalSpent || 0).toLocaleString()}원</td>
            <td>
                <input type="number" class="expense-input" id="exp-${index}" placeholder="금액">
                <button onclick="spendMoney(${index})" style="background:#a2d2ff; border:none; border-radius:5px; cursor:pointer;">기록</button>
            </td>
            <td><button onclick="deleteAsset(${index})" style="background:#fab1a0; border:none; border-radius:5px; cursor:pointer;">삭제</button></td>
        `;
        body.appendChild(tr);
    });
    localStorage.setItem('assets', JSON.stringify(assets));
}

function addAsset() {
    const bank = document.getElementById('bankSelect').value === '기타' ? document.getElementById('bankOther').value : document.getElementById('bankSelect').value;
    const type = document.getElementById('typeSelect').value === '기타' ? document.getElementById('typeOther').value : document.getElementById('typeSelect').value;
    const purpose = document.getElementById('purposeSelect').value === '기타' ? document.getElementById('purposeOther').value : document.getElementById('purposeSelect').value;
    const balance = document.getElementById('accBalance').value;
    const rate = document.getElementById('accRate').value || 0;

    if (bank && type && balance) {
        assets.push({
            bank, type, purpose, 
            balance: parseInt(balance), 
            rate: parseFloat(rate),
            totalSpent: 0
        });
        renderAssets();
        // 입력창 초기화
        ['bankOther', 'typeOther', 'purposeOther'].forEach(id => document.getElementById(id).style.display = 'none');
        document.querySelectorAll('.asset-grid input, .asset-grid select').forEach(el => el.value = '');
    } else {
        alert("은행, 계좌종류, 현재 금액은 필수 입력 사항입니다.");
    }
}

function spendMoney(index) {
    const amountInput = document.getElementById(`exp-${index}`);
    const amount = parseInt(amountInput.value);
    
    if (amount) {
        assets[index].balance -= amount;
        assets[index].totalSpent = (assets[index].totalSpent || 0) + amount;
        renderAssets();
        amountInput.value = '';
    }
}

function deleteAsset(index) {
    if(confirm("정말 삭제하시겠습니까?")) {
        assets.splice(index, 1);
        renderAssets();
    }
}

// 초기 로드
renderTodos();
renderAssets();
