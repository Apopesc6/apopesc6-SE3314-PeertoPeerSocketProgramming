var timeStamp;
//the singleton contains a time stamp 
var packetSingleton = {timeStamp};

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

    },

    getTimestamp: function() {
        //returns the current time stamp
        return packetSingleton.timeStamp;
    }


};