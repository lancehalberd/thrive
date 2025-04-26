import { noteFrequencies } from 'app/utils/noteFrequencies';

// Safari uses webkitAudioContext instead of AudioContext.
const audioContext: AudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
// @ts-ignore
window['audioContext'] = audioContext;

interface SFX {
    play: () => void
}

const sounds = new Map<string, SFX>();
// @ts-ignore
window['sounds'] = sounds;


const tracks: {[key: string]: any} = {};
// @ts-ignore
window['tracks'] = tracks;

export function playSound(state: GameState, key: string) {
    const sfx = sounds.get(key);
    if (sfx) {
        sfx.play();
    }
}

let currentTrack: any;
export function playTrack(state: GameState, key: string) {
    if (currentTrack?.isPlaying) {
        currentTrack.stop();
        currentTrack = undefined;
    }
    const track = tracks[key];
    if (track) {
        track.play(state, 0.3);
        currentTrack = track;
    }
}



function makeDistortionCurve(amount: number) {
  let k = typeof amount === 'number' ? amount : 50,
    n_samples = 44100,
    curve = new Float32Array(n_samples),
    deg = Math.PI / 180,
    i = 0,
    x;
  for ( ; i < n_samples; ++i ) {
    x = i * 2 / n_samples - 1;
    curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
  }
  return curve;
};
const distortionCurve = makeDistortionCurve(50);

// Plays beeps in sequence
function playBeeps(inputFrequencies: number[], volume: number, duration: number, {smooth=false, swell=false, taper=false, distortion=false}) {
    const frequencies = Float32Array.from(inputFrequencies);
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'square';
    if (smooth) oscillator.frequency.setValueCurveAtTime(frequencies, audioContext.currentTime, duration);
    else {
        for (var i = 0; i < frequencies.length; i++) {
            oscillator.frequency.setValueAtTime(frequencies[i], audioContext.currentTime + duration * i / frequencies.length);
        }
    }
    let lastNode:AudioNode = oscillator;
    if (distortion) {
        const distortionNode = audioContext.createWaveShaper();
        distortionNode.curve = distortionCurve;
        distortionNode.oversample = '4x';
        lastNode.connect(distortionNode);
        lastNode = distortionNode;
    }

    const gainNode = audioContext.createGain();
    if (swell) {
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + duration * .1);
    } else {
        gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    }
    if (taper) {
        gainNode.gain.setValueAtTime(volume, audioContext.currentTime + duration * .9);
        // gainNode.gain.setTargetAtTime(0, audioContext.currentTime, duration / 10);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration);
    }
    lastNode.connect(gainNode);
    lastNode = gainNode;


    lastNode.connect(masterVolumeNode);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
    oscillator.onended = function() {
        lastNode.disconnect(masterVolumeNode);
    };
}
// @ts-ignore
window['playBeeps'] = playBeeps;

interface SimpleSoundOptions {
    oscillatorType?: 'sine' | 'square' | 'sawtooth' | 'triangle'
    attackTime?: number
    bandpassFrequency?: number
    highpassFrequency?: number
    fadeTime?: number
    frequencyVolumeFactor?: number
    frequencyDurationFactor?: number
    pitchNode?: AudioNode
}

function vibratoNode(duration: number, frequency: number, gain: number): AudioNode {
    const waveNode = audioContext.createOscillator();
    waveNode.frequency.value = frequency;
    const gainNode = audioContext.createGain();
    gainNode.gain.value = gain;
    waveNode.connect(gainNode);
    waveNode.start(audioContext.currentTime);
    waveNode.stop(audioContext.currentTime + duration);
    waveNode.onended = function () {
        waveNode.disconnect(gainNode);
    }
    return gainNode;
}
// @ts-ignore
window['vibratoNode'] = vibratoNode;

function glideNode(duration: number, glideStart: number, glideEnd: number, gain: number): AudioNode {
    const constantNode = audioContext.createConstantSource();
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, audioContext.currentTime + glideStart);
    gainNode.gain.linearRampToValueAtTime(gain, audioContext.currentTime + glideEnd);
    constantNode.connect(gainNode);
    constantNode.start(audioContext.currentTime);
    constantNode.stop(audioContext.currentTime + duration);
    constantNode.onended = function () {
        constantNode.disconnect(gainNode);
    }
    return gainNode
}
// @ts-ignore
window['glideNode'] = glideNode;

