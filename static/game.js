let gameInterval;
let timerInterval;
let startTime = Date.now();
let restrictions = {}; // Guardaremos las restricciones aquí

document.addEventListener('DOMContentLoaded', () => {
    fetchBoard();
    startTimer();  // Inicia el temporizador para verificar el tablero
    startGameTimer();  // Inicia el temporizador visible en pantalla
});

function fetchBoard() {
    fetch('/get-board')
        .then(response => response.json())
        .then(data => {
            restrictions = data.restrictions;  // Guardar las restricciones
            renderBoard(data.board);
            renderRestrictions();
        })
        .catch(error => console.error('Error al obtener el tablero:', error));
}

function renderBoard(board) {
    const boardElement = document.getElementById('game-board');
    boardElement.innerHTML = '';  // Limpia el contenido previo

    board.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
            const cellElement = document.createElement('div');
            cellElement.className = 'cell';

            if (cell === 'sun') {
                cellElement.classList.add('sun');
                cellElement.textContent = '☀️';
            } else if (cell === 'moon') {
                cellElement.classList.add('moon');
                cellElement.textContent = '🌙';
            } else {
                cellElement.onclick = () => toggleSymbol(cellElement, rowIndex, colIndex);
            }

            boardElement.appendChild(cellElement);
        });
    });
}

function renderRestrictions() {
    const boardElement = document.getElementById('game-board');

    Object.keys(restrictions).forEach(key => {
        const [[row1, col1], [row2, col2]] = JSON.parse(key.replace(/\(/g, '[').replace(/\)/g, ']'));
        const type = restrictions[key];

        const cell1 = boardElement.children[row1 * 6 + col1];
        const cell2 = boardElement.children[row2 * 6 + col2];

        const marker = document.createElement('span');
        marker.className = 'restriction';
        marker.textContent = type === '=' ? '=' : 'X';
        marker.style.position = 'absolute';
        marker.style.fontSize = '18px';
        marker.style.color = '#888';

        if (col1 === col2) {
            marker.style.left = `${cell1.offsetLeft + cell1.offsetWidth / 2 - 7}px`;
            marker.style.top = `${Math.min(cell1.offsetTop, cell2.offsetTop) + cell1.offsetHeight - 10}px`;
        } else {
            marker.style.top = `${cell1.offsetTop + cell1.offsetHeight / 2 - 7}px`;
            marker.style.left = `${Math.min(cell1.offsetLeft, cell2.offsetLeft) + cell1.offsetWidth - 7}px`;
        }

        boardElement.appendChild(marker);
    });
}

function toggleSymbol(cellElement, rowIndex, colIndex) {
    if (cellElement.classList.contains('sun')) {
        cellElement.classList.remove('sun');
        cellElement.classList.add('moon');
        cellElement.textContent = '🌙';
    } else if (cellElement.classList.contains('moon')) {
        cellElement.classList.remove('moon');
        cellElement.textContent = '';
    } else {
        cellElement.classList.add('sun');
        cellElement.textContent = '☀️';
    }
}

function startTimer() {
    gameInterval = setInterval(() => {
        checkSolution();
    }, 1000); // Verifica el tablero cada segundo
}

// Temporizador visible en pantalla
function startGameTimer() {
    const timerElement = document.getElementById('game-timer');
    timerInterval = setInterval(() => {
        const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        timerElement.textContent = `Tiempo: ${elapsedTime} segundos`;
    }, 1000); // Actualiza cada segundo
}

function stopGameTimer() {
    clearInterval(timerInterval);  // Detiene el temporizador visible
}

function checkSolution() {
    const boardElement = document.getElementById('game-board');
    const cells = Array.from(boardElement.children);
    const size = Math.sqrt(cells.length);
    let isValid = true;

    const board = [];
    for (let i = 0; i < size; i++) {
        board.push(cells.slice(i * size, (i + 1) * size).map(cell =>
            cell.classList.contains('sun') ? 'sun' :
            cell.classList.contains('moon') ? 'moon' : ''));
    }

    for (let i = 0; i < size; i++) {
        const row = board[i];
        const col = board.map(row => row[i]);

        if (!isBalanced(row) || !isBalanced(col) || hasConsecutive(row) || hasConsecutive(col)) {
            isValid = false;
            break;
        }
    }

    if (isValid && isComplete(board) && validateRestrictions(board)) {
        clearInterval(gameInterval);  // Detiene la verificación automática
        stopGameTimer();  // Detiene el temporizador visible
        disableBoard();  // Desactiva la interacción del tablero
        showVictoryPopup();  // Muestra el popup de victoria
    }
}

// Función para validar las restricciones
function validateRestrictions(board) {
    return Object.keys(restrictions).every(key => {
        const [[row1, col1], [row2, col2]] = JSON.parse(key);
        const type = restrictions[key];

        const cell1 = board[row1][col1];
        const cell2 = board[row2][col2];

        return type === '=' ? cell1 === cell2 : cell1 !== cell2;
    });
}

// Verifica que la fila o columna esté balanceada
function isBalanced(arr) {
    const sunCount = arr.filter(cell => cell === 'sun').length;
    const moonCount = arr.filter(cell => cell === 'moon').length;
    return sunCount === moonCount;
}

// Verifica que no haya más de dos consecutivos
function hasConsecutive(arr) {
    for (let i = 0; i < arr.length - 2; i++) {
        if (arr[i] && arr[i] === arr[i + 1] && arr[i] === arr[i + 2]) {
            return true;
        }
    }
    return false;
}

// Verifica que todas las celdas estén llenas
function isComplete(board) {
    return board.every(row => row.every(cell => cell === 'sun' || cell === 'moon'));
}

function showVictoryPopup() {
    const endTime = Date.now();
    const elapsedTime = Math.floor((endTime - startTime) / 1000);  // Tiempo en segundos
    document.getElementById('victory-time').innerText = `Tiempo total: ${elapsedTime} segundos`;

    const popup = document.getElementById('victory-popup');
    popup.style.display = 'flex';
}

function closeVictoryPopup() {
    const popup = document.getElementById('victory-popup');
    popup.style.display = 'none';
}

