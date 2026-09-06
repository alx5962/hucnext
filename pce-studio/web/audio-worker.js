/**
 * AudioWorkletProcessor for streaming PC Engine PCM audio from libpce
 */
const BUFFER_CAPACITY = 44100 * 2;
const OUTPUT_BUFFER_SIZE = 128;

class StreamingAudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this._lastSample = 0.0;
        this._floats = new Float32Array(BUFFER_CAPACITY);
        this._size = 0;
        this._first = 0;

        const port = this.port;
        port.onmessage = (event) => {
            const [samples, length] = event.data;
            if (length > 44100) {
                port.postMessage(samples, [samples.buffer]);
                return;
            }
            if (this._size + length > BUFFER_CAPACITY) {
                console.log("BUFFER OVERRUN, DISCARDING.");
                port.postMessage(samples, [samples.buffer]);
                return;
            }
            for (let i = 0; i < length; i++) {
                this._floats[(this._size + this._first) % BUFFER_CAPACITY] =
                    samples[i] > 0 ? samples[i] / 32767.0 : samples[i] / 32768.0;
                this._size += 1;
            }
            port.postMessage(samples, [samples.buffer]);
        };
    }

    process(inputs, outputs, parameters) {
        const outputChannel = outputs[0][0];
        if (this._size === 0) {
            outputChannel.fill(this._lastSample);
            return true;
        }
        let i = 0;
        while (i < outputChannel.length && this._size > 0) {
            this._lastSample = outputChannel[i] = this._floats[this._first];
            this._size -= 1;
            this._first = (this._first + 1) % BUFFER_CAPACITY;
            i++;
        }
        for (let j = i; j < outputChannel.length; j++) {
            outputChannel[j] = this._lastSample;
        }
        return true;
    }
}

registerProcessor('streaming-audio-processor', StreamingAudioProcessor);