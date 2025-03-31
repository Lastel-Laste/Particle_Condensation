// Particle5.js - 자연스러운 물리 기반 시뮬레이션

// 입자 클래스
class Particle {
	constructor(x, y) {
		this.position = { x: x, y: y };
		this.velocity = { 
			x: Math.random() * 1 - 0.5, 
			y: Math.random() * 1 - 0.5 
		};
		this.acceleration = { x: 0, y: 0 };
		
		// 물리적 특성
		this.radius = 4;
		this.mass = this.radius * this.radius * this.radius * 1e7;
		this.invMass = 1 / this.mass;
		
		// 회전 관련 변수
		this.angle = 0;
		this.angularVelocity = 0;
		this.inertia = (2/5) * this.mass * this.radius * this.radius; // 구체의 관성 모멘트
		this.invInertia = 1 / this.inertia;
		
		// 물리적 특성
		this.restitution = 0.5 + Math.random() * 0.3; // 0.5~0.8 범위 (대부분의 실제 물질)
		this.friction = 0.1 + Math.random() * 0.3;    // 0.1~0.4 범위 (일반적인 마찰 계수)
		this.staticFriction = this.friction * 1.5;    // 정지 마찰계수 (일반적으로 동적 마찰보다 큼)
		
		// 에너지 관련 변수
		this.kineticEnergy = 0;
		
		this.isColliding = false;
		this.gridIndex = -1;
	}

	// 운동 에너지 계산
	calculateKineticEnergy() {
		const v2 = this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y;
		this.kineticEnergy = 0.5 * this.mass * v2;
		return this.kineticEnergy;
	}

	// 간단한 반 오일러 적분
	integrate(dt) {
		// 속도 업데이트
		this.velocity.x += this.acceleration.x * dt;
		this.velocity.y += this.acceleration.y * dt;
		
		// 위치 업데이트
		this.position.x += this.velocity.x * dt;
		this.position.y += this.velocity.y * dt;
		
		// 회전 업데이트
		this.angle += this.angularVelocity * dt;
		
		// 가속도 초기화
		this.acceleration.x = 0;
		this.acceleration.y = 0;
		
		// 에너지 계산
		this.calculateKineticEnergy();
	}
}

// 충돌 접점을 나타내는 클래스
class Contact {
	constructor(a, b, normal, penetration) {
		this.a = a;             // 충돌 입자 A
		this.b = b;             // 충돌 입자 B
		this.normal = normal;   // A에서 B로 향하는 단위 법선 벡터
		this.penetration = penetration; // 침투 깊이
		this.persisted = false; // 지속된 접촉인지 여부
	}
}

// 전역 변수들 및 상수들
let particles = [];
const particle_num = 1000;
const solverIterations = 10;   // Sequential Impulse Solver 반복 횟수
const timeScale = 15;          // 현실적인 시간 스케일

// 물리 상수
const G = 6.67430e-11; // 실제 중력 상수
const G_scale = 50;     // 시뮬레이션용 스케일 (조정됨)

// 응착력 상수 (가까운 거리에서의 인력)
const ADHESION_DISTANCE = 10;    // 응착력 작용 거리
const ADHESION_STRENGTH = 0.2;   // 응착력 강도

// 시간 관련 변수
let fps = 480;
let then = Date.now();
let simulationTime = 0; // 총 시뮬레이션 시간

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
	
	simulationTime = 0;
}

