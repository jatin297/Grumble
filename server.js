const express = require('express')
const path = require('path')
const app = express();
const port = process.env.port || 3000;

app.use(express.static(path.join(__dirname,'../public')))

app.get('/lobby',(req,res)=>{
    // global.window.location = 'lobby.html';
    res.sendFile('./room.html', { root: __dirname });
})
app.listen(port,()=>{
    console.log(`listening on.. ${port}`)
});