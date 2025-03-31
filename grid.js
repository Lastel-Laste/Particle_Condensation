// Grid.js - 최적화된 공간 분할 그리드

// 그리드(셀) 관련 변수
const gridSize = 8; // 그리드 셀의 크기
let gridWidth; // 그리드 너비
let gridHeight; // 그리드 높이
let grid; // 그리드 배열

// 그리드(셀) 초기화
function initGrid(canvas) {
	gridWidth = Math.ceil(canvas.width / gridSize);
	gridHeight = Math.ceil(canvas.height / gridSize);
	grid = new Array(gridWidth * gridHeight);

	// 각 그리드 셀에 빈 배열 할당
	for (let i = 0; i < grid.length; i++) {
	  grid[i] = [];
	}
}

// 파티클을 그리드에 할당
function addParticleToGrid(particle, gridIndex) {
	if (gridIndex >= 0 && gridIndex < grid.length) {
		grid[gridIndex].push(particle);
		particle.gridIndex = gridIndex;
	}
}

// 파티클을 그리드에서 제거
function removeParticleFromGrid(particle) {
	const gridIndex = particle.gridIndex;
	if (grid[gridIndex]) {
	  const particleIndex = grid[gridIndex].indexOf(particle);
	  if (particleIndex !== -1) {
		grid[gridIndex].splice(particleIndex, 1);
	  }
	}
	particle.gridIndex = -1;
}

// 파티클의 위치를 기반으로 그리드 셀의 인덱스 계산
function calculateGridIndex(position) {
	const gridX = Math.floor(position.x / gridSize);
	const gridY = Math.floor(position.y / gridSize);
	
	// 범위 체크
	if (gridX < 0 || gridX >= gridWidth || gridY < 0 || gridY >= gridHeight) {
		return -1;
	}
	
	return gridX + gridY * gridWidth;
}

// 주변 그리드 셀에서 파티클들을 가져옴
function getNearbyParticles(particle) {
	const gridIndices = getSurroundingGridIndices(particle);
	const nearbyParticles = [];
	for (let i = 0; i < gridIndices.length; i++) {
	  const gridIndex = gridIndices[i];
	  const particlesInGrid = grid[gridIndex];
	  if (particlesInGrid) {
		nearbyParticles.push(...particlesInGrid);
	  }
	}
	return nearbyParticles;
}

// 주변 그리드 셀의 인덱스 계산
function getSurroundingGridIndices(particle) {
	const gridIndices = [];
	const gridIndex = particle.gridIndex;
	
	// 유효한 그리드 인덱스인지 확인
	if (gridIndex < 0 || gridIndex >= grid.length) {
		return gridIndices;
	}
	
	const gridX = gridIndex % gridWidth;
	const gridY = Math.floor(gridIndex / gridWidth);
  
	// 9개 인접 셀 검색 (자기 자신 포함)
	for (let dx = -1; dx <= 1; dx++) {
	  for (let dy = -1; dy <= 1; dy++) {
		const neighborX = gridX + dx;
		const neighborY = gridY + dy;
		// 유효한 그리드 셀만 포함
		if (neighborX >= 0 && neighborX < gridWidth && neighborY >= 0 && neighborY < gridHeight) {
		  const neighborIndex = neighborX + neighborY * gridWidth;
		  if (grid[neighborIndex] && grid[neighborIndex].length > 0) {
			gridIndices.push(neighborIndex);
		  }
		}
	  }
	}
  
	return gridIndices;
}

// 그리드 라인 그리기 - 밀도에 따른 시각화
function drawGridLines(ctx, canvas) {
	// 기본 그리드 라인 (연한 색상)
	ctx.strokeStyle = "rgba(100, 100, 100, 0.2)";
	ctx.lineWidth = 0.2;
  
	// 가로 그리드 라인
	for (let y = 0; y <= canvas.height; y += gridSize) {
		ctx.beginPath();
		ctx.moveTo(0, y);
		ctx.lineTo(canvas.width, y);
		ctx.stroke();
	}
	
	// 세로 그리드 라인
	for (let x = 0; x <= canvas.width; x += gridSize) {
		ctx.beginPath();
		ctx.moveTo(x, 0);
		ctx.lineTo(x, canvas.height);
		ctx.stroke();
	}
	
	// 입자 밀도가 높은 셀 표시 (선택적으로 활성화)
	const showDensityCells = false;
	
	if (showDensityCells) {
		// 셀 밀도에 따라 색상 표시
		for (let y = 0; y < gridHeight; y++) {
			for (let x = 0; x < gridWidth; x++) {
				const gridIndex = x + y * gridWidth;
				const cellParticles = grid[gridIndex];
				
				// 입자가 있는 셀만 표시
				if (cellParticles && cellParticles.length > 0) {
					const density = Math.min(cellParticles.length / 5, 1.0); // 5개 이상이면 최대 밀도
					
					// 밀도에 따라 색상 설정 (낮음: 파랑, 높음: 빨강)
					const r = Math.floor(255 * density);
					const b = Math.floor(255 * (1 - density));
					
					ctx.fillStyle = `rgba(${r}, 0, ${b}, 0.1)`;
					ctx.fillRect(x * gridSize, y * gridSize, gridSize, gridSize);
				}
			}
		}
	}
}
