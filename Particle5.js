// Particle5.js with Sleep Mechanism

// 입자 클래스
class Particle {
	constructor(x, y) {
		this.position = { x: x, y: y };
		this.velocity = { 
			x: Math.random() * 1 - 0.5, 
			y: Math.random() * 1 - 0.5 
		};
		this.acceleration = { x: 0, y: 0 };
		this.radius = 4;
		this.mass = this.radius * this.radius * 1e7;
		this.invMass = 1 / this.mass;
		// 회전 관련 변수: 각도, 각속도, 관성 (원반의 경우 I = 0.5 * m * r^2)
		this.angle = 0;
		this.angularVelocity = 0;
		this.inertia = 0.5 * this.mass * this.radius * this.radius;
		this.invInertia = 1 / this.inertia;
		this.isColliding = false;
		// 공간 분할(그리드) 용 인덱스
		this.gridIndex = -1;
		// 슬립 메커니즘 관련 변수
		this.sleepTimer = 0;
		this.isSleeping = false;
	}

	// dt(초) 동안 위치와 회전 통합
	integrate(dt) {
		// 슬립 상태라면 업데이트하지 않음
		if (this.isSleeping) {
			// 작은 오차 누적 방지를 위해 가속도 초기화
			this.acceleration.x = 0;
			this.acceleration.y = 0;
			return;
		}
		// 선형 운동
		this.velocity.x += this.acceleration.x * dt;
		this.velocity.y += this.acceleration.y * dt;
		this.position.x += this.velocity.x * dt;
		this.position.y += this.velocity.y * dt;
		// 회전 운동
		this.angle += this.angularVelocity * dt;
		// 매 프레임마다 외력에 의해 가속도가 재계산되므로 초기화
		this.acceleration.x = 0;
		this.acceleration.y = 0;
	}
}

// 충돌 접점을 나타내는 클래스
class Contact {
	constructor(a, b, normal, penetration) {
		this.a = a;             // 충돌 입자 A
		this.b = b;             // 충돌 입자 B
		this.normal = normal;   // A에서 B로 향하는 단위 법선 벡터
		this.penetration = penetration; // 침투 깊이
	}
}

// 전역 변수들 및 상수들
let particles = [];
const particle_num = 1000;
const restitution = 0.6;       // 충돌 반발 계수
const friction = 0.1;          // 접촉 마찰 계수
const solverIterations = 10;   // Sequential Impulse Solver 반복 횟수
const timeScale = 30;

// 슬립 메커니즘 관련 상수들
const sleepVelocityThreshold = 0.05; // 임계 속도 (이하이면 슬립 고려)
const sleepTimeLimit = 0.5;          // 슬립 판정까지 필요한 시간 (초)
const wakeVelocityThreshold = 0.1;   // 깨어나기 위한 속도 임계값
const wakeAccelerationThreshold = 0.1; // 깨어나기 위한 가속도 임계값

// 시간 관련 변수
let fps = 480;
let then = Date.now();

// 파티클 초기화 (index.html에서 init(canvas) 호출)
function init(canvas) {
	particles = [];
	for (let i = 0; i < particle_num; i++) {
		const x = Math.random() * canvas.width;
		const y = Math.random() * canvas.height;
		let p = new Particle(x, y);
		particles.push(p);
		addParticleToGrid(p, calculateGridIndex(p.position));
	}
}

// 외력(중력) 계산 – 각 입자에 대해 모든 다른 입자와의 만유인력을 계산 (스케일 조정 가능)
function computeGravitationalAcceleration(particle) {
	const G = 6.125e-11;
	let ax = 0, ay = 0;
	for (let i = 0; i < particles.length; i++) {
		const other = particles[i];
		if (other !== particle) {
			let dx = other.position.x - particle.position.x;
			let dy = other.position.y - particle.position.y;
			let distSq = dx * dx + dy * dy;
			let distance = Math.sqrt(distSq) || 1;
			let force = (G * particle.mass * other.mass) / (distSq);
			ax += (force * dx) / (distance * particle.mass);
			ay += (force * dy) / (distance * particle.mass);
		}
	}
	return { x: ax, y: ay };
}

