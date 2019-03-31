let net = require('net'),
    singleton = require('./Singleton');
peerResPacket = require('./PeerResponsePacket');
peerReqPacket = require('./PeerRequestPacket');

//generate a random port number
var portNum = Math.floor((Math.random() * 30000) + 1);
var numPeers = 0;
var peerID;
var maxPeers;
var declinedPeers = [];
var joinTable = [];
var pendingTable = [];

//set the ip and port number for the peer
let HOST = '127.0.0.1',
    PORT = portNum;

net.bytesWritten = 300000;
net.bufferSize = 300000;

//initialize the singleton (start the timer and sequence number)
singleton.init();

let peerServer = net.createServer();
peerServer.listen(PORT, HOST);

if (process.argv.length == 2) { //USER JUST TYPES node peer

    //default the peer with ID 1, and with max peers 6
    peerID = 1;
    maxPeers = 6;
    console.log('This peer address is ' + HOST + ':' + PORT + ' located at p' + peerID);

} else if (process.argv.length == 4 && process.argv[2] == '-n') { //USER TYPES node peer with the -n command next to it

    //default the peer with ID 1, but set the max peers this time
    peerID = 1;
    maxPeers = parseInt(process.argv[3]);
    console.log('This peer address is ' + HOST + ':' + PORT + ' located at p' + peerID);

//CLIENT FUNCTIONALITY -----------------------------------------------------------------------------------------------------------------------
} else { 

    /*NOTE: THE USER CAN ONLY TYPE THE COMMAND IN THE FORMAT: node peer -p [address] -n[numPeers] */
    /*OR JUST: node peer -p [address]*/

    //Setting maxPeers based on the command
    if (process.argv.length == 6) {
        maxPeers = parseInt(process.argv[5]);
    } else {
        maxPeers = 6;
    }

    var address = process.argv[3]; //gets the address from the command

    //uses substr on the address to get the Host and Port numbers
    var connectHOST = address.substr(0, address.lastIndexOf(':'));
    var connectPORT = parseInt(address.substr(address.lastIndexOf(':') + 1, address.length));

    //creates a new socket to connect to the other peer
    var peerClient = new net.Socket();

    //creates the peer message packet
    peerReqPacket.init(1, numPeers, HOST, PORT);

    //peer acting as a client connects to the peer acting as a server
    peerClient.connect(connectPORT, connectHOST, function () {

        let peerObj = {
            ip: '',
            port: 0
        };
        //sets the ip and port of that peer object
        peerObj.ip = connectHOST;
        peerObj.port = connectPORT;
        
        pendingTable.push(peerObj);

        //send the peer message packet to the other peer 
        peerClient.write(peerReqPacket.getPacket());
    });

    //when the peer trying to connect receives an acknowledgement packet back
    peerClient.on('data', function (data) {

        console.log(pendingTable);
        pendingTable.pop();
        console.log(pendingTable);

        var recMsg = data.readIntBE(3, 1);
        var recID = data.readIntBE(4, 4);
        var numP = data.readIntBE(8, 4);

        //array of received peers
        var peersReceived = [];

        //for reading the end of the packet that stores the port and ip of each peer
        for (let j = 0; j < numP; j++) {
            var recIParr = [];
            var recPort = data.readIntBE(14 + (6 * j), 2);
            recIParr[0] = data.readIntBE(16 + (6 * j), 1);
            recIParr[1] = data.readIntBE(17 + (6 * j), 1);
            recIParr[2] = data.readIntBE(18 + (6 * j), 1);
            recIParr[3] = data.readIntBE(19 + (6 * j), 1);

            //converts back to string
            var recIP = (recIParr[0] + '.' + recIParr[1] + '.' + recIParr[2] + '.' + recIParr[3]);

            //creates a peer object to store the ip and port in
            let peerObj = {
                ip: '',
                port: 0
            };

            //sets the ip and port of that peer object
            peerObj.ip = recIP;
            peerObj.port = recPort;

            //pushes the peer object to the array
            peersReceived.push(peerObj);
        }

        //updates the number of peers (if the received message is 1 for welcome)
        if (recMsg == 1) {
            numPeers = numPeers + 1;
            //if the received message is 1, add to the peer table (successful connection)
            peerResPacket.addToPeerTable(connectHOST, parseInt(connectPORT));
        }

        if(numP>recID){
            peerID = numP + 1;
        }else if(numP<=recID){
            peerID = recID + 1;
        }
        
        if (declinedPeers.length == 0) {
            //console logging the output like the examples
            console.log("Connected to peer p" + recID + ":" + connectPORT + " at timestamp: " + singleton.getTimestamp());
            console.log('This peer address is ' + HOST + ':' + PORT + ' located at p' + peerID);
            console.log("Received ack from p" + recID + ":" + connectPORT);
        } else {
            //console logging the output like the examples
            console.log("Connected to peer p" + recID + ":" + joinTable[0].port + " at timestamp: " + singleton.getTimestamp());
            console.log('This peer address is ' + HOST + ':' + PORT + ' located at p' + peerID);
            console.log("Received ack from p" + recID + ":" + joinTable[0].port);
        }


        //for printing out the peers that it is connected to other than itself
        for (let i = 0; i < numP; i++) {
            if (peersReceived[i].port != PORT || peersReceived[i].ip != HOST) {
                console.log(" which is peered with: " + peersReceived[i].ip + ":" + peersReceived[i].port);
            }
        }

        var peerTable = peerResPacket.getPeerTable();

        //if it receives back a message type of 2 (redirect)
        if (recMsg == 2) {
            console.log("Join redirected, trying to connect to another peer in the network....");

            if (declinedPeers.length == 0) {
                //creates a peer object to store the ip and port in
                let peerObj = {
                    ip: '',
                    port: 0
                };
                //sets the ip and port of that peer object
                peerObj.ip = connectHOST;
                peerObj.port = connectPORT;
                //adding to the declined peers table
                declinedPeers.push(peerObj);
            } else {
                //creates a peer object to store the ip and port in
                let peerObj = {
                    ip: '',
                    port: 0
                };
                //sets the ip and port of that peer object
                peerObj.ip = joinTable[0].ip;
                peerObj.port = joinTable[0].port;
                //adding to the declined peers table
                declinedPeers.push(peerObj);
            }

            //removing the peer with the failed connection from the join table
            joinTable.shift();

            //nested for loops to determine if there is a returned peer that can be added to the join table
            for (let i = 0; i < peersReceived.length; i++) {
                var connectablePeer = true;
                //sees if the peer is in the declined table
                for (let j = 0; j < declinedPeers.length; j++) {
                    if (peersReceived[i].port == declinedPeers[j].port && peersReceived[i].ip == declinedPeers[j].ip) {
                        connectablePeer = false;
                    }
                }
                //sees if the peer is already in the peer table
                for (let y = 0; y < peerTable.length; y++) {
                    if (peersReceived[i].port == peerTable[y].port && peersReceived[i].ip == peerTable[y].ip) {
                        connectablePeer = false;
                    }
                }

                //if it's in neither table, add it to the join table (potential peer that can be joined if a connection fails)
                if (connectablePeer == true) {
                    let peerObject = {
                        ip: '',
                        port: 0
                    };
                    //sets the ip and port of that peer object
                    peerObject.ip = peersReceived[i].ip;
                    peerObject.port = peersReceived[i].port;
                    //adds to join table
                    joinTable.push(peerObject);
                }
            }

            peerClient.destroy();

            if (joinTable.length > 0) {
                //creating a new peer packet to connect
                peerReqPacket.init(1, numPeers, HOST, PORT);
                //connecting to the new peer
                peerClient.connect(joinTable[0].port, joinTable[0].ip, function () {

                    let peerObj = {
                        ip: '',
                        port: 0
                    };
                    //sets the ip and port of that peer object
                    peerObj.ip = joinTable[0].ip;
                    peerObj.port = joinTable[0].port;
                    //pushes it to the pending peers table
                    pendingTable.push(peerObj);

                    //send the peer message packet to the other peer 
                    peerClient.write(peerReqPacket.getPacket());
                });
            } else {
                console.log('Unable to connect to any peers in the network');
            }

        }
    });

}


