let amp, osc, delay, env1, env2, osc2;
let oscind = 0;
let drywetreverb = 0;
let reverb;
let reverb1;
let dt = 0.0;
let root2 = 32.7;
let stat = 0;
let ind1 = 0;
let comp;
let master;
let tab1 = false;
let img;
let distortion;
let distortion2;
let playerAmp;
let oct = 5;
let lpfilter;
let sound;
let vol = 0.001;
let freqfilter;
let slider1,
  slider2,
  slider3,
  slider4,
  slider5,
  slider6,
  slider7,
  slider8,
  slider9,
  slider10;
let button1, button2, button3, button4, button5;
let rectangles;
let r;
let ind;
let on = 5;
let scind = 0;
let det = [
  1, 1.059, 1.122, 1.189, 1.259, 1.334, 1.414, 1.498, 1.587, 1.681, 1.782,
  1.887, 2,
];
let maj = [det[0], det[2], det[4], det[5], det[7], det[9], det[11], det[12]];
let minNat = [det[0], det[2], det[3], det[5], det[7], det[8], det[10], det[12]];
let minHar = [det[0], det[2], det[3], det[5], det[7], det[8], det[11], det[12]];
let cs = [];
let noise;
let color1, color2;
let intervalInSeconds = 2;
let synth, soundLoop;
let notePattern;
let stepnumber = 0;
let chord = 0;
let delayLoop;
let noiseind = 0;

