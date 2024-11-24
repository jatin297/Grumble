
let form = document.getElementById('lobby__form');
let displayName = sessionStorage.getItem('display_name') // sessionStorage because when session is over its storage needs to be overed.
                                                         // sessionStorage contains form data..

if(displayName){
    form.name.value = displayName;
}

form.addEventListener('submit',(e)=>{
    e.preventDefault();
    
    sessionStorage.setItem('display_name',e.target.name.value);
    let inviteCode = e.target.room.value;
    if(!inviteCode){
        inviteCode = String(Math.floor(Math.random()*10000));
    }
    window.location = `room.html?room=${inviteCode}`
})