function mergeNodes(nodes: AudioNode[]): AudioNode {
    const gainNode = audioContext.createGain();
    for (const node of nodes) {
        node.connect(gainNode);
    }
    return gainNode;
}
// @ts-ignore
window['mergeNodes'] = mergeNodes;

function playSimpleSoundAt(frequencies: number[], volume: number, duration: number, {
   oscillatorType = 'sine',
   attackTime = 0.003,
   fadeTime = 0.1 * duration,
   frequencyVolumeFactor = 1,
   frequencyDurationFactor = 1,
   bandpassFrequency,
   highpassFrequency,
   pitchNode,
}: SimpleSoundOptions = {}, time: number = audioContext.currentTime, destination = masterVolumeNode) {
    const combinedGainNode = audioContext.createGain();
    combinedGainNode.gain.value = volume;
    let lastNode = combinedGainNode;

    if (bandpassFrequency) {
        const filterNode = audioContext.createBiquadFilter();
        filterNode.frequency.value = bandpassFrequency;
        filterNode.type = 'bandpass';
        lastNode.connect(filterNode);
        lastNode = filterNode;
    }
    if (highpassFrequency) {
        const filterNode = audioContext.createBiquadFilter();
        filterNode.frequency.value = highpassFrequency;
        filterNode.type = 'highpass';
        lastNode.connect(filterNode);
        lastNode = filterNode;
    }
    lastNode.connect(destination);


    const frequenciesArray = Float32Array.from(frequencies);
    let frequencyVolume = 1;
    let frequencyDuration = duration;
    for (const frequency of frequenciesArray) {
        let fadeDuration = Math.min(fadeTime, frequencyDuration - attackTime);
        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(frequencyVolume, time + attackTime);
        gainNode.gain.setValueAtTime(frequencyVolume, time + duration - fadeDuration);
        gainNode.gain.linearRampToValueAtTime(0, time + duration);
        const oscillator = audioContext.createOscillator();
        oscillator.frequency.value = frequency;
        /*if (pitchVibratoGain && pitchVibratoFrequency) {
            const vibratoOscillator = audioContext.createOscillator();
            vibratoOscillator.frequency.value = pitchVibratoFrequency;
            const vibratoGain = audioContext.createGain();
            vibratoGain.gain.value = pitchVibratoGain;
            vibratoOscillator.connect(vibratoGain).connect(oscillator.frequency);
            console.log('adding pitch vibrato');
            vibratoOscillator.start(time);
            vibratoOscillator.stop(time + duration);
        }*/
        if (pitchNode) {
            pitchNode.connect(oscillator.frequency);
        }
        oscillator.type = oscillatorType;
        oscillator.connect(gainNode);
        oscillator.start(time);
        oscillator.stop(time + duration);
        oscillator.onended = () => {
            if (pitchNode) {
                pitchNode.disconnect(oscillator.frequency);
            }
            oscillator.disconnect(gainNode);
            gainNode.disconnect(combinedGainNode);
        }
        frequencyVolume *= frequencyVolumeFactor;
        frequencyDuration *= frequencyDurationFactor;
        gainNode.connect(combinedGainNode);
    }
    setTimeout(() => {
        lastNode.disconnect(destination);
    }, 1000 * (time - audioContext.currentTime + duration));
}
// @ts-ignore
window['playSimpleSoundAt'] = playSimpleSoundAt;

const masterVolumeNode = audioContext.createGain();
masterVolumeNode.connect(audioContext.destination);
export function setVolume(volume: number): void {
    masterVolumeNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.1);
}

function playBellSoundAt(frequencies: number[], volume: number, duration: number, time: number = audioContext.currentTime, destination = masterVolumeNode) {
    const combinedGainNode = audioContext.createGain();
    combinedGainNode.connect(destination);
    combinedGainNode.gain.value = volume;

    const frequenciesArray = Float32Array.from(frequencies);
    const attackTime = 0.003;
    let frequencyVolume = 0.5;
    let fadeDuration = duration - attackTime;
    for (const frequency of frequenciesArray) {
        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(frequencyVolume, time + attackTime);
        gainNode.gain.setValueAtTime(frequencyVolume, time + attackTime);
        gainNode.gain.linearRampToValueAtTime(0, time + attackTime + fadeDuration);
        const oscillator = audioContext.createOscillator();
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        oscillator.connect(gainNode);
        oscillator.start(time);
        oscillator.stop(time + duration);
        frequencyVolume *= 0.5;
        fadeDuration *= 0.75;
        gainNode.connect(combinedGainNode);
    }
    setTimeout(() => {
        combinedGainNode.disconnect(destination);
    }, 1000 * (time - audioContext.currentTime + duration));
}
// @ts-ignore
window['playBellSoundAt'] = playBellSoundAt;

