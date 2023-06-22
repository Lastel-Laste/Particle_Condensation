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
	  this.radius = 2.5;
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
function handleCollision(A, B, dx, dy, d, overlap) {
    const normal = = { x: dx / d, y: dy / d };
    const tangent = { x: -1*normal.y, y: normal.x};
    
    // 충돌 벡터의 정사영 계산
    const vA1 = A.velocity.x * normal.x + A.velocity.y * normal.y;
    const vB1 = B.velocity.x * normal.x + B.velocity.y * normal.y;

    // 충돌 벡터의 직교 영 계산
    const vA2 = A.velocity.x * tangent.x + A.velocity.y * tangent.y;
    const vB2 = B.velocity.x * tangent.x + B.velocity.y * tangent.y;

    // 충돌 후의 정사영 속도 계산
    const restitution = 0.9;
    const vA1Final = (vA1 * (A.mass - B.mass) + (1 + restitution) * B.mass * vB1) / (A.mass + B.mass);
    const vB1Final = (vB1 * (B.mass - A.mass) + (1 + restitution) * A.mass * vA1) / (A.mass + B.mass);

    // 충돌 후의 속도 벡터 계산
    const vA1FinalVec = vA1Final * normal;
    const vA2FinalVec = vA2 * tangent;
    const vB1FinalVec = vB1Final * normal;
    const vB2FinalVec = vB2 * tangent;

    // 충돌 후의 속도 계산
    A.velocity = vA1FinalVec + vA2FinalVec;
    B.velocity = vB1FinalVec + vB2FinalVec;

    // 충돌 후의 위치 조정
    const displacementScale = overlap / (A.mass + B.mass);
    const displacement = displacementScale * normal;

    A.position += displacement * A.mass;
    B.position -= displacement * B.mass;
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