// 중력 계산 - 모든 입자 쌍 간 상호작용
function computeGravitationalAcceleration(particle) {
	const G_effective = G * G_scale;
	let ax = 0, ay = 0;
	
	// 모든 입자와의 중력 상호작용
	for (let i = 0; i < particles.length; i++) {
		const other = particles[i];
		if (other !== particle) {
			let dx = other.position.x - particle.position.x;
			let dy = other.position.y - particle.position.y;
			let distSq = dx * dx + dy * dy;
			
			// 특이점 방지 (너무 가까울 때)
			const minDistSq = (particle.radius + other.radius) * (particle.radius + other.radius) * 0.25;
			if (distSq < minDistSq) distSq = minDistSq;
			
			let distance = Math.sqrt(distSq);
			
			// 뉴턴의 중력 법칙: F = G*m1*m2/r^2
			let force = (G_effective * particle.mass * other.mass) / distSq;
			
			// 가속도 계산: a = F/m
			ax += (force * dx) / (distance * particle.mass);
			ay += (force * dy) / (distance * particle.mass);
			
			// 응착력 (가까운 거리에서의 추가 인력)
			if (distance < ADHESION_DISTANCE) {
				// 거리에 반비례하는 응착력 (가까울수록 강함)
				const adhesionFactor = 1.0 - (distance / ADHESION_DISTANCE);
				const adhesionForce = ADHESION_STRENGTH * adhesionFactor * particle.mass;
				ax += (adhesionForce * dx) / (distance * particle.mass);
				ay += (adhesionForce * dy) / (distance * particle.mass);
			}
		}
	}
	
	return { x: ax, y: ay };
}

