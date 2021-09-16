#!/usr/bin/env node
const clipboardy = require('clipboardy')

let clipboard
let monitor = new (require('events')).EventEmitter()
setInterval(async _ => {
    let current = await clipboardy.read()
    if (clipboard !== current) {
        clipboard = current
        monitor.emit('copy', current)
    }
}, 500)

const listenServer = _ => {
    console.log("RUNNING AS SERVER\nWARNING: THE PANDAS ARE COMING")
    const app = require("express")()
    const server = require("http").createServer(app)
    const io = require("socket.io")(server)
    process.env.PORT = process.argv[3]
    
    server.listen(process.env.PORT || 0, _ => {
        let port = process.env.PORT || server.address().port
        console.log(`Listening on port ${port}`)
        console.log(`Run "shareclip http://${require('ip').address()}:${port}" on a different device`)
    })

    io.on('connection', socket => {
        console.log(`Connected to ${socket.id}`)    
        socket.on('data', async data => {
            console.log(`Got data: ${data}`)
            socket.broadcast.emit(data)
            clipboard = data
            await clipboardy.write(data)
        })
    })

    monitor.on('copy', data => {
        console.log(`Copied: ${data}`)
        io.emit('data', data)
    })
}

const connectClient = _ => {
    console.log("RUNNING AS CLIENT\nWARNING: THE PANDAS ARE COMING")
    let socket
    try {
        socket = require('socket.io-client')(process.argv[2])
    } catch {
        throw "Invalid server address"
    }

    socket.on('connect', _ => {
        console.log(`Connected to ${process.argv[2]}`)
        monitor.on('copy', data => {
            console.log(`Copied: ${data}`)
            socket.emit('data', data)
        })
    })

    socket.on('data', async data => {
        console.log(`Got data: ${data}`)
        clipboard = data 
        await clipboardy.write(data)
    })
}

try {
    if (process.argv.length === 4) { // Server
        listenServer()
    } else if (process.argv.length === 3) { // Client
        connectClient()
    } else {
        throw "Invalid arguments"
    }
} catch (e) {
    console.log(e)
    console.log(`Usage: shareclip [server-address if running as client]`)
    process.exit(1)
}
