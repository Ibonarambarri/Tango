let gameInterval;
let timerInterval;
let startTime = Date.now();
let restrictions = {}; // Guardaremos las restricciones aquí
let boardSize = 6; // Tamaño predeterminado del tablero

document.addEventListener('DOMContentLoaded', () => {
    fetchBoard();
    startTimer();  // Inicia el temporizador para verificar el tablero
    startGameTimer();  // Inicia el temporizador visible en pantalla

    // Agregar botón para nueva partida
    document.getElementById('new-game').addEventListener('click', resetGame);

    // Agregar botón para mostrar pistas
    document.getElementById('hint-button').addEventListener('click', showHint);

    // Agregar botón para alternar modo de dificultad
    document.getElementById('difficulty-toggle').addEventListener('click', toggleDifficulty);
});

function fetchBoard() {
    fetch('/get-board')
        .then(response => response.json())
        .then(data => {
            restrictions = data.restrictions;  // Guardar las restricciones
            boardSize = data.board.length; // Actualizar el tamaño del tablero
            renderBoard(data.board);
            setTimeout(() => {
                renderRestrictions(); // Aplicar un pequeño retraso para que los elementos DOM estén listos
            }, 100);
        })
        .catch(error => console.error('Error al obtener el tablero:', error));
}

function renderBoard(board) {
    const boardElement = document.getElementById('game-board');
    boardElement.innerHTML = '';  // Limpia el contenido previo

    // Establecer el tamaño de la cuadrícula según el tamaño del tablero
    boardElement.style.gridTemplateColumns = `repeat(${boardSize}, 60px)`;

    board.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
            const cellElement = document.createElement('div');
            cellElement.className = 'cell';
            cellElement.dataset.row = rowIndex;
            cellElement.dataset.col = colIndex;

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
    const markers = document.querySelectorAll('.restriction');

    // Eliminar restricciones anteriores
    markers.forEach(marker => marker.remove());

    Object.keys(restrictions).forEach(key => {
        try {
            const positions = JSON.parse(key.replace(/\(/g, '[').replace(/\)/g, ']'));
            const [[row1, col1], [row2, col2]] = positions;
            const type = restrictions[key];

            // Encontrar las celdas por atributos data
            const cell1 = boardElement.querySelector(`[data-row="${row1}"][data-col="${col1}"]`);
            const cell2 = boardElement.querySelector(`[data-row="${row2}"][data-col="${col2}"]`);

            if (!cell1 || !cell2) return; // Si no se encuentran las celdas, saltar

            const marker = document.createElement('span');
            marker.className = 'restriction';
            marker.textContent = type === '=' ? '=' : 'X';

            // Cálculo de la posición mejorado
            const rect1 = cell1.getBoundingClientRect();
            const rect2 = cell2.getBoundingClientRect();
            const boardRect = boardElement.getBoundingClientRect();

            // Posición relativa al tablero
            if (row1 === row2) { // Restricción horizontal
                marker.style.left = `${Math.min(rect1.left, rect2.left) - boardRect.left + rect1.width - 8}px`;
                marker.style.top = `${rect1.top - boardRect.top + rect1.height/2 - 10}px`;
            } else { // Restricción vertical
                marker.style.left = `${rect1.left - boardRect.left + rect1.width/2 - 5}px`;
                marker.style.top = `${Math.min(rect1.top, rect2.top) - boardRect.top + rect1.height - 12}px`;
            }

            boardElement.appendChild(marker);
        } catch (e) {
            console.error('Error al renderizar restricción:', e);
        }
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

    // Comprobar inmediatamente si hay errores
    highlightErrors();
}

function highlightErrors() {
    const boardElement = document.getElementById('game-board');
    const cells = Array.from(boardElement.querySelectorAll('.cell'));
    const board = [];

    // Limpiar alertas previas
    cells.forEach(cell => cell.classList.remove('error'));

    // Construir el tablero actual
    for (let i = 0; i < boardSize; i++) {
        const row = [];
        for (let j = 0; j < boardSize; j++) {
            const cell = boardElement.querySelector(`[data-row="${i}"][data-col="${j}"]`);
            row.push(
                cell.classList.contains('sun') ? 'sun' :
                cell.classList.contains('moon') ? 'moon' : ''
            );
        }
        board.push(row);
    }

    // Comprobar errores de tres consecutivos en filas
    for (let i = 0; i < boardSize; i++) {
        for (let j = 0; j < boardSize - 2; j++) {
            if (board[i][j] && board[i][j] === board[i][j+1] && board[i][j] === board[i][j+2]) {
                for (let k = 0; k < 3; k++) {
                    boardElement.querySelector(`[data-row="${i}"][data-col="${j+k}"]`).classList.add('error');
                }
            }
        }
    }

    // Comprobar errores de tres consecutivos en columnas
    for (let j = 0; j < boardSize; j++) {
        for (let i = 0; i < boardSize - 2; i++) {
            if (board[i][j] && board[i][j] === board[i+1][j] && board[i][j] === board[i+2][j]) {
                for (let k = 0; k < 3; k++) {
                    boardElement.querySelector(`[data-row="${i+k}"][data-col="${j}"]`).classList.add('error');
                }
            }
        }
    }

    // Comprobar restricciones
    Object.keys(restrictions).forEach(key => {
        try {
            const positions = JSON.parse(key.replace(/\(/g, '[').replace(/\)/g, ']'));
            const [[row1, col1], [row2, col2]] = positions;
            const type = restrictions[key];

            const cell1Value = board[row1][col1];
            const cell2Value = board[row2][col2];

            // Solo verificar si ambas celdas tienen valores
            if (cell1Value && cell2Value) {
                const isEqual = cell1Value === cell2Value;

                if ((type === '=' && !isEqual) || (type === 'X' && isEqual)) {
                    // Marcar error en restricción
                    boardElement.querySelector(`[data-row="${row1}"][data-col="${col1}"]`).classList.add('error');
                    boardElement.querySelector(`[data-row="${row2}"][data-col="${col2}"]`).classList.add('error');
                }
            }
        } catch (e) {
            console.error('Error al verificar restricción:', e);
        }
    });

    // Comprobar balanceo en filas y columnas completas
    for (let i = 0; i < boardSize; i++) {
        const row = board[i];
        const col = board.map(r => r[i]);

        // Verificar solo filas completas
        if (!row.includes('')) {
            if (!isBalanced(row)) {
                for (let j = 0; j < boardSize; j++) {
                    boardElement.querySelector(`[data-row="${i}"][data-col="${j}"]`).classList.add('error');
                }
            }
        }

        // Verificar solo columnas completas
        if (!col.includes('')) {
            if (!isBalanced(col)) {
                for (let j = 0; j < boardSize; j++) {
                    boardElement.querySelector(`[data-row="${j}"][data-col="${i}"]`).classList.add('error');
                }
            }
        }
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
    const cells = Array.from(boardElement.querySelectorAll('.cell'));
    let isValid = true;

    // Construir el tablero actual
    const board = [];
    for (let i = 0; i < boardSize; i++) {
        const row = [];
        for (let j = 0; j < boardSize; j++) {
            const cell = boardElement.querySelector(`[data-row="${i}"][data-col="${j}"]`);
            row.push(
                cell.classList.contains('sun') ? 'sun' :
                cell.classList.contains('moon') ? 'moon' : ''
            );
        }
        board.push(row);
    }

    // Verificar si el tablero está completo
    const isComplete = board.every(row => row.every(cell => cell === 'sun' || cell === 'moon'));
    if (!isComplete) return; // Si no está completo, no seguir verificando

    // Verificar filas y columnas
    for (let i = 0; i < boardSize; i++) {
        const row = board[i];
        const col = board.map(r => r[i]);

        if (!isBalanced(row) || !isBalanced(col) || hasConsecutive(row) || hasConsecutive(col)) {
            isValid = false;
            break;
        }
    }

    // Verificar restricciones
    if (isValid && !validateRestrictions(board)) {
        isValid = false;
    }

    if (isValid && isComplete) {
        clearInterval(gameInterval);  // Detiene la verificación automática
        stopGameTimer();  // Detiene el temporizador visible
        disableBoard();  // Desactiva la interacción del tablero
        showVictoryPopup();  // Muestra el popup de victoria
    }
}

// Función para validar las restricciones
function validateRestrictions(board) {
    return Object.keys(restrictions).every(key => {
        try {
            const positions = JSON.parse(key.replace(/\(/g, '[').replace(/\)/g, ']'));
            const [[row1, col1], [row2, col2]] = positions;
            const type = restrictions[key];

            const cell1 = board[row1][col1];
            const cell2 = board[row2][col2];

            return type === '=' ? cell1 === cell2 : cell1 !== cell2;
        } catch (e) {
            console.error('Error al validar restricción:', e);
            return false;
        }
    });
}

// Verifica que la fila o columna esté balanceada
function isBalanced(arr) {
    const sunCount = arr.filter(cell => cell === 'sun').length;
    const moonCount = arr.filter(cell => cell === 'moon').length;
    return sunCount === moonCount && sunCount === boardSize / 2;
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

function disableBoard() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.onclick = null;
        cell.classList.add('disabled');
    });
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

function resetGame() {
    // Detener temporizadores
    clearInterval(gameInterval);
    clearInterval(timerInterval);

    // Reiniciar tiempo
    startTime = Date.now();

    // Obtener nuevo tablero
    fetchBoard();

    // Reiniciar temporizadores
    startTimer();
    startGameTimer();

    // Ocultar popup de victoria si está visible
    document.getElementById('victory-popup').style.display = 'none';

    // Actualizar mensaje
    updateStatusMessage('¡Nuevo juego iniciado!');
}

function showHint() {
    // Encontrar una celda vacía
    const boardElement = document.getElementById('game-board');
    const emptyCells = Array.from(boardElement.querySelectorAll('.cell')).filter(
        cell => !cell.classList.contains('sun') && !cell.classList.contains('moon')
    );

    if (emptyCells.length === 0) {
        updateStatusMessage('¡No hay celdas vacías para dar pista!');
        return;
    }

    // Seleccionar una celda aleatoria
    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const row = parseInt(randomCell.dataset.row);
    const col = parseInt(randomCell.dataset.col);

    // Hacer una petición al servidor para obtener el valor correcto
    fetch('/get-hint', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ row, col })
    })
    .then(response => response.json())
    .then(data => {
        if (data.value) {
            // Aplicar la pista
            randomCell.classList.remove('sun', 'moon');
            randomCell.classList.add(data.value);
            randomCell.textContent = data.value === 'sun' ? '☀️' : '🌙';

            // Deshabilitar la celda para que no se pueda cambiar
            randomCell.onclick = null;
            randomCell.classList.add('hint');

            updateStatusMessage('¡Pista aplicada!');

            // Comprobar errores
            highlightErrors();
        }
    })
    .catch(error => {
        console.error('Error al obtener pista:', error);

        // Aplicar una pista aleatoria en caso de error
        const value = Math.random() > 0.5 ? 'sun' : 'moon';
        randomCell.classList.add(value);
        randomCell.textContent = value === 'sun' ? '☀️' : '🌙';
        randomCell.onclick = null;
        randomCell.classList.add('hint');

        updateStatusMessage('Aplicando pista aleatoria...');
    });
}

function toggleDifficulty() {
    const difficultyButton = document.getElementById('difficulty-toggle');
    const currentDifficulty = difficultyButton.dataset.difficulty || 'normal';

    // Alternar dificultad
    const newDifficulty = currentDifficulty === 'normal' ? 'hard' : 'normal';
    difficultyButton.dataset.difficulty = newDifficulty;

    // Actualizar texto del botón
    difficultyButton.textContent = `Dificultad: ${newDifficulty === 'normal' ? 'Normal' : 'Difícil'}`;

    // Reiniciar juego con nueva dificultad
    fetch('/set-difficulty', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ difficulty: newDifficulty })
    })
    .then(() => resetGame())
    .catch(error => console.error('Error al cambiar dificultad:', error));
}

function updateStatusMessage(message) {
    const messageElement = document.getElementById('message');
    if (messageElement) {
        messageElement.textContent = message;

        // Hacer que el mensaje desaparezca después de unos segundos
        setTimeout(() => {
            messageElement.textContent = '';
        }, 3000);
    }
}