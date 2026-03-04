// Split-flap counter usando SVGs desde ./assets/0.svg .. ./assets/9.svg

const svgCache = new Map();

function wait(ms){ return new Promise(r => setTimeout(r, ms)); }

function cssMs(varName){
  const root = getComputedStyle(document.documentElement);
  const v = root.getPropertyValue(varName).trim(); // ej "110ms"
  if (v.endsWith("ms")) return parseFloat(v);
  if (v.endsWith("s")) return parseFloat(v) * 1000;
  return 30;
}

function wrapSVG(svgString){
  return `<div class="svgWrap">${svgString}</div>`;
}

async function loadDigitSVG(d){
  if (svgCache.has(d)) return svgCache.get(d);

  const res = await fetch(`./assets/${d}.svg`);
  if (!res.ok) throw new Error(`No pude cargar ./assets/${d}.svg (${res.status})`);

  let txt = await res.text();

  // Limpieza básica para insertar como innerHTML
  txt = txt
    .replace(/<\?xml[\s\S]*?\?>\s*/i, "")
    .replace(/<!--[\s\S]*?-->\s*/g, "")
    .trim();

  svgCache.set(d, txt);
  return txt;
}

async function preloadDigits(){
  await Promise.all([...Array(10)].map((_, d) => loadDigitSVG(d)));
}

class SplitFlapDigit {
  constructor(initial=0){
    this.value = initial;

    this.el = document.createElement("div");
    this.el.className = "digit";
    this.el.innerHTML = `
      <div class="static">
        <div class="half top" data-part="static-top"></div>
        <div class="half bottom" data-part="static-bottom"></div>
      </div>

      <div class="flip">
        <div class="flip-top" data-part="flip-top"></div>
        <div class="flip-bottom" data-part="flip-bottom"></div>
      </div>
    `;

    this.parts = {
      staticTop: this.el.querySelector('[data-part="static-top"]'),
      staticBottom: this.el.querySelector('[data-part="static-bottom"]'),
      flipTop: this.el.querySelector('[data-part="flip-top"]'),
      flipBottom: this.el.querySelector('[data-part="flip-bottom"]'),
    };

    // render inicial (sin bloquear)
    this.renderStatic(this.value);
  }

  async renderStatic(d){
    const svg = await loadDigitSVG(d);
    this.parts.staticTop.innerHTML = wrapSVG(svg);
    this.parts.staticBottom.innerHTML = wrapSVG(svg);
  }

  async flipTo(next){
    if (next === this.value) return;

    const curSvg  = await loadDigitSVG(this.value);
    const nextSvg = await loadDigitSVG(this.value);

    // Capas flip
    this.parts.flipTop.innerHTML = wrapSVG(curSvg);
    this.parts.flipBottom.innerHTML = wrapSVG(nextSvg);

    // Mientras gira: arriba queda el actual, abajo ya muestra el próximo
    this.parts.staticTop.innerHTML = wrapSVG(curSvg);
    this.parts.staticBottom.innerHTML = wrapSVG(nextSvg);

    this.el.classList.add("is-flipping");

    // 2 fases: top y bottom (cada una dura --flip)
    await wait(2 * cssMs("--flip"));

    this.el.classList.remove("is-flipping");
    this.value = next ;

    //await this.renderStatic(this.value);
  }
}

class SplitFlapCounter{
  constructor(container, digits=3, initial=3){
    this.container = container;
    this.digits = [];

    const str = String(initial).padStart(digits, "0").slice(-digits);
    for(let i=0;i<digits;i++){
      const d = new SplitFlapDigit(parseInt(str[i], 10));
      this.digits.push(d);
      container.appendChild(d.el);
    }
  }

  async animateTo(target, { stepDelay=3, cycles=1 } = {}){
    const digitsCount = this.digits.length;
    const padded = String(target).replace(/\D/g,"").padStart(digitsCount, "0").slice(-digitsCount);

    // paralelo tipo tablero
    await Promise.all(
      this.digits.map((digit, idx) => {
        const final = parseInt(padded[idx], 10);
        return this.flipDigitWithCycles(digit, final, cycles, stepDelay);
      })
    );
  }

  async flipDigitWithCycles(digit, final, cycles, stepDelay){
    let current = digit.value;
    const totalSteps = cycles * 10 + ((final + 1 - current + 10) % 10);

    for(let i=0;i<totalSteps;i++){
      const next = (current + 1 ) % 10;
      await digit.flipTo(next);
      current = next;
      if (stepDelay > 0) await wait(stepDelay);
    }
  }
}

// --- Bootstrap demo ---
await preloadDigits();

const counterEl = document.getElementById("counter");
const randomNumber = Math.round(Math.random() * 100)
const counter = new SplitFlapCounter(counterEl, 3, randomNumber);

async function contador() {
    const asuncion = new Date('2027-12-10T00:00:00')
    const today = new Date()
    const diferenciaMs = asuncion - today
    const t = Math.floor(diferenciaMs / (1000 * 60 * 60 *24))
    document.title = "Faltan " + t + " días"
    await counter.animateTo(t, { cycles: 1, stepDelay: 1 });
}

window.onload(contador())