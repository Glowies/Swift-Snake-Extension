window.addEventListener('DOMContentLoaded', function(){
    chrome.storage.sync.get("highScore",function(info){
        if(typeof(info.highScore) == "undefined"){
            chrome.storage.sync.set({'highScore': 0}, function(){});
            $('#highscoreEXT').text('Highscore : 0');
            currentHS = 0;
        }else{
            $('#highscoreEXT').text('Highscore : ' + info.highScore);
            currentHS = info.highScore;
        }
    });
    chrome.storage.sync.get("nickname",function(info) {
        if(typeof(info.nickname) == "undefined" || info.nickname.replace(/\s/g, '') == "") {
            $('#alertEXT').html('<div class="alert alert-danger" style="width:100%;height:100%;z-index:99;opacity:0.92"><br><br><br><br><br><b>Signin:</b><br></div>');
            $('#alertEXT').width('800px');
            $('#alertEXT').height('500px');
            fixUI();

            $('#nickEnter').click(function(){
                enterNickname();
            });

        }else{
            nickname = info.nickname;
        }
    });

    int = 0;
    pause = 0;
    game = 0;
    frameCount = 0;
    view = 0;
    queue = [];
    tempNick = "";
    p = -1;

    connectSocket('https://snake-leaderboard.herokuapp.com/');

    canvas = document.getElementById('renderCanvasEXT');

    engine = new BABYLON.Engine(canvas, true);

    var createScene = function(){
        scene = new BABYLON.Scene(engine);

        camera = new BABYLON.ArcRotateCamera("ArcRotateCamera", 0, 0, 0, BABYLON.Vector3.Zero(), scene);
        camera.setPosition(new BABYLON.Vector3(5, 20, -25));
        camera.attachControl(canvas);

        function adjustCamKeys() {
            var c = camera;
            c.keysUp = []; // t
            c.keysLeft = []; // f
            c.keysDown = []; // g
            c.keysRight = []; // h
        }

        adjustCamKeys();

        setSkyBox();

        var light = new BABYLON.HemisphericLight("Hemi0", new BABYLON.Vector3(-2, 3, -3), scene);

        box = new BABYLON.Mesh.CreateBox('box', 1, scene);

        box.material = new BABYLON.StandardMaterial("texture1", scene);
        box.material.diffuseColor = new BABYLON.Color3(0.2, 0.7, 0.2);
        box.position = {
            x:-6,
            y:0.5,
            z:-6
        };

        ground = new BABYLON.Mesh.CreateGround('ground1', 21, 21, 2, scene);
        ground.material = new BABYLON.StandardMaterial("texture3", scene);
        ground.material.diffuseTexture = new BABYLON.Texture("assets/grid.png", scene);
        ground.material.diffuseTexture.uScale = 21;
        ground.material.diffuseTexture.vScale = 21;
        ground.material.diffuseTexture.hasAlpha = false;

        scene.ambientColor = new BABYLON.Color3(1, 1, 1);                 // TO
        ground.material.diffuseColor = new BABYLON.Color3(0, 0, 0);       // PREVENT
        ground.material.specularColor = new BABYLON.Color3(0, 0, 0);      // LIGHT
        ground.material.ambientColor = new BABYLON.Color3(1,1,1);         // REFLECTION

        createFood();

        wall = [];

        wall[1] = new BABYLON.Mesh.CreateBox('wall', 1, scene);
        wall[1].position.x = 11.1;
        wall[1].scaling.z = 23;
        wall[2] = new BABYLON.Mesh.CreateBox('wall', 1, scene);
        wall[2].position.x = -11.1;
        wall[2].scaling.z = 23;
        wall[3] = new BABYLON.Mesh.CreateBox('wall', 1, scene);
        wall[3].position.z = 11.1;
        wall[3].scaling.x = 23;
        wall[4] = new BABYLON.Mesh.CreateBox('wall', 1, scene);
        wall[4].position.z = -11.1;
        wall[4].scaling.x = 23;

        for (var i = 1; i < wall.length; i++) {
            wall[i].material = new BABYLON.StandardMaterial("texture4", scene);
            wall[i].material.diffuseColor = new BABYLON.Color3(1.0, 0.0, 0.0);
        }

        body = [];

        return scene;
    };

    $('#alertEXT').html('<div class="alert alert-danger fade in"><a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a><h4><b>Swift Snake</b></h4>Collect food and evade your tail.<hr><b>Controls: &nbsp;</b><kbd>Arrow Keys</kbd> or <kbd>WASD</kbd><b><hr>Snake : <span class="glyphicon glyphicon-stop" aria-hidden="true" style="color:#81be2a"></span> <br> Food : <span class="glyphicon glyphicon-stop" aria-hidden="true" style="color:blue"></span><hr></b>Press <kbd>ENTER</kbd> to begin... </div>');
    fixUI();
    scene = createScene();

    scene.registerBeforeRender(function () {
        if (camera.beta > Math.PI / 2) {
            camera.beta = Math.PI / 2;
        }
        if (camera.alpha < Math.PI / 2) {
            camera.alpha = 5 * Math.PI / 2;
        }
        if (camera.alpha > 5 * Math.PI / 2) {
            camera.alpha = Math.PI / 2;
        }
        if(camera.radius < 7){
            camera.radius = 7;
        }
    });

    engine.runRenderLoop(function(){
        scene.render();
        if(game){
            if(frameCount > 1) {
                move();
                frameCount = 0;
            }else{
                frameCount++;
            }
        }
    });
});