function playScale(coreFrequenciess: number[], callback: (frequency: number) => void, interval: number = 500) {
    let index = 0;
    const intervalId = setInterval(() => {
        const frequency = coreFrequenciess[index++];
        if (!frequency) {
            clearInterval(intervalId);
            return;
        }
        callback(frequency);
    }, interval);
}
// @ts-ignore
window['playScale'] = playScale;

sounds.set('reflect', {
    play() {
        playBeeps([2000, 8000, 4000], .01, .1, {});
    }
});
sounds.set('wand', {
    play() {
        playBeeps([1200, 400], 0.1, .1, {smooth: true, taper: true, swell: true, distortion: true});
    }
});
sounds.set('takeDamage', {
    play() {
        playBeeps([100, 50], 0.2, 0.2, {smooth: true, distortion: true});
    }
});
sounds.set('takeBigDamage', {
    play() {
        playBeeps([200, 100, 100, 200, 100, 50, 50], 0.5, 0.3, {smooth: true, distortion: true});
    }
});
// This gets replaced once audio worklets load.
sounds.set('dealDamage', {
    play() {
        playBeeps([200, 230, 200, 230], 0.1, 0.1, {smooth: true, distortion: true});
    }
});


sounds.set('chargeReady', {
    play() {
        playSimpleSoundAt([100], 0.05, 0.5, {oscillatorType: 'square', pitchNode: glideNode(0.5, 0, 0.5, 100), attackTime: 0.1, fadeTime: 0.4});
    }
});
sounds.set('activateCharge', {
    play() {
        //playSimpleSoundAt([120], 0.05, 2, {oscillatorType: 'square', pitchNode: mergeNodes([glideNode(2, 0, 0.5, 80), vibratoNode(2, 10, 5)]), attackTime: 0.1, fadeTime: 0.1});
        playSimpleSoundAt([100], 0.2, 2, {oscillatorType: 'triangle', pitchNode: mergeNodes([glideNode(2, 0, 1, 100), vibratoNode(2, 20, 10)]), attackTime: 0.1, fadeTime: 0.1});
    }
});



