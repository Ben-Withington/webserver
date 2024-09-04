import * as net from "net"

import type { TCPConn } from "./types";

function soInit(socket: net.Socket): TCPConn {
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

async function serveClient(socket: net.Socket): Promise<void> {
    const conn: TCPConn = soInit(socket);

    while(true) {
        const data = await soRead(conn);
        if(data.length === 0 || data.includes('q')) {
            console.log('end connection');
            conn.socket.end();
            break;
        }

        console.log('data', data);
        await soWrite(conn, data);
    }
}

async function newConn(socket: net.Socket): Promise<void> {
    console.log('new connection', socket.remoteAddress, socket.remotePort);

    try {
        await serveClient(socket);
    } catch (e) {
        console.error("exception", e);
    } finally {
        socket.destroy();
    }
}

const server = net.createServer({
    pauseOnConnect: true,
});

server.on('connection', newConn);
server.listen({host: '127.0.0.1', port: 1234});