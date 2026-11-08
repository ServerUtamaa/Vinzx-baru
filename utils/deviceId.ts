export const getDeviceId = () => {
    let deviceId = localStorage.getItem('VINZX_DEVICE_ID');
    if (!deviceId) {
        deviceId = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('VINZX_DEVICE_ID', deviceId);
    }
    return deviceId;
};
