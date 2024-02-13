// Particle3.js

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
	  this.mass = this.radius * this.radius * 1e7;
	  this.friction = 0.95;  // 0: 완전 미끌 1: 완전 뻣뻣
	  this.isColliding = false;
	}

	update() {
		this.velocity.x += this.acceleration.x
		this.velocity.y += this.acceleration.y
	}
}

let particles = []; // particles 변수 선언
let particle_num = 1000;
const restitution = 0.6;
const restitution_wall = 0.4;
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
			if (LOver > 0) { particle.position.x += LOver; particle.velocity.x *= -restitution_wall; }
			else if (ROver > 0) { particle.position.x -= ROver; particle.velocity.x *= -restitution_wall; }
			if (DOver > 0) { particle.position.y += DOver; particle.velocity.y *= -restitution_wall; }
			else if (UOver > 0) { particle.position.y -= UOver; particle.velocity.y *= -restitution_wall; }
	  
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
	  ctx.fillStyle = particle.isColliding ? "#ff0000" : "#ffffff";
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
	  
  	  particle.isColliding = false;
	}
        then = now - (delta % interval);}
}

function handleCollision(particleA, particleB, dx, dy, distance, overlap) {
	const direction = { x: dx / distance, y: dy / distance };
	particleA.position.x += overlap * direction.x * 0.5;
	particleA.position.y += overlap * direction.y * 0.5;
	particleB.position.x -= overlap * direction.x * 0.5;
	particleB.position.y -= overlap * direction.y * 0.5;

    const normalX = dx / distance;
    const normalY = dy / distance;

    const p = (1 + restitution) * (particleA.velocity.x * normalX 
				 + particleA.velocity.y * normalY 
				 - particleB.velocity.x * normalX 
				 - particleB.velocity.y * normalY) 
				/ (particleA.mass + particleB.mass);

    const colVelocityA = { x: particleA.velocity.x - p * particleB.mass * normalX, 
						   y: particleA.velocity.y - p * particleB.mass * normalY };
    const colVelocityB = { x: particleB.velocity.x + p * particleA.mass * normalX, 
						   y: particleB.velocity.y + p * particleA.mass * normalY };

    particleA.velocity = colVelocityA;
    particleB.velocity = colVelocityB;

    particleA.isColliding = true;
    particleB.isColliding = true;
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
