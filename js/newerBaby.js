window.addEventListener('DOMContentLoaded', function () {
    // Check for updates
    chrome.runtime.onUpdateAvailable.addListener(function (details) {
        console.log("updating to version " + details.version);
        chrome.runtime.reload();
    });

    chrome.runtime.requestUpdateCheck(function (status) {
        if (status == "update_available") {
            console.log("update pending...");
        } else if (status == "no_update") {
            console.log("no update found");
        } else if (status == "throttled") {
            console.log("Oops, I'm asking too frequently - I need to back off.");
        }
    });
    // Credits for update checking code: https://stackoverflow.com/questions/15775187/how-to-cause-a-chrome-app-to-update-as-soon-as-possible


    // Initialize data object that will store private information about the game
    var data = Object();

    data.user = null;
    data.disconnected = true;
    data.game = 0;
    data.frameCount = 0;
    data.queue = [];
    data.dir = "right";
    data.snake = [];
    data.length = 0;
    data.score = 0;
    data.combo = 0;
    data.maxCombo = 0;
    data.turnCount = 0;
    data.comboBreakpoint = 6;
    data.body = [];
    data.wobble = false;
    data.loggingIn = false;
    data.highscore = {length: 0, score: 0, maxCombo: 0};
    view = 0;

    // Initialize socket.io connection
    connectSocket(data, "https://snake-leaderboard-v2.herokuapp.com/");

    // Initialize Google user authentication
    initUserAuth(data);

    window.addEventListener("keydown", function (e) {
        setdir(e, data);
    }, true);

    canvas = document.getElementById('renderCanvasEXT');

    engine = new BABYLON.Engine(canvas, true);

    var createScene = function () {
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

        // Materials
        data.foodMat = new BABYLON.StandardMaterial("food", scene);
        data.foodMat.specularColor = new BABYLON.Color3(0, 0, 0);

        data.boxMat = new BABYLON.StandardMaterial("box", scene);
        data.boxMat.specularColor = new BABYLON.Color3(0, 0, 0);

        data.bodyMat = new BABYLON.StandardMaterial("body", scene);
        data.bodyMat.specularColor = new BABYLON.Color3(0, 0, 0);

        data.wallMat = new BABYLON.StandardMaterial("wall", scene);
        data.wallMat.specularColor = new BABYLON.Color3(0, 0, 0);

        setColorScheme(data, 4);

        // Lights
        var light1 = new BABYLON.HemisphericLight("Hemi0", new BABYLON.Vector3(-2, 1.5, -3), scene);
        light1.intensity = 1.0;
        var light2 = new BABYLON.HemisphericLight("Hemi0", new BABYLON.Vector3(3, 1.5, 2), scene);
        light2.intensity = 0.5;

        data.box = new BABYLON.Mesh.CreateBox('box', 1, scene);
        data.box.material = data.boxMat;
        data.box.position = {
            x: -6,
            y: 0.5,
            z: -6
        };

        data.ground = new BABYLON.Mesh.CreateGround('ground1', 21, 21, 2, scene);
        data.ground.material = new BABYLON.StandardMaterial("texture3", scene);

        // New Ground Texture
        data.dynamicGroundTexture = new BABYLON.DynamicTexture("dynamic texture", 512, scene, true);
        data.dynamicGroundContext = data.dynamicGroundTexture.getContext();
        data.ground.material.diffuseTexture = data.dynamicGroundTexture;
        data.ground.material.specularColor = new BABYLON.Color3(0, 0, 0);
        data.ground.material.emissiveColor = new BABYLON.Color3(1, 1, 1);
        data.tileImg = new Image();
        data.tileImg.src = "assets/tileA.png";
        data.tileImg.onload = function () {
            updateGroundTexture(data);
        };
        // Old Ground Texture
        // data.ground.material.diffuseTexture = new BABYLON.Texture("assets/gridBlue.png", scene);
        // data.ground.material.diffuseTexture.uScale = 21;
        // data.ground.material.diffuseTexture.vScale = 21;
        // data.ground.material.diffuseTexture.hasAlpha = false;

        scene.ambientColor = new BABYLON.Color3(1, 1, 1);                      // TO
        data.ground.material.diffuseColor = new BABYLON.Color3(0, 0, 0);       // PREVENT
        data.ground.material.specularColor = new BABYLON.Color3(0, 0, 0);      // LIGHT
        data.ground.material.ambientColor = new BABYLON.Color3(1, 1, 1);       // REFLECTION

        createFood(data);

        data.wall = [];

        data.wall[1] = new BABYLON.Mesh.CreateBox('wall', 1, scene);
        data.wall[1].position.x = 11;
        data.wall[1].scaling.z = 23;
        data.wall[2] = new BABYLON.Mesh.CreateBox('wall', 1, scene);
        data.wall[2].position.x = -11;
        data.wall[2].scaling.z = 23;
        data.wall[3] = new BABYLON.Mesh.CreateBox('wall', 1, scene);
        data.wall[3].position.z = 11;
        data.wall[3].scaling.x = 23;
        data.wall[4] = new BABYLON.Mesh.CreateBox('wall', 1, scene);
        data.wall[4].position.z = -11;
        data.wall[4].scaling.x = 23;

        for (var i = 1; i < data.wall.length; i++) {
            data.wall[i].material = data.wallMat;
        }


        return scene;
    };

    showTutorial();

    scene = createScene();

    setInterval(function () {
        if (data.game) {
            if (data.frameCount > 1) {
                move(data);
                data.frameCount = 0;
            } else {
                data.frameCount++;
            }
        }
    }, 17);

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
        if (camera.radius < 7) {
            camera.radius = 7;
        }
    });

    engine.runRenderLoop(function () {
        scene.render();
    });

    // Event binds
    $('#highscoreEXT').off('click').on('click', function(){
        if(data.loggingIn){return;}
        $("#alertEXT").width(480);
        $('#alertEXT').html('<div class="alert alert-dark"><a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a><h5 style="margin-bottom:18px"><b>Your Highscores &nbsp; & &nbsp; Global Leaderboards</b></h5>' +
            '<div class="card text-center">' +
            '   <div class="card-header" style="padding-top:4px">' +
            '       <ul class="nav nav-tabs nav-fill card-header-tabs" id="nav-tab" role="tablist">' +
            '           <li class="nav-item">' +
            '               <a class="nav-link active" id="tabs-length-tab" data-toggle="tab" href="#tabs-length" role="tab" aria-controls="tabs-length" aria-selected="true">Length: ' + data.highscore.length + '</a>' +
            '           </li>' +
            '           <li class="nav-item">' +
            '               <a class="nav-link" id="tabs-score-tab" data-toggle="tab" href="#tabs-score" role="tab" aria-controls="tabs-score" aria-selected="false">Score: ' + data.highscore.score + '</a>' +
            '           </li>' +
            '           <li class="nav-item">' +
            '               <a class="nav-link" id="tabs-combo-tab" data-toggle="tab" href="#tabs-combo" role="tab" aria-controls="tabs-combo" aria-selected="false">Max Combo: ' + data.highscore.maxCombo + '</a>' +
            '           </li>' +
            '       </ul>' +
            '   </div>' +
            '   <div class="card-body" style="padding:0px; padding-top:4px;">' +
            '       <div class="tab-content" id="tabs-tabContent">' +
            '           <div class="tab-pane fade show active" id="tabs-length" role="tabpanel" aria-labelledby="tabs-length-tab"><div id="scoreLoadWarn" class="alert alert-warning" style="margin-bottom:4px"><strong>Loading Scores</strong><br>Please wait... </div></div>' +
            '           <div class="tab-pane fade" id="tabs-score" role="tabpanel" aria-labelledby="tabs-score-tab"><div id="scoreLoadWarn" class="alert alert-warning" style="margin-bottom:4px"><strong>Loading Scores</strong><br>Please wait... </div></div>' +
            '           <div class="tab-pane fade" id="tabs-combo" role="tabpanel" aria-labelledby="tabs-combo-tab"><div id="scoreLoadWarn" class="alert alert-warning" style="margin-bottom:4px"><strong>Loading Scores</strong><br>Please wait... </div></div>' +
            '       </div>' +
            '   </div>' +
            '</div><br>' +
            'Press <kbd>ENTER</kbd> to play again... ' +
            '</div>'
        );

        if(!data.disconnected && data.user){
            data.socket.emit("check highscore", {uid: data.user.uid, photoURL: data.user.photoURL, score: data.score, length: data.length, maxCombo: data.maxCombo});
        }else if(!data.disconnected && data.user == null){
            $('#tabs-length').html('<div id="scoreLoadError" class="alert alert-danger">Please sign-in to submit scores and view leaderboards...</div>');
            $('#tabs-score').html('<div id="scoreLoadError" class="alert alert-danger">Please sign-in to submit scores and view leaderboards...</div>');
            $('#tabs-combo').html('<div id="scoreLoadError" class="alert alert-danger">Please sign-in to submit scores and view leaderboards...</div>');
        }

        fixUI();
    });

    $('#viewEXT').off('click').on('click', function () {
        if(data.loggingIn){return;}
        if (!view) {
            $("#viewEXT").html("3D");
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
                value: Math.PI / 2 * 3
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
                value: 0.02
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
                value: 1390
            });
            cameraRadiusAnimation.setKeys(radiusKeys);
            camera.animations.push(cameraRadiusAnimation);

            scene.beginAnimation(camera, 0, 30, false);
        } else {
            $("#viewEXT").html("2D");
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

    $('#aboutEXT').off('click').on('click', function () {
        if(data.loggingIn){return;}
        chrome.tabs.create({url: "https://www.oktaycomu.com/swiftSnake"});
    });
});