// 충돌 검출: 그리드 기반으로 인접 입자들과의 충돌 접점을 목록에 추가
function detectContacts() {
	let contacts = [];
	for (let i = 0; i < particles.length; i++) {
		let p = particles[i];
		let nearby = getNearbyParticles(p);
		for (let j = 0; j < nearby.length; j++) {
			let p2 = nearby[j];
			if (p === p2) continue;
			let dx = p2.position.x - p.position.x;
			let dy = p2.position.y - p.position.y;
			let dist = Math.sqrt(dx * dx + dy * dy) || 1;
			let penetration = p.radius + p2.radius - dist;
			if (penetration > 0) {
				let normal = { x: dx / dist, y: dy / dist };
				contacts.push(new Contact(p, p2, normal, penetration));
			}
		}
	}
	return contacts;
}

// Sequential Impulse Solver: 단일 충돌 접점에 대해 impulse 계산 및 적용
function resolveContact(contact) {
	let a = contact.a;
	let b = contact.b;
	let normal = contact.normal;
	
	// 접촉점 위치: 각 입자의 경계상에서의 접촉점 근사 (법선 방향)
	let rA = { x: normal.x * a.radius, y: normal.y * a.radius };
	let rB = { x: -normal.x * b.radius, y: -normal.y * b.radius };
	
	// 접촉점에서의 상대 속도: 선형 속도와 회전 효과 포함
	let vA = {
		x: a.velocity.x - a.angularVelocity * rA.y,
		y: a.velocity.y + a.angularVelocity * rA.x
	};
	let vB = {
		x: b.velocity.x - b.angularVelocity * rB.y,
		y: b.velocity.y + b.angularVelocity * rB.x
	};
	let rv = { x: vB.x - vA.x, y: vB.y - vA.y };
	
	// 법선 방향의 상대 속도 성분
	let relVelNorm = rv.x * normal.x + rv.y * normal.y;
	if (relVelNorm > 0) return;
	
	// 회전 효과를 포함한 효과적 질량 계산
	let rA_cross_n = rA.x * normal.y - rA.y * normal.x;
	let rB_cross_n = rB.x * normal.y - rB.y * normal.x;
	let invMassSum = a.invMass + b.invMass +
		(rA_cross_n * rA_cross_n) * a.invInertia +
		(rB_cross_n * rB_cross_n) * b.invInertia;
	
	// 충돌 impulse 스칼라
	let j = -(1 + restitution) * relVelNorm / invMassSum;
	let impulse = { x: j * normal.x, y: j * normal.y };
	
	// 선형 운동 업데이트
	a.velocity.x -= impulse.x * a.invMass;
	a.velocity.y -= impulse.y * a.invMass;
	b.velocity.x += impulse.x * b.invMass;
	b.velocity.y += impulse.y * b.invMass;
	
	// 회전 운동 업데이트
	a.angularVelocity -= a.invInertia * (rA.x * impulse.y - rA.y * impulse.x);
	b.angularVelocity += b.invInertia * (rB.x * impulse.y - rB.y * impulse.x);
	
	// 접선(마찰) 계산
	let tangent = { x: -normal.y, y: normal.x };
	let relVelTangent = rv.x * tangent.x + rv.y * tangent.y;
	let jt = -relVelTangent / invMassSum;
	let maxFriction = friction * j;
	if (jt > maxFriction) jt = maxFriction;
	if (jt < -maxFriction) jt = -maxFriction;
	let frictionImpulse = { x: jt * tangent.x, y: jt * tangent.y };
	
	a.velocity.x -= frictionImpulse.x * a.invMass;
	a.velocity.y -= frictionImpulse.y * a.invMass;
	b.velocity.x += frictionImpulse.x * b.invMass;
	b.velocity.y += frictionImpulse.y * b.invMass;
	
	a.angularVelocity -= a.invInertia * (rA.x * frictionImpulse.y - rA.y * frictionImpulse.x);
	b.angularVelocity += b.invInertia * (rB.x * frictionImpulse.y - rB.y * frictionImpulse.x);
	
	a.isColliding = true;
	b.isColliding = true;
	
	// 충돌 발생 시 슬립 상태 해제
	a.isSleeping = false;
	b.isSleeping = false;
	a.sleepTimer = 0;
	b.sleepTimer = 0;
}

// Baumgarte positional correction: 침투 보정
function positionalCorrection(contact) {
	const percent = 0.2;
	const slop = 0.01;
	let correctionMag = Math.max(contact.penetration - slop, 0) /
		(contact.a.invMass + contact.b.invMass) * percent;
	let correction = { x: correctionMag * contact.normal.x, y: correctionMag * contact.normal.y };
	contact.a.position.x -= correction.x * contact.a.invMass;
	contact.a.position.y -= correction.y * contact.a.invMass;
	contact.b.position.x += correction.x * contact.b.invMass;
	contact.b.position.y += correction.y * contact.b.invMass;
}

