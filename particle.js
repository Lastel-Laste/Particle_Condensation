// 파티클 클래스
class Particle {
	constructor(x, y) {
	  this.position = { x, y };
	  this.previousPosition = { x, y };
	  this.velocity = {
		x: Math.random() * 4 - 2,
		y: Math.random() * 4 - 2
	  };
	  this.radius = Math.random() * 3 + 2;
	  this.mass = this.radius * this.radius * 1e8;
	  this.isColliding = false;
	  this.gridIndex = -1; // 그리드 셀의 인덱스
	}

	update() {
	  this.position.x += this.velocity.x;
	  this.position.y += this.velocity.y;

	  const radius = this.radius;

	  if (this.position.x - radius < 0) {
		this.position.x = radius;
		this.velocity.x *= -1;
	  } else if (this.position.x + radius > canvas.width) {
		this.position.x = canvas.width - radius;
		this.velocity.x *= -1;
	  }
	  if (this.position.y - radius < 0) {
		this.position.y = radius;
		this.velocity.y *= -1;
	  } else if (this.position.y + radius > canvas.height) {
		this.position.y = canvas.height - radius;
		this.velocity.y *= -1;
	  }

	  // 그리드 셀 인덱스 업데이트
	  const newGridIndex = calculateGridIndex(this.position);
	  if (this.gridIndex !== newGridIndex) {
		removeParticleFromGrid(this);
		addParticleToGrid(this, newGridIndex);
	  }

	  // 주변 그리드 셀의 파티클들과 충돌 검사
	  const nearbyParticles = getNearbyParticles(this);
	  for (let i = 0; i < nearbyParticles.length; i++) {
		const particle = nearbyParticles[i];
		if (particle !== this) {
		  const distance = Math.sqrt(
			(this.position.x - particle.position.x) ** 2 +
			(this.position.y - particle.position.y) ** 2
		  );
		  const sumOfRadii = this.radius + particle.radius;
		  if (distance < sumOfRadii) {
			handleCollision(this, particle);
		  }
		}
	  }

	  this.isColliding = false;

	  // 만유인력 적용
	  applyGravitation(this);
	}
}

// 그리드(셀) 관련 변수
const gridSize = 100; // 그리드 셀의 크기
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
		  gridIndices.push(neighborIndex);
		}
	  }
	}

	return gridIndices;
}

// 충돌 처리 함수
function handleCollision(particleA, particleB) {
	const dx = particleA.position.x - particleB.position.x;
	const dy = particleA.position.y - particleB.position.y;
	const distance = Math.sqrt(dx * dx + dy * dy);
	if (distance < particleA.radius + particleB.radius) {
	  particleA.isColliding = true;
	  particleB.isColliding = true;

	  const overlap = (particleA.radius + particleB.radius) - distance;
	  const direction = { x: dx / distance, y: dy / distance };

	  particleA.position.x += overlap * direction.x * 0.5;
	  particleA.position.y += overlap * direction.y * 0.5;
	  particleB.position.x -= overlap * direction.x * 0.5;
	  particleB.position.y -= overlap * direction.y * 0.5;

	  const restitution = 0.9;
	  const velocityDiff_x =
		particleA.velocity.x - particleB.velocity.x;
	  const velocityDiff_y =
	    particleA.velocity.y - particleB.velocity.y;
	  const impulse_x =
		(1 + restitution) * velocityDiff_x / (particleA.mass + particleB.mass);
	  const impulse_y =
		(1 + restitution) * velocityDiff_y / (particleA.mass + particleB.mass);

	  particleA.velocity.x -= impulse_x * particleB.mass;
	  particleB.velocity.x += impulse_x * particleA.mass;

	  particleA.velocity.y -= impulse_y * particleB.mass;
	  particleB.velocity.y += impulse_y * particleA.mass;
	}
}

// 만유인력 적용 함수
function applyGravitation(particle) {
	const G = 6.674 * Math.pow(10, -11); // 만유인력 상수
	const acceleration = { x: 0, y: 0 };

	for (let i = 0; i < particles.length; i++) {
	  const otherParticle = particles[i];
	  if (otherParticle !== particle) {
		const dx = otherParticle.position.x - particle.position.x;
		const dy = otherParticle.position.y - particle.position.y;
		const distance = Math.sqrt(dx * dx + dy * dy);

		const gravity = (G * particle.mass * otherParticle.mass) / (distance * distance);
		const fx = gravity * dx / distance;
		const fy = gravity * dy / distance;

		acceleration.x += fx / particle.mass;
		acceleration.y += fy / particle.mass;
	  }
	}

	particle.velocity.x += acceleration.x;
	particle.velocity.y += acceleration.y;
}


// 초기화 함수
function init(canvas) {
	particles = [];

	for (let i = 0; i < 1000; i++) {
	  const x = Math.random() * canvas.width;
	  const y = Math.random() * canvas.height;
	  const particle = new Particle(x, y);
	  particles.push(particle);
	  const gridIndex = calculateGridIndex(particle.position);
	  addParticleToGrid(particle, gridIndex);
	}

	initGrid(canvas);
}

// 캔버스 업데이트 함수
function update(ctx, canvas) {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
  
	// 그리드 라인 그리기
	drawGridLines(ctx, canvas);
  
	for (let i = 0; i < particles.length; i++) {
	  const particle = particles[i];
  
	  particle.update();
  
	  if (particle.isColliding) {
		ctx.fillStyle = "#ff0000";
	  } else {
		ctx.fillStyle = "#ffffff";
	  }
  
	  ctx.beginPath();
	  ctx.arc(
		particle.position.x,
		particle.position.y,
		particle.radius,
		0,
		Math.PI * 2
	  );
	  ctx.closePath();
	  ctx.fill();
	}
  
	requestAnimationFrame(() => update(ctx, canvas));
  }

function drawGridLines(ctx, canvas) {
	ctx.strokeStyle = "#000000";
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
  
