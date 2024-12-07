const express = require('express');
const app = express();
const defaultPort = 80;

app.get('/test', (req, resp) => {
    console.log("/test API hit"); 
    resp.status(200).send('success');
});

app.get('/', (resp) => {
    console.log("homepage hit");
    resp.status(200).send('welcome');
})

var port = process.env.PORT || defaultPort;
app.listen(port, function(req, resp){
    console.log(`App available on http://localhost:%d`, port);
});

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