// 메인 업데이트 루프 (고정 dt 방식, Sequential Impulse Solver 적용)
function update(ctx, canvas) {
	requestAnimationFrame(() => update(ctx, canvas));
	let now = Date.now();
	let frameTime = (now - then) / 1000;
	frameTime *= timeScale;
	if (frameTime > 0.25) frameTime = 0.25;
	then = now;
	
	// 그리드 업데이트
	for (let i = 0; i < particles.length; i++) {
		removeParticleFromGrid(particles[i]);
		addParticleToGrid(particles[i], calculateGridIndex(particles[i].position));
	}
	
	// 중력 적용 및 선형 속도 업데이트
	for (let i = 0; i < particles.length; i++) {
		let p = particles[i];
		// 슬립 상태인 경우, 외력이나 속도가 일정 임계치를 넘으면 깨어나도록 검사
		if (p.isSleeping) {
			let grav = computeGravitationalAcceleration(p);
			let aMag = Math.hypot(grav.x, grav.y);
			let vMag = Math.hypot(p.velocity.x, p.velocity.y);
			if (aMag > wakeAccelerationThreshold || vMag > wakeVelocityThreshold) {
				p.isSleeping = false;
				p.sleepTimer = 0;
			}
		}
		// 슬립 상태가 아니라면 중력 적용
		if (!p.isSleeping) {
			let grav = computeGravitationalAcceleration(p);
			p.acceleration.x = grav.x;
			p.acceleration.y = grav.y;
			p.velocity.x += p.acceleration.x * frameTime;
			p.velocity.y += p.acceleration.y * frameTime;
		}
	}
	
	// 충돌 접점 검출
	let contacts = detectContacts();
	
	// Sequential Impulse Solver
	for (let iter = 0; iter < solverIterations; iter++) {
		for (let i = 0; i < contacts.length; i++) {
			resolveContact(contacts[i]);
		}
	}
	
	// 침투 보정
	for (let i = 0; i < contacts.length; i++) {
		positionalCorrection(contacts[i]);
	}
	
	// 최종 위치와 회전 통합
	for (let i = 0; i < particles.length; i++) {
		particles[i].integrate(frameTime);
	}
	
	// 슬립 상태 업데이트: 일정 시간 이하의 속도라면 슬립 타이머 증가
	for (let i = 0; i < particles.length; i++) {
		let p = particles[i];
		if (!p.isSleeping) {
			let speedSq = p.velocity.x * p.velocity.x + p.velocity.y * p.velocity.y;
			if (speedSq < sleepVelocityThreshold * sleepVelocityThreshold) {
				p.sleepTimer += frameTime;
				if (p.sleepTimer > sleepTimeLimit) {
					p.isSleeping = true;
					p.velocity.x = 0;
					p.velocity.y = 0;
					p.angularVelocity = 0;
				}
			} else {
				p.sleepTimer = 0;
			}
		}
	}
	
	// 벽 충돌 처리 
	for (let i = 0; i < particles.length; i++) {
		let p = particles[i];
		if (p.position.x - p.radius < 0) {
			p.position.x = p.radius;
			p.velocity.x *= -restitution;
		}
		if (p.position.x + p.radius > canvas.width) {
			p.position.x = canvas.width - p.radius;
			p.velocity.x *= -restitution;
		}
		if (p.position.y - p.radius < 0) {
			p.position.y = p.radius;
			p.velocity.y *= -restitution;
		}
		if (p.position.y + p.radius > canvas.height) {
			p.position.y = canvas.height - p.radius;
			p.velocity.y *= -restitution;
		}
	}
	
	// 캔버스 클리어 및 그리드 라인 그리기
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	drawGridLines(ctx, canvas);
	
	// 모든 입자 그리기
	for (let i = 0; i < particles.length; i++) {
		let p = particles[i];
		ctx.save();
		ctx.translate(p.position.x, p.position.y);
		ctx.rotate(p.angle);
		ctx.fillStyle = p.isColliding ? "#ff0000" : "#ffffff";
		ctx.beginPath();
		ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
		p.isColliding = false;
	}
}
