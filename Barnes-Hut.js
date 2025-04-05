// Barnes-Hut.js - 중력 계산을 위한 Barnes-Hut 알고리즘 구현
// O(n log n) 시간 복잡도로 중력 계산 최적화

// 사분 트리의 노드를 표현하는 클래스
class QuadTreeNode {
    constructor(x, y, width, height, depth = 0) {
        this.x = x;              // 사분면의 좌상단 x 좌표
        this.y = y;              // 사분면의 좌상단 y 좌표
        this.width = width;      // 사분면의 너비
        this.height = height;    // 사분면의 높이
        this.depth = depth;      // 트리의 깊이 (최적화에 사용)
        
        this.centerOfMass = { x: 0, y: 0 };  // 질량 중심
        this.totalMass = 0;                   // 총 질량
        
        this.children = [];      // 자식 노드 (NW, NE, SW, SE)
        this.particles = [];     // 이 노드에 포함된 입자들
        this.hasChildren = false;// 자식 노드 존재 여부
        this.isLeaf = true;      // 리프 노드 여부
    }
    
    // 입자가 이 노드에 속하는지 확인
    contains(particle) {
        return (
            particle.position.x >= this.x &&
            particle.position.x < this.x + this.width &&
            particle.position.y >= this.y &&
            particle.position.y < this.y + this.height
        );
    }
    
    // 입자 추가
    insert(particle) {
        // 이 노드가 입자를 포함하지 않으면 무시
        if (!this.contains(particle)) {
            return false;
        }
        
        // 질량 중심 업데이트
        this.updateMass(particle);
        
        // 최대 깊이 또는 한 개의 입자만 있을 경우 그냥 추가
        const MAX_DEPTH = 8; // 최대 트리 깊이 설정
        const MAX_PARTICLES_PER_LEAF = 1; // 리프 노드당 최대 입자 수
        
        if (this.depth >= MAX_DEPTH || this.particles.length < MAX_PARTICLES_PER_LEAF) {
            this.particles.push(particle);
            return true;
        }
        
        // 노드 분할이 필요하면 분할
        if (!this.hasChildren) {
            this.subdivide();
        }
        
        // 기존 입자들을 자식 노드로 이동
        if (this.particles.length > 0) {
            const existingParticles = [...this.particles];
            this.particles = [];
            for (const p of existingParticles) {
                this.insertToChildren(p);
            }
        }
        
        // 새 입자를 자식 노드에 추가
        this.insertToChildren(particle);
        return true;
    }
    
    // 자식 노드들에 입자 추가 시도
    insertToChildren(particle) {
        for (const child of this.children) {
            if (child.insert(particle)) {
                return true;
            }
        }
        // 만약 자식이 모두 포함하지 않으면 (엣지 케이스)
        this.particles.push(particle);
        return false;
    }
    
    // 노드를 4개의 자식 노드로 분할
    subdivide() {
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        const nextDepth = this.depth + 1;
        
        // 북서 (NW)
        this.children.push(new QuadTreeNode(
            this.x, 
            this.y, 
            halfWidth, 
            halfHeight, 
            nextDepth
        ));
        
        // 북동 (NE)
        this.children.push(new QuadTreeNode(
            this.x + halfWidth, 
            this.y, 
            halfWidth, 
            halfHeight, 
            nextDepth
        ));
        
        // 남서 (SW)
        this.children.push(new QuadTreeNode(
            this.x, 
            this.y + halfHeight, 
            halfWidth, 
            halfHeight, 
            nextDepth
        ));
        
        // 남동 (SE)
        this.children.push(new QuadTreeNode(
            this.x + halfWidth, 
            this.y + halfHeight, 
            halfWidth, 
            halfHeight, 
            nextDepth
        ));
        
        this.hasChildren = true;
        this.isLeaf = false;
    }
    
    // 질량 중심 업데이트
    updateMass(particle) {
        const totalMass = this.totalMass + particle.mass;
        
        // 질량 중심 계산 (가중 평균)
        this.centerOfMass.x = (this.centerOfMass.x * this.totalMass + 
                               particle.position.x * particle.mass) / totalMass;
        this.centerOfMass.y = (this.centerOfMass.y * this.totalMass + 
                               particle.position.y * particle.mass) / totalMass;
        
        this.totalMass = totalMass;
    }
    
