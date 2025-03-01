import tkinter as tk
import random

def create_board(size, mines):
    """Create the game board with mines placed randomly."""
    board = [[0 for _ in range(size)] for _ in range(size)]  # Initialize board with zeros
    mine_positions = set()

    while len(mine_positions) < mines:
        row = random.randint(0, size - 1)  # Random row for mine placement
        col = random.randint(0, size - 1)  # Random column for mine placement
        mine_positions.add((row, col))  # Add mine position to set

    for row, col in mine_positions:
        board[row][col] = 'M'  # Place mine on the board
        for r in range(max(0, row - 1), min(size, row + 2)):
            for c in range(max(0, col - 1), min(size, col + 2)):
                if board[r][c] != 'M':
                    board[r][c] += 1  # Increment adjacent cell counters

    return board, mine_positions

def reveal_cell(board, buttons, revealed, row, col):
    """Reveal a cell and handle recursive revealing if no adjacent mines."""
    if revealed[row][col]:  # Skip already revealed cells
        return

    revealed[row][col] = True  # Mark the cell as revealed
    if board[row][col] == 'M':
        buttons[row][col].config(text='M', bg='red', state='disabled')  # Display mine hit
        end_game(False, buttons)  # End game due to mine hit
        return

    buttons[row][col].config(text=str(board[row][col]) if board[row][col] > 0 else '', state='disabled')  # Show cell value

    if board[row][col] == 0:  # If no adjacent mines, reveal surrounding cells
        for r in range(max(0, row - 1), min(len(board), row + 2)):
            for c in range(max(0, col - 1), min(len(board), col + 2)):
                if not revealed[r][c]:
                    reveal_cell(board, buttons, revealed, r, c)  # Recursive reveal

def end_game(won, buttons):
    """Handle the end of the game, displaying a message and disabling all buttons."""
    for row in buttons:
        for btn in row:
            btn.config(state='disabled')  # Disable all buttons
    if won:
        print("Congratulations! You cleared the board.")  # Display win message
    else:
        print("BOOM! You hit a mine! Game over.")  # Display game-over message

def check_win(board, revealed, mine_positions):
    """Check if the player has won by revealing all non-mine cells."""
    size = len(board)
    return all(revealed[r][c] or (r, c) in mine_positions for r in range(size) for c in range(size))  # Verify win condition

def on_cell_click(board, buttons, revealed, row, col, mine_positions):
    """Handle cell click events."""
    if revealed[row][col]:  # Ignore clicks on revealed cells
        return

    reveal_cell(board, buttons, revealed, row, col)  # Reveal clicked cell
    if check_win(board, revealed, mine_positions):
        end_game(True, buttons)  # End game with win message

def create_gui(size, board, mine_positions):
    """Create the Minesweeper GUI."""
    root = tk.Tk()
    root.title("Minesweeper")  # Set window title

    buttons = [[None for _ in range(size)] for _ in range(size)]  # Initialize button grid
    revealed = [[False for _ in range(size)] for _ in range(size)]  # Track revealed cells

    def reset_game():
        """Reset the game and regenerate the board."""
        nonlocal board, mine_positions, revealed
        board, mine_positions = create_board(size, num_mines)
        revealed = [[False for _ in range(size)] for _ in range(size)]
        for r in range(size):
            for c in range(size):
                buttons[r][c].config(text="", bg='SystemButtonFace', state='normal')  # Reset UI

    reset_button = tk.Button(root, text="Reset", command=reset_game)
    reset_button.grid(row=0, column=0, columnspan=size, sticky="ew")  # Add reset button

    for row in range(size):
        for col in range(size):
            btn = tk.Button(root, text="", width=3, height=1,
                            command=lambda r=row, c=col: on_cell_click(board, buttons, revealed, r, c, mine_positions))  # Create button with click handler
            btn.grid(row=row+1, column=col)  # Place button on grid
            buttons[row][col] = btn  # Store button reference

    root.mainloop()  # Start GUI loop

def main():
    global num_mines  # Make num_mines accessible inside reset_game
    size = 8  # Board size
    num_mines = 10  # Number of mines
    board, mine_positions = create_board(size, num_mines)  # Create board and mine positions
    create_gui(size, board, mine_positions)  # Launch GUI

if __name__ == "__main__":
    main()
