const hostname = window.location.hostname || "localhost";

document.title = hostname;

document.getElementById("logoText").textContent = hostname;
document.getElementById("logoShine").textContent = hostname;

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const logoWrap = document.getElementById("logoWrap");

let width = 0;
let height = 0;
let dpr = 1;

let time = 0;

const PARTICLE_COUNT = 170;
const particles = [];

const mouse = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    active: false
};


function resize() {
    width = window.innerWidth;
    height = window.innerHeight;

    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
    );

    if (!mouse.active) {
        mouse.x = width / 2;
        mouse.y = height / 2;
        mouse.targetX = width / 2;
        mouse.targetY = height / 2;
    }
}


window.addEventListener("mousemove", event => {
    mouse.targetX = event.clientX;
    mouse.targetY = event.clientY;
    mouse.active = true;
});


window.addEventListener("mouseleave", () => {
    mouse.active = false;

    mouse.targetX = width / 2;
    mouse.targetY = height / 2;
});


window.addEventListener(
    "touchmove",
    event => {
        if (!event.touches.length) {
            return;
        }

        mouse.targetX = event.touches[0].clientX;
        mouse.targetY = event.touches[0].clientY;
        mouse.active = true;
    },
    { passive: true }
);


class Particle {

    constructor() {
        this.reset();
    }

    reset() {

        const angle =
            Math.random() *
            Math.PI *
            2;

        const radius =
            Math.pow(Math.random(), .55) *
            Math.min(width, height) *
            .55;

        this.x =
            width / 2 +
            Math.cos(angle) *
            radius;

        this.y =
            height / 2 +
            Math.sin(angle) *
            radius;

        this.angle = angle;
        this.radius = radius;

        this.orbit =
            Math.random() * .0015 +
            .0004;

        this.size =
            Math.random() * 1.8 +
            .2;

        this.alpha =
            Math.random() * .65 +
            .08;

        this.phase =
            Math.random() *
            Math.PI *
            2;
    }


    update() {

        const cx = width / 2;
        const cy = height / 2;

        this.angle += this.orbit;

        const targetX =
            cx +
            Math.cos(this.angle) *
            this.radius;

        const targetY =
            cy +
            Math.sin(this.angle) *
            this.radius *
            .65;

        this.x +=
            (targetX - this.x) *
            .0025;

        this.y +=
            (targetY - this.y) *
            .0025;


        const mx =
            mouse.x - this.x;

        const my =
            mouse.y - this.y;

        const distance =
            Math.sqrt(
                mx * mx +
                my * my
            );


        if (distance < 280) {

            const force =
                (1 - distance / 280) *
                .9;

            this.x -=
                (mx / (distance || 1)) *
                force;

            this.y -=
                (my / (distance || 1)) *
                force;

            this.x +=
                (-my / (distance || 1)) *
                force *
                .7;

            this.y +=
                (mx / (distance || 1)) *
                force *
                .7;
        }


        this.phase += .015;

        this.x +=
            Math.sin(this.phase) *
            .12;

        this.y +=
            Math.cos(this.phase * .8) *
            .12;
    }


    draw() {

        const pulse =
            .7 +
            Math.sin(this.phase) *
            .3;

        ctx.beginPath();

        ctx.arc(
            this.x,
            this.y,
            this.size,
            0,
            Math.PI * 2
        );

        ctx.fillStyle =
            `rgba(
                90,
                130,
                255,
                ${this.alpha * pulse}
            )`;

        ctx.fill();
    }
}


function createParticles() {

    particles.length = 0;

    for (
        let i = 0;
        i < PARTICLE_COUNT;
        i++
    ) {
        particles.push(
            new Particle()
        );
    }
}


function drawCenterGlow() {

    const gradient =
        ctx.createRadialGradient(
            width / 2,
            height / 2,
            0,
            width / 2,
            height / 2,
            Math.max(width, height) * .65
        );

    gradient.addColorStop(
        0,
        "rgba(55,80,255,.12)"
    );

    gradient.addColorStop(
        .3,
        "rgba(60,60,255,.06)"
    );

    gradient.addColorStop(
        .6,
        "rgba(100,30,255,.025)"
    );

    gradient.addColorStop(
        1,
        "rgba(0,0,0,0)"
    );

    ctx.fillStyle = gradient;

    ctx.fillRect(
        0,
        0,
        width,
        height
    );
}


