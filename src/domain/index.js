const SUDOKU_SIZE = 9;
const BOX_SIZE = 3;
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function createEmptyGrid() {
	return Array.from({ length: SUDOKU_SIZE }, () => Array(SUDOKU_SIZE).fill(0));
}

function createEmptyBooleanGrid(value = false) {
	return Array.from({ length: SUDOKU_SIZE }, () => Array(SUDOKU_SIZE).fill(value));
}

function cloneGrid(grid) {
	return grid.map((row) => row.slice());
}

function cloneBooleanGrid(grid) {
	return grid.map((row) => row.slice());
}

function cloneInvalidPositions(invalidPositions) {
	return invalidPositions.map(({ row, col }) => ({ row, col }));
}

function cloneHintEntry(entry) {
	if (!entry) {
		return null;
	}

	return {
		...entry,
		candidates: Array.isArray(entry.candidates) ? entry.candidates.slice() : [],
	};
}

function cloneCandidateEntries(entries) {
	return entries.map((entry) => ({
		...entry,
		candidates: entry.candidates.slice(),
	}));
}

function cloneEditablePositions(positions) {
	return positions.map(({ row, col }) => ({ row, col }));
}

function assertGrid9x9(grid, source = 'grid') {
	if (!Array.isArray(grid) || grid.length !== SUDOKU_SIZE) {
		throw new TypeError(`${source} must be a 9x9 number matrix`);
	}

	for (let row = 0; row < SUDOKU_SIZE; row++) {
		if (!Array.isArray(grid[row]) || grid[row].length !== SUDOKU_SIZE) {
			throw new TypeError(`${source} must be a 9x9 number matrix`);
		}

		for (let col = 0; col < SUDOKU_SIZE; col++) {
			const cell = grid[row][col];
			if (!Number.isInteger(cell) || cell < 0 || cell > SUDOKU_SIZE) {
				throw new TypeError(`${source}[${row}][${col}] must be an integer in [0, 9]`);
			}
		}
	}
}

function normalizeGrid(input) {
	const grid = input ?? createEmptyGrid();
	assertGrid9x9(grid, 'input');
	return cloneGrid(grid);
}

function assertBooleanGrid9x9(grid, source = 'givens') {
	if (!Array.isArray(grid) || grid.length !== SUDOKU_SIZE) {
		throw new TypeError(`${source} must be a 9x9 boolean matrix`);
	}

	for (let row = 0; row < SUDOKU_SIZE; row++) {
		if (!Array.isArray(grid[row]) || grid[row].length !== SUDOKU_SIZE) {
			throw new TypeError(`${source} must be a 9x9 boolean matrix`);
		}

		for (let col = 0; col < SUDOKU_SIZE; col++) {
			if (typeof grid[row][col] !== 'boolean') {
				throw new TypeError(`${source}[${row}][${col}] must be a boolean`);
			}
		}
	}
}

function createGivenGridFromGrid(grid) {
	return grid.map((row) => row.map((cell) => cell !== 0));
}

function normalizeGivens(givens, grid) {
	if (givens === undefined) {
		return createGivenGridFromGrid(grid);
	}

	assertBooleanGrid9x9(givens, 'givens');
	return cloneBooleanGrid(givens);
}

function normalizeMove(move) {
	if (!move || typeof move !== 'object') {
		throw new TypeError('move must be an object');
	}

	const { row, col, value } = move;
	if (!Number.isInteger(row) || row < 0 || row >= SUDOKU_SIZE) {
		throw new RangeError('move.row must be an integer in [0, 8]');
	}
	if (!Number.isInteger(col) || col < 0 || col >= SUDOKU_SIZE) {
		throw new RangeError('move.col must be an integer in [0, 8]');
	}

	const normalizedValue = value === null ? 0 : value;
	if (!Number.isInteger(normalizedValue) || normalizedValue < 0 || normalizedValue > SUDOKU_SIZE) {
		throw new RangeError('move.value must be an integer in [0, 9] (or null)');
	}

	return { row, col, value: normalizedValue };
}

