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
var itemSpriteSheet;

var player;
var sky;
var ground;
var clouds;

var stage;

var obstacleTimer = 100;

var loaded = false;

var entities = [];
var entitiesToRemove = [];

var obstaclePool = [];

var gameOver = true;

var speed = 2;

var message;

var playerAnim = "fly";

var lastHeight = 8;
var lastTopHeight = 20;

var obstacleCache;
var obstacleContainer;

var score = 0;
var obstacleCount = 0;

var itemTime = 0;

var goalItemCache;

var scoreText;
var scoreTextShadow;

function makePlayer() {
	var newplayer = new createjs.Sprite(playerSpriteSheet, "fly");
	newplayer.scaleX = 1;
	newplayer.scaleY = 1;
	newplayer.xa = 0;
	newplayer.ya = 0;
	newplayer.snapToPixel = true;

	newplayer.x = 33;

	newplayer.tick = function() {

		if(this.x < 33) {
			this.xa = 0.2;
		} else {
			this.xa = 0;
		}

		// move in x if free
		if(isFree(this.x + this.xa, this.y, 20, 8, this, false)) {
			this.x += this.xa;
		}
		else {
			this.xa = 0;
			this.x -= speed;
		}

		// move in y if free
		if(isFree(this.x, this.y + this.ya, 20, 8, this, true)) {
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
		this.ya += 0.1;

		if(this.x < -30) endGame();
	}

	return newplayer;
}

function makeItem(itemX, itemY) {
	if(!goalItemCache) {
		goalItemCache = new createjs.Sprite(itemSpriteSheet, "bottle");
		goalItemCache.scaleX = 1;
		goalItemCache.scaleY = 1;
		goalItemCache.snapToPixel = true;
	}

	var goalItem = goalItemCache.clone();
	goalItem.x = itemX * 16 + 8;
	goalItem.y = itemY * 16 - 31;

	goalItem.tick = function() {
		this.x -= speed;

		if(this.x < -100) {
			entitiesToRemove.push(this);
		}

		if(this.x - 24 < player.x && this.x + 16 > player.x && this.y - 32 < player.y) {
			entitiesToRemove.push(this);
			score++;
			updateScore();
		}
	}

	goalItem.remove = function() { 
		stage.removeChild(this);
	}

	entities.push(goalItem);

	stage.addChild(goalItem);
}

function obstacleFactory() {
	var newobstacle = new createjs.Shape();
	newobstacle.graphics.beginBitmapFill(loader.getResult("ground")).drawRect(0,0,32,128);
	newobstacle.scaleX = 1;
    newobstacle.scaleY = 1;
    newobstacle.snapToPixel = true;
    newobstacle.width = 32;
    newobstacle.height = 128;
    newobstacle.cache(0,0,32,128);

    newobstacle.tick = function() {
		this.x -= speed;

		if(this.x < -100) {
			entitiesToRemove.push(this);
		}
	}

	newobstacle.remove = function() {
		putObstacleInPool(this);
	}

	return newobstacle;
}

function makeObstacle(obstacleX, obstacleY) {
	var newobstacle = getObstacleFromPool();

	newobstacle.x = obstacleX * 16;
	newobstacle.y = obstacleY * 16 - 16;

	obstacleContainer.addChild(newobstacle);
	entities.push(newobstacle);

	obstacleCount++;

	return newobstacle;
}

function init() {
	stage = new createjs.Stage("gameCanvas");
	stage.snapToPixelEnabled = true;

	stage.scaleX = 3;
	stage.scaleY = 3;

	createjs.Ticker.setFPS(60);
	createjs.Ticker.addEventListener("tick", stage);
	createjs.Ticker.addEventListener("tick", tick);

	loadGraphics();

	document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;

    FastClick.attach(document.body);
    document.body.addEventListener('click', handleClick, false);
    document.body.onclick = handleClick;

    manifest = [
			{src:"background.png", id:"background"},
			{src:"ground.png", id:"ground"},
			{src:"message-bg.png", id:"message-bg"},
			{src:"clouds.png", id:"clouds"}
		];

		loader = new createjs.LoadQueue(false);
		loader.addEventListener("complete", loadComplete);
		loader.loadManifest(manifest);
}

function loadComplete() {

	clouds = new createjs.Shape();
	clouds.graphics.beginBitmapFill(loader.getResult("clouds")).drawRect(0,0,640,64);
	clouds.scaleX = 1;
	clouds.scaleY = 1;
	clouds.tileW = 10;
	clouds.y = 20;
	clouds.snapToPixel = true;
	clouds.cache(0,0,320,120);
	stage.addChild(clouds);

	sky = new createjs.Shape();
	sky.graphics.beginBitmapFill(loader.getResult("background")).drawRect(0,0,640,64);
	sky.scaleX = 1;
	sky.scaleY = 1;
	sky.tileW = 10;
	sky.y = 53;
	sky.snapToPixel = true;
	sky.cache(0,0,320,120);
	stage.addChild(sky);

	ground = new createjs.Shape();
	ground.graphics.beginBitmapFill(loader.getResult("ground")).drawRect(0,0,640,16);
	ground.scaleX = 1;
	ground.scaleY = 1;
	ground.tileW = 10;
	ground.y = 130;
	ground.snapToPixel = true;
	ground.cache(0,0,320,16);
	stage.addChild(ground);

	loaded = true;

	showGameOverMessage("Gargoyle's Flap", "tap to start");
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

	itemSpriteSheet = new createjs.SpriteSheet({
		"frames": {
	        "width": 16,
	        "numFrames": 2,
	        "regX": 1,
	        "regY": 1,
	        "height": 16
	    },
    "animations": {
    	"bottle": [0, 1],
    },
    "images": ["./bottle.png"]
	});

	playerSpriteSheet.getAnimation("fly").speed = 0.2;
	playerSpriteSheet.getAnimation("run").speed = 0.2;
	itemSpriteSheet.getAnimation("bottle").speed = 0.05;
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
			entitiesToRemove[i].remove();
			removeEntity(entitiesToRemove[i]);
		}
		entitiesToRemove = [];

		// move sky and ground images
		sky.x -= speed / 3.0;
		sky.x %= 64;

		ground.x -= speed;
		ground.x %= 64;

		// generate new obstacles
		obstacleTimer += speed;
		if(obstacleTimer > 30) {
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

			makeObstacle(14, y);
			makeObstacle(14, y - topHeight);

			if(itemTime > 50 && y <= 7) {
				makeItem(14, y);
				itemTime = 0;
			}
		}

		itemTime++;
	}
}

