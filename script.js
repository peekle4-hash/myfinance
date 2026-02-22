// 탭 전환 기능
function openTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    event.currentTarget.classList.add('active');
}

// 1. 할 일 목록 기능
let todos = JSON.parse(localStorage.getItem('todos')) || [];

function renderTodos() {
    const list = document.getElementById('todoList');
    list.innerHTML = '';
    todos.forEach((todo, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span style="margin-right:10px">${index + 1}.</span>
            <input type="checkbox" ${todo.completed ? 'checked' : ''} onchange="toggleTodo(${index})">
            <span class="todo-text ${todo.completed ? 'checked' : ''}">${todo.text}</span>
            <button onclick="deleteTodo(${index})" style="margin-left:auto; background:#ff9a9e">삭제</button>
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

// 2. 자산 관리 기능
let assets = JSON.parse(localStorage.getItem('assets')) || [];

function renderAssets() {
    const body = document.getElementById('assetBody');
    body.innerHTML = '';
    assets.forEach((asset, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${asset.name}</td>
            <td>${asset.purpose}</td>
            <td>${Number(asset.balance).toLocaleString()}원</td>
            <td>
                <input type="number" class="expense-input" id="exp-${index}" placeholder="금액">
                <button onclick="spendMoney(${index})">지출</button>
            </td>
            <td><button onclick="deleteAsset(${index})" style="background:#ff9a9e">삭제</button></td>
        `;
        body.appendChild(tr);
    });
    localStorage.setItem('assets', JSON.stringify(assets));
}

function addAsset() {
    const name = document.getElementById('accName').value;
    const purpose = document.getElementById('accPurpose').value;
    const balance = document.getElementById('accBalance').value;

    if (name && balance) {
        assets.push({ name, purpose, balance: parseInt(balance) });
        renderAssets();
        document.getElementById('accName').value = '';
        document.getElementById('accPurpose').value = '';
        document.getElementById('accBalance').value = '';
    }
}

function spendMoney(index) {
    const amount = document.getElementById(`exp-${index}`).value;
    if (amount) {
        assets[index].balance -= parseInt(amount);
        renderAssets();
    }
}

function deleteAsset(index) {
    assets.splice(index, 1);
    renderAssets();
}

// 초기 로드 시 실행
renderTodos();
renderAssets();