dir = "right";

window.addEventListener("keydown",setdir, true);

snake = [];
length = 0;

function move(){
    if(queue.length > 0){
        switch(queue[0]){
            case 'right':
                if(dir != 'left'){
                    dir = queue[0]
                }
                break;
            case 'left':
                if(dir != 'right'){
                    dir = queue[0]
                }
                break;
            case 'up':
                if(dir != 'down'){
                    dir = queue[0]
                }
                break;
            case 'down':
                if(dir != 'up'){
                    dir = queue[0]
                }
                break;
        }
    }
    switch(queue.length){
        case 2:
            queue = [queue[1]];
            break;
        case 1:
            queue = [];
            break;
    }

	switch (dir){
		case "right":
			box.position.x++;
			break;
		case "left":
			box.position.x--;
			break;
		case "up":
			box.position.z++;
			break;
		case "down":
			box.position.z--;
			break;
	}
	snake.unshift({x: box.position.x, z: box.position.z});
    //debugger;
	for (var i=0; i < body.length; i++) {
		var d = i + 1;
        body[i].position.x = snake[d].x;
        body[i].position.z = snake[d].z;
	}

	if(box.intersectsMesh(food, false)){
		addBody();
	}
	if(box.intersectsMesh(wall[1], false)){
		endGame();
	}
	if(box.intersectsMesh(wall[2], false)){
		endGame();
	}
	if(box.intersectsMesh(wall[3], false)){
		endGame();
	}
	if(box.intersectsMesh(wall[4], false)){
		endGame();
	}
	for (var i = body.length-2; i > -1; i--) { // i = 1
		if(box.intersectsMesh(body[i],false)){
			endGame();
            break;
		}
        if(food.intersectsMesh(body[i],false)){
            food.dispose();
            createFood();
        }
	}
    delete snake[length];
}


function setdir(e){
    if(queue.length < 2 && game){
         switch(e.keyCode){
            case 37:
                queue.push('left');
                break;
            case 38:
                queue.push('up');
                break;
            case 39:
                queue.push('right');
                break;
            case 40:
                queue.push('down');
                break;
            case 65:
                queue.push('left');
                break;
            case 68:
                queue.push('right');
                break;
            case 87:
                queue.push('up');
                break;
            case 83:
                queue.push('down');
                break;
        }
    }
    if(e.keyCode == 13){
        if(typeof nickname == "undefined" || nickname == ""){
            enterNickname();
        }else {
            startGame();
        }
    }
}