function normalizePosition(pos, source = 'position') {
	if (!pos || typeof pos !== 'object') {
		throw new TypeError(`${source} must be an object`);
	}

	const { row, col } = pos;
	if (!Number.isInteger(row) || row < 0 || row >= SUDOKU_SIZE) {
		throw new RangeError(`${source}.row must be an integer in [0, 8]`);
	}
	if (!Number.isInteger(col) || col < 0 || col >= SUDOKU_SIZE) {
		throw new RangeError(`${source}.col must be an integer in [0, 8]`);
	}

	return { row, col };
}

function formatSudoku(grid) {
	const lines = [];
	lines.push('    1 2 3   4 5 6   7 8 9');
	lines.push('  +-------+-------+-------+');

	for (let row = 0; row < SUDOKU_SIZE; row++) {
		const chunks = [];
		for (let col = 0; col < SUDOKU_SIZE; col++) {
			chunks.push(grid[row][col] === 0 ? '.' : String(grid[row][col]));
		}

		lines.push(
			`${row + 1} | ${chunks.slice(0, 3).join(' ')} | ${chunks.slice(3, 6).join(' ')} | ${chunks.slice(6, 9).join(' ')} |`,
		);

		if ((row + 1) % BOX_SIZE === 0) {
			lines.push('  +-------+-------+-------+');
		}
	}

	return lines.join('\n');
}

function getBoxStart(index) {
	return Math.floor(index / BOX_SIZE) * BOX_SIZE;
}

function getCandidatesForGrid(grid, row, col) {
	if (grid[row][col] !== 0) {
		return [];
	}

	const used = new Set();

	for (let index = 0; index < SUDOKU_SIZE; index++) {
		used.add(grid[row][index]);
		used.add(grid[index][col]);
	}

	const startRow = getBoxStart(row);
	const startCol = getBoxStart(col);
	for (let currentRow = startRow; currentRow < startRow + BOX_SIZE; currentRow++) {
		for (let currentCol = startCol; currentCol < startCol + BOX_SIZE; currentCol++) {
			used.add(grid[currentRow][currentCol]);
		}
	}

	return DIGITS.filter((digit) => !used.has(digit));
}

function collectCandidateEntries(grid) {
	const entries = [];

	for (let row = 0; row < SUDOKU_SIZE; row++) {
		for (let col = 0; col < SUDOKU_SIZE; col++) {
			if (grid[row][col] !== 0) {
				continue;
			}

			entries.push({
				row,
				col,
				candidates: getCandidatesForGrid(grid, row, col),
				reason: 'Candidates are filtered by row, column, and 3x3 box constraints.',
			});
		}
	}

	return entries;
}

function createNextHint(entry, level = 'value') {
	if (!entry) {
		return null;
	}

	const baseHint = {
		row: entry.row,
		col: entry.col,
		candidates: entry.candidates.slice(),
		reason: 'This cell has exactly one legal candidate.',
		level,
	};

	if (level === 'position') {
		return baseHint;
	}

	return {
		...baseHint,
		value: entry.candidates[0],
	};
}

function getNextHintFromGrid(grid, level = 'value') {
	const single = collectCandidateEntries(grid).find((entry) => entry.candidates.length === 1);
	return createNextHint(single, level);
}