// 충돌 검출 - 그리드 기반 최적화
function detectContacts() {
	let contacts = [];
	
	// 그리드 기반 충돌 검출
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

// 충돌 해결 - 정지 마찰 포함
function resolveContact(contact) {
	let a = contact.a;
	let b = contact.b;
	let normal = contact.normal;
	
	// 접촉점 위치
	let rA = { x: normal.x * a.radius, y: normal.y * a.radius };
	let rB = { x: -normal.x * b.radius, y: -normal.y * b.radius };
	
	// 접촉점에서의 상대 속도
	let vA = {
		x: a.velocity.x - a.angularVelocity * rA.y,
		y: a.velocity.y + a.angularVelocity * rA.x
	};
	let vB = {
		x: b.velocity.x - b.angularVelocity * rB.y,
		y: b.velocity.y + b.angularVelocity * rB.x
	};
	let rv = { x: vB.x - vA.x, y: vB.y - vA.y };
	
	// 법선 방향 상대 속도
	let relVelNorm = rv.x * normal.x + rv.y * normal.y;
	if (relVelNorm > 0) return; // 이미 분리 중
	
	// 효과적 질량 계산
	let rA_cross_n = rA.x * normal.y - rA.y * normal.x;
	let rB_cross_n = rB.x * normal.y - rB.y * normal.x;
	let invMassSum = a.invMass + b.invMass +
		(rA_cross_n * rA_cross_n) * a.invInertia +
		(rB_cross_n * rB_cross_n) * b.invInertia;
	
	// 속도 의존적 반발계수
	let relVelMag = Math.abs(relVelNorm);
	const velocityThreshold = 10.0;
	
	// 입자별 반발계수의 조합
	let avgRestitution = (a.restitution + b.restitution) * 0.5;
	
	// 속도에 따른 반발계수 감소 (실제 충돌에서 관찰되는 현상)
	let effectiveRestitution = avgRestitution;
	if (relVelMag > velocityThreshold) {
		effectiveRestitution *= Math.max(0.2, 1.0 - (relVelMag - velocityThreshold) * 0.015);
	}
	
	// 충돌 impulse 계산
	let j = -(1 + effectiveRestitution) * relVelNorm / invMassSum;
	let impulse = { x: j * normal.x, y: j * normal.y };
	
	// 선형 운동량 적용
	a.velocity.x -= impulse.x * a.invMass;
	a.velocity.y -= impulse.y * a.invMass;
	b.velocity.x += impulse.x * b.invMass;
	b.velocity.y += impulse.y * b.invMass;
	
	// 회전 운동량 적용
	a.angularVelocity -= a.invInertia * (rA.x * impulse.y - rA.y * impulse.x);
	b.angularVelocity += b.invInertia * (rB.x * impulse.y - rB.y * impulse.x);
	
	// 접선(마찰) 벡터 계산
	let tangent = { x: -normal.y, y: normal.x };
	let relVelTangent = rv.x * tangent.x + rv.y * tangent.y;
	
	// 접선 방향 impulse 계산
	let jt = -relVelTangent / invMassSum;
	
	// 정지 마찰과 동적 마찰 구분
	// 정지 마찰: 상대 속도가 매우 작을 때
	const isResting = Math.abs(relVelTangent) < 0.1;
	
	// 정지/동적 마찰 계수 선택
	let effectiveFriction;
	if (isResting) {
		// 정지 마찰 (더 큼)
		effectiveFriction = Math.max(a.staticFriction, b.staticFriction);
	} else {
		// 동적 마찰
		effectiveFriction = (a.friction + b.friction) * 0.5;
	}
	
	// Coulomb 마찰 모델
	let maxFriction = Math.abs(j) * effectiveFriction;
	if (Math.abs(jt) > maxFriction) {
		jt = jt > 0 ? maxFriction : -maxFriction;
	}
	
	let frictionImpulse = { x: jt * tangent.x, y: jt * tangent.y };
	
	// 마찰력에 의한 운동량 적용
	a.velocity.x -= frictionImpulse.x * a.invMass;
	a.velocity.y -= frictionImpulse.y * a.invMass;
	b.velocity.x += frictionImpulse.x * b.invMass;
	b.velocity.y += frictionImpulse.y * b.invMass;
	
	// 마찰에 의한 회전 운동량
	a.angularVelocity -= a.invInertia * (rA.x * frictionImpulse.y - rA.y * frictionImpulse.x);
	b.angularVelocity += b.invInertia * (rB.x * frictionImpulse.y - rB.y * frictionImpulse.x);
	
	// 충돌 상태 표시
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

// 메인 업데이트 루프
function update(ctx, canvas) {
	requestAnimationFrame(() => update(ctx, canvas));
	let now = Date.now();
	let frameTime = (now - then) / 1000;
	frameTime *= timeScale;
	if (frameTime > 0.25) frameTime = 0.25; // 안정성을 위한 최대 dt 제한
	then = now;
	
	// 시뮬레이션 시간 갱신
	simulationTime += frameTime;
	
	// 그리드 업데이트
	for (let i = 0; i < particles.length; i++) {
		removeParticleFromGrid(particles[i]);
		addParticleToGrid(particles[i], calculateGridIndex(particles[i].position));
	}
	
	// 모든 입자의 중력 가속도 계산
	for (let i = 0; i < particles.length; i++) {
		let p = particles[i];
		let grav = computeGravitationalAcceleration(p);
		p.acceleration.x = grav.x;
		p.acceleration.y = grav.y;
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
	
	// 위치와 회전 업데이트
	for (let i = 0; i < particles.length; i++) {
		particles[i].integrate(frameTime);
	}
	
	// 벽 충돌 처리 (정지 마찰 포함)
	for (let i = 0; i < particles.length; i++) {
		let p = particles[i];
		
		// 속도에 따른 벽 반발계수
		const speed = Math.sqrt(p.velocity.x * p.velocity.x + p.velocity.y * p.velocity.y);
		const wallRestitution = p.restitution * Math.max(0.5, 1.0 - speed * 0.01);
		
		// 왼쪽 벽
		if (p.position.x - p.radius < 0) {
			p.position.x = p.radius;
			
			// 정지 상태 판별 (속도가 매우 낮으면 정지 마찰 적용)
			const isResting = Math.abs(p.velocity.x) < 0.5;
			
			// 속도 반전 (반발계수 적용)
			p.velocity.x *= -wallRestitution;
			
			// 벽 마찰 (수직방향 속도 감소) - 정지 마찰 적용 시 더 강하게
			const frictionCoeff = isResting ? p.staticFriction : p.friction;
			p.velocity.y *= (1.0 - frictionCoeff * 0.3);
			
			// 회전 효과
			p.angularVelocity += p.velocity.y * 0.1;
		}
		// 오른쪽 벽
		else if (p.position.x + p.radius > canvas.width) {
			p.position.x = canvas.width - p.radius;
			
			const isResting = Math.abs(p.velocity.x) < 0.5;
			p.velocity.x *= -wallRestitution;
			
			const frictionCoeff = isResting ? p.staticFriction : p.friction;
			p.velocity.y *= (1.0 - frictionCoeff * 0.3);
			
			p.angularVelocity -= p.velocity.y * 0.1;
		}
		
		// 위쪽 벽
		if (p.position.y - p.radius < 0) {
			p.position.y = p.radius;
			
			const isResting = Math.abs(p.velocity.y) < 0.5;
			p.velocity.y *= -wallRestitution;
			
			const frictionCoeff = isResting ? p.staticFriction : p.friction;
			p.velocity.x *= (1.0 - frictionCoeff * 0.3);
			
			p.angularVelocity -= p.velocity.x * 0.1;
		}
		// 아래쪽 벽
		else if (p.position.y + p.radius > canvas.height) {
			p.position.y = canvas.height - p.radius;
			
			const isResting = Math.abs(p.velocity.y) < 0.5;
			p.velocity.y *= -wallRestitution;
			
			const frictionCoeff = isResting ? p.staticFriction : p.friction;
			p.velocity.x *= (1.0 - frictionCoeff * 0.3);
			
			p.angularVelocity += p.velocity.x * 0.1;
		}
		
		// 운동 에너지 업데이트
		p.calculateKineticEnergy();
	}
	
	// 캔버스 클리어 및 그리드 라인 그리기
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	drawGridLines(ctx, canvas);
	
	// 입자 에너지 범위 계산 (색상 매핑용)
	let minEnergy = Infinity;
	let maxEnergy = -Infinity;
	for (let i = 0; i < particles.length; i++) {
		let energy = particles[i].kineticEnergy;
		if (energy < minEnergy) minEnergy = energy;
		if (energy > maxEnergy) maxEnergy = energy;
	}
	
	// 에너지 범위가 0이 아닌지 확인
	let energyRange = maxEnergy - minEnergy;
	if (energyRange <= 0) energyRange = 1;
	
	// 모든 입자 그리기 (개별 에너지에 따른 색상)
	for (let i = 0; i < particles.length; i++) {
		let p = particles[i];
		
		// 상대적 에너지 계산 (0~1 사이 값)
		const normalizedEnergy = (p.kineticEnergy - minEnergy) / energyRange;
		
		// 적절한 색상 매핑 범위 지정 (더 좁은 범위로 조정)
		// 낮은 에너지: 파랑 (240), 중간: 초록 (120), 높은 에너지: 빨강 (0)
		let hue;
		
		// 색상 매핑을 더 세분화 (로그 스케일 적용)
		const logEnergy = Math.log(normalizedEnergy * 9 + 1) / Math.log(10); // 0~1 사이 로그 스케일
		hue = 240 * (1 - logEnergy);
		
		// HSL 색상 설정
		const saturation = 80;
		const lightness = 50;
		
		ctx.save();
		ctx.translate(p.position.x, p.position.y);
		ctx.rotate(p.angle);
		
		ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
		
		ctx.beginPath();
		ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
		ctx.fill();
		
		// 회전 표시 (작은 선)
		ctx.strokeStyle = "#ffffff";
		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.lineTo(p.radius, 0);
		ctx.stroke();
		
		ctx.restore();
		
		// 충돌 표시 초기화
		p.isColliding = false;
	}
	
	// 시스템 정보 표시
	ctx.fillStyle = "#ffffff";
	ctx.font = "14px Arial";
	
	// 평균 운동 에너지 표시
	let totalEnergy = 0;
	for (let i = 0; i < particles.length; i++) {
		totalEnergy += particles[i].kineticEnergy;
	}
	const avgEnergy = totalEnergy / particles.length;
	ctx.fillText(`Avg Energy: ${avgEnergy.toExponential(2)}`, 10, 30);
	
	// 입자 속도 정보 표시
	let totalSpeed = 0;
	let maxSpeed = 0;
	for (let i = 0; i < particles.length; i++) {
		const speed = Math.sqrt(
			particles[i].velocity.x * particles[i].velocity.x + 
			particles[i].velocity.y * particles[i].velocity.y
		);
		totalSpeed += speed;
		if (speed > maxSpeed) maxSpeed = speed;
	}
	const avgSpeed = totalSpeed / particles.length;
	ctx.fillText(`Avg Speed: ${avgSpeed.toFixed(2)}, Max: ${maxSpeed.toFixed(2)}`, 10, 50);
	
	// 시뮬레이션 시간 표시
	ctx.fillText(`Simulation Time: ${simulationTime.toFixed(2)}s`, 10, 70);
}
