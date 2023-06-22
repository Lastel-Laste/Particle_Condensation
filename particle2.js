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
function handleCollision(particleA, particleB, dx, dy, distance, overlap) {
	const direction = { x: dx / distance, y: dy / distance };
	
	particleA.position.x += overlap * direction.x * 0.5;
	particleA.position.y += overlap * direction.y * 0.5;
	particleB.position.x -= overlap * direction.x * 0.5;
	particleB.position.y -= overlap * direction.y * 0.5;
	
	const restitution = 0.9;
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
