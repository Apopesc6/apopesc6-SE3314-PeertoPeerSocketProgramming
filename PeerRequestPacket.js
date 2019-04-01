//set the packet header equal to a buffer of 16 bytes
var packet = Buffer.alloc(32); 
var imageName = 'NULL';

module.exports = {

    init: function(messageType, senderID, passedIP, passedPort) { 

        let protocolVersion = 3314;
        //Adds the protocol version, message type, sender id, number of peers, stored port and stored ip address in the packet
        packet.writeIntBE(protocolVersion,0,3);
        packet.writeIntBE(messageType,3,1);
        packet.writeIntBE(senderID,4,4);
        packet.writeIntBE(44,8,4);//currently a constant number, will be the search ID afterwards (need to implement)
        packet.writeIntBE(0,12,2);
        packet.writeIntBE(passedPort,14,2);

        let IP = passedIP.split('.');

        for (let i=0;i<IP.length;i++){
            IP[i]= parseInt(IP[i]);
        }

        packet.writeIntBE(IP[0], 16, 1);
        packet.writeIntBE(IP[1], 17, 1);
        packet.writeIntBE(IP[2], 18, 1);
        packet.writeIntBE(IP[3], 19, 1);
        packet.write(imageName, 20, 12, 'utf-8');
    },
  
    setImageName: function(name){
        imageName = name;
    },

    //Returns the packet
    getPacket: function() {
        return packet;
    }
};