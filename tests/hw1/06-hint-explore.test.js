import { describe, expect, it } from 'vitest'
import { loadDomainApi, makePuzzle } from './helpers/domain-api.js'

describe('HW2 hints and explore mode', () => {
  it('returns candidate numbers for an empty cell through the domain API', async () => {
    const { createSudoku } = await loadDomainApi()
    const sudoku = createSudoku(makePuzzle())

    expect(sudoku.getCandidates({ row: 0, col: 2 })).toEqual([1, 2, 4])
  })

  it('returns a candidate hint with an explanation', async () => {
    const { createSudoku } = await loadDomainApi()
    const sudoku = createSudoku(makePuzzle())

    expect(sudoku.getCandidateHint({ row: 0, col: 2 })).toEqual({
      row: 0,
      col: 2,
      candidates: [1, 2, 4],
      reason: 'Candidates are filtered by row, column, and 3x3 box constraints.',
      level: 'candidate',
    })
  })

  it('supports multi-level next hints', async () => {
    const { createSudoku } = await loadDomainApi()
    const sudoku = createSudoku(makePuzzle())

    expect(sudoku.getNextHint('position')).toEqual({
      row: 4,
      col: 4,
      candidates: [5],
      reason: 'This cell has exactly one legal candidate.',
      level: 'position',
    })
    expect(sudoku.getNextHint('value')).toEqual({
      row: 4,
      col: 4,
      value: 5,
      candidates: [5],
      reason: 'This cell has exactly one legal candidate.',
      level: 'value',
    })
  })

  it('can backtrack to the start of an explore session', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    expect(game.enterExplore()).toBe(true)
    game.guess({ row: 0, col: 2, value: 4 })
    game.guess({ row: 1, col: 1, value: 7 })

    expect(game.getSudoku().getGrid()[0][2]).toBe(4)
    expect(game.discardExplore()).toBe(true)
    expect(game.getSudoku().getGrid()[0][2]).toBe(0)
    expect(game.getSudoku().getGrid()[1][1]).toBe(0)
  })

  it('detects failed explore states caused by conflicts', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.enterExplore()
    game.guess({ row: 0, col: 2, value: 5 })

    const snapshot = game.getSnapshot()
    expect(snapshot.exploring).toBe(true)
    expect(snapshot.exploreFailed).toBe(true)
  })

  it('remembers a failed explore path after serialization', async () => {
    const { createGame, createGameFromJSON, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.enterExplore()
    game.guess({ row: 0, col: 2, value: 5 })

    const restored = createGameFromJSON(JSON.parse(JSON.stringify(game.toJSON())))
    expect(restored.getSnapshot().knownFailed).toBe(true)
  })

  it('warns when another branch reaches a remembered failed board', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.enterExplore()
    game.guess({ row: 0, col: 2, value: 5 })
    expect(game.getSnapshot().exploreFailed).toBe(true)

    game.undo()
    expect(game.getSnapshot().knownFailed).toBe(false)

    game.guess({ row: 0, col: 2, value: 5 })
    const snapshot = game.getSnapshot()
    expect(snapshot.exploreFailed).toBe(true)
    expect(snapshot.knownFailed).toBe(true)
  })

  it('keeps main undo redo compatible after explore commit and discard', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.guess({ row: 0, col: 2, value: 4 })
    game.enterExplore()
    game.guess({ row: 1, col: 1, value: 7 })
    expect(game.commitExplore()).toBe(true)

    expect(game.getSudoku().getGrid()[0][2]).toBe(4)
    expect(game.getSudoku().getGrid()[1][1]).toBe(7)

    game.undo()
    expect(game.getSudoku().getGrid()[0][2]).toBe(4)
    expect(game.getSudoku().getGrid()[1][1]).toBe(0)

    game.redo()
    expect(game.getSudoku().getGrid()[1][1]).toBe(7)

    game.enterExplore()
    game.guess({ row: 2, col: 0, value: 1 })
    expect(game.discardExplore()).toBe(true)

    expect(game.getSudoku().getGrid()[2][0]).toBe(0)
    expect(game.canRedo()).toBe(false)

    game.undo()
    expect(game.getSudoku().getGrid()[1][1]).toBe(0)
  })

  it('supports nested explore branches with independent undo redo', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.enterExplore()
    game.guess({ row: 0, col: 2, value: 4 })
    game.enterExplore()
    game.guess({ row: 1, col: 1, value: 7 })

    expect(game.getSnapshot().exploreDepth).toBe(2)
    expect(game.canUndo()).toBe(true)

    game.undo()
    expect(game.getSudoku().getGrid()[1][1]).toBe(0)
    game.redo()
    expect(game.getSudoku().getGrid()[1][1]).toBe(7)

    expect(game.commitExplore()).toBe(true)
    expect(game.getSnapshot().exploreDepth).toBe(1)
    expect(game.getSudoku().getGrid()[1][1]).toBe(7)
  })
})
