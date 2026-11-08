const fs = require('fs');

const generateDeviceId = () => {
    return 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
};

console.log(generateDeviceId());