function collectInvalidPositions(grid) {
	const invalid = new Set();

	function markRow(row) {
		const seen = new Map();
		for (let col = 0; col < SUDOKU_SIZE; col++) {
			const value = grid[row][col];
			if (value === 0) {
				continue;
			}

			if (!seen.has(value)) {
				seen.set(value, []);
			}
			seen.get(value).push({ row, col });
		}

		for (const positions of seen.values()) {
			if (positions.length > 1) {
				for (const position of positions) {
					invalid.add(`${position.row},${position.col}`);
				}
			}
		}
	}

	function markColumn(col) {
		const seen = new Map();
		for (let row = 0; row < SUDOKU_SIZE; row++) {
			const value = grid[row][col];
			if (value === 0) {
				continue;
			}

			if (!seen.has(value)) {
				seen.set(value, []);
			}
			seen.get(value).push({ row, col });
		}

		for (const positions of seen.values()) {
			if (positions.length > 1) {
				for (const position of positions) {
					invalid.add(`${position.row},${position.col}`);
				}
			}
		}
	}

	function markBox(startRow, startCol) {
		const seen = new Map();
		for (let row = startRow; row < startRow + BOX_SIZE; row++) {
			for (let col = startCol; col < startCol + BOX_SIZE; col++) {
				const value = grid[row][col];
				if (value === 0) {
					continue;
				}

				if (!seen.has(value)) {
					seen.set(value, []);
				}
				seen.get(value).push({ row, col });
			}
		}

		for (const positions of seen.values()) {
			if (positions.length > 1) {
				for (const position of positions) {
					invalid.add(`${position.row},${position.col}`);
				}
			}
		}
	}

	for (let row = 0; row < SUDOKU_SIZE; row++) {
		markRow(row);
	}

	for (let col = 0; col < SUDOKU_SIZE; col++) {
		markColumn(col);
	}

	for (let startRow = 0; startRow < SUDOKU_SIZE; startRow += BOX_SIZE) {
		for (let startCol = 0; startCol < SUDOKU_SIZE; startCol += BOX_SIZE) {
			markBox(startRow, startCol);
		}
	}

	return Array.from(invalid, (key) => {
		const [row, col] = key.split(',').map(Number);
		return { row, col };
	});
}

function analyzeGrid(grid) {
	const invalidPositions = collectInvalidPositions(grid);
	const candidates = collectCandidateEntries(grid);
	const complete = grid.every((row) => row.every((cell) => cell !== 0));
	const deadEnd = candidates.some((entry) => entry.candidates.length === 0);
	const solved = complete && invalidPositions.length === 0;
	const noSolution = invalidPositions.length > 0 || deadEnd || !hasAnySolution(grid);

	return {
		invalidPositions,
		candidates,
		complete,
		deadEnd,
		noSolution,
		solved,
	};
}

function boardKey(grid) {
	return grid.flat().join(',');
}

function gridFromBoardKey(key) {
	const values = key.split(',').map(Number);
	if (values.length !== SUDOKU_SIZE * SUDOKU_SIZE || values.some((value) => !Number.isInteger(value))) {
		return null;
	}

	const grid = createEmptyGrid();
	for (let index = 0; index < values.length; index++) {
		const value = values[index];
		if (value < 0 || value > SUDOKU_SIZE) {
			return null;
		}

		grid[Math.floor(index / SUDOKU_SIZE)][index % SUDOKU_SIZE] = value;
	}

	return grid;
}

function includesFailedBoard(currentGrid, failedGrid) {
	for (let row = 0; row < SUDOKU_SIZE; row++) {
		for (let col = 0; col < SUDOKU_SIZE; col++) {
			const failedValue = failedGrid[row][col];
			if (failedValue !== 0 && currentGrid[row][col] !== failedValue) {
				return false;
			}
		}
	}

	return true;
}

function hasAnySolution(grid) {
	if (collectInvalidPositions(grid).length > 0) {
		return false;
	}

	const workingGrid = cloneGrid(grid);

	function solve() {
		let bestEntry = null;

		for (const entry of collectCandidateEntries(workingGrid)) {
			if (entry.candidates.length === 0) {
				return false;
			}

			if (!bestEntry || entry.candidates.length < bestEntry.candidates.length) {
				bestEntry = entry;
			}
		}

		if (!bestEntry) {
			return true;
		}

		for (const candidate of bestEntry.candidates) {
			workingGrid[bestEntry.row][bestEntry.col] = candidate;

			if (solve()) {
				return true;
			}
		}

		workingGrid[bestEntry.row][bestEntry.col] = 0;
		return false;
	}

	return solve();
}

function normalizeSnapshot(snapshot, source = 'snapshot') {
	if (!snapshot || typeof snapshot !== 'object') {
		throw new TypeError(`${source} must be an object`);
	}

	const sudoku = createSudokuFromJSON(snapshot);
	return sudoku.toJSON();
}

function normalizeFailedBoards(failedBoards) {
	if (!Array.isArray(failedBoards)) {
		return [];
	}

	return failedBoards.filter((entry) => typeof entry === 'string');
}

