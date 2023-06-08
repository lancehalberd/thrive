// From https://noisehack.com/generate-noise-web-audio-api/
// Adapted to an AudioWorkletProcessor


class BrownNoiseProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const output = outputs[0];
    for (const channel of output) {
      let lastOut = 0.0;
      for (let i = 0; i < channel.length; i++) {
        let white = Math.random() * 2 - 1;
        channel[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = channel[i];
        channel[i] *= 3.5; // (roughly) compensate for gain
      }
    }
    return true;
  }
}
registerProcessor('brown-noise', BrownNoiseProcessor);

/*
Original code:

var bufferSize = 4096;
var brownNoise = (function() {
    var lastOut = 0.0;
    var node = audioContext.createScriptProcessor(bufferSize, 1, 1);
    node.onaudioprocess = function(e) {
        var output = e.outputBuffer.getChannelData(0);
        for (var i = 0; i < bufferSize; i++) {
            var white = Math.random() * 2 - 1;
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5; // (roughly) compensate for gain
        }
    }
    return node;
})();

brownNoise.connect(audioContext.destination);

*/
