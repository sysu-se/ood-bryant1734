# Homework 2 Evolution

## 1. 你如何实现提示功能？

我把提示能力放进了领域对象，而不是继续留在 UI 中临时计算。

- `Sudoku.getCandidates({ row, col })` 负责计算某个空格在当前局面下的候选数集合。
- `Sudoku.getCandidateHint({ row, col })` 在候选集合之外补充原因说明。
- `Sudoku.getNextHint('position')` 只提示下一步的位置和候选。
- `Sudoku.getNextHint('value')` 直接给出下一步可填写的值。
- `Game` 不重新实现候选逻辑，而是通过当前活跃局面（主局面或 explore 局面）转发这些能力，再由 store/UI 调用。

这样提示功能依赖的规则仍然属于数独本身，而不是某个 Svelte 组件。

## 2. 你认为提示功能更属于 `Sudoku` 还是 `Game`？为什么？

我认为提示能力的核心更属于 `Sudoku`。

原因是候选数和“下一步可填什么”本质上是对棋盘约束的分析，只依赖当前 9x9 局面，不依赖会话状态、暂停状态或者 UI 交互。

但 `Game` 仍然需要参与协作，因为最终用户是在一局游戏里请求提示，所以 `Game` 负责把当前活跃局面对应的 `Sudoku` 暴露出去。

## 3. 你如何实现探索模式？

我把探索模式建模成 `Game` 内部的临时分支会话，并在加分项里进一步扩展成可嵌套分支栈。

进入 explore 时：
- 记录当前活跃局面的快照作为 explore 起点；
- 新建一个独立的 explore timeline；
- 之后的 `guess / undo / redo / getSudoku` 都作用在当前最深层 explore timeline 上。

退出 explore 有两种方式：
- `discardExplore()`：直接丢弃当前 explore timeline，回到上一层 explore 或主局面；
- `commitExplore()`：把当前 explore 的最终局面作为一个新快照提交到上一层 explore 或主 history。

探索失败由领域层自动判断，而不是 UI 临时猜测：
- 如果 `Sudoku.validate()` 发现行、列或 3x3 宫内有重复数字，就认为当前探索冲突；
- 如果存在空格没有任何候选数，就认为当前探索已经走进死胡同；
- 如果局面没有显式冲突，但回溯求解器已经找不到任何完整解，也认为该探索路径无解。

`Game.getSnapshot()` 会把这些结果暴露成 `exploreFailed`、`knownFailed` 和 `canCommitExplore`。失败时禁止 `commitExplore()`，用户只能 undo 或 discard/backtrack。

为了满足“用户多路径探索到已经失败的探索路径的某一棋盘时，告知用户探索失败”，`Game` 还维护了 `failedBoards` 黑名单。每次 explore 中证明某个棋盘失败时，会用棋盘快照哈希记录下来；之后用户通过另一条路径到达同一个失败局面，或者到达一个包含该失败局面全部试填信息的后续局面，`knownFailed` 会立即变成 `true`。这个黑名单会随 `Game.toJSON()` 序列化，并在 `createGameFromJSON()` 中恢复。

## 4. 主局面与探索局面的关系是什么？

主局面与探索局面不是共享同一个可变对象，而是基于快照复制出的多个会话层次。

这样做的好处：
- 不会出现深拷贝污染；
- explore 中的试填不会直接污染主局面；
- 提交时只需要把 explore 当前快照压入上一层时间线；
- 放弃时只需要销毁当前 explore session，就能立即回到上一层起点。

## 5. 你的 history 结构在本次作业中是否发生了变化？

发生了演进。

- 普通游戏仍然使用 Homework 1 的线性 undo/redo timeline；
- explore 模式拥有独立的 timeline；
- 加分项中，explore 进一步支持栈式嵌套分支，因此整体 history 从“单一线性栈”扩展成“主线性 history + explore 分支栈”；
- 但仍然没有引入 DAG 合并，避免复杂度过高。

Undo/Redo 的兼容性原则是：普通状态下 `undo()` / `redo()` 只操作主 timeline；explore 状态下只操作当前最深层 explore timeline。`commitExplore()` 会把 explore 的最终快照作为一次普通新操作压入父 timeline，并清空父 timeline 当前位置之后的 redo 分支；`discardExplore()` 只销毁当前 explore session，不会把临时试填写回主局面。这样既保留 Homework 1 的线性 Undo/Redo 行为，又能在 explore 分支内独立撤销和重做。

## 6. Homework 1 中的哪些设计，在 Homework 2 中暴露出了局限？

Homework 1 的局限主要有两点：

1. `Sudoku` 只支持基本读写和校验，没有暴露更高层的棋盘分析能力，所以提示功能原本很容易滑回 UI 层实现。
2. `Game` 的 history 只有单一线性时间线，适合 undo/redo，但不天然适合“先分支试探，再决定提交或回滚”的 explore 场景。

这说明 Homework 1 的设计足够支撑基础行为，但在面对功能演进时，需要把“分析能力”和“临时分支状态”显式建模出来。

## 7. 如果重做一次 Homework 1，你会如何修改原设计？

如果重做 Homework 1，我会更早把设计拆成两层：

- `Sudoku` 负责局面本身和所有基于约束的分析；
- `Game` 负责会话、history、状态切换和分支。

同时我会更早把 timeline 抽象成可复用的内部结构，这样 Homework 2 在加入 explore 时就不需要从线性 history 再向外扩展一次，而可以更自然地复用同一套快照机制。

根据 Homework 1 的 review，我也把“题面 givens 不可修改”从 Svelte 适配层收回到了领域对象中。现在 `Sudoku` 会保存初始 givens，`Sudoku.guess()` / `Game.guess()` 都会拒绝覆盖 givens；`Game.getSnapshot()` 会导出 `givens` 和 `editablePositions`，Board 与 Keyboard 再根据这个领域快照判断样式和输入可用性，而不是直接用旧 `grid` store 当第二份真相源。

同时，`Game` 的 timeline 内部从“只保存 JSON”调整为“保存 `Sudoku` 克隆对象，对外序列化时再输出 JSON”。这样仍保留快照式 undo/redo 的简单语义，但当前局面不再每次通过 JSON 反序列化重建，`Game` 更像一个稳定管理 `Sudoku` 聚合的会话对象。
