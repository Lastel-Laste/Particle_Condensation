// Grid

// 그리드(셀) 관련 변수
const gridSize = 2; // 그리드 셀의 크기
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
	const gridX = gridIndex % gridWidth;
	const gridY = Math.floor(gridIndex / gridWidth);
  
	for (let dx = -1; dx <= 1; dx++) {
	  for (let dy = -1; dy <= 1; dy++) {
		const neighborX = gridX + dx;
		const neighborY = gridY + dy;
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

function drawGridLines(ctx, canvas) {
	ctx.strokeStyle = "#FFFFFF";
	ctx.lineWidth = 0.5;
  
	for (let x = 0; x <= canvas.width; x += gridSize) {
	  ctx.beginPath();
	  ctx.moveTo(x, 0);
	  ctx.lineTo(x, canvas.height);
	  ctx.stroke();
	}
  
	for (let y = 0; y <= canvas.height; y += gridSize) {
	  ctx.beginPath();
	  ctx.moveTo(0, y);
	  ctx.lineTo(canvas.width, y);
	  ctx.stroke();
	}
  }