function drawEnergyField() {

    const cx = width / 2;
    const cy = height / 2;

    for (
        let layer = 0;
        layer < 8;
        layer++
    ) {

        ctx.beginPath();

        for (
            let x = -100;
            x <= width + 100;
            x += 7
        ) {

            const nx =
                (x - cx) / width;

            const wave1 =
                Math.sin(
                    nx * 10 +
                    time * .0007 +
                    layer
                );

            const wave2 =
                Math.sin(
                    nx * 25 -
                    time * .001 +
                    layer * 2
                );

            const envelope =
                Math.exp(
                    -nx * nx *
                    (1.8 + layer * .05)
                );

            const y =
                cy +
                (wave1 * 35 + wave2 * 14) *
                envelope;

            if (x === -100) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.strokeStyle =
            `rgba(
                ${55 + layer * 8},
                ${90 + layer * 3},
                255,
                ${.018 + layer * .006}
            )`;

        ctx.lineWidth =
            1 + layer * .5;

        ctx.stroke();
    }
}


function connectParticles() {

    const maxDistance = 115;

    for (
        let i = 0;
        i < particles.length;
        i++
    ) {

        for (
            let j = i + 1;
            j < particles.length;
            j++
        ) {

            const a = particles[i];
            const b = particles[j];

            const dx = a.x - b.x;
            const dy = a.y - b.y;

            const distance =
                Math.sqrt(
                    dx * dx +
                    dy * dy
                );

            if (distance < maxDistance) {

                const opacity =
                    (1 - distance / maxDistance) *
                    .055;

                ctx.beginPath();

                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);

                ctx.strokeStyle =
                    `rgba(
                        90,
                        120,
                        255,
                        ${opacity}
                    )`;

                ctx.lineWidth = .45;

                ctx.stroke();
            }
        }
    }
}


function drawFlashes() {

    for (let i = 0; i < 4; i++) {

        const angle =
            time * .0001 * (i + 1) +
            i * 1.7;

        const radius =
            Math.min(width, height) *
            (.25 + i * .08);

        const x =
            width / 2 +
            Math.cos(angle) *
            radius;

        const y =
            height / 2 +
            Math.sin(angle) *
            radius *
            .6;

        const glow =
            ctx.createRadialGradient(
                x,
                y,
                0,
                x,
                y,
                35
            );

        glow.addColorStop(
            0,
            "rgba(180,210,255,.45)"
        );

        glow.addColorStop(
            .15,
            "rgba(100,130,255,.18)"
        );

        glow.addColorStop(
            1,
            "rgba(0,0,0,0)"
        );

        ctx.fillStyle = glow;

        ctx.fillRect(
            x - 40,
            y - 40,
            80,
            80
        );
    }
}


function animate(timestamp) {

    time = timestamp;

    mouse.x +=
        (mouse.targetX - mouse.x) *
        .06;

    mouse.y +=
        (mouse.targetY - mouse.y) *
        .06;


    ctx.clearRect(
        0,
        0,
        width,
        height
    );


    const background =
        ctx.createRadialGradient(
            width / 2,
            height / 2,
            0,
            width / 2,
            height / 2,
            Math.max(width, height) * .8
        );

    background.addColorStop(
        0,
        "#050817"
    );

    background.addColorStop(
        .3,
        "#02040e"
    );

    background.addColorStop(
        .7,
        "#010107"
    );

    background.addColorStop(
        1,
        "#000000"
    );

    ctx.fillStyle = background;

    ctx.fillRect(
        0,
        0,
        width,
        height
    );


    drawCenterGlow();
    drawEnergyField();
    drawFlashes();


    for (const particle of particles) {
        particle.update();
    }

    connectParticles();

    for (const particle of particles) {
        particle.draw();
    }


    const dx =
        mouse.x - width / 2;

    const dy =
        mouse.y - height / 2;

    const rotateX =
        -(dy / height) * 3;

    const rotateY =
        (dx / width) * 3;

    logoWrap.style.transform =
        `rotateX(${rotateX}deg)
         rotateY(${rotateY}deg)`;


    requestAnimationFrame(animate);
}


resize();
createParticles();

requestAnimationFrame(animate);

window.addEventListener(
    "resize",
    () => {
        resize();
        createParticles();
    }
);