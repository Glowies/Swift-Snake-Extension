function connectSocket(dataMain, ip) {
    dataMain.socket = io.connect(ip);

    dataMain.socket.on('connection check', function (data) {
        dataMain.disconnected = false;

        // If the user has already logged into Google but the leaderboard was late at responding, start the logging in
        // process once again. This is to compensate for the case where the leaderboard server falls asleep.
        if(dataMain.user){
            dataMain.loggingIn = true;
            dataMain.socket.emit('check user', {
                uid: dataMain.user.uid,
                email: dataMain.user.email,
                photoURL: dataMain.user.photoURL
            });
        }
    });

    dataMain.socket.on('ranks', function (data) {
        if(dataMain.user == null){
            $('#tabs-length').html('<div id="scoreLoadError" class="alert alert-danger"><br>Please sign-in to submit scores and view leaderboards...</div>');
            $('#tabs-score').html('<div id="scoreLoadError" class="alert alert-danger"><br>Please sign-in to submit scores and view leaderboards...</div>');
            $('#tabs-combo').html('<div id="scoreLoadError" class="alert alert-danger"><br>Please sign-in to submit scores and view leaderboards...</div>');
            fixUI();
            return;
        }

        // Modify length tab
        $('#tabs-length').html('' +
            '<table class="table table-borderless table-striped table-sm" style="margin-bottom:4px">' +
            '  <thead>' +
            '    <tr>' +
            '      <th scope="col" style="width:32px">#</th>' +
            '      <th scope="col" style="width:32px"></th>' +
            '      <th scope="col" style="text-align:left">Display Name</th>' +
            '      <th scope="col">Length</th>' +
            '    </tr>' +
            '  </thead>' +
            '  <tbody id="lengthTableBody">' +
            '  </tbody>' +
            '</table>'
        );
        for(var i=0; i<data.length.length; i++){
            $("#lengthTableBody").append('<tr' + ((data.length[i].uid == dataMain.user.uid) ? (' class="table-primary"') : '') + '>' +
            '      <th scope="row">' + (i+1) + '</th>' +
            '      <td><img src="' + data.length[i].photoURL + '" width="26px" class="rounded"/></td>' +
            '      <td style="text-align:left">' + data.length[i].nickname + '</td>' +
            '      <td>' + data.length[i].length + '</td>' +
            '    </tr>'
            );
        }

        // Modify score tab
        $('#tabs-score').html('' +
            '<table class="table table-borderless table-striped table-sm" style="margin-bottom:4px">' +
            '  <thead>' +
            '    <tr>' +
            '      <th scope="col" style="width:32px">#</th>' +
            '      <th scope="col" style="width:32px"></th>' +
            '      <th scope="col" style="text-align:left">Display Name</th>' +
            '      <th scope="col">Score</th>' +
            '    </tr>' +
            '  </thead>' +
            '  <tbody id="lengthScoreBody">' +
            '  </tbody>' +
            '</table>'
        );
        for(var i=0; i<data.score.length; i++){
            $("#lengthScoreBody").append('<tr' + ((data.score[i].uid == dataMain.user.uid) ? (' class="table-primary"') : '') + '>' +
            '      <th scope="row">' + (i+1) + '</th>' +
            '      <td><img src="' + data.score[i].photoURL + '" width="26px" class="rounded"/></td>' +
            '      <td style="text-align:left">' + data.score[i].nickname + '</td>' +
            '      <td>' + data.score[i].score + '</td>' +
            '    </tr>'
            );
        }

        // Modify max combo tab
        $('#tabs-combo').html('' +
            '<table class="table table-borderless table-striped table-sm" style="margin-bottom:4px">' +
            '  <thead>' +
            '    <tr>' +
            '      <th scope="col" style="width:32px">#</th>' +
            '      <th scope="col" style="width:32px"></th>' +
            '      <th scope="col" style="text-align:left">Display Name</th>' +
            '      <th scope="col">Max Combo</th>' +
            '    </tr>' +
            '  </thead>' +
            '  <tbody id="lengthComboBody">' +
            '  </tbody>' +
            '</table>'
        );
        for(var i=0; i<data.maxCombo.length; i++){
            $("#lengthComboBody").append('<tr' + ((data.maxCombo[i].uid == dataMain.user.uid) ? (' class="table-primary"') : '') + '>' +
                '      <th scope="row">' + (i+1) + '</th>' +
                '      <td><img src="' + data.maxCombo[i].photoURL + '" width="26px" class="rounded"/></td>' +
                '      <td style="text-align:left">' + data.maxCombo[i].nickname + '</td>' +
                '      <td>' + data.maxCombo[i].maxCombo + '</td>' +
                '    </tr>'
            );
        }

        fixUI();
    });

    dataMain.socket.on('connect_error', function () {
        $('#tabs-length').html('<div id="scoreLoadError" class="alert alert-warning"><strong>Error</strong><br>Could not connect to leaderboard servers...</div>');
        $('#tabs-score').html('<div id="scoreLoadError" class="alert alert-warning"><strong>Error</strong><br>Could not connect to leaderboard servers...</div>');
        $('#tabs-combo').html('<div id="scoreLoadError" class="alert alert-warning"><strong>Error</strong><br>Could not connect to leaderboard servers...</div>');
        fixUI();
        dataMain.disconnected = true;
    });

    dataMain.socket.on('user return', function (data) {
        // Update the sign-in button to show user photo and display name
        $("#profileEXT").html("<img src=\"" + dataMain.user.photoURL + "\" width=\"47\" class=\"rounded profile-btn\"/>");
        fixUI();

        if(data.newUser) {
            // Show alert box for user to pick a display name
            $("#alertEXT").width(300);
            $("#alertEXT").html(
                '<div class="alert alert-dark text-center">' +
                '   <img src="' + dataMain.user.photoURL + '" width="96px" class="rounded img-thumbnail"/><br>' +
                '   Logged in as: <strong style="margin-left:5px">' + dataMain.user.displayName + '</strong><br>' +
                '   ' + dataMain.user.email + '<hr>' +
                '   Please pick a display name:<br>' +
                '   <div class="input-group mb-3">' +
                '      <input id="nickTextbox" data-toggle="tooltip" title="" data-placement="left" maxlength="15" type="text" class="form-control">' +
                '      <div class="input-group-append">' +
                '         <button id="nickSubmit" class="btn btn-outline-primary" type="button" id="button-addon2">Confirm</button>' +
                '      </div>' +
                '   </div><hr>' +
                '   <button id="signOutBtn" type="button" class="btn btn-outline-danger">Sign Out</button>' +
                '</div>'
            );

            $("#signOutBtn").off('click').on('click', function(){
                googleSignOut(dataMain);
            });

            $('#nickSubmit').off('click').on('click', function(){
                var temp = $('#nickTextbox').val();
                if(!dataMain.disconnected){
                    // Check if the display name given has less than 16 chars and contains only a-z or 0-9 using regex
                    if(temp.length < 16 && /^[a-z0-9]+$/i.test(temp)){
                        //tempNick = temp.replace(/</g, " ").replace(/>/g, " ").slice(0, 15);
                        sendData = {uid: dataMain.user.uid, nickname: temp};
                        dataMain.socket.emit('change display name', sendData);
                    }else{
                        $('#nickTextbox').attr("title", "Display names have to be less than 16 characters and can only contain letters belonging to the English alphabet or numbers 0 to 9.");
                        $("#nickTextbox").tooltip("show");
                    }
                }else{
                    $('#nickTextbox').attr("title", "You need to connect to the internet in order to pick a display name.");
                    $("#nickTextbox").tooltip("show");
                }
            });

            $('#nickTextbox').keypress(function(){
                var inputVal = $('#nickTextbox').val().replace(/[^a-z0-9]/gi,'');
                $('#nickTextbox').val(inputVal);
            });

            fixUI();
            // Compensate for the picture that will load
            alertOffset = $("#alertEXT").offset();
            $("#alertEXT").offset({
                left: alertOffset.left,
                top: alertOffset.top - 32
            });
        }else{
            // If not a new user
            dataMain.nickname = data.nickname;
            dataMain.highscore = {length: data.length, score: data.score, maxCombo: data.maxCombo};
            dataMain.loggingIn = false;
            $("#profileEXT").off('click').on('click', function(){
                if(data.loggingIn){return;}
                showProfile(dataMain);
            });
        }
    });

    dataMain.socket.on("nickname return", function(data){
        if(data.success){
            $("#nickTextbox").tooltip("hide");
            showTutorial();
            dataMain.nickname = data.nickname;
            dataMain.loggingIn = false;
            $("#profileEXT").off('click').on('click', function(){
                if(data.loggingIn){return;}
                showProfile(dataMain);
            });
        }else{
            $('#nickTextbox').attr("title", "Display names have to be less than 16 characters and can only contain letters belonging to the English alphabet or numbers 0 to 9.");
            $("#nickTextbox").tooltip("show");
        }
    });
}