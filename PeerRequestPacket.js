//set the packet header equal to a buffer of 16 bytes
var packet = Buffer.alloc(32); 
var imageName = 'NULL';
var searchID;

module.exports = {

    init: function(messageType, senderID, passedIP, passedPort) { 

        let protocolVersion = 3314;
        //Adds the protocol version, message type, sender id, number of peers, stored port and stored ip address in the packet
        packet.writeIntBE(protocolVersion,0,3);
        packet.writeIntBE(messageType,3,1);
        packet.writeIntBE(senderID,4,4);

        if(messageType == 3){ //for search packet
            packet.writeIntBE(searchID,8,4);//currently a constant number, will be the search ID afterwards (need to implement)
        }else{
            packet.writeIntBE(44,8,4);//otherwise set to constant number
        }

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

    updateSearchID: function(passedID){
        if(searchID != null){
            var tempString = searchID.toString();
            tempString = tempString + passedID;

            searchID = parseInt(tempString);
        }else{
            searchID = passedID;
        }
    },

    getSearchID: function(){
        return searchID;
    },

    //Returns the packet
    getPacket: function() {
        return packet;
    }
};