function move(data) {
    if (data.queue.length > 0) {
        switch (data.queue[0]) {
            case 'right':
                if (data.dir != 'left') {
                    data.dir = data.queue[0];
                    data.turnCount += 1;
                }
                break;
            case 'left':
                if (data.dir != 'right') {
                    data.dir = data.queue[0];
                    data.turnCount += 1;
                }
                break;
            case 'up':
                if (data.dir != 'down') {
                    data.dir = data.queue[0];
                    data.turnCount += 1;
                }
                break;
            case 'down':
                if (data.dir != 'up') {
                    data.dir = data.queue[0];
                    data.turnCount += 1;
                }
                break;
        }
    }
    // Break combo if turnCount has surpassed the combo breakpoint
    if(data.turnCount >= data.comboBreakpoint){
        if(data.combo > data.maxCombo){
            data.maxCombo = data.combo;
        }
        data.combo = 0;
        updateGroundTexture(data);
    }

    switch (data.queue.length) {
        case 2:
            data.queue = [data.queue[1]];
            break;
        case 1:
            data.queue = [];
            break;
    }

    switch (data.dir) {
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

    for (var i = 0; i < data.body.length; i++) {
        var d = i + 1;
        data.body[i].position.x = data.snake[d].x;
        data.body[i].position.z = data.snake[d].z;
    }

    // If the head collides with a food
    if (data.box.position.x == data.food.position.x && data.box.position.z == data.food.position.z) {
        addBody(data);
    }

    // If the head hits one of the side walls
    if (Math.abs(data.box.position.x) > 10 || Math.abs(data.box.position.z) > 10) {
        endGame(data);
    }
    // If the head collides with one of the body pieces
    for (var i = data.body.length - 2; i > -1; i--) { // i = 1
        if (data.box.position.x == data.body[i].position.x && data.box.position.z == data.body[i].position.z) {
            endGame(data);
            break;
        }
    }

    data.snake.pop();

    if (data.wobble) {
        camera.alpha = 3 * Math.PI / 2 - 0.02 * data.box.position.x;
        camera.beta = 0.75 - 0.02 * data.box.position.z;
    }
}


function setdir(e, data) {
    if (data.queue.length < 2 && data.game) {
        switch (e.keyCode) {
            case 37:
                if (!data.queue.includes('left')) {
                    data.queue.push('left');
                }
                break;
            case 38:
                if (!data.queue.includes('up')) {
                    data.queue.push('up');
                }
                break;
            case 39:
                if (!data.queue.includes('right')) {
                    data.queue.push('right');
                }
                break;
            case 40:
                if (!data.queue.includes('down')) {
                    data.queue.push('down');
                }
                break;
            case 65:
                if (!data.queue.includes('left')) {
                    data.queue.push('left');
                }
                break;
            case 68:
                if (!data.queue.includes('right')) {
                    data.queue.push('right');
                }
                break;
            case 87:
                if (!data.queue.includes('up')) {
                    data.queue.push('up');
                }
                break;
            case 83:
                if (!data.queue.includes('down')) {
                    data.queue.push('down');
                }
                break;
        }
    }
    if (e.keyCode == 13) {
        if (!data.loggingIn) {
            startGame(data);
        }
    }
}

function addBody(data) {
    data.food.dispose();
    data.body[data.length] = new BABYLON.Mesh.CreateBox('body', 0.9, scene);
    data.body[data.length].position.y = 0.5;
    data.body[data.length].position.x = 9999;
    data.body[data.length].position.z = 9999;
    data.body[data.length].material = data.bodyMat;
    data.snake.push({x: 9999, z: 9999});

    // Update stats
    data.length++;
    data.combo += 1;
    if(data.turnCount < 4){
        data.score += 4 * Math.min(data.combo, 10);
    }else if(data.turnCount < 6){
        data.score += 2 * Math.min(data.combo, 10);
    }else{
        data.score += 1;
    }
    data.turnCount = 0;
    // Update ground texture to reflect current stats
    updateGroundTexture(data);

    fixUI();
    createFood(data);

}

function createFood(data) {
    data.food = new BABYLON.Mesh.CreateBox('food', 0.9, scene);
    data.food.position.y = 0.5;
    data.food.position.x = Math.floor(Math.random() * 21) - 10;
    data.food.position.z = Math.floor(Math.random() * 21) - 10;
    while (foodIntersectsBody(data) || BABYLON.Vector3.Distance(data.food.position, data.box.position) < 2) {
        data.food.position.x = Math.floor(Math.random() * 21) - 10;
        data.food.position.z = Math.floor(Math.random() * 21) - 10;
    }
    data.food.material = data.foodMat;
}

function foodIntersectsBody(data) {
    for (var i = 0; i < data.body.length - 1; i++) {
        if (data.food.position.x == data.body[i].position.x && data.food.position.z == data.body[i].position.z) {
            return true
        }
    }
    return false
}

function endGame(data) {
    data.game = 0;
    data.box.position.x = -6;
    data.box.position.z = -6;

    data.maxCombo = Math.max(data.maxCombo, data.combo); // Check to see if final combo is the maximum

    $("#alertEXT").width(480);
    $('#alertEXT').html('<div class="alert alert-dark"><a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a><h5 style="margin-bottom:18px"><b>GAME OVER</b></h5>' +
        '<div class="card text-center">' +
        '   <div class="card-header" style="padding-top:4px">' +
        '       <ul class="nav nav-tabs nav-fill card-header-tabs" id="nav-tab" role="tablist">' +
        '           <li class="nav-item">' +
        '               <a class="nav-link active" id="tabs-length-tab" data-toggle="tab" href="#tabs-length" role="tab" aria-controls="tabs-length" aria-selected="true">Length: ' + data.length + '</a>' +
        '           </li>' +
        '           <li class="nav-item">' +
        '               <a class="nav-link" id="tabs-score-tab" data-toggle="tab" href="#tabs-score" role="tab" aria-controls="tabs-score" aria-selected="false">Score: ' + data.score + '</a>' +
        '           </li>' +
        '           <li class="nav-item">' +
        '               <a class="nav-link" id="tabs-combo-tab" data-toggle="tab" href="#tabs-combo" role="tab" aria-controls="tabs-combo" aria-selected="false">Max Combo: ' + data.maxCombo + '</a>' +
        '           </li>' +
        '       </ul>' +
        '   </div>' +
        '   <div class="card-body" style="padding:0px; padding-top:4px;">' +
        '       <div class="tab-content" id="tabs-tabContent">' +
        '           <div class="tab-pane fade show active" id="tabs-length" role="tabpanel" aria-labelledby="tabs-length-tab"><div id="scoreLoadWarn" class="alert alert-warning" style="margin-bottom:4px"><strong>Loading Scores</strong><br>Please wait... </div></div>' +
        '           <div class="tab-pane fade" id="tabs-score" role="tabpanel" aria-labelledby="tabs-score-tab"><div id="scoreLoadWarn" class="alert alert-warning" style="margin-bottom:4px"><strong>Loading Scores</strong><br>Please wait... </div></div>' +
        '           <div class="tab-pane fade" id="tabs-combo" role="tabpanel" aria-labelledby="tabs-combo-tab"><div id="scoreLoadWarn" class="alert alert-warning" style="margin-bottom:4px"><strong>Loading Scores</strong><br>Please wait... </div></div>' +
        '       </div>' +
        '   </div>' +
        '</div><br>' +
        'Press <kbd>ENTER</kbd> to play again... ' +
        '</div>'
    );

    if(!data.disconnected && data.user){
        data.socket.emit("check highscore", {uid: data.user.uid, photoURL: data.user.photoURL, score: data.score, length: data.length, maxCombo: data.maxCombo});
    }else if(!data.disconnected && data.user == null){
        $('#tabs-length').html('<div id="scoreLoadError" class="alert alert-danger">Please sign-in to submit scores and view leaderboards...</div>');
        $('#tabs-score').html('<div id="scoreLoadError" class="alert alert-danger">Please sign-in to submit scores and view leaderboards...</div>');
        $('#tabs-combo').html('<div id="scoreLoadError" class="alert alert-danger">Please sign-in to submit scores and view leaderboards...</div>');
    }

    fixUI();

    // Update client highscores
    if(data.length > data.highscore.length){
        data.highscore.length = data.length;
    }
    if(data.score > data.highscore.score){
        data.highscore.score = data.score;
    }
    if(data.maxCombo > data.highscore.maxCombo){
        data.highscore.maxCombo = data.maxCombo;
    }

    data.food.dispose();
    createFood(data);

    data.length = 0;
    data.score = 0;
    data.combo = 0;
    data.maxCombo = 0;
    data.turnCount = 0;
    for (var i = 0; i < data.body.length; i++) {
        data.body[i].dispose();
    }
    data.body = [];
    data.queue = [];
    data.dir = "right";

    updateGroundTexture(data);
}

function updateGroundTexture(data){
    // Update score texture
    data.dynamicGroundContext.clearRect(0, 0, 512, 512);
    data.dynamicGroundTexture.drawText(data.length, null, 326, "bold 240px verdana", "lightgray", "white");
    data.dynamicGroundTexture.drawText(data.combo + "x", 26, 488, "bold 64px verdana", (data.combo == 0) ? "indianred" : "lightgray", "");
    // It is important that the measurement of pointWidth comes after drawing the text of combo.
    // This is because the measurement is done according the font of the previous drawText call.
    var pointWidth = data.dynamicGroundContext.measureText(data.score.toString()).width;
    data.dynamicGroundTexture.drawText(data.score, 512 - pointWidth - 26, 488, "bold 64px verdana", "lightgray", "");
    data.dynamicGroundContext.drawImage(data.tileImg, 0, 0, 840, 840, 0, 0, 512, 512);
    data.dynamicGroundTexture.update();
}

function startGame(data) {
    $('#alertEXT').html('');
    fixUI();
    if (!data.game) {
        data.dir = "right";
        //int = setInterval(move, 50);
        data.game = 1;
    }
}

$(document).on("ready", function () {
    fixUI();
});

$(document).on("click", function(){
    $(".btn").blur();
});

$("#alertEXT").on("load", function () {
    fixUI();
});

function fixUI() {
    var height = $('#renderCanvasEXT').height();
    var width = $('#renderCanvasEXT').width();

    $('#highscoreEXT').offset({left: 16, top: 30});
    $('#profileEXT').offset({
        left: width - 2 * parseInt($("#profileEXT").css("padding-left")) - $('#profileEXT').width() - 16,
        top: 30
    });
    $('#aboutEXT').offset({
        left: width - 2 * parseInt($("#aboutEXT").css("padding-left")) - $('#aboutEXT').width() - 16,
        top: height - 80
    });
    $('#viewEXT').offset({left: 16, top: height - 80});
    $('#alertEXT').offset({
        left: width / 2 - $('#alertEXT').width() / 2,
        top: height / 2 - $('#alertEXT').height() / 2 + 10
    });
}

function showTutorial(){
    $('#alertEXT').html('<div class="alert alert-dark"><a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a><h4><b>Swift Snake</b></h4>Collect food and evade your tail.<hr><b>Controls: &nbsp;</b><kbd>Arrow Keys</kbd> or <kbd>WASD</kbd><b><hr>Snake : <img src="assets/snakeS.png" alt="snake" style="height:20px"> <br> Food : <img src="assets/foodS.png" alt="food" style="height:20px"> <hr></b>Press <kbd>ENTER</kbd> to begin... </div>');
    $('#alertEXT').width(300);
    fixUI();
}

function setColorScheme(data, c) {
    switch (c) {
        case 1:
            data.foodMat.diffuseColor = new BABYLON.Color3(237 / 255, 245 / 255, 150 / 255);
            data.boxMat.diffuseColor = new BABYLON.Color3(153 / 255, 115 / 255, 106 / 255);
            data.bodyMat.diffuseColor = new BABYLON.Color3(205 / 255, 166 / 255, 162 / 255);
            data.wallMat.diffuseColor = new BABYLON.Color3(115 / 255, 132 / 255, 153 / 255);
            break;
        case 2:
            data.foodMat.diffuseColor = new BABYLON.Color3(247 / 255, 197 / 255, 159 / 255);
            data.boxMat.diffuseColor = new BABYLON.Color3(189 / 255, 219 / 255, 161 / 255);
            data.bodyMat.diffuseColor = new BABYLON.Color3(209 / 255, 239 / 255, 181 / 255);
            data.wallMat.diffuseColor = new BABYLON.Color3(115 / 255, 132 / 255, 153 / 255);
            break;
        case 3:
            data.foodMat.diffuseColor = new BABYLON.Color3(183 / 255, 148 / 255, 146 / 255);
            data.boxMat.diffuseColor = new BABYLON.Color3(84 / 255, 94 / 255, 86 / 255);
            data.bodyMat.diffuseColor = new BABYLON.Color3(102 / 255, 119 / 255, 97 / 255);
            data.wallMat.diffuseColor = new BABYLON.Color3(115 / 255, 132 / 255, 153 / 255);
            break;
        case 4:
            data.foodMat.diffuseColor = new BABYLON.Color3(206 / 255, 185 / 255, 146 / 255);
            data.boxMat.diffuseColor = new BABYLON.Color3(153 / 255, 115 / 255, 106 / 255);
            data.bodyMat.diffuseColor = new BABYLON.Color3(205 / 255, 166 / 255, 162 / 255);
            data.wallMat.diffuseColor = new BABYLON.Color3(115 / 255, 132 / 255, 153 / 255);
            break;
    }
}

function setSkyBox() {
    skybox = BABYLON.Mesh.CreateBox("skyBox", 10000.0, scene);
    skyboxMaterial = new BABYLON.StandardMaterial("skyBox", scene);
    skyboxMaterial.backFaceCulling = false;
    skybox.material = skyboxMaterial;
    skybox.infiniteDistance = true;
    skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 1);
    skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("assets/skybox/white", scene);
    skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
}
