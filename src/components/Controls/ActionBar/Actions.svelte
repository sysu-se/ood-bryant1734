<script>
	import { candidates } from '@sudoku/stores/candidates';
	import {
		canCommitExplore,
		canDiscardExplore,
		canRedo,
		canUndo,
		exploreDepth,
		exploreFailed,
		exploring,
		knownFailed,
		lastCandidateHint,
		nextHint,
		nextHintPreview,
		userGrid,
	} from '@sudoku/stores/grid';
	import { cursor } from '@sudoku/stores/cursor';
	import { hints } from '@sudoku/stores/hints';
	import { notes } from '@sudoku/stores/notes';
	import { settings } from '@sudoku/stores/settings';
	import { keyboardDisabled } from '@sudoku/stores/keyboard';
	import { gamePaused } from '@sudoku/stores/game';

	$: hintsAvailable = $hints > 0;
	$: hasCursor = $cursor.x !== null && $cursor.y !== null;
	$: selectedValue = hasCursor ? $userGrid[$cursor.y][$cursor.x] : null;
	$: canShowCandidates = !$keyboardDisabled && hintsAvailable && hasCursor && selectedValue === 0;
	$: canPreviewNextHint = !$gamePaused && hintsAvailable && $nextHintPreview !== null;
	$: canApplyNextHint = !$gamePaused && hintsAvailable && $nextHint !== null;

	function handleCandidateHint() {
		if (canShowCandidates) {
			userGrid.showCandidates($cursor);
			hints.useHint();
		}
	}

	function handlePreviewNextHint() {
		if (canPreviewNextHint) {
			userGrid.previewNextHint();
		}
	}

	function handleNextHint() {
		if (canApplyNextHint) {
			userGrid.applyNextHint();
		}
	}

	function handleUndo() {
		if (!$gamePaused && $canUndo) {
			userGrid.undo();
		}
	}

	function handleRedo() {
		if (!$gamePaused && $canRedo) {
			userGrid.redo();
		}
	}

	function handleEnterExplore() {
		if (!$gamePaused) {
			userGrid.enterExplore();
		}
	}

	function handleCommitExplore() {
		if (!$gamePaused && $canCommitExplore) {
			userGrid.commitExplore();
		}
	}

	function handleDiscardExplore() {
		if (!$gamePaused && $canDiscardExplore) {
			userGrid.discardExplore();
		}
	}
</script>

<div class="action-panel space-y-3">
	<div class="action-buttons space-x-3">
		<button class="btn btn-round" disabled={$gamePaused || !$canUndo} on:click={handleUndo} title="Undo">
			<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
			</svg>
		</button>

		<button class="btn btn-round" disabled={$gamePaused || !$canRedo} on:click={handleRedo} title="Redo">
			<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10h-10a8 8 90 00-8 8v2M21 10l-6 6m6-6l-6-6" />
			</svg>
		</button>

		<button class="btn btn-round btn-badge" disabled={!canShowCandidates} on:click={handleCandidateHint} title="Show candidates ({$hints})">
			<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
			</svg>

			{#if $settings.hintsLimited}
				<span class="badge" class:badge-primary={hintsAvailable}>{$hints}</span>
			{/if}
		</button>

		<button class="btn btn-round btn-text" disabled={!canPreviewNextHint} on:click={handlePreviewNextHint} title="Preview next hint position">
			Hint
		</button>

		<button class="btn btn-round btn-text" disabled={!canApplyNextHint} on:click={handleNextHint} title="Apply next hint value">
			Apply
		</button>

		<button class="btn btn-round btn-badge" on:click={notes.toggle} title="Notes ({$notes ? 'ON' : 'OFF'})">
			<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
			</svg>

			<span class="badge tracking-tighter" class:badge-primary={$notes}>{$notes ? 'ON' : 'OFF'}</span>
		</button>
	</div>

	<div class="explore-row space-x-3">
		<button class="btn btn-round btn-text" disabled={$gamePaused} on:click={handleEnterExplore} title="Enter nested explore mode">
			{#if $exploring}
				Branch
			{:else}
				Explore
			{/if}
		</button>
		{#if $exploring}
			<button class="btn btn-round btn-text" disabled={$gamePaused || !$canCommitExplore} on:click={handleCommitExplore} title="Commit explore result">
				Commit
			</button>
			<button class="btn btn-round btn-text" disabled={$gamePaused || !$canDiscardExplore} on:click={handleDiscardExplore} title="Discard explore result">
				Backtrack
			</button>
		{/if}
	</div>

	{#if $lastCandidateHint}
		<div class="hint-status">
			Candidates at ({$lastCandidateHint.col + 1}, {$lastCandidateHint.row + 1}): {$lastCandidateHint.candidates.join(', ') || 'none'}. {$lastCandidateHint.reason}
		</div>
	{/if}

	{#if $nextHintPreview}
		<div class="hint-status">
			Next hint points to ({$nextHintPreview.col + 1}, {$nextHintPreview.row + 1}). {$nextHintPreview.reason}
		</div>
	{/if}

	{#if $exploring}
		<div class="explore-status" class:explore-status-error={$exploreFailed}>
			Depth {$exploreDepth}.
			{#if $knownFailed}
				Known failed explore path.
			{:else if $exploreFailed}
				Explore path failed.
			{:else}
				Explore mode active.
			{/if}
		</div>
	{/if}
</div>

<style>
	.action-panel {
		@apply flex flex-col;
	}

	.action-buttons {
		@apply flex flex-wrap justify-evenly self-end;
	}

	.explore-row {
		@apply flex justify-center;
	}

	.btn-badge {
		@apply relative;
	}

	.btn-text {
		@apply px-4;
	}

	.badge {
		min-height: 20px;
		min-width:  20px;
		@apply p-1 rounded-full leading-none text-center text-xs text-white bg-gray-600 inline-block absolute top-0 left-0;
	}

	.badge-primary {
		@apply bg-primary;
	}

	.hint-status {
		@apply text-center text-sm text-gray-700;
	}

	.explore-status {
		@apply text-center text-sm text-primary;
	}

	.explore-status-error {
		@apply text-red-600;
	}
</style>