function startGame() {
	gameOver = false;

	if(player != null) stage.removeChild(player);
	if(obstacleContainer != null) stage.removeChild(obstacleContainer);

	obstacleContainer = new createjs.Container();
	stage.addChild(obstacleContainer);

	for(i = 0; i < entities.length; i++) {
		stage.removeChild(entities[i]);
	}

	entities = [];
	entitiesToRemove = [];
	obstaclePool = [];

	for(var i = 0; i < 24; i++) {
		putObstacleInPool(obstacleFactory());
	}

	player = makePlayer();
	stage.addChild(player);

	sky.x = 0;
	ground.x = 0;

	removeMessage();

	player.gotoAndPlay("fly");
	playerAnim = "fly";

	time = 0;
	score = 0;

	if(scoreText) stage.removeChild(scoreText);
	if(scoreTextShadow) stage.removeChild(scoreTextShadow);
	scoreText = null;
	scoreTextShadow = null;

	updateScore();
}

function endGame() {
	gameOver = true;
	showGameOverMessage("Score: " + score, "tap to start again");
}

function handleKeyDown(e) {
    if (!e) { var e = window.event; }
    switch (e.keyCode) {
        case KEYCODE_SPACE:
        	if(!KEYS_DOWN[KEYCODE_SPACE]) {
        		tap();
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

function handleClick(e) {
	if (!e) { var e = window.event; }
	tap();
}

function tap() {
	if(loaded) {
		if(!gameOver) {
			player.ya = -2.66666;

			if(playerAnim != "fly") {
				player.gotoAndPlay("fly");
				playerAnim = "fly";
			}
		}
		else {
			startGame();
		}
	}
}

function removeEntity(entity) {
	stage.removeChild(entity);
	obstacleContainer.removeChild(entity);

	var index = entities.indexOf(entity);
	if (index > -1) {
    	entities.splice(index, 1);
	}
}

function getObstacleFromPool() {
	if(obstaclePool.length > 0) {
		var cachedObstacle = obstaclePool[0];
		obstaclePool.splice(0, 1);
		return cachedObstacle;
	}
	return null;
}

function putObstacleInPool(theObstacle) {
	obstaclePool.push(theObstacle);	
}

function isFree(xLoc, yLoc, width, height, checking, moveY) {
	if(yLoc < -10) {
		if(checking != null && moveY) checking.y = -9.99;
		return false;
	}
	else if(yLoc > 100) {
		if(checking != null && moveY) checking.y = 99.99;
		return false;
	}

	for(i = 0; i < entities.length; i++) {
		var entity = entities[i];
		if(entity.x > 200) continue;

		if(xLoc + width * 0.5 > entity.x - entity.width * 0.5 && xLoc < entity.x + entity.width * 0.5) {
			if(yLoc > entity.y - 31 && yLoc < entity.y + entity.height - 31) {
				if(checking != null && moveY) checking.y = entity.y - 31;
				return false;
			}
			if(yLoc - height > entity.y - 23 && yLoc - height < entity.y + entity.height - 23) {
				if(checking != null && moveY) checking.y = entity.y + entity.height - 23 + height;
				return false;
			}
		}    
	}

	return true;
}

function showGameOverMessage(messageText, secondLine) {
	removeMessage();

	message = new createjs.Container();

	var messageBg = new createjs.Shape();
	messageBg.graphics.beginBitmapFill(loader.getResult("message-bg")).drawRect(0,0,128,64);
	messageBg.scaleX = 1;
	messageBg.scaleY = 1;
	messageBg.y = 53;
	messageBg.x = 43;
	message.addChild(messageBg);

	var messageText = new createjs.Text(messageText, "7px 'Press Start 2P'", "#000")
	messageText.x = messageBg.x + 63;
	messageText.y = messageBg.y + 10;
	messageText.lineWidth = 110;
	messageText.textAlign = "center";
	message.addChild(messageText);

	var helpText = new createjs.Text(secondLine, "6px 'Press Start 2P'", "#000");
	helpText.x = messageBg.x + 63;
	helpText.y = messageBg.y + 23;
	helpText.lineWidth = 110;
	helpText.textAlign = "center";
	message.addChild(helpText);

	message.snapToPixel = true;

	stage.addChild(message);
}

function updateScore() {
	if(!scoreTextShadow) {
		scoreTextShadow = new createjs.Text(score + "", "8px 'Press Start 2P'", "#fff");
		scoreTextShadow.x = 106 + 1;
		scoreTextShadow.y = 10 + 1;
		scoreTextShadow.lineWidth = 66;
		scoreTextShadow.textAlign = "center";
		scoreTextShadow.snapToPixel = true;
		stage.addChild(scoreTextShadow);
	}
	else {
		scoreTextShadow.text = score + "";
	}

	if(!scoreText) {
		scoreText = new createjs.Text(score + "", "8px 'Press Start 2P'", "#000");
		scoreText.x = 106;
		scoreText.y = 10;
		scoreText.lineWidth = 66;
		scoreText.textAlign = "center";
		scoreText.snapToPixel = true;
		stage.addChild(scoreText);
	}
	else {
		scoreText.text = score + "";
	}

	scoreText.cache(-60,0,128,64);
	scoreTextShadow.cache(-60,0,128,64);
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