import { Socket, createServer } from "net";

import { cutMessage, bufferPush } from "./dynamic_buffer";
import type { TCPConn, DynamicBuffer } from "./types";

function soInit(socket: Socket): TCPConn {
    const conn: TCPConn = {
        socket: socket,
        err: null,
        ended: false,
        reader: null,
    };

    socket.on('data', (data: Buffer) => {
        console.assert(conn.reader);
        
        conn.socket.pause();

        conn.reader!.resolve(data);
        conn.reader = null;
    });

    socket.on('end', () => {
        conn.ended = true;
        if(conn.reader) {
            conn.reader.resolve(Buffer.from(''));
            conn.reader = null;
        }
    })

    socket.on('error', (err: Error) => {
        conn.err = err;
        if(conn.reader) {
            conn.reader.reject(err);
            conn.reader = null;
        }
    })

    return conn;
}

function soRead(conn: TCPConn): Promise<Buffer> {
    console.assert(!conn.reader);
    return new Promise((resolve, reject) => {

        if(conn.err) {
            reject(conn.err);
            return;
        }

        if(conn.ended) {
            resolve(Buffer.from(''));
            return;
        }

        conn.reader = {resolve: resolve, reject: reject};
        conn.socket.resume();
    });
}

function soWrite(conn: TCPConn, data: Buffer): Promise<void> {
    console.assert(data.length > 0);
    return new Promise((resolve, reject) => {
        if(conn.err) {
            reject(conn.err);
            return;
        }

        conn.socket.write(data, (err?: Error) => {
            if(err) {
                reject(err);
            } else {
                resolve();
            }
        })
    });
}

async function serveClient(socket: Socket): Promise<void> {
    const conn: TCPConn = soInit(socket);
    const buffer: DynamicBuffer = { data: Buffer.alloc(0), length: 0 };

    while(true) {
        const message: null | Buffer = cutMessage(buffer);

        if(!message) {
            const data: Buffer = await soRead(conn);
            bufferPush(buffer, data);

            if(data.length === 0) {
                console.log('end connection');
                conn.socket.end();
                return;
            }

            continue;
        }

        if(message.equals(Buffer.from('quit\n'))) {
            await soWrite(conn, Buffer.from('Bye.\n'));
            socket.destroy();
            return;
        } else {
            const reply = Buffer.concat([Buffer.from('Echo: '), message])
            await soWrite(conn, reply);
        }
    }
}

async function newConn(socket: Socket): Promise<void> {
    console.log('new connection', socket.remoteAddress, socket.remotePort);

    try {
        await serveClient(socket);
    } catch (e) {
        console.error("exception", e);
    } finally {
        socket.destroy();
    }
}

const server = createServer({
    pauseOnConnect: true,
});

server.on('connection', newConn);
server.listen({host: '127.0.0.1', port: 1234});