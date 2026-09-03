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

/* Sine first, so the instrument opens on the plainest voice it has. A square
   is buzzy by nature and reads as an effect when you have not asked for one. */
const WAVES = ['sine', 'triangle', 'sawtooth', 'square'];
const NOISES = ['pink', 'brown', 'white'];
const FILTERS = [
  { id: 'lowpass', label: 'LP' },
  { id: 'highpass', label: 'HP' },
  { id: 'bandpass', label: 'BP' },
];

/* Each row is one register. The letters match the original key mapping. */
const ROWS = [
  { id: 'row-up', mul: 2, keys: ['q', 'w', 'e', 'r', 't', 'y', 'u', 'ı'] },
  { id: 'row-base', mul: 1, keys: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k'] },
  { id: 'row-down', mul: 0.5, keys: ['z', 'x', 'c', 'v', 'b', 'n', 'm', 'ö'] },
];

// ---- State -----------------------------------------------------------------

let osc, osc2, noise, delay, delayLoop, reverb, distortion, filter, fft;
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
let detuneCents = 0;
/** Phase of the idle drift line, so the scope is never completely still. */
let drift = 0;

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
  /* p5.SoundLoop hands the callback the offset, in seconds from now, at which
     this step should sound — it fires early on purpose so the note can be
     scheduled ahead on the audio clock. Dropping it made every arpeggio note
     land whenever the main thread got to it, which is audible as an uneven
     arpeggio. Both the pitch change and the envelope take the same offset. */
  osc2.freq(0);
  /* env3, not env1. The loop oscillator was being driven by the KEYBOARD
     envelope, so every key press sounded osc2 as well — at whatever frequency
     it happened to hold, which at startup is 0Hz. A square at 0Hz is a DC step,
     and an envelope-shaped DC pulse on every note is a heavy thump that shoves
     the rest of the chain into distortion. That was the parallel voice heard
     underneath the sine. The loop voice now answers only to the loop. */
  osc2.amp(env3);
  /* Every source and every effect stage is disconnected from the master before
     it is patched onward, so the signal reaches the output by exactly one path.
     p5.Oscillator connects itself to the master when constructed and p5.Effect
     does the same, so without this the raw oscillators AND each stage were all
     being heard in parallel with the chain — several summed copies, bypassing
     the filter, saturator and limiter. That is what made the default sound
     washy no matter how the mixes were set.

     The delays also start dry: p5.Effect constructs as CrossFade(1), fully wet,
     and their internal lowpass sat at 2300Hz, so everything played was a
     comb-filtered, dulled copy of itself. */
  osc.disconnect();
  osc2.disconnect();
  noise.disconnect();

  delay.process(osc, 0.25, 0.4, 8000);
  delay.process(noise, 0.25, 0.4, 8000);
  delayLoop.process(osc2, 0.25, 0.4, 8000);
  delay.drywet(0);
  delayLoop.drywet(0);
  delay.disconnect();
  delayLoop.disconnect();

  reverb.process(delay, 10, 10);
  reverb.process(delayLoop, 10, 10);
  reverb.drywet(0);
  reverb.disconnect();

  distortion.process(reverb);
  distortion.drywet(0);

  /* The filter sits last, after the room, so sweeping it darkens the tails as
     well as the note. Disconnecting the distortion first keeps the dry copy of
     the signal from running past the filter straight to the output. */
  filter = new p5.Filter('lowpass');
  distortion.disconnect();
  filter.process(distortion);

  /* A limiter on the master and a two-band saturator before it — the same
     chain as VMI-001. Both start transparent. */
  saturator = createSaturator(getAudioContext(), { lowCross: 180, highCross: 3200 });
  compressor = new p5.Compressor();
  compressor.set(0.003, 0, 20, -3, 0.15);
  filter.disconnect();
  filter.connect(saturator.input);
  saturator.output.connect(compressor.input);

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
  env1.setRange(Math.max(amp * 0.1, 1e-6), 0);
  /* env3 belongs to the loop and carries the loop Level; setting it here every
     frame overwrote that control. env1 and env2 are the keyboard voice and its
     noise, so those stay. */
  /* Clamped above zero on purpose. p5.Envelope.setRange does
     `this.aLevel = aLevel || 1`, so a level of exactly 0 does not mean silence —
     it means FULL SCALE. The noise slider defaulted to 0.00001, which is not a
     multiple of its own step, so the browser rounded it to 0, and every key
     press then fired white noise at full amplitude alongside the note. */
  env2.setRange(Math.max(noiseLevel, 1e-6), 0);

  background('#0f1412');

  /* Spectrum: columns rising off the floor, warm at the bottom of the range and
     cool at the top, so register is legible at a glance. */
  const spectrum = fft.analyze();
  noStroke();
  const bw = width / spectrum.length;
  for (let i = 0; i < spectrum.length; i++) {
    const level = spectrum[i] / 255;
    const mix = i / spectrum.length;
    fill(217 - mix * 90, 132 + mix * 46, 90 + mix * 106, (0.18 + level * 0.5) * 255);
    rect(i * bw, height - level * height * 0.62, bw + 1, level * height * 0.62);
  }

  // Horizon, so a silent scope still reads as an instrument.
  stroke(188, 207, 182, 36);
  strokeWeight(1);
  line(0, height / 2, width, height / 2);

  /* The waveform is traced twice — a wide soft pass under a thin bright one —
     so the trace glows without needing a blur filter. */
  const form = fft.waveform();
  /* Clipping is read off the mastered waveform, not guessed from the faders. */
  let peak = 0;
  for (let i = 0; i < form.length; i++) { const v = Math.abs(form[i]); if (v > peak) peak = v; }
  if (peak >= 0.99) clipUntil = millis() + 700;
  if (ui.clip) ui.clip.hidden = millis() > clipUntil;
  noFill();
  const trace = (weight, alpha) => {
    stroke(232, 182, 76, alpha);
    strokeWeight(weight);
    beginShape();
    for (let i = 0; i < form.length; i++) {
      vertex(
        map(i, 0, form.length - 1, 0, width),
        map(form[i], -waveScale, waveScale, height, 0)
      );
    }
    endShape();
  };
  trace(5, 40);
  trace(1.5, 255);

  // A slow sine crossing the floor: the panel is alive before the first note.
  drift += 0.006;
  stroke(188, 207, 182, 40);
  strokeWeight(1);
  beginShape();
  for (let x = 0; x <= width; x += 6) {
    vertex(x, height - 10 - Math.sin(x * 0.012 + drift) * 5);
  }
  endShape();
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

function onSoundLoop(timeFromNow) {
  const scale = SCALES[scaleIndex].steps;
  const chord = parseInt(ui.chord.value, 10);

  /* Advance first, so the position and the direction agree on every step. */
  switch (LOOP_DIRECTIONS[loopDir]) {
    case 'down':
      loopPos = (loopPos - 1 + loopSteps) % loopSteps;
      break;
    case 'up-down':
      if (loopBack) {
        loopPos -= 1;
        if (loopPos <= 0) { loopPos = 0; loopBack = false; }
      } else {
        loopPos += 1;
        if (loopPos >= loopSteps - 1) { loopPos = loopSteps - 1; loopBack = true; }
      }
      break;
    case 'random':
      loopPos = Math.floor(Math.random() * loopSteps);
      break;
    default:
      loopPos = (loopPos + 1) % loopSteps;
  }

  /* The figure spans `loopSpan` octaves of the scale. Chord offsets where in
     the scale it starts, so it can sit under or against what is being played. */
  const reach = scale.length * loopSpan;
  const idx = (loopPos + chord) % reach;
  const degree = idx % scale.length;
  const mul = Math.pow(2, Math.floor(idx / scale.length));

  osc2.amp(env3);
  env3.setRange(Math.max(loopLevel * 0.25, 1e-6), 0);
  /* Gate is a fraction of the step, so shortening it shortens the note rather
     than the interval — the loop keeps its tempo either way. */
  env3.setADSR(0.005, soundLoop.interval * loopGate * 0.6, 0.2, soundLoop.interval * loopGate * 0.4);
  /* Detuning the loop voice against the played note is what puts the beat into
     a sustained chord. */
  osc2.freq(
    scale[degree] * ROOT * octave * mul * Math.pow(2, detuneCents / 1200),
    0,
    timeFromNow
  );
  env3.play(osc2, timeFromNow);
}

// ---- Interface -------------------------------------------------------------

/* One writer for every tempo-locked value: both delay times and the arpeggio
   loop interval. Called when the tempo moves as well as when a division is
   picked, which is the point — 1/8 stays an eighth note at any tempo. */
function applyTempoSync() {
  const beat = 60 / bpm;
  const secs = (idx) => DIVISIONS[idx].beats * beat;
  /* p5.Delay allocates a fixed line; keep well inside it. */
  if (delay) delay.delayTime(Math.min(1.9, secs(delayDiv)));
  if (delayLoop) delayLoop.delayTime(Math.min(1.9, secs(loopDiv)));
  if (soundLoop) soundLoop.interval = secs(loopDiv) * 2;
  const d = document.getElementById("delay-div-out");
  const l = document.getElementById("loop-div-out");
  if (d) d.textContent = `${DIVISIONS[delayDiv].label} · ${secs(delayDiv).toFixed(2)}s`;
  if (l) l.textContent = `${DIVISIONS[loopDiv].label} · ${(secs(loopDiv) * 2).toFixed(2)}s`;
}

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
  segmented($('filter-seg'), FILTERS.map((f) => f.label), 0, (i) => filter.setType(FILTERS[i].id));

  slider($('attack'), $('attack-out'), (v) => `${v.toFixed(3)}s`, setEnvelope);
  slider($('decay'), $('decay-out'), (v) => `${v.toFixed(2)}s`, setEnvelope);
  slider($('sustain'), $('sustain-out'), (v) => v.toFixed(2), setEnvelope);
  slider($('release'), $('release-out'), (v) => `${v.toFixed(2)}s`, setEnvelope);

  slider($('cutoff'), $('cutoff-out'), hz, (v) => filter.freq(v, 0.02));
  slider($('res'), $('res-out'), (v) => v.toFixed(1), (v) => filter.res(v));
  slider($('detune'), $('detune-out'), (v) => `${v > 0 ? '+' : ''}${v}¢`, (v) => (detuneCents = v));

  slider($('reverb'), $('reverb-out'), (v) => v.toFixed(2), (v) => reverb.drywet(v));
  slider($('reverb-time'), $('reverb-time-out'), (v) => `${v.toFixed(1)}s`, (v) => reverb.set(v, 10));
  slider($('delay'), $('delay-out'), (v) => (v === 0 ? 'dry' : v.toFixed(2)), (v) => delay.drywet(v));
  slider($('delay-div'), $('delay-div-out'), () => '', (v) => { delayDiv = v; applyTempoSync(); });
  slider($('delay-fb'), $('delay-fb-out'), (v) => v.toFixed(2), (v) => {
    delay.feedback(v);
    delayLoop.feedback(v);
  });
  slider($('drive'), $('drive-out'), (v) => v.toFixed(2), (v) => distortion.drywet(v));
  slider($('drive-amt'), $('drive-amt-out'), (v) => v.toFixed(2), (v) => distortion.set(v, '2x'));
  slider($('volume'), $('volume-out'), (v) => v.toFixed(2), (v) => masterVolume(v, 0.02));
  slider($('loop-delay'), $('loop-delay-out'), (v) => (v === 0 ? 'dry' : v.toFixed(2)), (v) => delayLoop.drywet(v));
  slider($('loop-div'), $('loop-div-out'), () => '', (v) => { loopDiv = v; applyTempoSync(); });
  slider($('loop-steps'), $('loop-steps-out'), (v) => String(v), (v) => {
    loopSteps = v;
    if (loopPos >= loopSteps) loopPos = 0;
  });
  slider($('loop-span'), $('loop-span-out'), (v) => `${v} oct`, (v) => { loopSpan = v; });
  slider($('loop-gate'), $('loop-gate-out'), (v) => v.toFixed(2), (v) => { loopGate = v; });
  slider($('loop-level'), $('loop-level-out'), (v) => v.toFixed(2), (v) => { loopLevel = v; });
  segmented($('loop-dir'), ['UP', 'DN', 'U-D', 'RND'], 0, (idx) => {
    loopDir = idx;
    loopBack = false;
  });
  slider($('tempo'), $('tempo-out'), (v) => `${v} bpm`, (v) => { bpm = v; applyTempoSync(); });
  slider($('sat-low'), $('sat-low-out'), (v) => (v === 0 ? 'off' : v.toFixed(2)), (v) => saturator.setLow(v));
  slider($('sat-high'), $('sat-high-out'), (v) => (v === 0 ? 'off' : v.toFixed(2)), (v) => saturator.setHigh(v));
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

  applyTempoSync();
  ui.clip = document.getElementById("clip");
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

/** Hz reads better as kHz once past a thousand. */
function hz(v) {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}kHz` : `${Math.round(v)}Hz`;
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
/* Musical divisions, in quarter notes. Shared by both delays and the arpeggio
   loop so nothing drifts against anything else when the tempo moves. */
const DIVISIONS = [
  { label: '1/1', beats: 4 },
  { label: '1/2', beats: 2 },
  { label: '1/4.', beats: 1.5 },
  { label: '1/4', beats: 1 },
  { label: '1/8.', beats: 0.75 },
  { label: '1/8', beats: 0.5 },
  { label: '1/8T', beats: 1 / 3 },
  { label: '1/16', beats: 0.25 },
];
/* ---- Looper ----
   The old loop walked a fixed two-step-at-a-time figure with no control over
   its length, direction or reach, so every setting of Chord produced the same
   shape. It now has a length, a direction, an octave range and its own gate and
   level, and it walks degrees of the SELECTED SCALE rather than a fixed table —
   change scale and the same figure is reinterpreted. */
const LOOP_DIRECTIONS = ['up', 'down', 'up-down', 'random'];
let loopSteps = 8;
let loopDir = 0;
let loopSpan = 1;
let loopGate = 0.5;
let loopLevel = 0.5;
/* Position within the figure, and which way a ping-pong is currently going. */
let loopPos = 0;
let loopBack = false;

let bpm = 90;
let delayDiv = 5;
let loopDiv = 3;
let compressor, saturator;
let clipUntil = 0;