function enterNickname(){
    var temp = $('#nickInput').val();
    if(temp.replace(/\s/g, '') != ""){
        tempNick = temp.replace(/</g," ").replace(/>/g," ").slice(0,15);
        socket.emit('blacklist',tempNick);
    }else{
        try{$('#tempEXT').remove();}catch(err){}
        $('.alert').append("<a id='tempEXT'><br><b>Plase enter a valid username...<br></b></a>")
    }
}

function connectSocket(ip){
    socket = io.connect(ip);

    socket.on('ranks',function(data){
        $('#scoreboard').html('');
        $('#scoreLoadWarn').remove();
        for(var i=0;i<5;i++) {
            $('#scoreboard').append("<tr class='active'><td>"+data[i].name.replace(/</g," ").replace(/>/g," ").slice(0,15)+"</td><td>"+data[i].score+"</td></tr>");
        }
        if(!(typeof nickname == "undefined" || nickname == "")){
            $('#alertEXT').width(250);
        }
        try{$('#tempEXT').remove();}catch(err){}
        fixUI();
    });

    socket.on('connect_error',function(){
        $('#scoreboard').html('');
        $('#scoreLoadWarn').remove();
        $('#scoreboard').html("<tr class='danger'><td>Connection Failed...</td></tr>");
    });

    socket.on('blacklist',function(data){
        console.log(data);
        if(data){
            chrome.storage.sync.set({'nickname': tempNick}, function(){});
            nickname = tempNick;
            $('#alertEXT').html('');
            $('#alertEXT').width(250);
            $('#alertEXT').height('100%');
            fixUI();
        }else{
            try{$('#tempEXT').remove();}catch(err){}
            $('.alert').append("<a id='tempEXT'><br><b>That name has been suspended...<br></b></a>");
        }
    });

    socket.on('connect_error',function(){
        try{$('#tempEXT').remove();}catch(err){}
        $('.alert').append("<a id='tempEXT'><br><b>Trouble connecting to server...<br>Check your internet connection and try again.</b><br></a>");
    });
}

function addBody(){
    p++;
	food.dispose();
	body[length] = new BABYLON.Mesh.CreateBox('body', 0.9, scene);
	body[length].position.y = 0.5;
	body[length].position.x = 9999;
	body[length].position.z = 9999;
	body[length].material = new BABYLON.StandardMaterial("texture1", scene);
    body[length].material.diffuseColor = new BABYLON.Color3(0.0, 1.2, 0.2);

	length++;

    $('#pointsEXT').text('Points : '+length);
    fixUI();
	createFood();

}

function createFood(){
    food = new BABYLON.Mesh.CreateBox('food', 0.9, scene);
    food.position.y = 0.5;
    food.position.x = Math.floor(Math.random() * 21) - 10;
    food.position.z = Math.floor(Math.random() * 21) - 10;
    food.material = new BABYLON.StandardMaterial("texture2", scene);
    food.material.diffuseColor = new BABYLON.Color3(0.0, 0.2, 1.2);
}

function endGame(){
    chrome.storage.sync.get("highScore",function(info){
        currentHS = info.highScore;
    });
    if(length > currentHS){
        chrome.storage.sync.set({'highScore': length}, function(){});
        $('#highscoreEXT').text('Highscore : ' + length);
        currentHS = length;
    }
    //clearInteval(int);
    game = 0;
    box.position.x = -6;
    box.position.z = -6;
    $('#alertEXT').html('<div class="alert alert-info fade in"><a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a><h4><b>GAME OVER</b></h4>Your final score is: <strong>'+length+'</strong><br><br><b>Global Leaderboard</b> :<table id="scoreboard" class="table table-striped"></table><div id="scoreLoadWarn" class="alert alert-warning"><strong>Loading Scores</strong><br>Please wait... </div>Press <kbd>ENTER</kbd> to play again... </div>');
    socket.emit('check highscore', {"name":nickname,"test":p,"score":length});
    p = -1;
    fixUI();

    food.dispose();
    createFood();

    length = 0;
    for (var i = 0; i < body.length; i++) {
        body[i].dispose();
    }
    body = [];
    queue = [];
    dir = "right";
    $('#pointsEXT').text('Points : 0');
}