async function registerAndUseAudioWorklets(): Promise<void> {
    await audioContext.audioWorklet.addModule('audio/gain-processor.js');
    await audioContext.audioWorklet.addModule('audio/white-noise-processor.js');
    await audioContext.audioWorklet.addModule('audio/pink-noise-processor.js');
    await audioContext.audioWorklet.addModule('audio/brown-noise-processor.js');

    const pinkNoiseNode = new AudioWorkletNode(audioContext, 'pink-noise');
    const brownNoiseNode = new AudioWorkletNode(audioContext, 'brown-noise');
    //const gainWorkletNode = new AudioWorkletNode(audioContext, 'gain');
    /*const whiteNoiseNode = new AudioWorkletNode(audioContext, 'white-noise');
    const gainParam = gainWorkletNode.parameters.get('gain')!;
    gainParam.setValueAtTime(0, audioContext.currentTime);
    gainParam.linearRampToValueAtTime(0.8, audioContext.currentTime + .05);
    gainParam.linearRampToValueAtTime(0, audioContext.currentTime + .1);*/
    //whiteNoiseNode.connect(gainWorkletNode).connect(masterVolumeNode);
    //pinkNoiseNode.connect(gainWorkletNode).connect(masterVolumeNode);
    //setTimeout(() => gainWorkletNode.disconnect(masterVolumeNode), 2000);
    sounds.set('dealDamage', {
        play() {
            const noiseGainNode = new AudioWorkletNode(audioContext, 'gain');
            const noiseGainParam = noiseGainNode.parameters.get('gain')!;
            noiseGainParam.setValueAtTime(0, audioContext.currentTime);
            noiseGainParam.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.1);
            noiseGainParam.linearRampToValueAtTime(0, audioContext.currentTime + 0.15);
            pinkNoiseNode.connect(noiseGainNode);
            noiseGainNode.connect(masterVolumeNode);

            const waveGainNode = new AudioWorkletNode(audioContext, 'gain');
            const waveGainParam = waveGainNode.parameters.get('gain')!;
            waveGainParam.setValueAtTime(0.1, audioContext.currentTime);
            waveGainParam.linearRampToValueAtTime(0, audioContext.currentTime + 0.1);
            const oscillator = audioContext.createOscillator();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(500, audioContext.currentTime);
            oscillator.frequency.linearRampToValueAtTime(50, audioContext.currentTime + 0.02);
            oscillator.connect(waveGainNode);
            waveGainNode.connect(masterVolumeNode);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);

            oscillator.onended = function() {
                pinkNoiseNode.disconnect(noiseGainNode);
                noiseGainNode.port.postMessage('done');
                noiseGainNode.disconnect(masterVolumeNode);
                oscillator.disconnect(waveGainNode);
                waveGainNode.port.postMessage('done');
                waveGainNode.disconnect(masterVolumeNode);
            };
        }
    });
    sounds.set('shaveBullet', {
        play() {
            const gainNode = audioContext.createGain();
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.1);
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);
            pinkNoiseNode.connect(gainNode);
            gainNode.connect(masterVolumeNode);
            setTimeout(() => {
                pinkNoiseNode.disconnect(gainNode);
                gainNode.disconnect(masterVolumeNode);
            }, 400);
        }
    });
    sounds.set('defeatEnemy', {
        play() {
            const gainNode = audioContext.createGain();
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.1);
            gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.3);
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.4);
            brownNoiseNode.connect(gainNode);
            gainNode.connect(masterVolumeNode);
            setTimeout(() => {
                brownNoiseNode.disconnect(gainNode);
                gainNode.disconnect(masterVolumeNode);
            }, 400);
        }
    });
    tracks.beach = {
        isPlaying: false,
        masterNode: new AudioWorkletNode(audioContext, 'gain'),
        waterGainNode: new AudioWorkletNode(audioContext, 'gain'),
        // Times are all in seconds.
        lastTrackTime: 0,
        lastContextTime: 0,
        lastScheduledTime: 0,
        initialized: false,
        play(state: GameState, volume: number) {
            if (this.isPlaying) {
                return;
            }
            console.log('playing beach');
            this.isPlaying = true;
            state.audio.playingTracks.push(this);
            const masterGainParam = this.masterNode.parameters.get('gain')!;
            masterGainParam.setValueAtTime(volume, audioContext.currentTime);
            this.masterNode.connect(masterVolumeNode);
            this.lastTrackTime = 0;
            if (!this.initialized) {
                console.log('initializing beach');
                pinkNoiseNode.connect(this.waterGainNode);
                this.initialized = true;
                this.waterGainNode.connect(this.masterNode);
                const waterGainParam = this.waterGainNode.parameters.get('gain')!;
                waterGainParam.linearRampToValueAtTime(0, 0);
            }
        },
        update(state: GameState) {
            // this.waterSound.update(this.temp);
            if (!this.isPlaying) {
                return;
            }
            const trackTime = this.lastTrackTime + (audioContext.currentTime - this.lastContextTime);
            // Want to make the water gain node fade in and out over 2 second intervals.
            if (this.lastScheduledTime <= trackTime + 4) {
                const nextTime = this.lastScheduledTime + 4;
                const waterGainParam = this.waterGainNode.parameters.get('gain')!;
                // console.log('fading in+ out', this.lastScheduledTime + 1, this.lastScheduledTime + 4);
                waterGainParam.linearRampToValueAtTime(0.2, this.lastScheduledTime + 1);
                waterGainParam.linearRampToValueAtTime(0.1, this.lastScheduledTime + 2);
                waterGainParam.linearRampToValueAtTime(0.3, this.lastScheduledTime + 3);
                waterGainParam.linearRampToValueAtTime(0.05, this.lastScheduledTime + 4);
                if (this.lastScheduledTime % 32 >= 0) {
                    if (this.lastScheduledTime % 8 === 0) {
                        /*playZeldaSquareAt(noteFrequencies.C4, 1, this.lastScheduledTime, this.masterNode);
                        playZeldaSquareAt(noteFrequencies.B3, 1, this.lastScheduledTime + 1, this.masterNode);
                        playZeldaSquareAt(noteFrequencies.A3, 1, this.lastScheduledTime + 2, this.masterNode);
                        playZeldaSquareAt(noteFrequencies.G3, 1, this.lastScheduledTime + 3, this.masterNode);*/
                        playBellSoundAt(getBellFrequencies(noteFrequencies.C6), 0.4, 2, this.lastScheduledTime, this.masterNode);
                        playBellSoundAt(getBellFrequencies(noteFrequencies.B5), 0.4, 2, this.lastScheduledTime + 1, this.masterNode);
                        playBellSoundAt(getBellFrequencies(noteFrequencies.A5), 0.4, 2, this.lastScheduledTime + 2, this.masterNode);
                        playBellSoundAt(getBellFrequencies(noteFrequencies.G5), 0.4, 2, this.lastScheduledTime + 3, this.masterNode);
                    } else if (this.lastScheduledTime % 8 === 4) {
                        playBellSoundAt(getBellFrequencies(noteFrequencies.G5), 0.4, 2, this.lastScheduledTime, this.masterNode);
                        playBellSoundAt(getBellFrequencies(noteFrequencies.A5), 0.4, 2, this.lastScheduledTime + 1, this.masterNode);
                        playBellSoundAt(getBellFrequencies(noteFrequencies.B5), 0.4, 2, this.lastScheduledTime + 2, this.masterNode);
                        playBellSoundAt(getBellFrequencies(noteFrequencies.C6), 0.4, 2, this.lastScheduledTime + 3, this.masterNode);
                    }
                }
                if (this.lastScheduledTime % 32 >= 0 && (this.lastScheduledTime % 32 < 16 || this.lastScheduledTime % 32 >= 24)) {
                    playHihatSoundAt(40, 0.4, this.lastScheduledTime + 0, this.masterNode);
                    playHihatSoundAt(40, 0.2, this.lastScheduledTime + 0.5, this.masterNode);
                    playHihatSoundAt(40, 0.2, this.lastScheduledTime + 0.75, this.masterNode);
                    playHihatSoundAt(40, 0.4, this.lastScheduledTime + 1, this.masterNode);
                    playHihatSoundAt(40, 0.2, this.lastScheduledTime + 1.5, this.masterNode);
                    playHihatSoundAt(40, 0.4, this.lastScheduledTime + 1.75, this.masterNode);
                    playHihatSoundAt(40, 0.2, this.lastScheduledTime + 2.25, this.masterNode);
                    playHihatSoundAt(40, 0.4, this.lastScheduledTime + 2.5, this.masterNode);
                    playHihatSoundAt(40, 0.4, this.lastScheduledTime + 3, this.masterNode);
                    playHihatSoundAt(40, 0.4, this.lastScheduledTime + 3.5, this.masterNode);
                }
                if (this.lastScheduledTime % 32 >= 8) {
                    playBellSoundAt(getBellFrequencies(noteFrequencies.C6), 0.4, 1, this.lastScheduledTime, this.masterNode);
                    playBellSoundAt(getBellFrequencies(noteFrequencies.E6), 0.4, 1, this.lastScheduledTime + 0.5, this.masterNode);
                    playBellSoundAt(getBellFrequencies(noteFrequencies.G6), 0.4, 1, this.lastScheduledTime + 1, this.masterNode);
                    playBellSoundAt(getBellFrequencies(noteFrequencies.E6), 0.4, 1, this.lastScheduledTime + 1.5, this.masterNode);
                    playBellSoundAt(getBellFrequencies(noteFrequencies.G6), 0.4, 1, this.lastScheduledTime + 2, this.masterNode);
                    playBellSoundAt(getBellFrequencies(noteFrequencies.C7), 0.4, 1, this.lastScheduledTime + 2.5, this.masterNode);
                    playBellSoundAt(getBellFrequencies(noteFrequencies.G6), 0.4, 1, this.lastScheduledTime + 3, this.masterNode);
                    playBellSoundAt(getBellFrequencies(noteFrequencies.E6), 0.4, 1, this.lastScheduledTime + 3.5, this.masterNode);
                }
                this.lastScheduledTime = nextTime;
            }
        },
        stop(state: GameState) {
            if (!this.isPlaying) {
                return;
            }
            console.log('stopping beach');
            const index = state.audio.playingTracks.indexOf(this);
            if (index >= 0) {
                state.audio.playingTracks.splice(index, 1);
            }
            this.isPlaying = false;
            this.masterNode.disconnect(masterVolumeNode);
        }
    }
}

