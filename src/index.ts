import * as net from "net"

const newConnection = (socket: net.Socket): void => {
    console.log("new connection", socket.remoteAddress, socket.remotePort);

    socket.on('data', (data: Buffer) => {
        console.log('data', data);
        socket.write(data);

        if(data.includes('q')) {
            console.log("closing");
            socket.end();
        }
    });

    socket.on('end', () => {
        console.log("EOF");
    });
}

let server = net.createServer({allowHalfOpen: true});
server.on('error', (err: Error) => { throw err; });
server.on('connection', newConnection);
server.listen({host: '127.0.0.1', port: 1234});
