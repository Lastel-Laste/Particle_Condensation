// Particle2.js

// 파티클 클래스
class Particle {
	constructor(x, y) {
	  this.position = { x, y };
	  this.previousPosition = { x, y };
	  this.velocity = {
        x: Math.random() * 0.1 - 0.05,
        y: Math.random() * 0.1 - 0.05
      };
	  this.acceleration = {
		x: 0,
		y: 0
	  };
	  this.radius = 1;
	  this.mass = this.radius * this.radius * 1e8;
	  this.friction = 1;  // 0: 완전 미끌 1: 완전 뻣뻣
	}

	update() {
		this.velocity.x += this.acceleration.x
		this.velocity.y += this.acceleration.y
	}
}

let particles = []; // particles 변수 선언
let particle_num = 1000;
const sub_steps = 16;

let fps = 480;
let now;
let then = Date.now();
let interval = 1000/fps;
let delta;

// 파티클 초기화 함수
function init(canvas) {
  for (let i = particle_num; i--;) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const particle = new Particle(x, y);
    particles.push(particle);
  }

  initGrid(canvas);
}

// 캔버스 업데이트 함수
function update(ctx, canvas) {
	
	requestAnimationFrame(() => update(ctx, canvas));

    now = Date.now();
    delta = now - then;

    if (delta > interval) {
    	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	// 그리드 라인 그리기
	drawGridLines(ctx, canvas);
	
	for (let i = particles.length; i--;){ applyGravitation(particles[i]); }

	for (let k = sub_steps; k--;) {
		for (let i = particles.length; i--;) {
			const particle = particles[i];

			// 그리드 셀 인덱스 업데이트
			const newGridIndex = calculateGridIndex(particle.position);
				if (particle.gridIndex !== newGridIndex) {
		  			removeParticleFromGrid(particle);
		  			addParticleToGrid(particle, newGridIndex);
				}
			const nearbyParticles = getNearbyParticles(particle);

			const LOver = particle.radius - particle.position.x;
			const ROver = particle.position.x + particle.radius - canvas.width;
			const DOver = particle.radius - particle.position.y;
			const UOver = particle.position.y + particle.radius - canvas.height;
			if (LOver > 0) { particle.position.x += LOver; particle.velocity.x *= -1; }
			else if (ROver > 0) { particle.position.x -= ROver; particle.velocity.x *= -1; }
			if (DOver > 0) { particle.position.y += DOver; particle.velocity.y *= -1; }
			else if (UOver > 0) { particle.position.y -= UOver; particle.velocity.y *= -1; }
	  
			for (let j = nearbyParticles.length; j--;) {
			  const particle2 = nearbyParticles[j];
	  
			  if (particle !== particle2) {
				const dx = particle.position.x - particle2.position.x;
				const dy = particle.position.y - particle2.position.y;
				const distance = Math.sqrt(dx * dx + dy * dy);
				const overlap = particle.radius + particle2.radius - distance;
				if (overlap > 0) {
				  
				  handleCollision(particle, particle2, dx, dy, distance, overlap);
				}
			  }
			}
			particle.position.x += particle.velocity.x;
			particle.position.y += particle.velocity.y;
		}
	}
	
	for (let i = particles.length; i--;){
	  const particle = particles[i];

	  particle.update();

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
        then = now - (delta % interval);}
}

// 충돌 처리 함수
function handleCollision(particleA, particleB, dx, dy, distance, overlap) {
	const direction = { x: dx / distance, y: dy / distance };
	
	particleA.position.x += overlap * direction.x * 0.5;
	particleA.position.y += overlap * direction.y * 0.5;
	particleB.position.x -= overlap * direction.x * 0.5;
	particleB.position.y -= overlap * direction.y * 0.5;
	
	const restitution = 0.8;
	const friction = Math.sqrt(particleA.friction * particleB.friction);
	const velocityDiff_x = particleA.velocity.x - particleB.velocity.x;
	const velocityDiff_y = particleA.velocity.y - particleB.velocity.y;
	const impulse_x = (1 + restitution) * velocityDiff_x / (particleA.mass + particleB.mass);
  	const impulse_y = (1 + restitution) * velocityDiff_y / (particleA.mass + particleB.mass);

	// Apply the impulse and also consider the friction
	particleA.velocity.x -= impulse_x * particleB.mass * friction;
	particleA.velocity.y -= impulse_y * particleB.mass * friction;
	particleB.velocity.x += impulse_x * particleA.mass * friction;
	particleB.velocity.y += impulse_y * particleA.mass * friction;
}

// 만유인력 적용 함수
function applyGravitation(particle) {

	const G = 6.674 * Math.pow(10, -11); // 만유인력 상수
	const acceleration = { x: 0, y: 0 };
	for (let i = particles.length; i--;) {
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
	
	particle.acceleration.x = acceleration.x;
	particle.acceleration.y = acceleration.y;
}



// 그리드



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
