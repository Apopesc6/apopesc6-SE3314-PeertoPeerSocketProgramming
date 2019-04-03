const net = require('net'),
    singleton = require('./Singleton'),
    peerResPacket = require('./PeerResponsePacket'),
    fs = require('fs'),
    imageResPacket = require('./ImageResponsePacket'),
    opn = require('opn'),
    peerReqPacket = require('./PeerRequestPacket');

//generate a random port number to be used for the server part of the peer
var portNum = Math.floor((Math.random() * 30000) + 1);

//variables and arrays used later in logic
var numPeers = 0;
var peerID;
var maxPeers;
var declinedPeers = []; //declined peers is used for not trying to connect to a peer that has already declined you when using automatic join
var joinTable = []; //the remaining peers that need to be joined with automatic join
var pendingTable = []; //if the peer is pending (waiting for an ack package)
var imageName;
const imageFolder = './images/';

//set the ip and port number for the peer (for the server functionality)
let HOST = '127.0.0.1',
    PORT = portNum;

net.bytesWritten = 300000;
net.bufferSize = 300000;

//initialize the singleton (start the timer and sequence number)
singleton.init();

let peerServer = net.createServer(); //creates the server
peerServer.listen(PORT, HOST);




//USER JUST TYPES node peer (just initializes server functionality with a default of maxpeers to 6)
if (process.argv.length == 2) { 

    //default the peer with ID 1, and with max peers 6
    peerID = 1;
    maxPeers = 6;
    console.log('This peer address is ' + HOST + ':' + PORT + ' located at p' + peerID);


//USER TYPES node peer with the -n command next to it (just initializes server functionality with the amount of maxpeers entered)
} else if (process.argv.length == 4 && process.argv[2] == '-n') { 

    //default the peer with ID 1, but set the max peers this time
    peerID = 1;
    maxPeers = parseInt(process.argv[3]);
    console.log('This peer address is ' + HOST + ':' + PORT + ' located at p' + peerID);


//CLIENT FUNCTIONALITY -----------------------------------------------------------------------------------------------------------------------
} else {

    /*NOTE: THE USER CAN ONLY TYPE THE COMMAND IN THE FORMAT: node peer -p [address] -n[numPeers] -q[imageName] */
    /*OR: node peer -p [address] -q[imageName] */
    /*OR: node peer -p [address] -n[numPeers] */
    /*OR JUST: node peer -p [address]*/


    //Setting and imageName maxPeers based on the command
    if (process.argv[4] == '-n' && process.argv[6] == '-q') { //if the user specifies the max peers and the image name in the command
        imageName = process.argv[7];
        maxPeers = parseInt(process.argv[5]);
        peerReqPacket.setImageName(imageName);
    }
    else if (process.argv[4] == '-n') { //if the user only specifies the max peers in the command
        maxPeers = parseInt(process.argv[5]);
    }
    else if (process.argv[4] == '-q') { //if the user specifies the image name in the command
        imageName = process.argv[5];
        maxPeers = 6;
        peerReqPacket.setImageName(imageName);
    } else { //otherwise just set the maxpeers to 6
        maxPeers = 6;
    }

    var address = process.argv[3]; //gets the address from the command

    //uses substr on the address to get the Host and Port numbers of the server that the peer wants to connect to
    var connectHOST = address.substr(0, address.lastIndexOf(':'));
    var connectPORT = parseInt(address.substr(address.lastIndexOf(':') + 1, address.length));

    //creates a new socket to connect to the other peer 
    var peerClient = new net.Socket();

    //creates the peer message packet (to query the server if it can be connected to)
    peerReqPacket.init(0, numPeers, HOST, PORT);

    //peer acting as a client connects to the peer acting as a server 
    peerClient.connect(connectPORT, connectHOST, function () {

        let peerObj = {
            ip: '',
            port: 0
        };
        //sets the ip and port of that peer object
        peerObj.ip = connectHOST;
        peerObj.port = connectPORT;

        //push to the pending table as the peer is waiting for an ack
        pendingTable.push(peerObj);

        //send the peer message packet to the other peer acting as the server 
        peerClient.write(peerReqPacket.getPacket());
    });

    //when the peer trying to connect receives an acknowledgement packet back
    peerClient.on('data', function (data) {

        if (data.length == 100) { //IF IT IS A PEER RESPONSE PACKET (they have a fixed length of 100)

            //remove the peer from the pending table
            pendingTable.pop();

            //read the packet
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
                peerResPacket.addToPeerTable(connectHOST, parseInt(connectPORT),recID);
            }

            //assigning the peer IDs
            if (numP > recID) {
                peerID = numP + 1;
            } else if (numP <= recID) {
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

            //gets the peer's peertable
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

                //destroys the socket since the connection was failed
                peerClient.destroy();

                if (joinTable.length > 0) {
                    //creating a new peer packet to connect a new peer
                    peerReqPacket.init(0, numPeers, HOST, PORT);
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
        }  else { //IF IT IS AN IMAGE PACKET

            //reads all of the data from the response packet and stores it in variables
            var responseType = data.readIntBE(3, 1);
            var sequenceNum = data.readIntBE(4, 3);
            var timeStamp = data.readIntBE(7, 5);
            var fileSize = data.readIntBE(13, 3);

            //slices the header off of the packet, and stores the image data in this variable
            var file = data.slice(16);

            if (responseType == 1) { //console logs the data that comes with the image packet
                console.log("Image Received from server of size: " + fileSize + " mb.");
                console.log("At time stamp: " + timeStamp);
                console.log("With sequence number: " + sequenceNum);
            }

            //using the libraries to save the file and open the file
            if (responseType == 1) {
                fs.writeFileSync(imageName, file);
                opn(imageName).then(() => { });
            }
        }

    });

}
//-----------------------------------------------------------------------------------------------------------------------------------------------






//(Peer2PeerDB)
//SERVER FUNCTIONALITY --------------------------------------------------------------------------------------------------------------------------
peerServer.on('connection', function (sock) {
    //increase the number of peers
    numPeers = numPeers + 1;

    //when the peer acting as the server receives a message packet
    sock.on('data', readRespond);
    function readRespond(data) {

        var passedFileName = (data.toString('utf-8', 20, 32)).toString(); //gets the file name from the packet

        //read the port and ip from the packet
        var receivedPort = data.readIntBE(14, 2);
        var recIParr = [];
        recIParr[0] = data.readIntBE(16, 1);
        recIParr[1] = data.readIntBE(17, 1);
        recIParr[2] = data.readIntBE(18, 1);
        recIParr[3] = data.readIntBE(19, 1);

        //converts back to string
        var receivedIP = (recIParr[0] + '.' + recIParr[1] + '.' + recIParr[2] + '.' + recIParr[3]);

        if (data.readIntBE(3,1) != 3 && data.length == 32) { //IF IT IS NOT A SEARCH IMAGE QUERY PACKET
            var msgType;

            //if there are less than 3 peers, set message type to 1 for welcome and output that the connection was successful
            if (numPeers <= maxPeers) {
                msgType = 1;
                console.log("Connected from peer " + receivedIP + ":" + receivedPort);

                //adding the required information to the peer table (the ID of the peer connecting, the received ip and the received port)
                var storedID;
                if (numPeers > peerID) {
                    storedID = numPeers + 1;
                } else if (numPeers <= peerID) {
                    storedID = peerID + 1;
                }
                peerResPacket.addToPeerTable(receivedIP, receivedPort,storedID);
                

            } else { //otherwise set the message type to 2 and output that the peer has been redirected
                numPeers = numPeers - 1;
                msgType = 2;
                console.log("Peer table full: " + receivedIP + ":" + receivedPort + " redirected");
            }

            //Create the ack packet to send back to the peer attempting to connect
            peerResPacket.init(msgType, peerID, numPeers);
            sock.write(peerResPacket.getPacket());


            //HANDLES THE IMAGE QUERIES----------------------------------------------------------------------------------------------------------------------------------------------
            if (msgType == 1 && !(passedFileName.includes('NULL'))) { //Only performs the image searches if the message type is 1 (meaning that the peer can connect).

                //This will remove any extra white space from the buffer and create the correct file name to be used for searching purposes later
                if (passedFileName.includes("swan.jpg") || passedFileName.includes("Swan.jpg")) {
                    passedFileName = 'Swan.jpg';
                } else if (passedFileName.includes("flicker.jpg") || passedFileName.includes("Flicker.jpg")) {
                    passedFileName = 'Flicker.jpg';
                } else if (passedFileName.includes("parrot.jpg") || passedFileName.includes("Parrot.jpg")) {
                    passedFileName = 'Parrot.jpg';
                } else if (passedFileName.includes("cardinal.jpg") || passedFileName.includes("Cardinal.jpg")) {
                    passedFileName = 'Cardinal.jpg';
                } else if (passedFileName.includes("flamingo.jpg") || passedFileName.includes("Flamingo.jpg")) {
                    passedFileName = 'Flamingo.jpg';
                }

                //gets an array of file names from the 'images' folder
                var foundFiles = [];
                fs.readdirSync(imageFolder).forEach(file => {
                    foundFiles.push(file);
                });

                //search to see if file name extracted from the packet is in the array of file names extracted from the images folder.
                var responseMsg = 2; //set to 2 for not found
                for (let i = 0; i < foundFiles.length; i++) {
                    if (passedFileName == foundFiles[i]) {
                        responseMsg = 1; //if it finds the file, sets it to 1 for found
                        break;
                    }
                }

                //create the image response packet
                imageResPacket.init(3314, responseMsg, singleton.getSequenceNumber(), singleton.getTimestamp(), passedFileName);
                //send it back to the client
                sock.write(imageResPacket.getPacket());

                if (responseMsg == 2) { //if it's not found, query other peers
                    console.log("Image not found, querying other peers.");

                    //update the search ID for what peers have seen the packet
                    peerReqPacket.updateSearchID(storedID);
                    peerReqPacket.updateSearchID(peerID);
                    peerReqPacket.setImageName(passedFileName);

                    //create a search packet
                    peerReqPacket.init(3, peerID, receivedIP, receivedPort);
                    
                    //get the peer table
                    let searchTable = peerResPacket.getPeerTable();

                    //remove the peers that have already seen the packet from the table to be searched for peers
                    for (let i = 0; i < searchTable.length; i++){
                        if(searchTable[i].id == storedID || searchTable[i].id == peerID){
                            searchTable.splice(i,1);
                        }
                    }
                    
                    //create a new socket and forward the packet to the next peer in the table
                    let peerSearchClient = new net.Socket();

                    peerSearchClient.connect(searchTable[0].port, searchTable[0].ip, function () {
                        peerSearchClient.write(peerReqPacket.getPacket());
                    });

                }

            }
        }

        else if (data.readIntBE(3,1) == 3 && data.length == 32) {//IF IT IS A SEARCH IMAGE QUERY PACKET 

            //convert the passed file name to the correct string (removing the whitespace from the buffer)
            if (passedFileName.includes("swan.jpg") || passedFileName.includes("Swan.jpg")) {
                passedFileName = 'Swan.jpg';
            } else if (passedFileName.includes("flicker.jpg") || passedFileName.includes("Flicker.jpg")) {
                passedFileName = 'Flicker.jpg';
            } else if (passedFileName.includes("parrot.jpg") || passedFileName.includes("Parrot.jpg")) {
                passedFileName = 'Parrot.jpg';
            } else if (passedFileName.includes("cardinal.jpg") || passedFileName.includes("Cardinal.jpg")) {
                passedFileName = 'Cardinal.jpg';
            } else if (passedFileName.includes("flamingo.jpg") || passedFileName.includes("Flamingo.jpg")) {
                passedFileName = 'Flamingo.jpg';
            }

            //gets the file names stored in the image folder and pushes it to an array
            var foundFileNames = [];
            fs.readdirSync(imageFolder).forEach(file => {
                foundFileNames.push(file);
            });

            //search to see if file name extracted from the packet is in the array of file names extracted from the images folder.
            var foundMsg = 2; //set to 2 for not found
            for (let i = 0; i < foundFileNames.length; i++) {
                if (passedFileName == foundFileNames[i]) {
                    foundMsg = 1; //if it finds the file, sets it to 1 for found
                    break;
                }
            }

            //if the image is not found
            if(foundMsg == 2){
                
                //converting the search id to an array of integers to compare to peer table (to see which peers have already viewed the table)
                let searchID = data.readIntBE(8,4).toString();
                let searchedPeers = [];
                for(let i = 0; i<searchID.length;i++){
                    searchedPeers[i] = parseInt(searchID[i]);
                }

                //comparing IDs of peers who've already viewed the packet vs the ids of the peer's peer table
                let searchTable = peerResPacket.getPeerTable();
                
                //remove all peers that have viewed the packet already
                for (let i = 0; i < searchTable.length; i++){
                    for (let j = 0; j <searchedPeers.length;j++){
                        if (searchTable[i].id == searchedPeers[j]){
                            searchTable.splice(i,1);
                        }
                    }
                }
                
                //if there are some peers left that can be queried
                if(searchTable.length != 0){
                    console.log('Image not found, querying other peers.');

                    //adding to the search id of peers that have already seen the packet
                    peerReqPacket.updateSearchID(peerID);

                    //initializing the query packet that needs to be sent to other peers
                    peerReqPacket.setImageName(passedFileName);
                    peerReqPacket.init(3, peerID, receivedIP, receivedPort);
                    
                    //create a new socket and forward the packet to the next peer that hasn't seen it yet
                    let peerSearchClient = new net.Socket();

                    peerSearchClient.connect(searchTable[0].port, searchTable[0].ip, function () {
                        peerSearchClient.write(peerReqPacket.getPacket());
                    });

                }else{ //if there are no peers left to forward the packet to.
                    console.log('Could not find image in the peer network.')
                }


            }else{ //if it finds the image, it will connect back to the original peer
                console.log('Image found, sending back to original peer.');

                //create the image response packet
                imageResPacket.init(3314, 1, singleton.getSequenceNumber(), singleton.getTimestamp(), passedFileName);
                let peerSearchClient = new net.Socket();

                peerSearchClient.connect(receivedPort, receivedIP, function () {
                    //send it back to the client
                    peerSearchClient.write(imageResPacket.getPacket());
                });
            }



        }else{ //IF THERE IS ANOTHER PEER IN THE NETWORK DIRECTLY CONNECTING TO SEND THE FOUND IMAGE
            //reads all of the data from the response packet and stores it in variables
            var responseType = data.readIntBE(3, 1);
            var sequenceNum = data.readIntBE(4, 3);
            var timeStamp = data.readIntBE(7, 5);
            var fileSize = data.readIntBE(13, 3);

            //slices the header off of the packet, and stores the image data in this variable
            var file = data.slice(16);

            if (responseType == 1) {
                console.log("Image Received from server of size: " + fileSize + " mb.");
                console.log("At time stamp: " + timeStamp);
                console.log("With sequence number: " + sequenceNum);
            }

            //using the libraries to save the file and open the file
            if (responseType == 1) {
                fs.writeFileSync(imageName, file);
                opn(imageName).then(() => { });
            }
        }

    }

    sock.on('close', function () {

    });

    sock.on('error', function (err) {

    })
});