    // 디버깅을 위한 트리 그리기
    draw(ctx) {
        // 노드 경계 그리기
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        // 질량 중심 표시
        if (this.totalMass > 0) {
            ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
            ctx.beginPath();
            ctx.arc(this.centerOfMass.x, this.centerOfMass.y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 자식 노드 그리기
        if (this.hasChildren) {
            for (const child of this.children) {
                child.draw(ctx);
            }
        }
    }
}

// Barnes-Hut 트리
class BarnesHutTree {
    constructor(x, y, width, height) {
        this.root = new QuadTreeNode(x, y, width, height);
        this.theta = 0.5; // Barnes-Hut 세타 매개변수 (정확도 조절)
    }
    
    // 트리 초기화
    clear() {
        this.root = new QuadTreeNode(
            this.root.x, 
            this.root.y, 
            this.root.width, 
            this.root.height
        );
    }
    
    // 입자 추가
    insert(particle) {
        this.root.insert(particle);
    }
    
    // 입자 배열로 트리 구축
    buildTree(particles) {
        this.clear();
        for (const particle of particles) {
            this.insert(particle);
        }
    }
    
    // Barnes-Hut 알고리즘으로 입자에 작용하는 중력 계산
    calculateForce(particle, G_effective) {
        let acceleration = { x: 0, y: 0 };
        this._calculateForceRecursive(this.root, particle, G_effective, acceleration);
        return acceleration;
    }
    
    // 재귀적으로 중력 계산
    _calculateForceRecursive(node, particle, G_effective, acceleration) {
        // 노드에 입자가 없으면 무시
        if (node.totalMass === 0) return;
        
        // 자기 자신과의 상호작용 제외
        if (node.isLeaf && node.particles.length === 1 && 
            node.particles[0] === particle) return;
        
        // 노드 중심과 입자 사이의 거리 계산
        const dx = node.centerOfMass.x - particle.position.x;
        const dy = node.centerOfMass.y - particle.position.y;
        const distSq = dx * dx + dy * dy;
        
        // 특이점 방지 (너무 가까울 때)
        const minDistSq = (particle.radius * 2) * (particle.radius * 2);
        const effectiveDistSq = Math.max(distSq, minDistSq);
        const distance = Math.sqrt(effectiveDistSq);
        
        // Barnes-Hut 근사 적용 여부 결정
        // s/d < θ 조건 확인 (s는 노드 크기, d는 거리, θ는 임계값)
        const s = Math.max(node.width, node.height);
        
        if (node.isLeaf || (s / distance < this.theta)) {
            // 노드를 하나의 질량으로 근사하여 계산
            // 뉴턴 중력 법칙: F = G*m1*m2/r^2
            const force = (G_effective * particle.mass * node.totalMass) / effectiveDistSq;
            
            // 가속도 계산: a = F/m
            acceleration.x += (force * dx) / (distance * particle.mass);
            acceleration.y += (force * dy) / (distance * particle.mass);
            
            // 응착력 (가까운 거리에서의 추가 인력)
            if (distance < ADHESION_DISTANCE) {
                // 거리에 반비례하는 응착력 (가까울수록 강함)
                const adhesionFactor = 1.0 - (distance / ADHESION_DISTANCE);
                const adhesionForce = ADHESION_STRENGTH * adhesionFactor * particle.mass;
                acceleration.x += (adhesionForce * dx) / (distance * particle.mass);
                acceleration.y += (adhesionForce * dy) / (distance * particle.mass);
            }
        } else {
            // 자식 노드로 재귀 호출하여 더 정확하게 계산
            if (node.hasChildren) {
                for (const child of node.children) {
                    this._calculateForceRecursive(child, particle, G_effective, acceleration);
                }
            }
        }
    }
    
    // 디버깅용 트리 시각화
    draw(ctx) {
        this.root.draw(ctx);
    }
}

// 전역 변수로 Barnes-Hut 트리 선언
let barnesHutTree;

// Barnes-Hut 트리 초기화 함수
function initBarnesHut(canvas) {
    barnesHutTree = new BarnesHutTree(0, 0, canvas.width, canvas.height);
}

// Barnes-Hut로 중력 계산하는 함수
function computeGravitationalAccelerationBarnesHut(particle) {
    const G_effective = G * G_scale;
    return barnesHutTree.calculateForce(particle, G_effective);
}

// 디버깅용 Barnes-Hut 트리 시각화
function drawBarnesHutTree(ctx) {
    barnesHutTree.draw(ctx);
}
