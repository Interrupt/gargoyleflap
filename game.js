var KEYCODE_SPACE = 32;
var KEYCODE_UP = 38;
var KEYCODE_LEFT = 37;
var KEYCODE_RIGHT = 39;
var KEYCODE_W = 87;
var KEYCODE_A = 65;
var KEYCODE_D = 68;

var KEYS_DOWN = []

var time = 0;
var playerSpriteSheet;
var worldSpriteSheet;

var player;
var sky;
var ground;
var clouds;

var stage;

var obstacleTimer = 100;

var loaded = false;

var entities = [];
var entitiesToRemove = [];

var gameOver = true;

var speed = 6;

var message;

var playerAnim = "fly";

var lastHeight = 8;
var lastTopHeight = 20; 

function makePlayer() {
	var newplayer = new createjs.Sprite(playerSpriteSheet, "fly");
	newplayer.scaleX = 3;
	newplayer.scaleY = 3;
	newplayer.xa = 0;
	newplayer.ya = 0;

	newplayer.x = 100;

	newplayer.tick = function() {

		if(this.x < 100) {
			this.xa = 0.6;
		} else {
			this.xa = 0;
		}

		// move in x if free
		if(isFree(this.x + this.xa, this.y, 60, 25, this, false)) {
			this.x += this.xa;
		}
		else {
			this.xa = 0;
			this.x -= speed;
		}

		// move in y if free
		if(isFree(this.x, this.y + this.ya, 60, 25, this, true)) {
			this.y += this.ya;
		}
		else {
			if(this.ya > 0 && playerAnim != "run") {
				player.gotoAndPlay("run");
				playerAnim = "run";
			}
			this.ya = 0;
		}

		// gravity
		this.ya += 0.3;

		if(this.x < -80) endGame();
	}

	return newplayer;
}

function makeObstacle(obstacleX, obstacleY) {
	var newobstacle = new createjs.Shape();
	newobstacle.graphics.beginBitmapFill(loader.getResult("ground")).drawRect(0,0,32,128);
	newobstacle.x = obstacleX * 16 * 3;
	newobstacle.y = obstacleY * 16 * 3;
	newobstacle.scaleX = 3;
	newobstacle.scaleY = 3;
	newobstacle.width = 32 * 3;
	newobstacle.height = 128 * 3;

	newobstacle.tick = function() {
		this.x -= speed;

		if(this.x < -100) {
			entitiesToRemove.push(this);
		}
	}

	stage.addChild(newobstacle);
	entities.push(newobstacle);

	return newobstacle;
}

function init() {
	stage = new createjs.Stage("gameCanvas");

	createjs.Ticker.setFPS(60);
	createjs.Ticker.addEventListener("tick", stage);
	createjs.Ticker.addEventListener("tick", tick);

	loadGraphics();

	document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;

    manifest = [
			{src:"background.png", id:"background"},
			{src:"ground.png", id:"ground"},
			{src:"game-over.png", id:"game-over"},
			{src:"clouds.png", id:"clouds"}
		];

		loader = new createjs.LoadQueue(false);
		loader.addEventListener("complete", loadComplete);
		loader.loadManifest(manifest);
}

function loadComplete() {

	clouds = new createjs.Shape();
	clouds.graphics.beginBitmapFill(loader.getResult("clouds")).drawRect(0,0,640,64);
	clouds.scaleX = 3;
	clouds.scaleY = 3;
	clouds.tileW = 10;
	clouds.y = 60;
	stage.addChild(clouds);

	sky = new createjs.Shape();
	sky.graphics.beginBitmapFill(loader.getResult("background")).drawRect(0,0,640,64);
	sky.scaleX = 3;
	sky.scaleY = 3;
	sky.tileW = 10;
	sky.y = 160;
	stage.addChild(sky);

	ground = new createjs.Shape();
	ground.graphics.beginBitmapFill(loader.getResult("ground")).drawRect(0,0,640,16);
	ground.scaleX = 3;
	ground.scaleY = 3;
	ground.tileW = 10;
	ground.y = 436;
	stage.addChild(ground);

	loaded = true;

	showGameOverMessage();
}

function loadGraphics() {
	playerSpriteSheet = new createjs.SpriteSheet({
		"frames": {
	        "width": 32,
	        "numFrames": 16,
	        "regX": 1,
	        "regY": 1,
	        "height": 32
	    },
    "animations": {"fly": [0, 2], "run": [4, 7]},
    "images": ["./player-ss.png"]
	});

	worldSpriteSheet = new createjs.SpriteSheet({
		"frames": {
	        "width": 16,
	        "numFrames": 16,
	        "regX": 1,
	        "regY": 1,
	        "height": 64
	    },
    "animations": {
    	"ground": [0, 0],
    	"spike": [1, 1]
    },
    "images": ["./world-ss.png"]
	});

	playerSpriteSheet.getAnimation("fly").speed = 0.2;
	playerSpriteSheet.getAnimation("run").speed = 0.2;
}

