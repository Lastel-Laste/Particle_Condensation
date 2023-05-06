// particle.js 파일

// 파티클 클래스
class Particle {
  constructor(canvas) {
    this.canvas = canvas;
    this.radius = Math.random() * 5 + 1; // 반지름 1 ~ 6
    this.mass = this.radius * 1000; // 반지름 크기의 1000배
    this.x = Math.random() * this.canvas.width;
    this.y = Math.random() * this.canvas.height;
    this.velocity = {
      x: (Math.random() - 0.5) * 1, // -2.5 ~ 2.5
      y: (Math.random() - 0.5) * 1 // -2.5 ~ 2.5
    };
    this.color = "white";
  }

  // 파티클 간 거리 계산
  distanceTo(particle) {
      const dx = this.x - particle.x;
      const dy = this.y - particle.y;
      return Math.sqrt(dx * dx + dy * dy);
  }

  // 수직항력 계산
  calculateVerticalForce(particle) {
      const distance = this.distanceTo(particle);
      const G = 6.674 * Math.pow(10, -5); // 만유인력 상수
      const k = 0.1; // 수직항력 계수
      const force = G * this.mass * particle.mass / Math.pow(distance, 2) * k;
      const angle = Math.atan2(particle.y - this.y, particle.x - this.x) + Math.PI / 2;
      const fx = force * Math.cos(angle);
      const fy = force * Math.sin(angle);
      return { fx, fy };
  }

  // 파티클 위치 업데이트
  updateWithVerticalForce(particles) {
      let fx = 0;
      let fy = 0;
      for (let i = 0; i < particles.length; i++) {
          const particle = particles[i];
          if (particle === this) continue;
          const distance = this.distanceTo(particle);
          if (distance < 1) {
              const { fx: newFx, fy: newFy } = this.calculateVerticalForce(particle);
              fx += newFx;
              fy += newFy;
          }
      }
      const ax = fx / this.mass;
      const ay = fy / this.mass;
      this.velocity.x += ax;
      this.velocity.y += ay;
      this.x += this.velocity.x;
      this.y += this.velocity.y;
  }

  // 파티클 드로우
  draw(ctx) {
    this.x += this.velocity.x;
    this.y += this.velocity.y;
    if (this.x < 0 || this.x > canvas.width) {
      this.velocity.x = -this.velocity.x;
    }
    if (this.y < 0 || this.y > canvas.height) {
      this.velocity.y = -this.velocity.y;
    }
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
}

// 파티클 배열
const particles = [];

function init(canvas) {
  // 이전에 생성된 파티클의 위치를 캔버스 경계 내에 있도록 수정
  for (let i = 0; i < particles.length; i++) {
    const particle = particles[i];
    if (particle.x < 0) {
      particle.x = Math.random() * canvas.width;
    } else if (particle.x > canvas.width) {
      particle.x = Math.random() * canvas.width;
    }
    if (particle.y < 0) {
      particle.y = Math.random() * canvas.height;
    } else if (particle.y > canvas.height) {
      particle.y = Math.random() * canvas.height;
    }
  }
  // 새로운 캔버스 크기에 맞게 파티클을 생성하고 추가
  while (particles.length < 1000) {
    particles.push(new Particle(canvas));
  }
}



// 파티클 간의 충돌 검사
function checkCollision(particle1, particle2) {
    const dx = particle1.x - particle2.x;
    const dy = particle1.y - particle2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < particle1.radius + particle2.radius) {
        // 충돌 각도
        const angle = Math.atan2(dy, dx);
        // 겹침
        const overlap = (particle1.radius + particle2.radius) - distance;
        // 반발 계수
        const e = 0.99

        // 두 파티클 사이의 중심 방향 벡터
        const direction = {
          x: dx / distance,
          y: dy / distance
        };
      
        // 두 파티클을 겹치지 않게 위치 조정
        particle1.x += overlap * direction.x;
        particle1.y += overlap * direction.y;
        particle2.x -= overlap * direction.x;
        particle2.y -= overlap * direction.y;
      
        // 첫 번째 파티클의 충돌 속도
        const velocity1 = {
          x: particle1.velocity.x * Math.cos(angle) + particle1.velocity.y * Math.sin(angle),
          y: particle1.velocity.y * Math.cos(angle) - particle1.velocity.x * Math.sin(angle)
        };
      
        // 두 번째 파티클의 충돌 속도
        const velocity2 = {
            x: particle2.velocity.x * Math.cos(angle) + particle2.velocity.y * Math.sin(angle),
            y: particle2.velocity.y * Math.cos(angle) - particle2.velocity.x * Math.sin(angle)
        };
        
          // 충돌 속도를 이용한 파티클 이동
          const v1x = ((particle1.mass - particle2.mass) * velocity1.x + 2 * particle2.mass * velocity2.x) / (particle1.mass + particle2.mass);
          const v1y = ((particle1.mass - particle2.mass) * velocity1.y + 2 * particle2.mass * velocity2.y) / (particle1.mass + particle2.mass);
          const v2x = ((particle2.mass - particle1.mass) * velocity2.x + 2 * particle1.mass * velocity1.x) / (particle1.mass + particle2.mass);
          const v2y = ((particle2.mass - particle1.mass) * velocity2.y + 2 * particle1.mass * velocity1.y) / (particle1.mass + particle2.mass);
        
          particle1.velocity.x = v1x * e;
          particle1.velocity.y = v1y * e;
          particle2.velocity.x = v2x * e;
          particle2.velocity.y = v2y * e;
    }          
}


function applyGravitation(particle1, particle2) {
    const G = 6.674 * Math.pow(10, -5); // 만유인력 상수
    const dx = particle2.x - particle1.x;
    const dy = particle2.y - particle1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const Gravity = (G * particle1.mass * particle2.mass) / Math.pow(distance, 2);
    const fx = Gravity * dx / distance;
    const fy = Gravity * dy / distance;

    // 파티클1에 대한 가속도
    const ax1 = fx / particle1.mass;
    const ay1 = fy / particle1.mass;

    // 파티클2에 대한 가속도
    const ax2 = -fx / particle2.mass;
    const ay2 = -fy / particle2.mass;

    // 속도 갱신
    particle1.velocity.x += ax1;
    particle1.velocity.y += ay1;
    particle2.velocity.x += ax2;
    particle2.velocity.y += ay2;
}  


// 마우스 위치를 저장할 변수
let mouse = null;

// 마우스 이벤트 리스너 등록
canvas.addEventListener('mousemove', function(event) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;
  mouse = { x: mouseX, y: mouseY };
});

// 마우스 위치에 따라 파티클 속도에 강한 인력 적용
function applyMouseGravity(particle) {
  if (!mouse) {
    return;
  }
  const G = 6.674 * Math.pow(10, -3.5); // 강한 인력 계수
  const dx = mouse.x - particle.x;
  const dy = mouse.y - particle.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance < particle.radius) {
    return;
  }
  const force = -1 * G * particle.mass / Math.pow(distance, 2);
  const angle = Math.atan2(dy, dx);
  const fx = force * Math.cos(angle);
  const fy = force * Math.sin(angle);
  particle.velocity.x += fx;
  particle.velocity.y += fy;
}


function update(ctx, canvas) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < particles.length; i++) {
    particles[i].draw(ctx);
    particles[i].updateWithVerticalForce(particles);
    applyMouseGravity(particles[i]);
    for (let j = i + 1; j < particles.length; j++) {
        checkCollision(particles[i], particles[j]);
        applyGravitation(particles[i], particles[j])
    }
  }
  requestAnimationFrame(() => update(ctx, canvas));
}

