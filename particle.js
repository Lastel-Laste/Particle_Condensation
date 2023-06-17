// 파티클 클래스
class Particle {
	constructor(x, y) {
	  this.position = { x, y };
	  this.previousPosition = { x, y };
	  this.velocity = {
      x: Math.random() * 2 - 1,
      y: Math.random() * 2 - 1
    };
	  this.radius = Math.random() * 3 + 2;
	  this.mass = this.radius * this.radius * 1e8;
	  this.isColliding = false;
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

	  // 파티클 충돌 검사
	  for (let i = 0; i < particles.length; i++) {
		const particle = particles[i];
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

	  const restitution = 0.6;
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
	}
}

// 캔버스 업데이트 함수
function update(ctx, canvas) {
	ctx.clearRect(0, 0, canvas.width, canvas.height);

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