$('#viewEXT').click(function(){
    this.blur();
    if(!view){
        view = 1;
        camera.animations = [];

        var cameraTargetAnimation = new BABYLON.Animation("", "alpha", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        var keys = [];
        keys.push({
            frame: 0,
            value: camera.alpha
        });
        keys.push({
            frame: 30,
            value: Math.PI/2*3
        });
        cameraTargetAnimation.setKeys(keys);
        camera.animations.push(cameraTargetAnimation);

        var cameraPositionAnimation = new BABYLON.Animation("", "beta", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        var positionKeys = [];
        positionKeys.push({
            frame: 0,
            value: camera.beta
        });
        positionKeys.push({
            frame: 30,
            value: 0.001
        });
        cameraPositionAnimation.setKeys(positionKeys);
        camera.animations.push(cameraPositionAnimation);

        scene.beginAnimation(camera, 0, 30, false);
    }else{
        view = 0;
        camera.animations = [];

        var cameraTargetAnimation = new BABYLON.Animation("", "alpha", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        var keys = [];
        keys.push({
            frame: 0,
            value: camera.alpha
        });
        keys.push({
            frame: 30,
            value: 4.90978454023457
        });
        cameraTargetAnimation.setKeys(keys);
        camera.animations.push(cameraTargetAnimation);

        var cameraPositionAnimation = new BABYLON.Animation("", "beta", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        var positionKeys = [];
        positionKeys.push({
            frame: 0,
            value: camera.beta
        });
        positionKeys.push({
            frame: 30,
            value: 0.9056002717820779
        });
        cameraPositionAnimation.setKeys(positionKeys);
        camera.animations.push(cameraPositionAnimation);

        scene.beginAnimation(camera, 0, 30, false);
    }
});

$('#aboutEXT').click(function(){
    this.blur();
    chrome.tabs.create({url:"http://www.oktaycomu.com/about.php"});
});

$('#highscoreEXT').click(function(){
    this.blur();
    $('#alertEXT').html('<div class="alert alert-info fade in"><a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a><b>Leaderboard </b> :<table id="scoreboard" class="table table-striped"></table><div id="scoreLoadWarn" class="alert alert-warning"><strong>Loading Scores</strong><br>Please wait... </div>Top 5 highscores worldwide. <br> Your nickname : <b>'+nickname+'</b></div>');
    socket.emit('get ranks');
    $('#alertEXT').width(250);
    fixUI();
});

function startGame(){
    $('#alertEXT').html('');
    fixUI();
    if(!game) {
        dir = "right";
        //int = setInterval(move, 50);
        game = 1;
    }
}

$(document).ready(function(){
    fixUI();
});

function fixUI(){
    var height = $('#renderCanvasEXT').height();
    var width = $('#renderCanvasEXT').width();

    $('#highscoreEXT').offset({left:16,top:30});
    $('#pointsEXT').offset({left:width - 44 - $('#pointsEXT').width(),top:30});
    $('#aboutEXT').offset({left:width - 44 - $('#aboutEXT').width(),top:height-80});
    $('#viewEXT').offset({left:16,top:height-80});
    $('#alertEXT').offset({left:width/2 - $('#alertEXT').width()/2,top:height/2-$('#alertEXT').height()/2+10});
}

function setSkyBox(){
    skybox = BABYLON.Mesh.CreateBox("skyBox", 10000.0, scene);
    skyboxMaterial = new BABYLON.StandardMaterial("skyBox", scene);
    skyboxMaterial.backFaceCulling = false;
    skybox.material = skyboxMaterial;
    skybox.infiniteDistance = true;
    skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
    skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("assets/skybox/EBEN", scene);
    skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
}