function normalizeExploreStack(explore, source = 'explore') {
	if (!explore || typeof explore !== 'object') {
		return { stack: [], failedBoards: [] };
	}

	const stack = Array.isArray(explore.stack)
		? explore.stack
		: (explore.baseSnapshot ? [explore] : []);

	return {
		stack: stack.map((session, index) => {
			const sessionSource = `${source}.stack[${index}]`;
			const history = session.history ?? {};
			return {
				baseSnapshot: normalizeSnapshot(session.baseSnapshot, `${sessionSource}.baseSnapshot`),
				currentSnapshot: normalizeSnapshot(session.currentSnapshot ?? session.baseSnapshot, `${sessionSource}.currentSnapshot`),
				undo: Array.isArray(history.undo)
					? history.undo.map((snapshot, undoIndex) => normalizeSnapshot(snapshot, `${sessionSource}.history.undo[${undoIndex}]`))
					: [],
				redo: Array.isArray(history.redo)
					? history.redo.map((snapshot, redoIndex) => normalizeSnapshot(snapshot, `${sessionSource}.history.redo[${redoIndex}]`))
					: [],
			};
		}),
		failedBoards: normalizeFailedBoards(explore.failedBoards),
	};
}

function createTimelineState({ sudoku, undoStack = [], redoStack = [] }) {
	let timeline = [
		...undoStack.map((snapshot, index) => createSudokuFromJSON(normalizeSnapshot(snapshot, `undoStack[${index}]`))),
		sudoku.clone(),
		...redoStack.map((snapshot, index) => createSudokuFromJSON(normalizeSnapshot(snapshot, `redoStack[${index}]`))),
	];
	let cursor = undoStack.length;

	return {
		getCurrentSnapshot() {
			return timeline[cursor].toJSON();
		},

		getCurrentSudoku() {
			return timeline[cursor];
		},

		getUndoSnapshots() {
			return timeline.slice(0, cursor).map((entry) => entry.toJSON());
		},

		getRedoSnapshots() {
			return timeline.slice(cursor + 1).map((entry) => entry.toJSON());
		},

		push(nextSudoku) {
			timeline = [
				...timeline.slice(0, cursor + 1),
				nextSudoku.clone(),
			];
			cursor += 1;
		},

		undo() {
			if (cursor === 0) {
				return false;
			}

			cursor -= 1;
			return true;
		},

		redo() {
			if (cursor >= timeline.length - 1) {
				return false;
			}

			cursor += 1;
			return true;
		},

		canUndo() {
			return cursor > 0;
		},

		canRedo() {
			return cursor < timeline.length - 1;
		},
	};
}

function createExploreSession({ baseSnapshot, currentSnapshot, undo = [], redo = [] }) {
	return {
		baseSnapshot: normalizeSnapshot(baseSnapshot, 'explore.baseSnapshot'),
		state: createTimelineState({
			sudoku: createSudokuFromJSON(currentSnapshot ?? baseSnapshot),
			undoStack: undo,
			redoStack: redo,
		}),
	};
}

function serializeExploreSession(session) {
	return {
		baseSnapshot: normalizeSnapshot(session.baseSnapshot, 'explore.baseSnapshot'),
		currentSnapshot: normalizeSnapshot(session.state.getCurrentSnapshot(), 'explore.currentSnapshot'),
		history: {
			undo: session.state.getUndoSnapshots().map((snapshot) => normalizeSnapshot(snapshot)),
			redo: session.state.getRedoSnapshots().map((snapshot) => normalizeSnapshot(snapshot)),
		},
	};
}

