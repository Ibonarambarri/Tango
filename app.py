from flask import Flask, render_template, jsonify, request, session
import random

app = Flask(__name__)
app.secret_key = 'tango_game_secret_key'  # Clave necesaria para usar sesiones

# Configuración predeterminada
DEFAULT_BOARD_SIZE = 6
DEFAULT_EMPTY_PERCENTAGE = 0.6


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
def generate_valid_board(size=DEFAULT_BOARD_SIZE):
    max_attempts = 100  # Limitar intentos para evitar bucles infinitos
    attempts = 0

    while attempts < max_attempts:
        board = []
        for _ in range(size):
            row = ['sun'] * (size // 2) + ['moon'] * (size // 2)
            random.shuffle(row)
            board.append(row)

        if is_valid_board(board):
            return board

        attempts += 1

    # Si no podemos generar un tablero válido después de muchos intentos, usar un enfoque más directo
    return generate_simple_valid_board(size)


# Función alternativa para generar un tablero válido
def generate_simple_valid_board(size=DEFAULT_BOARD_SIZE):
    # Crear un tablero base
    board = []

    # Alternar entre filas que comienzan con sol y luna
    for i in range(size):
        row = []
        start = 'sun' if i % 2 == 0 else 'moon'

        for j in range(size):
            # Alternar entre sol y luna
            element = start if j % 2 == 0 else ('moon' if start == 'sun' else 'sun')
            row.append(element)

        board.append(row)

    # Mezclar el tablero manteniendo las reglas
    # Intercambiar algunas filas y columnas para agregar aleatoriedad
    for _ in range(size):
        # Seleccionar dos filas aleatorias
        row1, row2 = random.sample(range(size), 2)
        # Intercambiar filas
        board[row1], board[row2] = board[row2], board[row1]

        # Seleccionar dos columnas aleatorias
        col1, col2 = random.sample(range(size), 2)
        # Intercambiar columnas
        for i in range(size):
            board[i][col1], board[i][col2] = board[i][col2], board[i][col1]

    return board


# Función para ocultar algunos elementos del tablero
def hide_elements(board, empty_percentage=DEFAULT_EMPTY_PERCENTAGE):
    size = len(board)
    board_copy = [row[:] for row in board]  # Crear una copia del tablero

    num_elements_to_hide = int(size * size * empty_percentage)  # Calcula el número de celdas a vaciar
    empty_positions = random.sample([(i, j) for i in range(size) for j in range(size)], num_elements_to_hide)

    for i, j in empty_positions:
        board_copy[i][j] = ''  # Vacía la celda en la posición seleccionada

    return board_copy


# Generar restricciones compatibles con el tablero
def generate_restrictions(board, max_restrictions=None):
    size = len(board)
    if max_restrictions is None:
        max_restrictions = size * 2  # Por defecto, 2 restricciones por fila en promedio

    restrictions = {}
    all_possible_restrictions = (
            [(i, j, 'horizontal') for i in range(size) for j in range(size - 1)] +
            [(i, j, 'vertical') for i in range(size - 1) for j in range(size)]
    )

    # Mezclar las restricciones potenciales
    random.shuffle(all_possible_restrictions)

    # Elegir un subconjunto aleatorio de restricciones
    restriction_positions = all_possible_restrictions[:max_restrictions]

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
    # Inicializar configuración en la sesión si no existe
    if 'difficulty' not in session:
        session['difficulty'] = 'normal'

    return render_template('index.html')


@app.route('/get-board', methods=['GET'])
def get_board():
    difficulty = session.get('difficulty', 'normal')
    board_size = DEFAULT_BOARD_SIZE

    if difficulty == 'hard':
        # En dificultad difícil, mostrar menos celdas y menos restricciones
        empty_percentage = 0.75
        max_restrictions = board_size
    else:
        # En dificultad normal, mostrar más celdas y más restricciones
        empty_percentage = 0.6
        max_restrictions = board_size * 2

    board = generate_valid_board(board_size)  # Generar tablero resuelto

    # Guardar tablero completo en la sesión para usar en pistas
    session['solved_board'] = board

    restrictions = generate_restrictions(board, max_restrictions)  # Generar restricciones
    incomplete_board = hide_elements(board, empty_percentage)  # Crear tablero incompleto ocultando elementos

    return jsonify({'board': incomplete_board, 'restrictions': restrictions})


@app.route('/get-hint', methods=['POST'])
def get_hint():
    data = request.json
    row = data.get('row')
    col = data.get('col')

    solved_board = session.get('solved_board')

    if solved_board and row is not None and col is not None:
        try:
            value = solved_board[row][col]
            return jsonify({'value': value})
        except (IndexError, TypeError):
            return jsonify({'error': 'Posición inválida'}), 400

    return jsonify({'error': 'No hay solución disponible'}), 400


@app.route('/set-difficulty', methods=['POST'])
def set_difficulty():
    data = request.json
    difficulty = data.get('difficulty', 'normal')

    # Guardar en la sesión
    session['difficulty'] = difficulty

    return jsonify({'success': True})


@app.route('/check-solution', methods=['POST'])
def check_solution():
    data = request.json
    user_board = data.get('board')

    if not user_board:
        return jsonify({'valid': False, 'message': 'No se proporcionó un tablero'})

    valid = is_valid_board(user_board)

    return jsonify({
        'valid': valid,
        'message': '¡Correcto! Has resuelto el tablero.' if valid else 'Incorrecto. Revisa las reglas y vuelve a intentarlo.'
    })


if __name__ == '__main__':
    app.run(debug=True)