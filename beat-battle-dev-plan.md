BEAT BATTLE dev plan
--------------------

2.10.2023
----------------
Take a break from the complexity of the game.
Focus on some audio, playing some audio and some spatializing fun.  Spin audio source(s) around listener.
Then after it's working, try getting p2p shiz going, to control the audio stuff in some way


1.16.2023
----------------
make PeerManager even bigger, encompassing all p2p stuff as well as some firebase stuffs?
- not auth

it maintains various states for a client
- deviceId (new firebase table, has some device properties)
    - aoId (new firebase table audioOutput or something, has output latencies)
- userId (firebase uid)
    - playerId (new firebase table)
- gsId (firebase: groupSession id)
- peerId (firebase: peer id)
- peerServer stuff:
    - peerNode (self peer id)
    - peers' peerNodes
    - peerConns to self




1.11.2023
------------------------
1. OK start a new route for a html screen that is a phaser canvas plus a little html below
2. HMTL buttons are: login/logout | host new game ...   they work as they do now
3. joining a game sesh w/ phone connects as "Player 1" or "Player 2" etc.
    - controller says "player X" in a certain color, and has 2 buttos that can be pressed
    - host screen shows all players and appropriate colors and their btton states?
4. This demo shows host/controller communication
5. add clock times to all screens (server clock and local/controller clocks) as a next step?
6. final step could be to have a controller button schedule the playback of a track at a certain servertime, on host and all connected devices....  they should all be in sync



1.9.2023
--------------------------
MAYBE i just need to find concrete product to make that uses the fewest core components including:
- peer to peer comm
- multiplayer sync
- phaser/graphics
- 4-track playback with layer toggle
- section based playback
- spatializing


------------
1.7.2023

also a game host could share a google tab in a google meet / zoom, and players connect remotely without needing to host

figure out simplest approach for a human (peer) to join a peer session and connect to all peers
- map out all conditions for peers (db), gameSessions (db), psNodes (peerServer), psConns (peerServer)

rename all the  things
- game session
    - has type (type of game), has gameConfig json, etc.
    - has game state -- src of thuth
- peer
    - has link to gameSession
    - has type: "host", "player", "disruptor", etc.... custom based on game
        - if host, will read/write from/to gameState 
    - has link to psNode (PeerServer Node)
    - can contain or link to other data, like player name or number, avatar, color, score, if important to game
- peer Manager
    - client side manager for browser's psNode (peerserver.peer) and psConns (peerserver.conn)

-------------
12.20.2022

different roles in solving a music puzzle
- piece fetcher: grabs a piece and places it on a catapult
- piece flinger: aims catapult and launches piece to other side of board to be caught by the...
- piece catcher: catches the piece, orients (spins/flips) it properly, hands it to the...
- piece placer: who carries the piece to the right spot and drops it
- various disruptors

gotta jump over the play-stripe that passes left to right

when you get a whole row or column, you rewind to prior phrase or something?   buys you more time

whta if it was like a real puzzle look
what if it was a puzle _video_

what about connect4 style play

make sure we can have 1, 2, 3, 4 player modes.. even more would rule
- 1-player
    - 
- 2-player

- 3-player

- 4-player
    - this could be 2 vs 2 or 4 coop

game can start with entire empty grid (hard) or perhaps start with a row filled out




-------------
12.12.2022

with current svelte project, extend peers section:
- computer creates/resumes a game session, joins as peer 1
    - add this to db
- present QRcode on screen for controllers to join as peers 2, 3, 4 etc
    - add to db
- also present textarea for peer msgs, or list all the peers and current status, etc
- peers tab will look at querystring var for game session id, and from there determine if user has a peer id created or not
    - use peer id if so, create new one if not, add to db
    - display peer id
- present buttons A, B, C for peer controllers
- finally have a "start music" button on game computer
    - have music play like with adaptive hopping

with new svelte? project/url with new route(s) and with phaser.io
- one route for game, phaser, big canvas that scales to fill viewport
- one route for controller buttons... HTML to start
- phaser game has a few scenes
    - title scene with a couple choices: start new session, resume session
    - session lobby with the QRCode and list of current peer controllers, start button
    - game scene
        - starts music and pulses something in sync with music
- connect to tv with HDMI, detect latency
- connect to tv with chromecast, assess latency

get 4x4 grid working with some different tunes, use controller to move cursor around and toggle square states
- start experimenting with lalal.ai, other stems, etc
- toggle color of each square, color determines what sonic effect you hear
    - experiment with different sonic adjstments and determine best ones
        - on/off
        - low pass, high pass, bandpass
        - reverse
        - bit decimator

-----------------------
new thoughts 12/16/22

sync'd game states is 1 challenge
peer controllers or peer inputs is another

music game:
    - figure out and demo 2 computers sync'd, 1 vs 1?   1vs1vs1 ?
    - or, figure out 1 game running with 2 or 3 controller sync'd for a couch co-op game?
    - next would come a couch co-op VS couch co-op, like a team sport, team vs team
    - peer clients vs peer inputs

    hmmmmm
    - novelty is in peer inputs, with single game client.  sync not needed.  couch co-op with phones as inputs, 1 pc as game
        - followup step could be connecting multiple game runners keeping in sync with one another perhaps?
        - peer2peer game sync, removes need for game server???  could it be a possibility?

-----------------------
12.18.2022

currently have:
- 1 host peerId
- N controller peerIds
- 1 inConn and outConn for each controller

next:
- create gameSession db, like groupSession... but holds list of peers[], where each peer is an object with info like userId, peerId, peerType etc
- QRCode contains gsId only, and from that, the client will learn about all other peers
- make connectity like a mesh where every peer is connected to every peer (so msgs can be sent from controller to controller)

pings:
- each client should ping all others every N seconds or so, and close connections with peers when lost
- when N pings timeout, also update db?  nice to have.  for now, creator of gameSession is the sole host
- ping firestore (query) to learn about new peers or lost peers?

gameplay:
- controller can make their moves (msgs to host), disrupt the game in some way (msgs to host) or even disrupt another player controller directly (msgs to controller to stun, scramble controls, etc)
- controller should make lots of fun sound to accompany the whole game experience (not music, which is handled by the host)

------------------
12.19.2022

- move peer stuff to a singleton service
- figure out disconnections/resuming etc

fun ideas:
- when host returns hello, it assigns a color to the peer/controller/player
    - fill the phone controller bg with that color, etc
- like midi, send button dn and up events to host... all dn's create a 2s default up event
    - while pressed, controller will send button state event every 1s or so.
    - when received by host, will cancel future (up) events
- gamey interface on phone, not just buttons like a controller
    - 2d grid w/ phaser
- could lean more 3d for tv/host interface
    - show all players state in common scene?
    - pan around and have fun with 3d audio
- controller can change from puzzle mode to attack mode, launching missles upon others' puzzles
    - balance of build and destroy
- when player dies or gives up, they become a disruptor
    - this is the thing we did in strike fortress
    - maybe this is when we bring in missles?  or just introduce a new weapon like rolling bombs