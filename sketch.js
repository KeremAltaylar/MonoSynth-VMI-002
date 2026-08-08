/* VMI-002 — monophonic synthesiser.
   The audio graph is unchanged from the original sketch; the canvas is now only
   an oscilloscope and every control lives in the DOM so it can lay out
   responsively and be played by touch. */

// ---- Tuning ----------------------------------------------------------------

const ROOT = 32.7; // C1
const SEMITONE = [
  1, 1.059, 1.122, 1.189, 1.259, 1.334, 1.414, 1.498, 1.587, 1.681, 1.782, 1.887, 2,
];
const s = (i) => SEMITONE[i];

const SCALES = [
  { label: 'Maj', steps: [s(0), s(2), s(4), s(5), s(7), s(9), s(11), s(12)] },
  { label: 'Nat.min', steps: [s(0), s(2), s(3), s(5), s(7), s(8), s(10), s(12)] },
  { label: 'Har.min', steps: [s(0), s(2), s(3), s(5), s(7), s(8), s(11), s(12)] },
];

const WAVES = ['square', 'sine', 'sawtooth', 'triangle'];
const NOISES = ['pink', 'brown', 'white'];

/* Each row is one register. The letters match the original key mapping. */
const ROWS = [
  { id: 'row-up', mul: 2, keys: ['q', 'w', 'e', 'r', 't', 'y', 'u', 'ı'] },
  { id: 'row-base', mul: 1, keys: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k'] },
  { id: 'row-down', mul: 0.5, keys: ['z', 'x', 'c', 'v', 'b', 'n', 'm', 'ö'] },
];

// ---- State -----------------------------------------------------------------

let osc, osc2, noise, delay, delayLoop, reverb, distortion, fft;
let env1, env2, env3;
let soundLoop;

let audioLive = false;
let waveIndex = 0;
let scaleIndex = 0;
let noiseIndex = 0;
let octave = 5;
let noiseLevel = 0.00001;
let waveScale = 1;
let step = 0;

/** Every control element, looked up once. */
const ui = {};
/** key letter -> { el, mul, degree } */
const keyMap = new Map();

// ---- p5 --------------------------------------------------------------------

function setup() {
  const scope = document.getElementById('scope');
  const c = createCanvas(scope.clientWidth, scope.clientHeight);
  c.parent(scope);

  fft = new p5.FFT();
  reverb = new p5.Reverb();
  delay = new p5.Delay();
  delayLoop = new p5.Delay();
  osc = new p5.Oscillator('square');
  osc2 = new p5.Oscillator('square');
  noise = new p5.Noise('white');

  env1 = new p5.Envelope(0.001, 0.3, 0.3, 0.02);
  env2 = new p5.Envelope(0.001, 0.3, 0.3, 0.02);
  env3 = new p5.Envelope(0.001, 0.3, 0.3, 0.02);

  distortion = new p5.Distortion(1, '2x');

  osc.freq(0);
  osc.amp(env1);
  osc2.freq(0);
  osc2.amp(env1);
  delay.process(osc, 0.82, 0.7, 2300);
  delayLoop.process(osc2, 0.82, 0.7, 2300);
  delay.process(noise, 0.82, 0.7, 2300);
  reverb.process(delay, 10, 10);
  reverb.process(delayLoop, 10, 10);
  distortion.process(reverb);

  soundLoop = new p5.SoundLoop(onSoundLoop, 2);

  buildInterface();
}

function draw() {
  const wave = WAVES[waveIndex];
  osc.setType(wave);
  osc2.setType(wave);
  waveScale = wave === 'sine' || wave === 'triangle' ? 2 : 1;
  noise.setType(NOISES[noiseIndex]);

  const amp = waveScale;
  env1.setRange(amp * 0.1, 0);
  env3.setRange(amp * 0.2, 0);
  env2.setRange(noiseLevel, 0);

  background('#0f1412');

  // Spectrum along the floor.
  const spectrum = fft.analyze();
  noStroke();
  fill('#c4553a');
  const bw = width / spectrum.length;
  for (let i = 0; i < spectrum.length; i++) {
    const h = map(spectrum[i], 0, 255, 0, height * 0.7);
    rect(i * bw, height - h, bw + 1, h);
  }

  // Waveform through the middle.
  const form = fft.waveform();
  noFill();
  stroke('#e8b64c');
  strokeWeight(1.5);
  beginShape();
  for (let i = 0; i < form.length; i++) {
    vertex(
      map(i, 0, form.length - 1, 0, width),
      map(form[i], -waveScale, waveScale, height, 0)
    );
  }
  endShape();

  // Centre line, so a silent scope still reads as an instrument.
  stroke('rgba(188, 207, 182, 0.16)');
  strokeWeight(1);
  line(0, height / 2, width, height / 2);
}

function windowResized() {
  const scope = document.getElementById('scope');
  resizeCanvas(scope.clientWidth, scope.clientHeight);
}

function keyPressed() {
  const entry = keyMap.get(key.toLowerCase());
  if (!entry) return;
  press(entry);
  return false;
}

function keyReleased() {
  const entry = keyMap.get(key.toLowerCase());
  if (entry) entry.el.classList.remove('active');
}

// ---- Sound -----------------------------------------------------------------

function ensureAudio() {
  if (audioLive) return;
  userStartAudio();
  osc.start();
  osc2.start();
  noise.start();
  noise.amp(env2);
  audioLive = true;
  ui.power.textContent = 'Audio on';
  ui.power.classList.add('live');
}

function press(entry) {
  ensureAudio();
  const steps = SCALES[scaleIndex].steps;
  osc.freq(ROOT * octave * entry.mul * steps[entry.degree]);
  env1.play();
  env2.play();
  entry.el.classList.add('active');
}

function onSoundLoop() {
  const chord = parseInt(ui.chord.value, 10);
  if (step > 4 + chord) {
    step = chord;
    if (step > 7) step -= 8;
  }
  let degree = step;
  let mul = 1;
  if (degree > 7) {
    degree -= 8;
    mul = 2;
  }
  osc2.amp(env3);
  osc2.freq(SCALES[scaleIndex].steps[degree] * ROOT * octave * mul);
  env3.play();
  step += 2;
}

// ---- Interface -------------------------------------------------------------

function buildInterface() {
  const $ = (id) => document.getElementById(id);
  Object.assign(ui, {
    app: $('app'),
    power: $('power'),
    keysToggle: $('keys-toggle'),
    dock: $('dock'),
    octaveOut: $('octave-out'),
    chord: $('chord'),
    loopToggle: $('loop-toggle'),
  });

  ui.power.addEventListener('click', ensureAudio);

  ui.keysToggle.addEventListener('click', () => {
    const open = ui.dock.classList.toggle('open');
    ui.app.classList.toggle('dock-open', open);
    ui.keysToggle.setAttribute('aria-expanded', String(open));
    ui.keysToggle.textContent = open ? 'Hide keys' : 'Play keys';
    ui.dock.setAttribute('aria-hidden', String(!open));
  });

  segmented($('wave-seg'), WAVES, waveIndex, (i) => (waveIndex = i));
  segmented($('scale-seg'), SCALES.map((sc) => sc.label), scaleIndex, (i) => (scaleIndex = i));
  segmented($('noise-seg'), NOISES, noiseIndex, (i) => (noiseIndex = i));

  slider($('attack'), $('attack-out'), (v) => `${v.toFixed(3)}s`, setEnvelope);
  slider($('decay'), $('decay-out'), (v) => `${v.toFixed(2)}s`, setEnvelope);
  slider($('sustain'), $('sustain-out'), (v) => v.toFixed(2), setEnvelope);
  slider($('release'), $('release-out'), (v) => `${v.toFixed(2)}s`, setEnvelope);

  slider($('reverb'), $('reverb-out'), (v) => v.toFixed(2), (v) => reverb.drywet(v));
  slider($('delay'), $('delay-out'), (v) => `${v.toFixed(2)}s`, (v) => delay.delayTime(v));
  slider($('drive'), $('drive-out'), (v) => v.toFixed(2), (v) => distortion.drywet(v));
  slider($('loop-delay'), $('loop-delay-out'), (v) => `${v.toFixed(2)}s`, (v) => delayLoop.delayTime(v));
  /* The usable noise range is tiny in absolute terms, so show it as a percentage
     of the slider's span rather than a row of leading zeros. */
  slider($('noise-level'), $('noise-level-out'), (v) => `${Math.round((v / 0.03) * 100)}%`, (v) => (noiseLevel = v));
  slider($('chord'), $('chord-out'), (v) => String(v), () => {});

  $('oct-down').addEventListener('click', () => setOctave(octave / 2));
  $('oct-up').addEventListener('click', () => setOctave(octave * 2));
  setOctave(octave);

  ui.loopToggle.addEventListener('click', () => {
    ensureAudio();
    const playing = soundLoop.isPlaying;
    if (playing) soundLoop.stop();
    else soundLoop.start();
    ui.loopToggle.setAttribute('aria-pressed', String(!playing));
    ui.loopToggle.textContent = playing ? 'Start loop' : 'Stop loop';
  });

  buildKeys();
}

function setEnvelope() {
  const read = (id) => parseFloat(document.getElementById(id).value);
  const adsr = [read('attack'), read('decay'), read('sustain'), read('release')];
  env1.setADSR(...adsr);
  env2.setADSR(...adsr);
}

/* Octave is a doubling multiplier; three registers above and below the default
   keep it inside a usable range. */
function setOctave(next) {
  octave = constrain(next, 1.25, 20);
  ui.octaveOut.textContent = `${Math.round(Math.log2(octave / 5))}`;
}

function segmented(container, labels, initial, onPick) {
  const buttons = labels.map((label, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.setAttribute('aria-pressed', String(i === initial));
    b.addEventListener('click', () => {
      onPick(i);
      buttons.forEach((other, j) => other.setAttribute('aria-pressed', String(i === j)));
    });
    container.appendChild(b);
    return b;
  });
}

function slider(input, output, format, onInput) {
  const apply = () => {
    const v = parseFloat(input.value);
    output.textContent = format(v);
    onInput(v);
  };
  input.addEventListener('input', apply);
  apply();
}

function buildKeys() {
  for (const row of ROWS) {
    const container = document.getElementById(row.id);
    const tone = container.dataset.tone;
    row.keys.forEach((letter, degree) => {
      const el = document.createElement('div');
      el.className = 'key';
      el.style.setProperty('--row-tone', tone);
      el.innerHTML = `<span class="deg">${degree + 1}</span><span class="lbl">${letter}</span>`;

      const entry = { el, mul: row.mul, degree };
      keyMap.set(letter, entry);

      const down = (e) => {
        e.preventDefault();
        press(entry);
      };
      const up = () => el.classList.remove('active');

      el.addEventListener('mousedown', down);
      el.addEventListener('mouseup', up);
      el.addEventListener('mouseleave', up);
      el.addEventListener('touchstart', down, { passive: false });
      el.addEventListener('touchend', up);
      el.addEventListener('touchcancel', up);

      container.appendChild(el);
    });
  }
}
