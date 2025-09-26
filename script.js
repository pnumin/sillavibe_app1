document.addEventListener('DOMContentLoaded', () => {
    const board = document.getElementById('game-board');
    const scoreDisplay = document.getElementById('score');
    const rows = 8;
    const cols = 8;
    const gemColors = ['blue', 'green', 'red', 'yellow', 'purple', 'orange'];
    const gemIcons = {
        blue: 'fas fa-gem',
        green: 'fas fa-leaf',
        red: 'fas fa-heart',
        yellow: 'fas fa-star',
        purple: 'fas fa-moon',
        orange: 'fas fa-bolt'
    };
    
    let grid = []; // 게임 데이터를 저장할 배열 (DOM 요소가 아닌 데이터 객체)
    let score = 0;
    let selectedGem = null; // 선택된 보석의 {r, c} 좌표
    let isProcessing = false; // 스왑, 매칭 처리 중 다른 입력 방지 플래그

    // --- 초기화 --- //
    function initializeBoard() {
        for (let r = 0; r < rows; r++) {
            grid[r] = [];
            for (let c = 0; c < cols; c++) {
                grid[r][c] = createRandomGemColor();
            }
        }

        // 초기 보드에 매칭이 없을 때까지 다시 생성
        while (findAllMatches().length > 0) {
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    grid[r][c] = createRandomGemColor();
                }
            }
        }
        renderBoard();
    }

    function createRandomGemColor() {
        return gemColors[Math.floor(Math.random() * gemColors.length)];
    }

    // --- 렌더링 --- //
    function renderBoard() {
        board.innerHTML = '';
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (grid[r][c]) {
                    const color = grid[r][c];
                    const gem = document.createElement('div');
                    gem.classList.add('gem');
                    gem.dataset.r = r;
                    gem.dataset.c = c;

                    const icon = document.createElement('i');
                    icon.className = `${gemIcons[color]} gem-${color}`;
                    gem.appendChild(icon);
                    
                    // 선택된 보석 시각적 표시
                    if (selectedGem && selectedGem.r === r && selectedGem.c === c) {
                        gem.classList.add('selected');
                    }

                    gem.addEventListener('click', onGemClick);
                    board.appendChild(gem);
                }
            }
        }
        scoreDisplay.textContent = score;
    }

    // --- 이벤트 핸들러 --- //
    async function onGemClick(event) {
        if (isProcessing) return; // 처리 중에는 클릭 무시

        const gemElement = event.target.closest('.gem');
        if (!gemElement) return;

        const { r, c } = gemElement.dataset;
        const clickedR = parseInt(r);
        const clickedC = parseInt(c);

        if (!selectedGem) {
            // 첫 번째 보석 선택
            selectedGem = { r: clickedR, c: clickedC };
        } else {
            // 두 번째 보석 선택
            const selectedR = selectedGem.r;
            const selectedC = selectedGem.c;

            // 같은 보석 클릭 시 선택 해제
            if (selectedR === clickedR && selectedC === clickedC) {
                selectedGem = null;
            } 
            // 인접한 보석인지 확인 후 스왑
            else if (Math.abs(selectedR - clickedR) + Math.abs(selectedC - clickedC) === 1) {
                isProcessing = true;
                selectedGem = null; // 스왑 시작하면 선택 해제
                renderBoard(); // 선택 해제된 것 반영

                await swapAndProcess(selectedR, selectedC, clickedR, clickedC);
                isProcessing = false;
            } 
            // 인접하지 않은 보석 클릭 시, 새로 선택
            else {
                selectedGem = { r: clickedR, c: clickedC };
            }
        }
        renderBoard();
    }

    // --- 게임 로직 --- //
    async function swapAndProcess(r1, c1, r2, c2) {
        // 데이터 스왑
        [grid[r1][c1], grid[r2][c2]] = [grid[r2][c2], grid[r1][c1]];
        renderBoard();
        await new Promise(res => setTimeout(res, 200)); // 스왑을 보여주기 위한 지연

        let matches = findAllMatches();
        if (matches.length === 0) {
            // 매칭이 없으면 다시 스왑하여 원위치
            [grid[r1][c1], grid[r2][c2]] = [grid[r2][c2], grid[r1][c1]];
            renderBoard();
            await new Promise(res => setTimeout(res, 200));
            return;
        }

        // 매칭 처리 (연쇄 반응 포함)
        while (matches.length > 0) {
            score += matches.length * 10;
            
            // 1. 매칭된 보석 제거 (null로 표시)
            matches.forEach(gem => {
                grid[gem.r][gem.c] = null;
            });
            renderBoard();
            await new Promise(res => setTimeout(res, 300));

            // 2. 보석 아래로 내리기
            dropGems();
            renderBoard();
            await new Promise(res => setTimeout(res, 300));

            // 3. 빈 공간에 새로운 보석 채우기
            fillGems();
            renderBoard();
            await new Promise(res => setTimeout(res, 300));

            // 새로운 매칭 확인
            matches = findAllMatches();
        }
    }

    function findAllMatches() {
        const matches = new Set();
        // 가로 매칭
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols - 2; c++) {
                if (grid[r][c] && grid[r][c] === grid[r][c+1] && grid[r][c] === grid[r][c+2]) {
                    matches.add(`${r}-${c}`);
                    matches.add(`${r}-${c+1}`);
                    matches.add(`${r}-${c+2}`);
                }
            }
        }
        // 세로 매칭
        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows - 2; r++) {
                if (grid[r][c] && grid[r][c] === grid[r+1][c] && grid[r][c] === grid[r+2][c]) {
                    matches.add(`${r}-${c}`);
                    matches.add(`${r+1}-${c}`);
                    matches.add(`${r+2}-${c}`);
                }
            }
        }

        // 2x2 사각형 매칭 추가
        for (let r = 0; r < rows - 1; r++) {
            for (let c = 0; c < cols - 1; c++) {
                if (grid[r][c] &&
                    grid[r][c] === grid[r+1][c] &&
                    grid[r][c] === grid[r][c+1] &&
                    grid[r][c] === grid[r+1][c+1]) {
                    matches.add(`${r}-${c}`);
                    matches.add(`${r+1}-${c}`);
                    matches.add(`${r}-${c+1}`);
                    matches.add(`${r+1}-${c+1}`);
                }
            }
        }

        // Set을 좌표 객체 배열로 변환
        return Array.from(matches).map(coord => ({ r: parseInt(coord.split('-')[0]), c: parseInt(coord.split('-')[1]) }));
    }

    function dropGems() {
        for (let c = 0; c < cols; c++) {
            let emptyRow = -1;
            for (let r = rows - 1; r >= 0; r--) {
                if (grid[r][c] === null && emptyRow === -1) {
                    emptyRow = r;
                } else if (grid[r][c] !== null && emptyRow !== -1) {
                    grid[emptyRow][c] = grid[r][c];
                    grid[r][c] = null;
                    emptyRow--;
                }
            }
        }
    }

    function fillGems() {
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (grid[r][c] === null) {
                    grid[r][c] = createRandomGemColor();
                }
            }
        }
    }

    // --- 게임 시작 --- //
    initializeBoard();
});