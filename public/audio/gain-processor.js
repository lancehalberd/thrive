// From https://developer.chrome.com/blog/audio-worklet/

class GainProcessor extends AudioWorkletProcessor {

  // Custom AudioParams can be defined with this static getter.
  static get parameterDescriptors() {
    return [{ name: 'gain', defaultValue: 1 }];
  }

  done = false;

  constructor() {
    // The super constructor call is required.
    super();

    this.port.onmessage = (e) => {
      if (e.data === 'done'){
        this.done = true;
      }
    };
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const gain = parameters.gain;
    for (const input of inputs) {
      const channelCount = Math.min(input.length, output.length);
      for (let channelIndex = 0; channelIndex < channelCount; ++channelIndex) {
        const inputChannel = input[channelIndex];
        const outputChannel = output[channelIndex];
        if (gain.length === 1) {
          for (let i = 0; i < inputChannel.length; ++i)
            outputChannel[i] = inputChannel[i] * gain[0];
        } else {
          for (let i = 0; i < inputChannel.length; ++i)
            outputChannel[i] = inputChannel[i] * gain[i];
        }
      }
    }

    return !this.done;
  }
}

registerProcessor('gain', GainProcessor);
