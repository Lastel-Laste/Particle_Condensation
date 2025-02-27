// Particle4.js

// 2D 원형 입자 클래스 (회전, 질량, 관성 포함)
class Particle {
	constructor(x, y) {
		this.position = { x: x, y: y };
		this.velocity = { 
			x: Math.random() * 1 - 0.5, 
			y: Math.random() * 1 - 0.5 
		};
		this.acceleration = { x: 0, y: 0 };
		this.radius = 0.5;
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
	}

	// dt(초) 동안 위치와 회전 통합
	integrate(dt) {
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
const particle_num = 10000;
const restitution = 0.6;       // 충돌 반발 계수
const friction = 0.1;          // 접촉 마찰 계수
const solverIterations = 10;   // Sequential Impulse Solver 반복 횟수

// ★ 여기서 timeScale을 도입합니다. ★
// 이 값은 시뮬레이션 시간(물리 시간)을 실제 시간보다 빠르게 진행시켜,
// 입자들의 초기 속도와 운동이 눈에 띄게 보이도록 합니다.
// (물리적 관계는 그대로 유지되므로, 정확도는 양보하지 않습니다.)
const timeScale = 30;

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
	// 실제 상수 대신 시뮬레이션에 맞게 조정된 상수를 사용할 수 있음
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
				// 법선: p에서 p2로 향하는 단위 벡터
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
	// 이미 분리 중이면 해결하지 않음
	if (relVelNorm > 0) return;
	
	// 회전 효과를 포함한 효과적 질량 계산
	let rA_cross_n = rA.x * normal.y - rA.y * normal.x;
	let rB_cross_n = rB.x * normal.y - rB.y * normal.x;
	let invMassSum = a.invMass + b.invMass +
		(rA_cross_n * rA_cross_n) * a.invInertia +
		(rB_cross_n * rB_cross_n) * b.invInertia;
	
	// 충돌 impulse 스칼라
	let j = -(1 + restitution) * relVelNorm / invMassSum;
	// 법선 impulse 벡터
	let impulse = { x: j * normal.x, y: j * normal.y };
	
	// 선형 운동 업데이트
	a.velocity.x -= impulse.x * a.invMass;
	a.velocity.y -= impulse.y * a.invMass;
	b.velocity.x += impulse.x * b.invMass;
	b.velocity.y += impulse.y * b.invMass;
	
	// 회전 운동 업데이트 (2D에서: angularImpulse = r × impulse)
	a.angularVelocity -= a.invInertia * (rA.x * impulse.y - rA.y * impulse.x);
	b.angularVelocity += b.invInertia * (rB.x * impulse.y - rB.y * impulse.x);
	
	// 접선(마찰) 계산: 법선에 수직인 벡터
	let tangent = { x: -normal.y, y: normal.x };
	let relVelTangent = rv.x * tangent.x + rv.y * tangent.y;
	let jt = -relVelTangent / invMassSum;
	// Coulomb 마찰 모델: 최대 접선 impulse 제한
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
}

// Baumgarte positional correction: 침투 보정
function positionalCorrection(contact) {
	const percent = 0.2; // 보정 비율
	const slop = 0.01;   // 허용 침투
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
	// 실제 프레임 시간 (초)
	let frameTime = (now - then) / 1000;
	// ★ 시뮬레이션 시간 스케일 적용 ★
	frameTime *= timeScale;
	if (frameTime > 0.25) frameTime = 0.25; // 지나치게 큰 dt 방지
	then = now;
	
	// 그리드 업데이트: 각 입자에 대해 그리드 인덱스 최신화
	for (let i = 0; i < particles.length; i++) {
		removeParticleFromGrid(particles[i]);
		addParticleToGrid(particles[i], calculateGridIndex(particles[i].position));
	}
	
	// 모든 입자에 대해 외력(중력) 적용 및 선형 속도 업데이트
	for (let i = 0; i < particles.length; i++) {
		let p = particles[i];
		let grav = computeGravitationalAcceleration(p);
		p.acceleration.x = grav.x;
		p.acceleration.y = grav.y;
		// 선형 속도 업데이트 (이후 integrate에서 위치와 회전 통합)
		p.velocity.x += p.acceleration.x * frameTime;
		p.velocity.y += p.acceleration.y * frameTime;
	}
	
	// 충돌 접점 검출
	let contacts = detectContacts();
	
	// Sequential Impulse Solver 반복 적용
	for (let iter = 0; iter < solverIterations; iter++) {
		for (let i = 0; i < contacts.length; i++) {
			resolveContact(contacts[i]);
		}
	}
	
	// 침투 보정
	for (let i = 0; i < contacts.length; i++) {
		positionalCorrection(contacts[i]);
	}
	
	// 모든 입자에 대해 최종 위치와 회전 통합
	for (let i = 0; i < particles.length; i++) {
		particles[i].integrate(frameTime);
	}
	
	// 벽과의 간단한 충돌 처리 (반사)
	for (let i = 0; i < particles.length; i++) {
		let p = particles[i];
		// 왼쪽 벽
		if (p.position.x - p.radius < 0) {
			p.position.x = p.radius;
			p.velocity.x *= -restitution;
		}
		// 오른쪽 벽
		if (p.position.x + p.radius > canvas.width) {
			p.position.x = canvas.width - p.radius;
			p.velocity.x *= -restitution;
		}
		// 위쪽 벽
		if (p.position.y - p.radius < 0) {
			p.position.y = p.radius;
			p.velocity.y *= -restitution;
		}
		// 아래쪽 벽
		if (p.position.y + p.radius > canvas.height) {
			p.position.y = canvas.height - p.radius;
			p.velocity.y *= -restitution;
		}
	}
	
	// 캔버스 클리어 및 그리드 라인 그리기
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	drawGridLines(ctx, canvas);
	
		// 모든 입자 그리기 (회전 적용)
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