//(Peer2PeerDB)
//SERVER FUNCTIONALITY --------------------------------------------------------------------------------------------------------------------------
peerServer.on('connection', function(sock) {
    //increase the number of peers
    numPeers = numPeers + 1;
    
    //when the peer acting as the server receives a message packet
    sock.on('data',readRespond);
    function readRespond(data){
        
        //read the port and ip from the packet
        var receivedPort = data.readIntBE(14,2);
        var recIParr = [];
        recIParr[0]=data.readIntBE(16,1);
        recIParr[1]=data.readIntBE(17,1);
        recIParr[2]=data.readIntBE(18,1); 
        recIParr[3]=data.readIntBE(19,1);

        //converts back to string
        var receivedIP = (recIParr[0]+'.'+recIParr[1]+'.'+recIParr[2]+'.'+recIParr[3]);
        
        var msgType;

        //if there are less than 3 peers, set message type to 1 for welcome and output that the connection was successful
        if (numPeers <= maxPeers){
            msgType = 1;
            console.log("Connected from peer "+receivedIP+":"+receivedPort);
            peerResPacket.addToPeerTable(receivedIP, receivedPort);
        }else{ //otherwise set the message type to 2 and output that the peer has been redirected
            numPeers = numPeers - 1;
            msgType = 2;
            console.log("Peer table full: "+receivedIP+":"+receivedPort+" redirected");
        }

        //Create the ack packet to send back to the peer attempting to connect
        peerResPacket.init(msgType, peerID, numPeers);
        sock.write(peerResPacket.getPacket());

    }

    sock.on('close', function () {

    });

    sock.on('error', function (err) {
      
    })
});