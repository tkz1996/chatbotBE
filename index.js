const express = require('express');
const app = express();
const defaultPort = 3000;

app.get('/test', (request, response) => {
    response.status(200).send('success');
});

var port = process.env.PORT || defaultPort;
app.listen(port, () => console.log(`App available on http://localhost:%d`, port));

function gracefulshutdown() { 
    console.log("Shutting down"); 
    myApp.close(() => { 
        console.log("HTTP server closed."); 
          
        // When server has stopped accepting connections  
        // exit the process with exit status 0 
        process.exit(0);  
    }); 
} 
  
process.on("SIGTERM", gracefulshutdown);