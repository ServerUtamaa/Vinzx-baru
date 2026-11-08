const now = new Date();
const nyHour = parseInt(now.toLocaleTimeString("en-US", { timeZone: "America/New_York", hour12: false, hour: "numeric" }), 10);
const nyDate = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
console.log(nyHour, nyDate.getDay(), nyDate.getHours());
