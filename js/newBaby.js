window.addEventListener('DOMContentLoaded', function(){
    var data = Object();
    chrome.storage.sync.get("highScore",function(info){
        if(typeof(info.highScore) == "undefined"){
            chrome.storage.sync.set({'highScore': 0}, function(){});
            $('#highscoreEXT').text('Highscore : 0');
            data.currentHS = 0;
        }else{
            $('#highscoreEXT').text('Highscore : ' + info.highScore);
            data.currentHS = info.highScore;
        }
    });
    chrome.identity.getAuthToken({'interactive': false}, function(token) {
        if(typeof token == "undefined"){
            $('#alertEXT').html('<div class="alert alert-danger" style="width:100%;height:100%;z-index:99;opacity:0.92"><br><br><br><br><br><b>You need to sign-in to Google Chrome...<br></b><br><div class="input-group"><span class="input-group-btn"><button id="chromesignin" class="btn btn-default" type="button">Sign-In</button></div>');
            $('#chromesignin').click(function(){
                chrome.identity.getAuthToken({interactive:true},function(){})
            });
            $('#alertEXT').width(800);
            $('#alertEXT').height(500);
            fixUI();
        }else{
            chrome.storage.sync.get("nickname",function(info) {
                if(typeof(info.nickname) == "undefined" || info.nickname.replace(/\s/g, '') == "") {
                    $('#alertEXT').html('<div class="alert alert-danger" style="width:100%;height:100%;z-index:99;opacity:0.92"><br><br><br><br><br><b>Nickname:</b><br><div class="input-group"><input id="nickInput" type="text" class="form-control" placeholder="Derpina"><span class="input-group-btn"><button id="nickEnter" class="btn btn-default" type="button">Enter...</button></span></div><br><span id="errorBox"></span></div>');
                    $('#alertEXT').width(800);
                    $('#alertEXT').height(500);
                    fixUI();

                    $('#nickEnter').click(function(){
                        enterNickname(data);
                    });
                }else{
                    data.nickname = info.nickname;
                }
            });
        }
    });
    data.int = 0;
    data.pause = 0;
    data.game = 0;
    data.frameCount = 0;
    view = 0;
    data.queue = [];
    data.tempNick = "";
    data.dir = "right";
    data.snake = [];
    data.length = 0;
    data.body = [];

    window.addEventListener("keydown",function(e){
        setdir(e,data);
    }, true);

    connectSocket(data,'https://snake-leaderboard.herokuapp.com/');

    canvas = document.getElementById('renderCanvasEXT');

    engine = new BABYLON.Engine(canvas, true);

    var createScene = function(){
        scene = new BABYLON.Scene(engine);

        camera = new BABYLON.ArcRotateCamera("ArcRotateCamera", 0, 0, 0, BABYLON.Vector3.Zero(), scene);
        camera.setPosition(new BABYLON.Vector3(5, 20, -25));
        camera.attachControl(canvas);

        function adjustCamKeys(data) {
            var c = camera;
            c.keysUp = []; // t
            c.keysLeft = []; // f
            c.keysDown = []; // g
            c.keysRight = []; // h
        }

        adjustCamKeys(data);

        setSkyBox();

        var light = new BABYLON.HemisphericLight("Hemi0", new BABYLON.Vector3(-2, 3, -3), scene);

        data.box = new BABYLON.Mesh.CreateBox('box', 1, scene);

        data.box.material = new BABYLON.StandardMaterial("texture1", scene);
        data.box.material.diffuseColor = new BABYLON.Color3(0.2, 0.7, 0.2);
        data.box.position = {
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

        createFood(data);

        data.wall = [];

        data.wall[1] = new BABYLON.Mesh.CreateBox('wall', 1, scene);
        data.wall[1].position.x = 11.1;
        data.wall[1].scaling.z = 23.2;
        data.wall[2] = new BABYLON.Mesh.CreateBox('wall', 1, scene);
        data.wall[2].position.x = -11.1;
        data.wall[2].scaling.z = 23.2;
        data.wall[3] = new BABYLON.Mesh.CreateBox('wall', 1, scene);
        data.wall[3].position.z = 11.1;
        data.wall[3].scaling.x = 23.2;
        data.wall[4] = new BABYLON.Mesh.CreateBox('wall', 1, scene);
        data.wall[4].position.z = -11.1;
        data.wall[4].scaling.x = 23.2;

        for (var i = 1; i < data.wall.length; i++) {
            data.wall[i].material = new BABYLON.StandardMaterial("texture4", scene);
            data.wall[i].material.diffuseColor = new BABYLON.Color3(1.0, 0.0, 0.0);
        }

        return scene;
    };

    $('#alertEXT').html('<div class="alert alert-danger fade in"><a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a><h4><b>Swift Snake</b></h4>Collect food and evade your tail.<hr><b>Controls: &nbsp;</b><kbd>Arrow Keys</kbd> or <kbd>WASD</kbd><b><hr>Snake : <span class="glyphicon glyphicon-stop" aria-hidden="true" style="color:#81be2a"></span> <br> Food : <span class="glyphicon glyphicon-stop" aria-hidden="true" style="color:blue"></span><hr></b>Press <kbd>ENTER</kbd> to begin... </div>');
    fixUI();
    scene = createScene();

    scene.registerBeforeRender(function(){
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
        if(data.game){
            if(data.frameCount > 1) {
                move(data);
                data.frameCount = 0;
            }else{
                data.frameCount++;
            }
        }
    });

    // Event binds
    $('#highscoreEXT').click(function(){
        this.blur();
        $('#alertEXT').html('<div class="alert alert-info fade in"><a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a><b>Leaderboard </b> :<table id="scoreboard" class="table table-striped"></table><div id="scoreLoadWarn" class="alert alert-warning"><strong>Loading Scores</strong><br>Please wait... </div>Top 5 highscores worldwide. <br> Your nickname : <b>'+data.nickname+'</b></div>');
        data.socket.emit('get ranks');
        $('#alertEXT').width(250);
        fixUI();
    });
});

function move(data){
    if(data.queue.length > 0){
        switch(data.queue[0]){
            case 'right':
                if(data.dir != 'left'){
                    data.dir = data.queue[0]
                }
                break;
            case 'left':
                if(data.dir != 'right'){
                    data.dir = data.queue[0]
                }
                break;
            case 'up':
                if(data.dir != 'down'){
                    data.dir = data.queue[0]
                }
                break;
            case 'down':
                if(data.dir != 'up'){
                    data.dir = data.queue[0]
                }
                break;
        }
    }
    switch(data.queue.length){
        case 2:
            data.queue = [data.queue[1]];
            break;
        case 1:
            data.queue = [];
            break;
    }

	switch (data.dir){
		case "right":
            data.box.position.x++;
			break;
		case "left":
            data.box.position.x--;
			break;
		case "up":
            data.box.position.z++;
			break;
		case "down":
            data.box.position.z--;
			break;
	}
	data.snake.unshift({x: data.box.position.x, z: data.box.position.z});

	for(var i=0; i < data.body.length; i++){
		var d = i + 1;
        data.body[i].position.x = data.snake[d].x;
        data.body[i].position.z = data.snake[d].z;
	}

	// If the head collides with a food
	if(data.box.position.x == data.food.position.x && data.box.position.z == data.food.position.z){
		addBody(data);
	}

	// If the head hits one of the side walls
	if(Math.abs(data.box.position.x) > 10 || Math.abs(data.box.position.z) > 10){
        endGame(data);
    }
    // If the head collides with one of the body pieces
	for (var i = data.body.length-2; i > -1; i--) { // i = 1
		if(data.box.position.x == data.body[i].position.x && data.box.position.z == data.body[i].position.z){
			endGame(data);
            break;
		}
	}
    data.snake.pop();
}


function setdir(e,data){
    if(data.queue.length < 2 && data.game){
         switch(e.keyCode){
            case 37:
                if(!data.queue.includes('left')) {
                    data.queue.push('left');
                }
                break;
            case 38:
                if(!data.queue.includes('up')) {
                    data.queue.push('up');
                }
                break;
            case 39:
                if(!data.queue.includes('right')) {
                    data.queue.push('right');
                }
                break;
            case 40:
                if(!data.queue.includes('down')) {
                    data.queue.push('down');
                }
                break;
            case 65:
                if(!data.queue.includes('left')) {
                    data.queue.push('left');
                }
                break;
            case 68:
                if(!data.queue.includes('right')) {
                    data.queue.push('right');
                }
                break;
            case 87:
                if(!data.queue.includes('up')) {
                    data.queue.push('up');
                }
                break;
            case 83:
                if(!queue.includes('down')) {
                    queue.push('down');
                }
                break;
        }
    }
    if(e.keyCode == 13){
        if(typeof data.nickname == "undefined" || data.nickname == ""){
            enterNickname(data);
        }else {
            startGame(data);
        }
    }
}

function enterNickname(data){
    var temp = $('#nickInput').val();
    if(temp.replace(/\s/g, '') != ""){
        tempNick = temp.replace(/</g," ").replace(/>/g," ").slice(0,15);
        data.socket.emit('blacklist',tempNick);
    }else{
        try{$('#tempEXT').remove();}catch(err){}
        $('.alert').append("<a id='tempEXT'><br><b>Plase enter a valid username...<br></b></a>")
    }
}

function connectSocket(dataMain,ip){
    dataMain.socket = io.connect(ip);

    dataMain.socket.emit('reset ranks');
    dataMain.socket.on('ranks',function(data){
        $('#scoreboard').html('');
        $('#scoreLoadWarn').remove();
        for(var i=0;i<5;i++) {
            $('#scoreboard').append("<tr class='active'><td>"+data[i].name.replace(/</g," ").replace(/>/g," ").slice(0,15)+"</td><td>"+data[i].score+"</td></tr>");
        }
        if(!(typeof dataMain.nickname == "undefined" || dataMain.nickname == "" || $('#chromesignin').length)){
            $('#alertEXT').width(250);
        }
        try{$('#tempEXT').remove();}catch(err){}
        fixUI();
    });

    dataMain.socket.on('connect_error',function(){
        $('#tempEXT').remove();
        $('#scoreboard').html('');
        $('#errorBox').html('');
        $('#scoreLoadWarn').remove();
        $('#scoreboard').html("<tr class='danger'><td>Connection Failed...</td></tr>");
        $('#errorBox').html("<tr class='danger'><td>Connection Failed...</td></tr>");
    });

    dataMain.socket.on('blacklist',function(data){
        if(data){
            chrome.storage.sync.set({'nickname': tempNick}, function(){});
            dataMain.nickname = tempNick;
            $('#alertEXT').html('');
            $('#alertEXT').width(250);
            $('#alertEXT').height('100%');
            fixUI();
        }else{
            try{$('#tempEXT').remove();}catch(err){}
            $('.alert').append("<a id='tempEXT'><br><b>That name has been suspended...<br></b></a>");
        }
    });
}

function addBody(data){
    data.food.dispose();
    data.body[data.length] = new BABYLON.Mesh.CreateBox('body', 0.9, scene);
    data.body[data.length].position.y = 0.5;
    data.body[data.length].position.x = 9999;
    data.body[data.length].position.z = 9999;
    data.body[data.length].material = new BABYLON.StandardMaterial("texture1", scene);
    data.body[data.length].material.diffuseColor = new BABYLON.Color3(0.0, 1.2, 0.2);

    data.length++;
    data.snake.push({x:999,z:999});

    $('#pointsEXT').text('Points : '+data.length);
    fixUI();
	createFood(data);

}

function createFood(data){
    data.food = new BABYLON.Mesh.CreateBox('food', 0.9, scene);
    data.food.position.y = 0.5;
    data.food.position.x = Math.floor(Math.random() * 21) - 10;
    data.food.position.z = Math.floor(Math.random() * 21) - 10;
    while(foodIntersectsBody(data)){
        data.food.position.x = Math.floor(Math.random() * 21) - 10;
        data.food.position.z = Math.floor(Math.random() * 21) - 10;
    }
    data.food.material = new BABYLON.StandardMaterial("texture2", scene);
    data.food.material.diffuseColor = new BABYLON.Color3(0.0, 0.2, 1.2);
}

function foodIntersectsBody(data){
    for(var i=0;i<data.body.length-2;i++){
        if(data.food.position.x == data.body[i].position.x && data.food.position.z == data.body[i].position.z){
            return true
        }
    }
    return false
}

function endGame(data){
    chrome.storage.sync.get("highScore",function(info){
        data.currentHS = info.highScore;
    });
    if(data.length > data.currentHS){
        chrome.storage.sync.set({'highScore': data.length}, function(){});
        $('#highscoreEXT').text('Highscore : ' + data.length);
        data.currentHS = data.length;
    }
    //clearInteval(int);
    data.game = 0;
    data.box.position.x = -6;
    data.box.position.z = -6;
    $('#alertEXT').html('<div class="alert alert-info fade in"><a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a><h4><b>GAME OVER</b></h4>Your final score is: <strong>'+data.length+'</strong><br><br><b>Global Leaderboard</b> :<table id="scoreboard" class="table table-striped"></table><div id="scoreLoadWarn" class="alert alert-warning"><strong>Loading Scores</strong><br>Please wait... </div>Press <kbd>ENTER</kbd> to play again... </div>');
    data.tempLength = data.length;

    chrome.identity.getAuthToken({'interactive': true}, function(token) {
        if(typeof token != "undefined") {
            data.socket.emit('check highscore', {"name": data.nickname, "score": data.tempLength, "token": token});
        }else{
            $('#scoreboard').html("<tr class='danger'><td>Bind your Google Account to Google Chrome in order to submit your highscores. <br><button id='bind' class='btn btn-default btn-lg' type='button'>Bind Account</button></td></tr>");
            $('#bind').click(function(){
                chrome.tabs.create({url:"chrome://chrome-signin/?access_point=6&reason=0"});
            });
        }
        fixUI();

        data.food.dispose();
        createFood(data);

        data.tempLength = 0;
    });
    data.length = 0;
    for (var i = 0; i < data.body.length; i++) {
        data.body[i].dispose();
    }
    data.body = [];
    data.queue = [];
    data.dir = "right";
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

        var cameraFovAnimation = new BABYLON.Animation("", "fov", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        var fovKeys = [];
        fovKeys.push({
            frame: 0,
            value: camera.fov
        });
        fovKeys.push({
            frame: 30,
            value: 0.1
        });
        cameraFovAnimation.setKeys(fovKeys);
        camera.animations.push(cameraFovAnimation);

        var cameraRadiusAnimation = new BABYLON.Animation("", "radius", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        var radiusKeys = [];
        radiusKeys.push({
            frame: 0,
            value: camera.radius
        });
        radiusKeys.push({
            frame: 30,
            value: 264
        });
        cameraRadiusAnimation.setKeys(radiusKeys);
        camera.animations.push(cameraRadiusAnimation);

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

        var cameraFovAnimation = new BABYLON.Animation("", "fov", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        var fovKeys = [];
        fovKeys.push({
            frame: 0,
            value: camera.fov
        });
        fovKeys.push({
            frame: 30,
            value: 0.8
        });
        cameraFovAnimation.setKeys(fovKeys);
        camera.animations.push(cameraFovAnimation);

        var cameraRadiusAnimation = new BABYLON.Animation("", "radius", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        var radiusKeys = [];
        radiusKeys.push({
            frame: 0,
            value: camera.radius
        });
        radiusKeys.push({
            frame: 30,
            value: 33
        });
        cameraRadiusAnimation.setKeys(radiusKeys);
        camera.animations.push(cameraRadiusAnimation);


        scene.beginAnimation(camera, 0, 30, false);
    }
});

$('#aboutEXT').click(function(){
    this.blur();
    chrome.tabs.create({url:"http://www.oktaycomu.com/about.php"});
});

function startGame(data){
    $('#alertEXT').html('');
    fixUI();
    if(!data.game) {
        data.dir = "right";
        //int = setInterval(move, 50);
        data.game = 1;
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
