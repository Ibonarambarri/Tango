from flask import Flask, render_template, jsonify
import random

app = Flask(__name__)

# Función para verificar si un tablero cumple con las reglas
def is_valid_board(board):
    size = len(board)
    for row in board:
        if row.count('sun') != size // 2 or row.count('moon') != size // 2:
            return False
        for i in range(1, size - 1):
            if row[i - 1] == row[i] == row[i + 1]:  # Tres consecutivos en fila
                return False
    for col in range(size):
        col_elements = [board[row][col] for row in range(size)]
        if col_elements.count('sun') != size // 2 or col_elements.count('moon') != size // 2:
            return False
        for i in range(1, size - 1):
            if col_elements[i - 1] == col_elements[i] == col_elements[i + 1]:  # Tres consecutivos en columna
                return False
    return True

# Función para generar un tablero válido
def generate_valid_board(size=6):
    while True:
        board = []
        for _ in range(size):
            row = ['sun'] * (size // 2) + ['moon'] * (size // 2)
            random.shuffle(row)
            board.append(row)
        if is_valid_board(board):
            return board

# Función para ocultar algunos elementos del tablero
def hide_elements(board, empty_percentage=0.6):
    size = len(board)
    board_copy = [row[:] for row in board]  # Crear una copia del tablero

    num_elements_to_hide = int(size * size * empty_percentage)  # Calcula el número de celdas a vaciar
    empty_positions = random.sample([(i, j) for i in range(size) for j in range(size)], num_elements_to_hide)

    for i, j in empty_positions:
        board_copy[i][j] = ''  # Vacía la celda en la posición seleccionada

    return board_copy

# Generar restricciones compatibles con el tablero
def generate_restrictions(board, max_restrictions=6):
    size = len(board)
    restrictions = {}
    restriction_positions = random.sample([(i, j, 'horizontal') for i in range(size) for j in range(size - 1)] +
                                          [(i, j, 'vertical') for i in range(size - 1) for j in range(size)],
                                          max_restrictions)

    for (i, j, orientation) in restriction_positions:
        if orientation == 'horizontal':
            if board[i][j] == board[i][j + 1]:
                restrictions[str(((i, j), (i, j + 1)))] = '='  # Restricción de igualdad
            else:
                restrictions[str(((i, j), (i, j + 1)))] = 'X'  # Restricción de diferencia
        else:
            if board[i][j] == board[i + 1][j]:
                restrictions[str(((i, j), (i + 1, j)))] = '='  # Restricción de igualdad
            else:
                restrictions[str(((i, j), (i + 1, j)))] = 'X'  # Restricción de diferencia

    return restrictions

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get-board', methods=['GET'])
def get_board():
    board = generate_valid_board()          # Generar tablero resuelto
    restrictions = generate_restrictions(board)  # Generar restricciones
    incomplete_board = hide_elements(board)  # Crear tablero incompleto ocultando elementos
    return jsonify({'board': incomplete_board, 'restrictions': restrictions})

if __name__ == '__main__':
    app.run(debug=True)
