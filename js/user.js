function initUserAuth(data){
    // Initialize Firebase
    var config = {
        apiKey: "AIzaSyDly1BVXdiDhxP1_8_NzUCidwPPiqOXUJA",
        authDomain: "swift-snake.firebaseapp.com",
        databaseURL: "https://swift-snake.firebaseio.com",
        projectId: "swift-snake",
        storageBucket: "swift-snake.appspot.com",
        messagingSenderId: "491250167307"
    };
    firebase.initializeApp(config);

    data.provider = new firebase.auth.GoogleAuthProvider();
    $("#profileEXT").off('click').on('click', function () {
        if(data.loggingIn){return;}
        googleSignIn(data);
    });

    firebase.auth().onAuthStateChanged(function (firebaseUser) {
        if(firebaseUser) {
            data.user = firebaseUser;
            $("#profileEXT").html("<img src=\"assets/loading_blocks.gif\" width=\"47\" class=\"rounded profile-btn\"/>");
            fixUI();
            if(!data.disconnected) {
                data.loggingIn = true;
                data.socket.emit('check user', {
                    uid: data.user.uid,
                    email: data.user.email,
                    photoURL: data.user.photoURL
                });
            }
        }else{
            // Update the sign-in button to Google sign-in button
            data.user = null;
            data.loggingIn = false;
            data.highscore = {length: 0, score: 0, maxCombo: 0};
            $("#profileEXT").off('click').on('click', function () {
                if(data.loggingIn){return;}
                googleSignIn(data);
            });
            $("#profileEXT").html("<img src=\"assets/google/btn_google_signin_dark_normal_web@2x.png\" width=\"191\" />");
            fixUI();
        }
    });
}

function googleSignIn(data){
    if(data.disconnected){
        $("#alertEXT").html("<div class=\"alert alert-danger alert-dismissible fade show\" role=\"alert\"><h5 class=\"alert-heading\"><strong>Error</strong></h5> Could not connect to leaderboard servers...<button type=\"button\" class=\"close\" data-dismiss=\"alert\" aria-label=\"Close\"><span aria-hidden=\"true\">&times;</span></button></div>");
        fixUI();
    }else{
        data.loggingIn = true;
        firebase.auth().signInWithPopup(data.provider).then(function (result) {
            // This gives you a Google Access Token. You can use it to access the Google API.
            var token = result.credential.accessToken;
            // The signed-in user info.
            //result.user;

        }).catch(function (error) {
            // Handle Errors here.
            var errorCode = error.code;
            var errorMessage = error.message;
            console.log(errorCode);
            console.log(errorMessage);
            // The email of the user's account used.

            data.loggingIn = false;
        });
    }
}

function googleSignOut(data){
    firebase.auth().signOut();
    data.user = null;
    $("#alertEXT").html("");
}

function showProfile(data){
    // Show user profile information
    $("#alertEXT").width(300);
    $("#alertEXT").html(
        '<div class="alert alert-dark text-center">' +
        '   <a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>' +
        '   <img src="' + data.user.photoURL + '" width="96px" class="rounded img-thumbnail"/><br>' +
        '   Logged in as: <strong style="margin-left:5px">' + data.user.displayName + '</strong><br>' +
        '   ' + data.user.email + '<hr>' +
        '   Display name:<br>' +
        '   <div class="input-group mb-3">' +
        '      <input disabled id="nickTextbox" data-toggle="tooltip" title="" data-placement="left" maxlength="15" type="text" class="form-control" placeholder="' + data.nickname + '">' +
        // '      <div class="input-group-append">' +
        // '         <button id="nickSubmit" class="btn btn-outline-primary" type="button" id="button-addon2">Confirm</button>' +
        // '      </div>' +
        '   </div><hr>' +
        '   <button id="signOutBtn" type="button" class="btn btn-outline-danger">Sign Out</button>' +
        '</div>'
    );

    $("#signOutBtn").off('click').on('click', function(){
        if(data.loggingIn){return;}
        googleSignOut(data);
    });

    fixUI();
}