export function createSudoku(input, options = {}) {
	let grid = normalizeGrid(input);
	const givens = normalizeGivens(options.givens, grid);

	return {
		getGrid() {
			return cloneGrid(grid);
		},

		getGivens() {
			return cloneBooleanGrid(givens);
		},

		isGiven(pos) {
			const { row, col } = normalizePosition(pos);
			return givens[row][col];
		},

		isEditable(pos) {
			return !this.isGiven(pos);
		},

		getEditablePositions() {
			const positions = [];
			for (let row = 0; row < SUDOKU_SIZE; row++) {
				for (let col = 0; col < SUDOKU_SIZE; col++) {
					if (!givens[row][col]) {
						positions.push({ row, col });
					}
				}
			}

			return positions;
		},

		guess(move) {
			const { row, col, value } = normalizeMove(move);
			if (givens[row][col]) {
				return false;
			}

			grid[row][col] = value;
			return true;
		},

		getCandidates(pos) {
			const { row, col } = normalizePosition(pos);

			return getCandidatesForGrid(grid, row, col);
		},

		getCandidateHint(pos) {
			const { row, col } = normalizePosition(pos);
			return {
				row,
				col,
				candidates: this.getCandidates(pos),
				reason: 'Candidates are filtered by row, column, and 3x3 box constraints.',
				level: 'candidate',
			};
		},

		getAllCandidates() {
			return cloneCandidateEntries(collectCandidateEntries(grid));
		},

		getNextHint(level = 'value') {
			return cloneHintEntry(getNextHintFromGrid(grid, level));
		},

		validate() {
			const analysis = analyzeGrid(grid);
			return {
				invalidPositions: cloneInvalidPositions(analysis.invalidPositions),
				complete: analysis.complete,
				solved: analysis.solved,
				deadEnd: analysis.deadEnd,
			};
		},

		clone() {
			return createSudoku(grid, { givens });
		},

		toJSON() {
			return {
				grid: cloneGrid(grid),
				givens: cloneBooleanGrid(givens),
			};
		},

		toString() {
			return formatSudoku(grid);
		},
	};
}

export function createSudokuFromJSON(json) {
	if (!json || typeof json !== 'object') {
		throw new TypeError('sudoku json must be an object');
	}

	return createSudoku(json.grid, { givens: json.givens });
}