registerAndUseAudioWorklets();

/*
class RandomNoiseProcessor extends AudioWorkletProcessor {
  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>) {
    const noiseRandomizer = SRandom.seed(1337);
    const output = outputs[0];
    output.forEach((channel) => {
      for (let i = 0; i < channel.length; i++) {
        channel[i] = noiseRandomizer.generateAndMutate() * 2 - 1;
      }
    });
    return true;
  }
}

registerProcessor("random-noise-processor", RandomNoiseProcessor);*/

/*

function generateWhiteNoiseBuffer(seconds: number): AudioBuffer {
    const noiseRandomizer = SRandom.seed(1337);
    const bufferSize = 2 * audioContext.sampleRate;
    const whiteNoiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = whiteNoiseBuffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
        output[i] = noiseRandomizer.generateAndMutate() * 2 - 1;
    }
    return whiteNoiseBuffer;
}
const whiteNoiseBuffer = generateWhiteNoiseBuffer(2);
// @ts-ignore
window['whiteNoiseBuffer'] = whiteNoiseBuffer;*/

/*
var whiteNoise = audioContext.createBufferSource();
whiteNoise.buffer = whiteNoiseBuffer;
whiteNoise.loop = true;
whiteNoise.start(0);

whiteNoise.connect(masterVolumeNode);
*/


