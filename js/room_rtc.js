const APP_ID =  "399679c1a6e14f5e96c995ee89ce4863";

let uid = sessionStorage.getItem("uid");

if(!uid){
    uid = String(Math.floor(Math.random() * 10000));
    sessionStorage.setItem("uid",uid);
}

let token = null;
let client;

let rtmClient;
let channel;


// room.html?room=234
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
let roomId =  urlParams.get('room');

if(!roomId){
    roomId = 'main'
}

let displayName = sessionStorage.getItem('display_name')
// if(!displayName){
//     window.location = 'lobby.html';
// }

let localTracks = [] // Current user audio and video
let remoteUsers  = {} // object of key value {user,audio:video track}

let localScreenTracks;
let screenSharing = false;

let joinInitRoom = async() => {
    rtmClient = await AgoraRTM.createInstance(APP_ID)
    await rtmClient.login({uid,token})

    await rtmClient.addOrUpdateLocalUserAttributes({'name':displayName});

    channel = await rtmClient.createChannel(roomId)
    await channel.join()

    channel.on('MemberJoined',handleMemberJoined); // user joins then this listener will be called.
    channel.on('MemberLeft',handleMemberLeft);
    channel.on('ChannelMessage',handleChannelMessage);


    getMembers();

    addBotMessageToDom(`Welcome to the room! ${displayName} 🤘`)

    client = AgoraRTC.createClient({mode:"rtc",codec:"vp8"});
    await client.join(APP_ID,roomId,token,uid);
    
    client.on("user-published",handleUserPublished);
    client.on("user-left",handleUserLeft);

    joinStream();
}

let joinStream = async() =>{

    localTracks = await AgoraRTC.createMicrophoneAndCameraTracks({},{encoderConfig:{
        width : {min:640,ideal:1920,max:1920},
        height: {min:480,ideal:1080,max:1080}
    }});

    let player =  `<div class="video__container" id="user-container-${uid}">
                <div class = "video_player" id = "user-${uid}"></div>
                    </div>`
    document.getElementById('streams_container').insertAdjacentHTML('beforeend',player);
    document.getElementById(`user-container-${uid}`).addEventListener('click',expandVideoFrame);

    localTracks[1].play(`user-${uid}`)

    if(displayFrame.style.display){
        player.style.height= '100px';
        player.style.widows = '100px';
    }
    await client.publish([localTracks[0],localTracks[1]]) // hits the line handleUserPublished using listener 'user-published' to publish in a stream.
}

let switchToCamera = async() => { // when screen is sharing and user wants to stop share then camera needs to open.
    let player =  `<div class="video__container" id="user-container-${uid}">
        <div class = "video_player" id = "user-${uid}"></div>
            </div>`
    displayFrame.insertAdjacentHTML('beforeend',player);

    await localTracks[0].setMuted(true);
    await localTracks[1].setMuted(true);
    
    document.getElementById('mic-btn').classList.remove('active');
    document.getElementById('screen-btn').classList.remove('active');

    localTracks[1].play(`user-${uid}`)
    await client.publish([localTracks[1]])
}

let handleUserPublished = async(user,mediaType) => {
    remoteUsers[user.uid] = user;
    await client.subscribe(user,mediaType);

    let player = document.getElementById(`user-container-${user.uid}`);
    if(player === null){
        player =  `<div class="video__container" id="user-container-${user.uid}">
                    <div class = "video_player" id = "user-${user.uid}"></div>
                        </div>`
        document.getElementById('streams_container').insertAdjacentHTML('beforeend',player);
        document.getElementById(`user-container-${user.uid}`).addEventListener('click',expandVideoFrame);

    }

    if(displayFrame.style.display){
        player.style.height= '100px';
        player.style.width = '100px';
    }

    if(mediaType === 'video'){
        user.videoTrack.play(`user-${user.uid}`)
    }

    if(mediaType === 'audio'){
        user.audioTrack.play(`user-${user.uid}`)
    }
}