function createGameWithState({ sudoku, undoStack = [], redoStack = [], explore = null }) {
	if (!sudoku || typeof sudoku.toJSON !== 'function' || typeof sudoku.validate !== 'function') {
		throw new TypeError('createGame expects a Sudoku-like object');
	}

	const mainState = createTimelineState({ sudoku, undoStack, redoStack });
	const normalizedExplore = normalizeExploreStack(explore);
	const failedBoards = new Set(normalizedExplore.failedBoards);
	let exploreStack = normalizedExplore.stack.map((session) => createExploreSession(session));

	function getActiveExploreSession() {
		return exploreStack.length > 0 ? exploreStack[exploreStack.length - 1] : null;
	}

	function getActiveState() {
		const session = getActiveExploreSession();
		return session ? session.state : mainState;
	}

	function getCurrentSudoku() {
		return getActiveState().getCurrentSudoku();
	}

	function isExploring() {
		return exploreStack.length > 0;
	}

	function getExploreDepth() {
		return exploreStack.length;
	}

	function matchesKnownFailedBoard(grid) {
		if (!isExploring()) {
			return false;
		}

		const key = boardKey(grid);
		if (failedBoards.has(key)) {
			return true;
		}

		for (const failedKey of failedBoards) {
			const failedGrid = gridFromBoardKey(failedKey);
			if (failedGrid && includesFailedBoard(grid, failedGrid)) {
				return true;
			}
		}

		return false;
	}

	function evaluateCurrentBoard() {
		const currentSudoku = getCurrentSudoku();
		const grid = currentSudoku.getGrid();
		const analysis = analyzeGrid(grid);
		const key = boardKey(grid);
		const knownFailed = matchesKnownFailedBoard(grid);
		const failed = knownFailed || analysis.noSolution;

		if (isExploring() && failed) {
			failedBoards.add(key);
		}

		const nextHint = getNextHintFromGrid(grid, 'value');
		const nextHintPreview = getNextHintFromGrid(grid, 'position');

		return {
			grid,
			analysis,
			key,
			knownFailed,
			failed,
			nextHint,
			nextHintPreview,
		};
	}

	function buildSnapshot() {
		const currentState = getActiveState();
		const currentSudoku = getCurrentSudoku();
		const evaluation = evaluateCurrentBoard();

		return {
			grid: cloneGrid(evaluation.grid),
			givens: currentSudoku.getGivens(),
			editablePositions: cloneEditablePositions(currentSudoku.getEditablePositions()),
			invalidPositions: cloneInvalidPositions(evaluation.analysis.invalidPositions),
			complete: evaluation.analysis.complete,
			won: evaluation.analysis.solved,
			canUndo: currentState.canUndo(),
			canRedo: currentState.canRedo(),
			exploring: isExploring(),
			exploreDepth: getExploreDepth(),
			exploreFailed: isExploring() && evaluation.failed,
			knownFailed: isExploring() && evaluation.knownFailed,
			canCommitExplore: isExploring() && !evaluation.failed,
			canDiscardExplore: isExploring(),
			nextHint: cloneHintEntry(evaluation.nextHint),
			nextHintPreview: cloneHintEntry(evaluation.nextHintPreview),
		};
	}

	return {
		getSudoku() {
			return getCurrentSudoku().clone();
		},

		getCandidates(pos) {
			return getCurrentSudoku().getCandidates(pos);
		},

		getCandidateHint(pos) {
			return getCurrentSudoku().getCandidateHint(pos);
		},

		getAllCandidates() {
			return getCurrentSudoku().getAllCandidates();
		},

		getNextHint(level = 'value') {
			return getCurrentSudoku().getNextHint(level);
		},

		isEditable(pos) {
			return getCurrentSudoku().isEditable(pos);
		},

		guess(move) {
			const { row, col, value } = normalizeMove(move);
			const currentSudoku = getCurrentSudoku();
			const currentGrid = currentSudoku.getGrid();

			if (currentGrid[row][col] === value) {
				return false;
			}

			const nextSudoku = currentSudoku.clone();
			if (!nextSudoku.guess({ row, col, value })) {
				return false;
			}

			getActiveState().push(nextSudoku);
			evaluateCurrentBoard();
			return true;
		},

		undo() {
			getActiveState().undo();
			evaluateCurrentBoard();
		},

		redo() {
			getActiveState().redo();
			evaluateCurrentBoard();
		},

		canUndo() {
			return getActiveState().canUndo();
		},

		canRedo() {
			return getActiveState().canRedo();
		},

		enterExplore() {
			exploreStack = [
				...exploreStack,
				createExploreSession({
					baseSnapshot: getActiveState().getCurrentSnapshot(),
					currentSnapshot: getActiveState().getCurrentSnapshot(),
				}),
			];
			evaluateCurrentBoard();
			return true;
		},

		isExploring() {
			return isExploring();
		},

		getExploreDepth() {
			return getExploreDepth();
		},

		discardExplore() {
			if (!isExploring()) {
				return false;
			}

			exploreStack = exploreStack.slice(0, -1);
			return true;
		},

		commitExplore() {
			if (!isExploring()) {
				return false;
			}

			const evaluation = evaluateCurrentBoard();
			if (evaluation.failed) {
				return false;
			}

			const currentSession = getActiveExploreSession();
			const targetState = exploreStack.length > 1
				? exploreStack[exploreStack.length - 2].state
				: mainState;

			targetState.push(createSudokuFromJSON(currentSession.state.getCurrentSnapshot()));
			exploreStack = exploreStack.slice(0, -1);
			return true;
		},

		getSnapshot() {
			return buildSnapshot();
		},

		toJSON() {
			return {
				sudoku: normalizeSnapshot(mainState.getCurrentSnapshot(), 'currentSnapshot'),
				history: {
					undo: mainState.getUndoSnapshots().map((snapshot) => normalizeSnapshot(snapshot)),
					redo: mainState.getRedoSnapshots().map((snapshot) => normalizeSnapshot(snapshot)),
				},
				explore: {
					stack: exploreStack.map(serializeExploreSession),
					failedBoards: Array.from(failedBoards),
				},
			};
		},
	};
}

export function createGame({ sudoku }) {
	return createGameWithState({ sudoku });
}

export function createGameFromJSON(json) {
	if (!json || typeof json !== 'object') {
		throw new TypeError('game json must be an object');
	}

	const sudoku = createSudokuFromJSON(json.sudoku);
	const undo = Array.isArray(json.history?.undo) ? json.history.undo : [];
	const redo = Array.isArray(json.history?.redo) ? json.history.redo : [];

	return createGameWithState({
		sudoku,
		undoStack: undo,
		redoStack: redo,
		explore: json.explore ?? null,
	});
}
