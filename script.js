///////////////
// PARAMETRS //
///////////////

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

const visibilityDuration = urlParams.get("duration") || 0;
const hideAlbumArt = urlParams.has("hideAlbumArt");

let currentState = false;
let currentSongUri = -1;

const axiosCLient = axios.create({
    baseURL: 'http://localhost:8880/api',
    mode: 'no-cors',
    headers: {
        'Content-Type': 'application/json'
    }
});

async function GetCurrentlyPlaying() {
    
    await axiosCLient.get(`/player?columns=%artist%,%title%`, {
        method: "GET",
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/json'
        }
    }).then(async (response) => {
        if (response.status == 200)
            {
                UpdatePlayer(response.data);
            }
    }).then(() => {
        setTimeout(() => {
            GetCurrentlyPlaying()
        }, 1000);
    }).catch((error) => {
        console.debug(error);
        SetVisibility(false);
        
        // Try again in 2 seconds
        setTimeout(() => {
            GetCurrentlyPlaying()
        }, 2000);
    });
}

function UpdatePlayer(data) {
	const isPlaying = data.player.playbackState === 'playing';							// The play/pause state of the player
	const songUri =  data.player.activeItem.index;
	const artist = `${data.player.activeItem.columns[0]}`;				// Name of the artist
	const name = `${data.player.activeItem.columns[1]}`;							// Name of the song
	const duration = `${data.player.activeItem.duration}`;			// The duration of the song in seconds
	const progress = `${data.player.activeItem.position}`;				// The current position in seconds

	// Set the visibility of the player, but only if the state is different than the last time we checked
	if (isPlaying != currentState) {

		// Set player visibility
		if (!isPlaying)
		{
			console.debug("Hiding player...");
			SetVisibility(false);
		}
		else
		{
			console.debug("Showing player...");
			setTimeout(() => {
				SetVisibility(true);

				if (visibilityDuration > 0) {
					setTimeout(() => {
						SetVisibility(false, false);
					}, visibilityDuration * 1000);
				}
			}, 500);
		}
	}

	if (songUri != currentSongUri) {		
		if (isPlaying) {
			console.debug("Showing player...");
			setTimeout(() => {
				SetVisibility(true);

				if (visibilityDuration > 0) {
					setTimeout(() => {
						SetVisibility(false, false);
					}, visibilityDuration * 1000);
				}
			}, 500);
	
            // Set thumbnail
	        let albumArt =  `images/placeholder-album-art.png`;					// The album art URL
            axiosCLient.get('artwork/current').
                then(async (response) => {
                    if (response.status == 200)
                        {
                            albumArt = "http://localhost:8880/api/artwork/current"
                        }
            }).catch((error) => {
                console.error(error);
            }).finally(() => {
                UpdateAlbumArt(document.getElementById("albumArt"), albumArt);
                UpdateAlbumArt(document.getElementById("backgroundImage"), albumArt);
            });

			currentSongUri = songUri;
		}
	}


	// Set song info
	UpdateTextLabel(document.getElementById("artistLabel"), artist);
	UpdateTextLabel(document.getElementById("songLabel"), name);
	
	// Set progressbar
	const progressPerc = ((progress / duration) * 100);			// Progress expressed as a percentage
	const progressTime = ConvertSecondsToMinutesSoThatItLooksBetterOnTheOverlay(progress);
	const timeRemaining = ConvertSecondsToMinutesSoThatItLooksBetterOnTheOverlay(duration - progress);

	document.getElementById("progressBar").style.width = `${progressPerc}%`;
	document.getElementById("progressTime").innerHTML = progressTime;
	document.getElementById("timeRemaining").innerHTML = `-${timeRemaining}`;
}

function UpdateTextLabel(div, text) {
	if (div.innerText != text) {
		div.setAttribute("class", "text-fade");
		setTimeout(() => {
			div.innerText = text;
			div.setAttribute("class", ".text-show");
		}, 500);
	}
}

function UpdateAlbumArt(div, imgsrc) {
	if (div.src != imgsrc) {
		div.setAttribute("class", "text-fade");
		setTimeout(() => {
			div.src = imgsrc;
			div.setAttribute("class", "text-show");
		}, 500);
	}
}



//////////////////////
// HELPER FUNCTIONS //
//////////////////////

function ConvertSecondsToMinutesSoThatItLooksBetterOnTheOverlay(time) {
	const minutes = Math.floor(time / 60);
	const seconds = Math.trunc(time - minutes * 60);

	return `${minutes}:${('0' + seconds).slice(-2)}`;
}

function SetVisibility(isVisible, updateCurrentState = true) {

	const mainContainer = document.getElementById("mainContainer");

	if (isVisible) {
		mainContainer.style.opacity = 1;
		mainContainer.style.bottom = "50%";
	}
	else {
		mainContainer.style.opacity = 0;
		mainContainer.style.bottom = "calc(50% - 20px)";
	}

	if (updateCurrentState)
		currentState = isVisible;
}



//////////////////////////////////////////////////////////////////////////////////////////
// RESIZER THING BECAUSE I THINK I KNOW HOW RESPONSIVE DESIGN WORKS EVEN THOUGH I DON'T //
//////////////////////////////////////////////////////////////////////////////////////////

let outer = document.getElementById('mainContainer'),
	maxWidth = outer.clientWidth+50,
	maxHeight = outer.clientHeight;

window.addEventListener("resize", resize);

resize();
function resize() {
	const scale = window.innerWidth / maxWidth;
	outer.style.transform = 'translate(-50%, 50%) scale(' + scale + ')';
}



/////////////////////////////////////////////////////////////////////
// IF THE USER PUT IN THE HIDEALBUMART PARAMATER, THEN YOU SHOULD  //
//   HIDE THE ALBUM ART, BECAUSE THAT'S WHAT IT'S SUPPOSED TO DO   //
/////////////////////////////////////////////////////////////////////

if (hideAlbumArt) {
	document.getElementById("albumArtBox").style.display = "none";
	document.getElementById("songInfoBox").style.width = "calc(100% - 20px)";
}



////////////////////////////////
// KICK OFF THE WHOLE WIDGET  //
////////////////////////////////

GetCurrentlyPlaying();			// This is a recursive function, so just run it once