function tick() {
	if(loaded && !gameOver) {
		time += 1;

		// tick entities
		player.tick();
		for(i = 0; i < entities.length; i++) {
			entities[i].tick();
		}

		for(i = 0; i < entitiesToRemove.length; i++) {
			removeEntity(entitiesToRemove[i]);
		}
		entitiesToRemove = [];

		// move sky and ground images
		sky.x -= speed / 3.0;
		sky.x %= 64 * 3;

		ground.x -= speed;
		ground.x %= 64 * 3;

		clouds.x -= speed / 12.0;
		clouds.x %= 128 * 3;

		// generate new obstacles
		obstacleTimer += speed;
		if(obstacleTimer > 90) {
			obstacleTimer = 0;
			//var y = 6 - Math.random() * 3;
			var y = 8 - Math.sin(time * 0.1) * 2;
			y = Math.floor(y);
			var mod = Math.random() > 0.7;

			var topHeight = 11;

			if(mod) topHeight++;

			var floorMod = Math.random() > 0.75;
			if(floorMod) {
				y--;
				topHeight++;
			}

			var ceilingDiff = getCeilingHeight(y - topHeight) - lastHeight;
			var floorDiff = lastTopHeight - getFloorHeight(y);

			// make sure the player can actually fit
			if(floorDiff < 3) {
				y += 3 - floorDiff;
				//console.log("Shoved floor");
			}
			if(ceilingDiff < 3) {
				topHeight += 3 - ceilingDiff;
				//console.log("Shoved ceiling");
			}

			lastHeight = getFloorHeight(y);
			lastTopHeight = getCeilingHeight(y - topHeight);

			makeObstacle(16, y);
			makeObstacle(16, y - topHeight);
		}
	}
}

function startGame() {
	gameOver = false;

	for(i = 0; i < entities.length; i++) {
		stage.removeChild(entities[i]);
	}

	if(player != null) stage.removeChild(player);

	entities = [];
	entitiesToRemove = [];

	player = makePlayer();
	stage.addChild(player);

	sky.x = 0;
	ground.x = 0;

	removeMessage();

	player.gotoAndPlay("fly");
	playerAnim = "fly";

	time = 0;
}

function endGame() {
	gameOver = true;
	showGameOverMessage();
}

function handleKeyDown(e) {
    if (!e) { var e = window.event; }
    switch (e.keyCode) {
        case KEYCODE_SPACE:
        	if(!KEYS_DOWN[KEYCODE_SPACE]) {
        		if(!gameOver) {
        			player.ya = -8;

        			if(playerAnim != "fly") {
						player.gotoAndPlay("fly");
						playerAnim = "fly";
					}
        		}
        		else {
        			startGame();
        		}
        	}
        	KEYS_DOWN[KEYCODE_SPACE] = true;
        	break;
    }
}

function handleKeyUp(e) {
    if (!e) { var e = window.event; }
    switch (e.keyCode) {
        case KEYCODE_SPACE:
        	KEYS_DOWN[KEYCODE_SPACE] = false;
        	break;
    }
}

function removeEntity(entity) {
	stage.removeChild(entity);
	var index = entities.indexOf(entity);
	if (index > -1) {
    	entities.splice(index, 1);
	}
}

function isFree(xLoc, yLoc, width, height, checking, moveY) {
	if(yLoc < -30) {
		if(checking != null && moveY) checking.y = -29.99;
		return false;
	}
	else if(yLoc > 345) {
		if(checking != null && moveY) checking.y = 344.99;
		return false;
	}

	for(i = 0; i < entities.length; i++) {
		var entity = entities[i];
		if(xLoc + width * 0.5 > entity.x - entity.width * 0.5 && xLoc < entity.x + entity.width * 0.5) {
			if(yLoc > entity.y - 92 && yLoc < entity.y + entity.height - 92) {
				if(checking != null && moveY) checking.y = entity.y - 93;
				return false;
			}
			if(yLoc - height > entity.y - 70 && yLoc - height < entity.y + entity.height - 70) {
				if(checking != null && moveY) checking.y = entity.y + entity.height - 70 + height;
				return false;
			}
		}    
	}

	return true;
}

function showGameOverMessage() {
	removeMessage();

	message = new createjs.Shape();
	message.graphics.beginBitmapFill(loader.getResult("game-over")).drawRect(0,0,128,64);
	message.scaleX = 3;
	message.scaleY = 3;
	message.y = 160;
	message.x = 130;

	stage.addChild(message);
}

function removeMessage() {
	if(message) stage.removeChild(message);
}

function getCeilingHeight(topHeight) {
	return (topHeight - 8) * -1 - 6;
}

function getFloorHeight(floorHeight) {
	return floorHeight * -1 + 9;
}