function preload() {
  font = loadFont("libraries/font.ttf");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  background("#231709");
  fft = new p5.FFT();
  amp = 0;
  lpfilter = new p5.BandPass();
  reverb1 = new p5.Reverb();
  comp = new p5.Compressor();
  delay = new p5.Delay();
  delayLoop = new p5.Delay();
  osc = new p5.Oscillator("square");
  osc2 = new p5.Oscillator("square");
  noise = new p5.Noise("white");

  env1 = new p5.Envelope(0.001, 0.3, 0.3, 0.02);
  env2 = new p5.Envelope(0.001, 0.3, 0.3, 0.02);
  env3 = new p5.Envelope(0.001, 0.3, 0.3, 0.02);

  distortion = new p5.Distortion(1, "2x");

  osc.freq(0);
  osc.amp(env1);
  osc2.freq(0);
  osc2.amp(env1);
  delay.process(osc, 0.82, 0.7, 2300);
  delayLoop.process(osc2, 0.82, 0.7, 2300);
  delay.process(noise, 0.82, 0.7, 2300);
  reverb1.process(delay, 10, 10);
  reverb1.process(delayLoop, 10, 10);
  distortion.process(reverb1);

  slider1 = createSlider(0, 1, 0, 0.1);
  slider1.position(windowWidth / 23, windowHeight / 1.7);
  slider2 = createSlider(0, 1, 0, 0.1);
  slider2.position(windowWidth / 4.1, windowHeight / 1.7);

  slider3 = createSlider(0.001, 1, 0.001, 0.01);
  slider3.position(windowWidth / 1200, windowHeight / 1.15);

  slider4 = createSlider(0.1, 3, 0.1, 0.01);
  slider4.position(windowWidth / 9.6, windowHeight / 1.15);

  slider5 = createSlider(0.1, 1, 0.1, 0.01);
  slider5.position(windowWidth / 4.8, windowHeight / 1.15);

  slider6 = createSlider(0.001, 3, 0.001, 0.01);
  slider6.position(windowWidth / 3.2, windowHeight / 1.15);

  slider7 = createSlider(0.000001, 0.03, 0.00001, 0.0001);
  slider7.position(windowWidth / 2.45, windowHeight / 1.15);

  slider8 = createSlider(0, 6, 0, 1);
  slider8.position(windowWidth / 10, windowHeight / 1.49);
  slider9 = createSlider(0, 1, 0, 0.1);
  slider9.position(windowWidth / 3.3, windowHeight / 1.49);

  slider10 = createSlider(0, 1, 0, 0.1);
  slider10.position(windowWidth / 1.93, windowHeight / 1.49);

  slider3.style("transform: rotate(" + 270 + "deg");
  slider4.style("transform: rotate(" + 270 + "deg");
  slider5.style("transform: rotate(" + 270 + "deg");
  slider6.style("transform: rotate(" + 270 + "deg");
  slider7.style("transform: rotate(" + 270 + "deg");
  //slider10.style("transform: rotate(" + 270 + "deg");

  color1 = "#750000"; // 17,255,196
  color2 = "#000000"; // 0,5,75
  button1 = createButton("Octave Down");
  button1.mousePressed(changeOctDown);
  button1.style("color", color1);
  button1.style("background-color", color2);
  button1.style("border-color", color1);

  button2 = createButton("Octave Up");
  button2.mousePressed(changeOctUp);
  button2.style("color", color1);
  button2.style("background-color", color2);
  button2.style("border-color", color1);
  // Rgb : rgb(24,105,244)
  button3 = createButton("Wave Type");
  button3.mousePressed(waveType);
  button3.style("color", color1);
  button3.style("background-color", color2);
  button3.style("border-color", color1);

  button4 = createButton("Scale Type");
  button4.mousePressed(scaleType);
  button4.style("color", color1);
  button4.style("background-color", color2);
  button4.style("border-color", color1);

  button5 = createButton("START THE SOUND (Click)");
  button5.mousePressed(starT);
  button5.style("color", "#f5ef71");
  button5.style("background-color", color1);
  button5.style("border-color", "#f5ef71");

  button6 = createButton("Loop");
  button6.mousePressed(loopSound);
  button6.style("color", color1);
  button6.style("background-color", color2);
  button6.style("border-color", color1);

  button7 = createButton("Noise Type");
  button7.mousePressed(noiseType);
  button7.style("color", color1);
  button7.style("background-color", color2);
  button7.style("border-color", color1);

  button1.position(windowWidth / 1.87, windowHeight / 2 + windowHeight / 26);
  button2.position(windowWidth / 1.6, windowHeight / 2 + windowHeight / 26);
  button5.position(windowWidth / 1.4, windowHeight / 2 + windowHeight / 27);
  button4.position(windowWidth / 1.16, windowHeight / 2 + windowHeight / 4);
  button3.position(windowWidth / 1.425, windowHeight / 2 + windowHeight / 4);
  button7.position(windowWidth / 1.86, windowHeight / 2 + windowHeight / 4);
  button6.position(20, windowHeight / 1.6);

  button1.style("height", windowHeight / 16 + "px");
  button2.style("height", windowHeight / 16 + "px");
  button3.style("height", windowHeight / 8.4 + "px");
  button3.style("width", windowWidth / 8 + "px");
  button2.style("width", windowWidth / 16 + "px");
  button1.style("width", windowWidth / 16 + "px");
  button4.style("height", windowHeight / 8.4 + "px");
  button4.style("width", windowWidth / 8 + "px");
  button5.style("height", windowHeight / 7.9 + "px");
  button5.style("width", windowWidth / 8 + "px");
  button6.style("height", windowHeight / 16 + "px");
  button6.style("width", windowWidth / 16 + "px");
  button7.style("height", windowHeight / 8.4 + "px");
  button7.style("width", windowWidth / 8 + "px");

  button1.style("font-size", windowWidth / 70 + "px");
  button2.style("font-size", windowWidth / 70 + "px");

  textFont(font);
  textSize(windowWidth / 28);
  textAlign(CENTER, CENTER);

  soundLoop = new p5.SoundLoop(onSoundLoop, intervalInSeconds);
}
function draw() {
  var scaler;
  delay.delayTime(slider2.value());
  delayLoop.delayTime(slider9.value());
  chord = slider8.value();

  //lpfilter.freq(freqfilter);
  env1.setADSR(
    slider3.value(),
    slider4.value(),
    slider5.value(),
    slider6.value()
  );
  env2.setADSR(
    slider3.value(),
    slider4.value(),
    slider5.value(),
    slider6.value()
  );
  vol = slider7.value();
  push();
  strokeWeight(5);
  stroke("#f5ef71");
  fill(0);
  //rect(5, 5, windowWidth / 2 - 5, windowHeight / 2);
  rect(
    windowWidth / 1.85,
    windowHeight / 1.09,
    windowWidth / 8.2,
    windowHeight / 13
  );
  rect(
    windowWidth / 1.155,
    windowHeight / 1.09,
    windowWidth / 8.2,
    windowHeight / 14
  );
  rect(
    windowWidth / 1.42,
    windowHeight / 1.09,
    windowWidth / 8.2,
    windowHeight / 14
  );
  pop();
  //noStoke();
  fill("#3b0000");

  if (oscind == 0) {
    osc.setType("square");
    osc2.setType("square");
    amp = 1;
    scaler = 1;
    text("Square", windowWidth / 1.31, windowHeight / 1.055);
  }
  if (oscind == 1) {
    osc.setType("sine");
    osc2.setType("sine");
    amp = 2;
    scaler = 2;
    text("Sine", windowWidth / 1.31, windowHeight / 1.055);
  }
  if (oscind == 2) {
    osc.setType("sawtooth");
    osc2.setType("sawtooth");
    amp = 1;
    scaler = 1;
    text("Sawtooth", windowWidth / 1.31, windowHeight / 1.055);
  }
  if (oscind == 3) {
    osc.setType("triangle");
    osc2.setType("triangle");
    amp = 2;
    scaler = 2;
    text("Triangle", windowWidth / 1.31, windowHeight / 1.055);
  }
  if (scind == 0) {
    cs = maj;
    text("Maj", windowWidth / 1.082, windowHeight / 1.055);
  }
  if (scind == 1) {
    cs = minNat;
    text("Nat.Min", windowWidth / 1.082, windowHeight / 1.055);
  }
  if (scind == 2) {
    cs = minHar;
    text("Har.min", windowWidth / 1.082, windowHeight / 1.055);
  }

  if (noiseind == 0) {
    noise.setType("pink");
    vol = slider7.value() * 2;
    push();
    stroke("#f5ef71");
    text("Pink", windowWidth / 1.66, windowHeight / 1.055);
    pop();
  }
  if (noiseind == 1) {
    noise.setType("brown");
    vol = slider7.value() * 2;
    push();
    stroke("#f5ef71");
    text("Brown", windowWidth / 1.66, windowHeight / 1.055);
    pop();
  }
  if (noiseind == 2) {
    noise.setType("white");
    push();
    stroke("#f5ef71");
    text("White", windowWidth / 1.66, windowHeight / 1.055);
    pop();
  }
  env1.setRange(amp * 0.1, 0);
  env3.setRange(amp * 0.2, 0);
  env2.setRange(vol, 0);

  //background(0);
  push();

  pop();
  fill(0, 0, 0);
  rect(5, 5, windowWidth / 2 - 5, windowHeight / 2);
  rect(windowWidth / 2, 5, windowWidth / 2 - 5, windowHeight / 2);
  push();
  pop();
  let spectrum = fft.analyze();
  noStroke();

  for (let i = 0; i < spectrum.length; i++) {
    //console.log(i);
    fill("#750000");
    let x = map(i, 0, spectrum.length, 0, windowWidth / 2);
    let h = -windowHeight + map(spectrum[i], 0, 255, windowHeight, 0);
    //on = h;
    rect(x, windowHeight / 2, windowWidth / 2 / spectrum.length, h / 2);
  }

  let waveform = fft.waveform();
  noFill();
  beginShape();
  stroke("#f5ef71");
  strokeWeight(1);

  for (let i = 0; i < waveform.length; i++) {
    let x = map(i, 0, waveform.length, 0, windowWidth);
    let y = map(waveform[i], -scaler, scaler, 0, windowHeight);
    vertex(windowWidth - x / 2, y / 2);
  }
  endShape();
  reverb1.drywet(slider1.value());
  distortion.drywet(slider10.value());
  push();
  stroke("#f5ef71");
  strokeWeight(10);
  rect(5, 5, windowWidth / 2 - 5, windowHeight / 2);
  rect(windowWidth / 2, 5, windowWidth / 2 - 5, windowHeight / 2);
  rect(5, windowHeight / 2 + 5, windowWidth - 10, windowHeight / 5);

  rect(
    windowWidth / 1.16,
    windowHeight / 2 + 5,
    windowWidth - 10,
    windowHeight / 5
  );
  rect(
    windowWidth / 2,
    windowHeight / 2 + 5,
    windowWidth - 10,
    windowHeight / 5
  );
  pop();

  //cs = maj;
  // console.log(cs);
  // noLoop();
  text("Reverb", windowWidth / 7.5, windowHeight / 1.82);
  text("Delay", windowWidth / 3.1, windowHeight / 1.82);
  text("Atc", windowWidth / 12, windowHeight / 1.32);
  text("Dec", windowWidth / 5.4, windowHeight / 1.32);
  text("Sus", windowWidth / 3.45, windowHeight / 1.32);
  text("Rel", windowWidth / 2.55, windowHeight / 1.32);
  text("Nois", windowWidth / 2.08, windowHeight / 1.32);
  text("Chord", windowWidth / 5.5, windowHeight / 1.57);
  text("Loop Delay", windowWidth / 2.55, windowHeight / 1.57);
  text("Distortion", windowWidth / 1.64, windowHeight / 1.57);
}