// Frequencies from https://www.computermusicresource.com/Simple.bell.tutorial.html
const bellFrequencies = [0.56, 0.92, 1.19, 1.71, 2, 2.74, 3, 3.76, 4.07];

function getBellFrequencies(baseFrequency: number): number[] {
    return bellFrequencies.map(n => baseFrequency * n);
}

// Frequencies etc from http://joesul.li/van/synthesizing-hi-hats/
const hiHatFrequencies = [2, 3, 4.16, 5.43, 6.79, 8.21];
function getHiHatFrequencies(baseFrequency: number): number[] {
    return hiHatFrequencies.map(n => baseFrequency * n);
}
// @ts-ignore
window['getHiHatFrequencies'] = getHiHatFrequencies;

const notes = Object.keys(noteFrequencies) as (keyof typeof noteFrequencies)[];

function majorScale(allNotes: number[], baseNote: number): number[] {
    return allNotes.filter((x, i) => [0, 2, 4, 5, 7, 9, 11].includes((i - baseNote + 11) % 12));
}

const frequencies: {[key: string]: number[]} = {};
frequencies.western = Object.values(noteFrequencies);
frequencies.midWestern = Object.values(noteFrequencies).slice(36, 72);
frequencies.cMajor = majorScale(frequencies.midWestern, 0);
// @ts-ignore
window['frequencies'] = frequencies;

notes.forEach((noteName) => {
    sounds.set(`bell${noteName}`, {
        play() {
            playBellSoundAt(getBellFrequencies(noteFrequencies[noteName]), 0.2, 2);
        }
    });
});

function playHihatSoundAt(frequency: number, duration: number = 0.1, time: number = audioContext.currentTime, destination = masterVolumeNode): void {
    playSimpleSoundAt(getHiHatFrequencies(frequency), 0.5, duration, {
        oscillatorType: 'square',
        attackTime: 0.002,
        fadeTime: duration - 0.005,
        bandpassFrequency: 10000,
        highpassFrequency: 7000,
    }, time, destination);
}
// @ts-ignore
window['playHihatSoundAt'] = playHihatSoundAt;

function playZeldaSquareAt(frequency: number, duration: number = 0.2, time: number = audioContext.currentTime, destination = masterVolumeNode) {
    const vibrato = vibratoNode(duration, 8, 1);
    playSimpleSoundAt([frequency], 0.1, duration, {
        oscillatorType: 'square',
        pitchNode: vibrato,
        //pitchVibratoFrequency: 8,
        //pitchVibratoGain: 1
    }, time, destination);
}
// @ts-ignore
window['playZeldaSquareAt'] = playZeldaSquareAt;

