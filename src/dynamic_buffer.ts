import type { DynamicBuffer } from "./types"

export const bufferPush = (buffer: DynamicBuffer, data: Buffer): void => {
    const newLength = buffer.length + data.length;
    
    if(buffer.data.length < newLength) {
        let cap = Math.max(buffer.data.length, 32);
        while(cap < newLength) {
            cap *= 2;
        }
        const grown = Buffer.alloc(cap);
        buffer.data.copy(grown, 0, 0);
        buffer.data = grown;
    }

    data.copy(buffer.data, buffer.length, 0);
    buffer.length = newLength;
}

const bufferPop = (buffer: DynamicBuffer, length: number): void => {
    buffer.data.copyWithin(0, length, buffer.length);
    buffer.length -= length;
}

export const cutMessage = (buffer: DynamicBuffer): null | Buffer => {
    const index = buffer.data.subarray(0, buffer.length).indexOf('\n');
    if(index < 0) {
        return null;
    }

    const message = Buffer.from(buffer.data.subarray(0, index + 1));
    bufferPop(buffer, index + 1);
    return message;
}