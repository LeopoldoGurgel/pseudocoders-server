// add any other functions that may come in handy here

module.exports = {

    generatePin: function() {
        let pin = '';
        for(let i = 0; i <= 3; i++){
        const random = Math.round(Math.random() * 9);
        pin = pin + random;
        };
         return pin;
    }

}