notes.forEach((noteName) => {
    sounds.set(`hiHat${noteName}`, {
        play() {
            playSimpleSoundAt(getHiHatFrequencies(noteFrequencies[noteName]), 0.2, 0.2, {
                oscillatorType: 'square',
                attackTime: 0.003,
                fadeTime: 0.1,
                bandpassFrequency: 10000,
                highpassFrequency: 7000,
                //frequencyVolumeFactor = 1,
                //frequencyDurationFactor = 1,
            });
        }
    });
});



const harpFrequencies = [
    1,2,3,4,5,6,7,
];
function getHarpFrequencies(baseFrequency: number): number[] {
    return harpFrequencies.map(n => baseFrequency * n);
}

function playHarpSoundAt(baseFrequency: number, duration: number = 1, time: number = audioContext.currentTime, destination = masterVolumeNode) {
    const frequencies = getHarpFrequencies(baseFrequency);
    const combinedGainNode = audioContext.createGain();
    combinedGainNode.gain.value = 0.5;
    //combinedGainNode.connect(destination);
    let lastNode = combinedGainNode;

    
    const lowpassFrequency = 200 + 0.2 * baseFrequency;// 100 + 0.4 * baseFrequency; //400
    if (lowpassFrequency) {
        const filterNode = audioContext.createBiquadFilter();
        filterNode.frequency.value = lowpassFrequency;
        filterNode.type = 'lowpass';
        lastNode.connect(filterNode);
        lastNode = filterNode;
    }

    const highpassFrequency = 200 + 0.2 * baseFrequency;//100 + 0.4 * baseFrequency;//frequency;
    if (highpassFrequency) {
        const filterNode = audioContext.createBiquadFilter();
        filterNode.frequency.value = highpassFrequency;
        filterNode.type = 'highpass';
        lastNode.connect(filterNode);
        lastNode = filterNode;
    }

    lastNode.connect(destination);

    //Attack: 0
    //Decay: 2,41
    //Sustain: 0
    //Release: 1.24

    const overtoneVolumeFactor = 0.9;
    const overtoneDurationFactor = .9;
    const frequenciesArray = Float32Array.from(frequencies);
    const attackTime = 0;//0.001;
    let frequencyVolume = 1;
    const decayTime = 0.05;
    const sustainTime = 0.0;
    const sustainPercent = 0.15;//0.15;
    let fadeDuration = duration - decayTime - sustainTime - attackTime;
    for (const frequency of frequenciesArray) {
        //const decayTime = 0.05 * Math.min(10, Math.max(0.5, 440 * 440 / frequency / frequency));
        fadeDuration = (duration - decayTime - sustainTime - attackTime) * Math.min(1, Math.max(0.2, 440 * 440 / frequency / frequency));
        //frequencyVolume = 1;
        //frequencyVolume = baseFrequency / frequency;
        const sustainVolume = frequencyVolume * sustainPercent;// * Math.min(2, Math.max(0.2, 440 * 440 / frequency / frequency));
        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(0, time);
        // Attack
        gainNode.gain.linearRampToValueAtTime(frequencyVolume, time + attackTime);
        //gainNode.gain.setValueAtTime(frequencyVolume, time + attackTime);
        // Decay
        gainNode.gain.linearRampToValueAtTime(sustainVolume, time + attackTime + decayTime);
        // Sustain
        gainNode.gain.setValueAtTime(sustainVolume, time + attackTime + decayTime + sustainTime);

        gainNode.gain.linearRampToValueAtTime(0, time + attackTime + decayTime + sustainTime + fadeDuration);
        const oscillator = audioContext.createOscillator();
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        oscillator.connect(gainNode);
        oscillator.start(time);
        oscillator.stop(time + duration);
        frequencyVolume *= overtoneVolumeFactor;
        fadeDuration *= overtoneDurationFactor;
        gainNode.connect(combinedGainNode);
    }
    setTimeout(() => {
        lastNode.disconnect(destination);
    }, 1000 * (time - audioContext.currentTime + duration));
}
notes.forEach((noteName) => {
    sounds.set(`harp${noteName}`, {
        play() {
            playHarpSoundAt(noteFrequencies[noteName]);
        }
    });
});

//playHarpSoundAt(noteFrequencies.A4);

//playScale(frequencies.cMajor, playHarpSoundAt, 200);
