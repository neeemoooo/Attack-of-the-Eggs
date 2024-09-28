import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getFirestore,collection,doc,addDoc,updateDoc,onSnapshot,query,limit,orderBy } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-analytics.js";
const firebaseConfig = {
    apiKey: "AIzaSyBNVXAO_tarL_SvSR6kr2F6UI04W0uu5KM",
    authDomain: "attack-of-the-eggs.firebaseapp.com",
    projectId: "attack-of-the-eggs",
    storageBucket: "attack-of-the-eggs.appspot.com",
    messagingSenderId: "978800162178",
    appId: "1:978800162178:web:2ddaa732f96d6e943bcb9b",
    measurementId: "G-0Q9HHNSVYR"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

type ActiveHand = "left" | "right";
type ElementToggleState = "show" | "hide"

interface LeaderBoardPlayer {
    playerName:string;
    playerProfileColor:string;
    playerScore:number;    
}

loadLeaderBoard();
toggleGameDisplay("hide");
gamePopupMessage("show","game-start-board");
detectPlayerInfo();

let activeHand:ActiveHand = "left";
let letters:string[] = generateLettersArray();

const gameCanvas = document.getElementById("game-canvas") as HTMLElementTagNameMap["section"];
const playAgainBtn =  document.getElementById("play-again-btn") as HTMLButtonElement;
const startGameBtn = document.getElementById("start-game-btn") as HTMLButtonElement;
const gameDifficultySelectElement = document.getElementById("game-difficulty-select") as HTMLSelectElement;
const playerLivesElement = document.getElementById("player-lives") as HTMLParagraphElement;
const playerScoreElement = document.getElementById("player-score") as HTMLSpanElement;
const daggerThrowAudio = new Audio("../audio/knifeThrow.wav");
const eggCrackAudio = new Audio("../audio/crackEgg.wav");
const selectAudio = new Audio("../audio/select.wav");

const DEFAULT_PLAYER_LIVES = 3;

let playerLives = DEFAULT_PLAYER_LIVES; 
let playerScore = 0;
let eggSpawnInterval = 1000;
let eggSpawnTimerId:number = 0;

function detectPlayerInfo():void {
    const playerInfo:string | null = localStorage.getItem("playerInfo");
    if(playerInfo) { 
        const {playerName,playerProfileColor} = JSON.parse(playerInfo);
        const playerInfoSection = document.getElementById("player-info-section") as HTMLDivElement;
        playerInfoSection.style.display = "none";
        loadPlayerInfo(playerName,playerProfileColor);
    }
}

function createPlayerInfo(playerName:string,playerProfileColor:string):void {
     localStorage.setItem("playerInfo",JSON.stringify({playerName,playerProfileColor,playerScore:0}));    
     const playerInfo = localStorage.getItem("playerInfo");
     if(playerInfo){
         const  {playerName,playerProfileColor} = JSON.parse(playerInfo);
         loadPlayerInfo(playerName,playerProfileColor);
     }
     createPlayerToDB(playerName,playerProfileColor,0);   
}

    
function createPlayerToDB(playerName:string,playerProfileColor:string,playerScore:number){
    const collectionRef = collection(db,"leaderboard");
    addDoc(collectionRef,{playerInfo:{playerName,playerProfileColor,playerScore}})
    .then(newPlayer => {
        localStorage.setItem("playerId",newPlayer.id);
    });
}

function loadPlayerInfo(playerName:string,playerProfileColor:string){
    const playerNameDisplayElement = document.getElementById("player-name-display-element") as HTMLSpanElement;
    const playerProfileColorElement = document.getElementById("player-profile-display-element") as HTMLDivElement;

    playerNameDisplayElement.textContent = playerName;
    playerProfileColorElement.style.background = playerProfileColor; 
}

function updatePlayerStats():void {
    playerScoreElement.textContent = `${playerScore}`;
    playerLivesElement.textContent = `${playerLives}`;
}

function generateLettersArray():string[]{
    return Array.from({length:26},((_,i) => String.fromCharCode(97 + i)));
}

function generateLeftPosition():number {
    return Math.floor(Math.random() * 85);
}

function generateLetter():string{
    if(letters.length <= 0){    
        letters = generateLettersArray();

    }
    const randomLetterIndex = Math.floor(Math.random() * letters.length);
    return letters.splice(randomLetterIndex,1)[0];
}

function generateEgg(eggLetter:string,leftPosition:number):HTMLDivElement {
    const eggElement = document.createElement("div");
    const eggLetterElement = document.createElement("p");
    const eggImageElement = document.createElement("img");
    const eggImageElementSrc = "./images/eggMonster.png";

    eggLetterElement.textContent = eggLetter;
    eggImageElement.src = eggImageElementSrc;
    eggImageElement.setAttribute("id",`egg-${eggLetter}-image`)
    eggImageElement.alt = "";
    eggImageElement.height = 80;
    eggImageElement.width = 80;
    
    eggElement.setAttribute("class","fallingEgg monsterEgg w-max flex flex-col justify-center transition-all duration-1000 absolute top-[-30%]");
    eggElement.setAttribute("id",`egg-${eggLetter}`);
    eggElement.setAttribute("data-egg-destroyed","false");
    eggElement.style.left = `${leftPosition}%`;
    eggLetterElement.setAttribute("class","h-[50px] w-[50px] flex items-center justify-center bg-keyBg rounded-md font-bold text-white text-2xl border-[5px] border-[#181818] translate-x-[15px] translate-y-[10px]");

    eggElement.append(eggLetterElement,eggImageElement);
    
    setTimeout(() => {
        const {bottom,height} = eggElement.getBoundingClientRect();
        const eggParentContainer = eggElement.parentElement?.getBoundingClientRect();
        const isOnBottom = ((bottom - height) - (eggParentContainer?.height || 0)) === 0;
        if(isOnBottom && eggElement.parentElement){
            playerLives -= 1;
            if(playerLives <= 0){                 
                stopGame();
                return;
            }
            removeEgg(eggElement);
            updatePlayerStats();
        }
    },4000);
    return eggElement;
}

function startSpawningEggs():void {
    eggSpawnTimerId = setInterval(() => { 
        const newEggElement = generateEgg(generateLetter(),generateLeftPosition());
        gameCanvas?.append(newEggElement);
    },eggSpawnInterval) as unknown as number;
}

function removeEgg(eggElement:HTMLElement):void {
    gameCanvas?.removeChild(eggElement);
}

function handThrowAnimation(activeHand:string):void {
    const currentHandElement = document.getElementById(`hand-${activeHand}`) as HTMLImageElement;
    if(activeHand === "left"){
        currentHandElement.style.transform = `translate(45px,20px) rotate(80deg)`;
    }
    else if(activeHand === "right"){
        currentHandElement.style.transform = `translate(-50px,30px) rotate(-80deg)`;
    }

    setTimeout(() => currentHandElement.style.transform = "",100);
}

function animateHandThrow():void {
    if(activeHand === "left") {         
        handThrowAnimation("left");
        activeHand = "right";
    }
    else if(activeHand === "right"){
        handThrowAnimation("right");
        activeHand = "left";
    }
}

function playBgAudio(audioType:"egg" | "knife"):void {
    if(audioType === "knife"){
        daggerThrowAudio.currentTime = 0;
        daggerThrowAudio.play();
        return;
    }
    else if(audioType === "egg"){
        eggCrackAudio.currentTime = 0;
        eggCrackAudio.play();
        return;
    }
}

function throwDaggerAtEgg(key:string):void {
    const targetEgg:HTMLElement |  null = document.getElementById(`egg-${key}`); 
    if(targetEgg && targetEgg.dataset.eggDestroyed === "false"){
        targetEgg.dataset.eggDestroyed = "true";
        const currentDagger = document.getElementById(`dagger-${activeHand}`) as HTMLImageElement;
        const targetImageElement = document.getElementById(`egg-${key}-image`) as HTMLImageElement;
        const crackedImageSrc = "./images/eggMonsterCracked.png";

        const {x,y} = targetEgg.getBoundingClientRect();
        const {x:xDagger,y:yDagger} = currentDagger.getBoundingClientRect();

        currentDagger.style.transform = `translate(${x - xDagger}px,${(y - yDagger) + 40}px)`; 

        playerScore++;
        updatePlayerStats();
        animateHandThrow();
        playBgAudio("knife");
        setTimeout(() => {
            targetImageElement.src = crackedImageSrc;
            targetEgg.style.opacity = "0"; 
            playBgAudio("egg");
        },200);
        setTimeout(() => removeEgg(targetEgg),1100);
        setTimeout(() => currentDagger.style.transform = "",300);
    }
}

function removeAllEggs():void {
    const allEggsElement:NodeList = document.querySelectorAll(".monsterEgg"); 
    allEggsElement.forEach(egg => gameCanvas.removeChild(egg));
}

function toggleGameDisplay(state:ElementToggleState){
    const gameLeaderBoardElement = document.getElementById("leader-board-element") as HTMLElementTagNameMap["aside"];
    const gameOptionsElement = document.getElementById("game-options-element") as HTMLElementTagNameMap["header"];
    const characterParts:NodeList = document.querySelectorAll(".character-part");
    if(state === "show") {
        gameLeaderBoardElement.style.display = "";
        gameOptionsElement.style.display = "";
        characterParts.forEach(part => (part as HTMLImageElement).style.display = "");
    }
    else if(state === "hide") {
        gameLeaderBoardElement.style.display = "none";
        gameOptionsElement.style.display = "none";
        characterParts.forEach(part => (part as HTMLImageElement).style.display = "none");
    }
}

function gamePopupMessage(state:ElementToggleState,id:string){
    const gameOverBoardElement = document.getElementById(id) as HTMLElementTagNameMap["section"];

    if(state === "show"){
        gameOverBoardElement.style.display = "flex";
    }
    else if(state === "hide") {
        gameOverBoardElement.style.display = "";
    }
}

function leaderBoardListItem(player:LeaderBoardPlayer,index:number):HTMLLIElement {    
    const crownImageSrc:string[] = ["./images/goldCrown.png","./images/silverCrown.png","./images/bronzeCrown.png"];

    const playerListElement = document.createElement("li");
    const playerProfileColorElement = document.createElement("div");
    const playerNameElement = document.createElement("p");
    const playerScoreElement = document.createElement("p");

    playerProfileColorElement.style.background = player.playerProfileColor;
    playerNameElement.textContent = player.playerName;
    playerScoreElement.textContent = `${player.playerScore}`;

    playerListElement.setAttribute("class","p-4 flex items-center gap-x-4")
    playerProfileColorElement.setAttribute("class","h-[40px] w-[40px] rounded-full");
    playerNameElement.setAttribute("class","text-white uppercase text-xl font-bold overflow-hidden w-[11ch] text-ellipsis text-nowrap");
    playerScoreElement.setAttribute("class","text-white uppercase text-xl font-bold overflow-hidden w-[5ch] text-ellipsis");

    if(index <= 2){
        const playerCrownImage = document.createElement("img");
        playerCrownImage.src = crownImageSrc[index];
        playerListElement.append(playerCrownImage);
    }

    playerListElement.append(playerProfileColorElement,playerNameElement,playerScoreElement);

    return playerListElement;
}

async function loadLeaderBoard() {
    const gameLeaderBoardElement = document.getElementById("leader-board-list-element") as HTMLUListElement;
    const leaderBoardRef = collection(db,"leaderboard");
    const leaderBoardQuery = query(leaderBoardRef,orderBy("playerInfo.playerScore","desc"),limit(10));

    onSnapshot(leaderBoardQuery,(querySnapshot) => {
         const topPlayers:LeaderBoardPlayer[] = [];
         querySnapshot.forEach(doc => {
            topPlayers.push(doc.data().playerInfo);
         });
         gameLeaderBoardElement.innerHTML = "";
         topPlayers.forEach((player,index) => {
            gameLeaderBoardElement.append(leaderBoardListItem(player,index));
         });

    });

}

function updateGameDifficulty():void {
    playerScore = 0;
    playerLives = DEFAULT_PLAYER_LIVES;

    clearInterval(eggSpawnTimerId);
    removeAllEggs();
    updatePlayerStats();
    startSpawningEggs();
}

function updateUserHighScore(newScore:number){
    const playerId = localStorage.getItem("playerId");
    const playerDocRef = doc(db,"leaderboard",playerId);
    updateDoc(playerDocRef,{"playerInfo.playerScore":newScore});
}

function trackPlayerScore(playerCurrentScore:number){
   const playerInfo:string | null = localStorage.getItem("playerInfo");
   if(playerInfo){    
        const playerInfoItem = JSON.parse(playerInfo);
        if(playerCurrentScore >  playerInfoItem.playerScore){
            playerInfoItem.playerScore = playerCurrentScore;
            updateUserHighScore(playerCurrentScore);
            localStorage.setItem("playerInfo",JSON.stringify(playerInfoItem)); 
        }
   }
}

function playAgain(){
    toggleGameDisplay("show");
    gamePopupMessage("hide","game-over-board");
    startSpawningEggs();
}

function stopGame(){
    const finalUserScoreElement = document.getElementById("final-user-score") as HTMLSpanElement;
    finalUserScoreElement.textContent = ` ${playerScore}`;
    trackPlayerScore(playerScore);

    toggleGameDisplay("hide");
    gamePopupMessage("show","game-over-board");

    playerScore = 0;
    playerLives = DEFAULT_PLAYER_LIVES;

    clearInterval(eggSpawnTimerId);
    removeAllEggs();
    updatePlayerStats();
}

function startGame(){
    window.addEventListener("keydown",(e:KeyboardEvent) => {
        throwDaggerAtEgg(e.key); 
    }); 

    gameDifficultySelectElement.addEventListener("change",(e:Event) => {
        const targetElement = e.target as HTMLSelectElement;
        const targetElementValue = parseInt(targetElement.value);        
        targetElement.blur();
        eggSpawnInterval = targetElementValue;        
        updateGameDifficulty();
    });

    gameDifficultySelectElement.addEventListener("click",() => {
        selectAudio.currentTime = 0;
        selectAudio.play();
    });

    playAgainBtn.addEventListener("click",playAgain) 

    updatePlayerStats();
    startSpawningEggs();
}

startGameBtn.addEventListener("click",() => {
    const playerNameInput = document.getElementById("player-name") as HTMLInputElement;
    const playerProfileColor = document.getElementById("profile-color") as HTMLInputElement;
    const playerInfo:string | null = localStorage.getItem("playerInfo");

    if(playerNameInput.value.trim().length <= 0 && playerInfo === null) {
        alert("please provide a player name");
        return;    
    }

    if(playerInfo === null){
       createPlayerInfo(playerNameInput.value.trim(),playerProfileColor.value);
    }

    gamePopupMessage("hide","game-start-board");
    toggleGameDisplay("show");
    startGame();
});