 // Game Configuration
const GRID_SIZE = 20;
const TILE_COUNT = 30; // 30x20 grid = 600x400 canvas roughly, will adjust dynamically
const GAME_SPEED = 100; // ms per frame

// Colors
const COLOR_BG = '#050505';
const COLOR_SNAKE = '#0f0';
const COLOR_FOOD = '#f0f';
const COLOR_FOOD_ALT = '#0ff';

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 1.0; // Alpha
        this.decay = Math.random() * 0.03 + 0.02;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Food {
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.tilesX = Math.floor(canvasWidth / GRID_SIZE);
        this.tilesY = Math.floor(canvasHeight / GRID_SIZE);
        this.position = { x: 5, y: 5 };
        this.spawn();
        this.color = COLOR_FOOD;
        this.pulse = 0;
    }

    spawn(snakeSegments = []) {
        let valid = false;
        while (!valid) {
            this.position.x = Math.floor(Math.random() * this.tilesX);
            this.position.y = Math.floor(Math.random() * this.tilesY);
            
            // Check collision with snake
            valid = true;
            for (let segment of snakeSegments) {
                if (segment.x === this.position.x && segment.y === this.position.y) {
                    valid = false;
                    break;
                }
            }
        }
        this.color = Math.random() > 0.5 ? COLOR_FOOD : COLOR_FOOD_ALT;
    }

    draw(ctx) {
        this.pulse += 0.1;
        const glow = 10 + Math.sin(this.pulse) * 5;
        const x = this.position.x * GRID_SIZE;
        const y = this.position.y * GRID_SIZE;

        ctx.save();
        ctx.shadowBlur = glow;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        
        // Draw orb
        ctx.beginPath();
        ctx.arc(x + GRID_SIZE/2, y + GRID_SIZE/2, GRID_SIZE/2 - 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Snake {
    constructor() {
        this.segments = [{x: 10, y: 10}, {x: 9, y: 10}, {x: 8, y: 10}];
        this.direction = { x: 1, y: 0 }; // Moving right
        this.nextDirection = { x: 1, y: 0 };
        this.growPending = 0;
    }

    setDirection(x, y) {
        // Prevent reversing
        if (this.direction.x + x === 0 && this.direction.y + y === 0) return;
        // Prevent multiple turns in one tick
        this.nextDirection = { x, y };
    }

    update() {
        this.direction = this.nextDirection;
        const head = { x: this.segments[0].x + this.direction.x, y: this.segments[0].y + this.direction.y };
        
        this.segments.unshift(head);
        
        if (this.growPending > 0) {
            this.growPending--;
        } else {
            this.segments.pop();
        }
    }

    grow() {
        this.growPending++;
    }

    checkCollision(width, height) {
        const head = this.segments[0];
        const tilesX = Math.floor(width / GRID_SIZE);
        const tilesY = Math.floor(height / GRID_SIZE);

        // Wall Collision
        if (head.x < 0 || head.x >= tilesX || head.y < 0 || head.y >= tilesY) {
            return true;
        }

        // Self Collision
        for (let i = 1; i < this.segments.length; i++) {
            if (head.x === this.segments[i].x && head.y === this.segments[i].y) {
                return true;
            }
        }

        return false;
    }

    draw(ctx) {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = COLOR_SNAKE;
        ctx.strokeStyle = COLOR_SNAKE;
        ctx.lineWidth = GRID_SIZE - 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Draw snake body as a continuous line
        ctx.beginPath();
        if (this.segments.length > 0) {
            const startX = this.segments[0].x * GRID_SIZE + GRID_SIZE/2;
            const startY = this.segments[0].y * GRID_SIZE + GRID_SIZE/2;
            ctx.moveTo(startX, startY);

            for (let i = 1; i < this.segments.length; i++) {
                const x = this.segments[i].x * GRID_SIZE + GRID_SIZE/2;
                const y = this.segments[i].y * GRID_SIZE + GRID_SIZE/2;
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        // Ghost Effect (Shadow/Trail)
        // We can draw the previous positions with lower opacity
        ctx.globalAlpha = 0.2;
        ctx.shadowBlur = 0;
        ctx.lineWidth = GRID_SIZE;
        ctx.stroke(); // Draw again with wider, faint line for blur feel

        ctx.restore();
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize();

        this.scoreElement = document.getElementById('score');
        this.highScoreElement = document.getElementById('high-score');
        this.finalScoreElement = document.getElementById('final-score-value');
        
        this.startModal = document.getElementById('start-modal');
        this.gameOverModal = document.getElementById('game-over-modal');
        this.startBtn = document.getElementById('start-btn');
        this.restartBtn = document.getElementById('restart-btn');

        this.startBtn.addEventListener('click', () => this.start());
        this.restartBtn.addEventListener('click', () => this.restart());
        window.addEventListener('resize', () => this.resize());
        document.addEventListener('keydown', (e) => this.input(e));
        
        // Touch controls
        this.touchStartX = 0;
        this.touchStartY = 0;
        document.addEventListener('touchstart', (e) => {
            this.touchStartX = e.changedTouches[0].screenX;
            this.touchStartY = e.changedTouches[0].screenY;
        }, {passive: false});
        
        document.addEventListener('touchend', (e) => {
            this.handleSwipe(e.changedTouches[0].screenX, e.changedTouches[0].screenY);
        }, {passive: false});

        this.score = 0;
        this.highScore = localStorage.getItem('snakeHighScore') || 0;
        this.updateScoreDisplay();

        this.state = 'MENU'; // MENU, PLAYING, GAMEOVER
        this.lastTime = 0;
        this.particles = [];
        
        // Loop
        requestAnimationFrame((t) => this.loop(t));
    }

    resize() {
        // Make canvas full screen or large container
        const container = document.getElementById('game-container');
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        
        // Ensure even grid
        this.canvas.width -= this.canvas.width % GRID_SIZE;
        this.canvas.height -= this.canvas.height % GRID_SIZE;
    }

    input(e) {
        if (this.state !== 'PLAYING') return;
        
        switch(e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                this.snake.setDirection(0, -1);
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                this.snake.setDirection(0, 1);
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.snake.setDirection(-1, 0);
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                this.snake.setDirection(1, 0);
                break;
        }
    }

    handleSwipe(endX, endY) {
        if (this.state !== 'PLAYING') return;

        const diffX = endX - this.touchStartX;
        const diffY = endY - this.touchStartY;
        const threshold = 30; // Min swipe distance

        if (Math.abs(diffX) > Math.abs(diffY)) {
            // Horizontal swipe
            if (Math.abs(diffX) > threshold) {
                if (diffX > 0) {
                    this.snake.setDirection(1, 0); // Right
                } else {
                    this.snake.setDirection(-1, 0); // Left
                }
            }
        } else {
            // Vertical swipe
            if (Math.abs(diffY) > threshold) {
                if (diffY > 0) {
                    this.snake.setDirection(0, 1); // Down
                } else {
                    this.snake.setDirection(0, -1); // Up
                }
            }
        }
    }

    initEntities() {
        this.snake = new Snake();
        this.food = new Food(this.canvas.width, this.canvas.height);
        this.food.spawn(this.snake.segments);
        this.particles = [];
        this.score = 0;
        this.updateScoreDisplay();
        this.accumulatedTime = 0;
    }

    start() {
        this.initEntities();
        this.state = 'PLAYING';
        this.startModal.classList.add('hidden');
        this.gameOverModal.classList.add('hidden');
    }

    restart() {
        this.start();
    }

    gameOver() {
        this.state = 'GAMEOVER';
        this.gameOverModal.classList.remove('hidden');
        this.finalScoreElement.innerText = this.score;
        
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('snakeHighScore', this.highScore);
            this.updateScoreDisplay();
        }
    }

    updateScoreDisplay() {
        this.scoreElement.innerText = this.score;
        this.highScoreElement.innerText = this.highScore;
    }

    createExplosion(x, y, color) {
        const px = x * GRID_SIZE + GRID_SIZE/2;
        const py = y * GRID_SIZE + GRID_SIZE/2;
        for (let i = 0; i < 20; i++) {
            this.particles.push(new Particle(px, py, color));
        }
    }

    loop(timestamp) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.ctx.fillStyle = COLOR_BG;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Grid (Subtle)
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        for (let x = 0; x <= this.canvas.width; x += GRID_SIZE) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
        }
        for (let y = 0; y <= this.canvas.height; y += GRID_SIZE) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
        }
        this.ctx.stroke();

        if (this.state === 'PLAYING') {
            this.accumulatedTime += deltaTime;
            if (this.accumulatedTime > GAME_SPEED) {
                this.accumulatedTime = 0;
                this.snake.update();

                // Collision with wall/self
                if (this.snake.checkCollision(this.canvas.width, this.canvas.height)) {
                    this.gameOver();
                }

                // Eat Food
                const head = this.snake.segments[0];
                if (head.x === this.food.position.x && head.y === this.food.position.y) {
                    this.score += 10;
                    this.updateScoreDisplay();
                    this.snake.grow();
                    this.createExplosion(this.food.position.x, this.food.position.y, this.food.color);
                    this.food.spawn(this.snake.segments);
                }
            }
        }

        // Draw Entities
        if (this.snake) this.snake.draw(this.ctx);
        if (this.food) this.food.draw(this.ctx);

        // Update & Draw Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.update();
            p.draw(this.ctx);
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        requestAnimationFrame((t) => this.loop(t));
    }
}

// Start Game
window.game = new Game();

