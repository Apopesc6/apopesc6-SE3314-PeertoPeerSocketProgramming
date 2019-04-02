
//set the packet header equal to a buffer of 16 bytes
var packet = Buffer.alloc(100); 

var peeringTable = [];



module.exports = {

    init: function(messageType, senderID, numPeers) { 

        let protocolVersion = 3314;
        //Adds the protocol version, message type, sender id, number of peers, stored port and stored ip address in the packet
        packet.writeIntBE(protocolVersion,0,3);
        packet.writeIntBE(messageType,3,1);
        packet.writeIntBE(senderID,4,4);
        packet.writeIntBE(numPeers,8,4);
        packet.writeIntBE(0,12,2);

        for (let j = 0; j <peeringTable.length; j++){
            
            packet.writeIntBE(peeringTable[j].port,14 + (6*j),2);
            let IP = (peeringTable[j].ip).split('.');
            
            for (let i=0;i<IP.length;i++){
                IP[i]= parseInt(IP[i]);
            }

            packet.writeIntBE(IP[0], 16 + (6*j), 1);
            packet.writeIntBE(IP[1], 17 + (6*j), 1);
            packet.writeIntBE(IP[2], 18 + (6*j), 1);
            packet.writeIntBE(IP[3], 19 + (6*j), 1);

        } 

    },

    addToPeerTable:function(ipAddr,portNum,passedID){

        let peerObj = {
            ip: '',
            port: 0,
            id: 0
        };

        peerObj.ip = ipAddr;
        peerObj.port = portNum;
        peerObj.id = passedID;

        peeringTable.push(peerObj);
    },

    getPeerTable:function(){
        return peeringTable;
    },

    //Returns the packet
    getPacket: function() {
        return packet;
    }
};