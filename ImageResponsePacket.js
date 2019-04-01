var fs = require('fs');

//set the packet header equal to a buffer of 16 bytes
var packet = Buffer.alloc(16); 

module.exports = {

    init: function(protocolVersion, responseType, sequenceNum, timeStamp, imageName) { 

        //if the response type is 1 (meaning that the file has been found), find the size of the file and store it in a variable
        if (responseType == 1){
            var stats = fs.statSync(`./images/${imageName}`);
            var filesize = stats.size;
        }else{
            //otherwise, set the file size to 0
            var filesize = 0;
        }

        //writes the protocol version, response type, sequence number, time stamp, and file size all in the packet header
        //in this case, I am using the 16 byte buffer that I declared earlier, and am offsetting and allocating certain amounts of bytes for each value
        packet.writeIntBE(protocolVersion,0,3);
        packet.writeIntBE(responseType,3,1);
        packet.writeIntBE(sequenceNum,4,3);
        packet.writeIntBE(timeStamp,7,5);
        packet.writeIntBE(filesize,13,3);
        
        //if the image is found
        if(responseType == 1){
            //Get the image file
            var file = fs.readFileSync(`./images/${imageName}`);
            //Combine the packet header with the payload (the image file)
            realPacket = Buffer.concat([packet,file]);
        }else{
            realPacket = packet;
        }
    },



    //Returns the packet
    getPacket: function() {
    
        return realPacket;
    }
};