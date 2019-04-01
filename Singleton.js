var timeStamp;
var sequenceNum;
//the singleton contains a time stamp and a sequence number
var packetSingleton = {timeStamp, sequenceNum};

module.exports = {

    init: function() {
        //the time stamp is initialized to a random number
        var randNum = Math.floor((Math.random()*999)+1);
        packetSingleton.timeStamp = randNum;

        //the time stamp is then incremented every 10ms
        setInterval(function(){
            packetSingleton.timeStamp = packetSingleton.timeStamp+1;
            //if it is greater than 2^32, reset the value back to 0
            if (packetSingleton.timeStamp > 4294967296){
                packetSingleton.timeStamp = 0;
            }
        },10);

        //initialize the sequence number as random
        var randSeqNum = Math.floor((Math.random()*999)+1);
        packetSingleton.sequenceNum = randSeqNum;
    },

   
    getSequenceNumber: function() {
        //returns the packet sequence number and increments it
        packetSingleton.seqenceNum = packetSingleton.seqenceNum + 1;
        return packetSingleton.sequenceNum;
    },

    getTimestamp: function() {
        //returns the current time stamp
        return packetSingleton.timeStamp;
    }


};