function starT() {
  osc.start();
  osc2.start();
  noise.start();
  noise.amp(env2);
  //on = 5;
  for (i = 0; i < 10; i++) {
    stroke(i * 60.3, i * 17.2, 0);
    //stroke(i * random(0, 25), i * random(0, 10), 0);
    noFill();
    ellipse(
      windowWidth / 1.08,
      windowHeight / 2 + windowHeight / 15,
      (i * on) / 2
    );
    ellipse(
      windowWidth / 1.08,
      windowHeight / 2 + windowHeight / 7,
      i * on * 1
    );
  }
}

function keyTyped() {
  if (key === "a") {
    osc.freq(root2 * oct * cs[0]);
    env1.play();
    env2.play();
  } else if (key === "s") {
    osc.freq(root2 * cs[1] * oct);
    env1.play();
    env2.play();
  } else if (key === "d") {
    osc.freq(root2 * cs[2] * oct);
    env1.play();
    env2.play();
  } else if (key === "f") {
    osc.freq(root2 * cs[3] * oct);
    env1.play();
    env2.play();
  } else if (key === "g") {
    osc.freq(root2 * cs[4] * oct);
    env1.play();
    env2.play();
  } else if (key === "h") {
    osc.freq(root2 * cs[5] * oct);
    env1.play();
    env2.play();
  } else if (key === "j") {
    osc.freq(root2 * cs[6] * oct);
    env1.play();
    env2.play();
  } else if (key === "k") {
    osc.freq(root2 * 2 * oct);
    env1.play();
    env2.play();
  } else if (key === "z") {
    osc.freq((root2 * oct) / 2);
    env1.play();
    env2.play();
  } else if (key === "x") {
    osc.freq((root2 * cs[1] * oct) / 2);
    env1.play();
    env2.play();
  } else if (key === "c") {
    osc.freq((root2 * cs[2] * oct) / 2);
    env1.play();
    env2.play();
  } else if (key === "v") {
    osc.freq((root2 * cs[3] * oct) / 2);
    env1.play();
    env2.play();
  } else if (key === "b") {
    osc.freq((root2 * cs[4] * oct) / 2);
    env1.play();
    env2.play();
  } else if (key === "n") {
    osc.freq((root2 * cs[5] * oct) / 2);
    env1.play();
    env2.play();
  } else if (key === "m") {
    osc.freq((root2 * cs[6] * oct) / 2);
    env1.play();
    env2.play();
  } else if (key === "ö") {
    osc.freq((root2 * 2 * oct) / 2);
    env1.play();
    env2.play();
  } else if (key === "q") {
    osc.freq(root2 * oct * 2);
    env1.play();
    env2.play();
  } else if (key === "w") {
    osc.freq(root2 * cs[1] * oct * 2);
    env1.play();
    env2.play();
  } else if (key === "e") {
    osc.freq(root2 * cs[2] * oct * 2);
    env1.play();
    env2.play();
  } else if (key === "r") {
    osc.freq(root2 * cs[3] * oct * 2);
    env1.play();
    env2.play();
  } else if (key === "t") {
    osc.freq(root2 * cs[4] * oct * 2);
    env1.play();
    env2.play();
  } else if (key === "y") {
    osc.freq(root2 * cs[5] * oct * 2);
    env1.play();
    env2.play();
  } else if (key === "u") {
    osc.freq(root2 * cs[6] * oct * 2);
    env1.play();
    env2.play();
  } else if (key === "ı") {
    osc.freq(root2 * 2 * oct * 2);
    env1.play();
    env2.play();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  background("#231709");
  slider1.position(windowWidth / 23, windowHeight / 1.7);
  slider2.position(windowWidth / 4.1, windowHeight / 1.7);
  slider3.position(windowWidth / 1200, windowHeight / 1.15);
  slider4.position(windowWidth / 9.6, windowHeight / 1.15);
  slider5.position(windowWidth / 4.8, windowHeight / 1.15);
  slider6.position(windowWidth / 3.2, windowHeight / 1.15);
  slider7.position(windowWidth / 2.45, windowHeight / 1.15);
  slider8.position(windowWidth / 10, windowHeight / 1.49);
  slider9.position(windowWidth / 3.3, windowHeight / 1.49);
  slider10.position(windowWidth / 1.93, windowHeight / 1.49);
  button1.position(windowWidth / 1.87, windowHeight / 2 + windowHeight / 26);
  button2.position(windowWidth / 1.6, windowHeight / 2 + windowHeight / 26);
  button5.position(windowWidth / 1.4, windowHeight / 2 + windowHeight / 27);
  button4.position(windowWidth / 1.16, windowHeight / 2 + windowHeight / 4);
  button3.position(windowWidth / 1.425, windowHeight / 2 + windowHeight / 4);
  button7.position(windowWidth / 1.86, windowHeight / 2 + windowHeight / 4);
  button6.position(20, windowHeight / 1.6);

  button1.style("height", windowHeight / 16 + "px");
  button2.style("height", windowHeight / 16 + "px");
  button3.style("height", windowHeight / 8.4 + "px");
  button3.style("width", windowWidth / 8 + "px");
  button2.style("width", windowWidth / 16 + "px");
  button1.style("width", windowWidth / 16 + "px");
  button1.style("font-size", windowWidth / 70 + "px");
  button2.style("font-size", windowWidth / 70 + "px");
  button4.style("height", windowHeight / 8.4 + "px");
  button4.style("width", windowWidth / 8 + "px");
  button4.style("height", windowHeight / 8.4 + "px");
  button5.style("width", windowWidth / 8 + "px");
  button5.style("height", windowHeight / 7.9 + "px");
  button6.style("width", windowWidth / 16 + "px");
  button6.style("height", windowHeight / 16 + "px");
  button7.style("height", windowHeight / 8.4 + "px");
  button7.style("width", windowWidth / 8 + "px");

  textSize(width / 39);
}

function changeOctDown() {
  oct = oct / 2;
}

function changeOctUp() {
  oct = oct * 2;
}
function waveType() {
  oscind = oscind + 1;
  if (oscind > 3) {
    oscind = 0;
  }
}
function scaleType() {
  scind = scind + 1;
  if (scind > 2) {
    scind = 0;
  }
}

function noiseType() {
  noiseind = noiseind + 1;
  if (noiseind > 2) {
    noiseind = 0;
  }
}
function loopSound() {
  // ensure audio is enabled
  userStartAudio();

  if (soundLoop.isPlaying) {
    soundLoop.stop();
  } else {
    // start the loop
    soundLoop.start();
  }
}

function onSoundLoop(timeFromNow) {
  //let noteIndex = (soundLoop.iterations - 1) % notePattern.length;

  if (stepnumber > 4 + chord) {
    stepnumber = 0 + chord;
    if (stepnumber > 7) {
      stepnumber = stepnumber - 8;
    }
  }
  var noteindex = stepnumber;
  var octloop = oct;
  if (noteindex > 7) {
    noteindex = noteindex - 8;
    octloop = octloop * 2;
  }
  let note = cs[noteindex] * root2 * octloop;
  osc2.amp(env3);

  osc2.freq(note);

  // env1.play();
  // env2.play();

  env3.play();
  //background(noteIndex * 360 / notePattern.length, 50, 100);
  stepnumber = stepnumber + 2;

  // console.log(noteindex);
  // console.log(octloop);
}