let handleUserLeft = async(user) => {
    delete remoteUsers[user.uid];

    let item = document.getElementById(`user-container-${user.uid}`);
    if(item){
        item.remove();
    }

    if(userIdInDisplayFrame === `user-container-${user.uid}`){
        displayFrame.style.display = null;
        let videoFrames = document.getElementsByClassName('video__container');

        for(let i = 0; i < videoFrames.length;i++){
            videoFrames[i].style.height = '300px';
            videoFrames[i].style.width = '300px';
        }
    }
}

let toggleMic = async(e) => {
    let button = e.currentTarget;
    
    if(localTracks[0].muted){
        await localTracks[0].setMuted(false);
        button.classList.add('active');
    }
    else{
        await localTracks[0].setMuted(true);
        button.classList.remove('active');     
    }
}

let toggleCamera = async(e) => {
    let button = e.currentTarget;
    
    if(localTracks[1].muted){
        await localTracks[1].setMuted(false);
        button.classList.add('active');
    }
    else{
        await localTracks[1].setMuted(true);
        button.classList.remove('active');     
    }
}

let toggleScreen = async(e) => {
    let screenButton = e.currentTarget;
    let cameraButton = document.getElementById('camera-btn');

    if(!screenSharing){
        screenSharing = true;
        screenButton.classList.add('active');
        cameraButton.classList.remove('active');
        cameraButton.style.display = 'none';

        localScreenTracks = await AgoraRTC.createScreenVideoTrack();
        document.getElementById(`user-container-${uid}`).remove();
        displayFrame.style.display = 'block';

        let player =  `<div class="video__container" id="user-container-${uid}">
        <div class = "video_player" id = "user-${uid}"></div>
            </div>`

        displayFrame.insertAdjacentHTML('beforeend',player);
        document.getElementById(`user-container-${uid}`).addEventListener('click',expandVideoFrame);

        userIdInDisplayFrame = `user-container-${uid}`;
        localScreenTracks.play(`user-${uid}`);

        await client.unpublish([localTracks[1]]) // we only want to send audio and screen to users thus removing video.
        await client.publish([localScreenTracks]) // we are sharing screen with everyone in the room.

        let videoFrames = document.getElementsByClassName('video__container'); 
        for(let i = 0; i < videoFrames.length;i++){
            if(videoFrames[i].id != userIdInDisplayFrame){
              videoFrames[i].style.height = '100px';
              videoFrames[i].style.width = '100px'; 
            }
        }
    }
    else{
        document.getElementById(`user-container-${uid}`).remove();
        screenButton = false;
        cameraButton.style.display = 'block';        
        await client.unpublish([localScreenTracks])

        switchToCamera();
    }
}

let leaveStream = async(e) => {
    e.preventDefault();
    document.getElementsByClassName('stream__actions')[0].style.display = 'none';

    await client.unpublish([localTracks[0],localTracks[1]]);
    
    if(screenSharing){
        await client.unpublish([localScreenTracks]);
    }
    
    document.getElementById(`user-container-${uid}`).remove();

    if(userIdInDisplayFrame === `user-container-${uid}`){
        displayFrame.style.display = null;

        for(let i = 0; i < videoFrames.length;i++){
            videoFrames[i].style.height = '300px';
            videoFrames[i].style.width = '300px'; 
        }
        if(!videoFrames.length){
            window.location = 'lobby.html'
        }
    }

    channel.sendMessage({text:JSON.stringify({
        'type':'user_left',
        'uid':uid
    })})
}

document.getElementById("mic-btn").addEventListener('click',toggleMic);
document.getElementById("camera-btn").addEventListener('click',toggleCamera);
document.getElementById("screen-btn").addEventListener('click',toggleScreen);
document.getElementById('leave-btn').addEventListener('click',leaveStream);
joinInitRoom();