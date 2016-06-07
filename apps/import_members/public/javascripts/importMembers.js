var currentUserID;
var currentUserName;
var targetGroupID;
var sourceGroupIDs = [];
var targetGroup;
var SUCCESS_STATUS_CODE = 200;
var jiveUrl;
var selectedStreams = ["connections"];
var handleContext =  function (ctx) {
    Q.all([jivePromises.getCurrentUserDetails(),jivePromises.getGroup(ctx.jive.content.id)])
    .spread(function(user,currentGroup){
            targetGroupID = currentGroup.placeID;
            currentUserID = user.id;
            currentUserName = user.name.formatted;
            jiveUrl =  opensocial.getEnvironment()['jiveUrl'];
            jivePromises.getGroup(ctx.jive.content.id).done(function(group){
                targetGroup = group;
                jivePromises.hasAccess(targetGroup,[],currentUserID).then(function(result){
                    if(result == false){
                        jivePromises.getGroupAdmins(targetGroup)
                            .then(function(admins){
                                displayRestrictedAccessMessage(admins);
                            });
                        $(".import-feature").hide();
                    }
                });
            }).fail(function(errorResponse){
                messageHandler.showJiveErrorMessage("Error loading DL: " + errorResponse.error.message + " (" + errorResponse.error.code + ")");
            });
        },function(err){

        })
};


var init = function(){
    gadgets.actions.updateAction({
        id: "org.jivesoftware.importmembers",
        callback: handleContext
    });

    $('.selected-streams input[type=checkbox]').on("click",function() {
        var checkedStream = $(this).val();

        if ($(this).attr("checked")) {
            selectedStreams.push(checkedStream);
        }
        else{
            _.remove(selectedStreams,function(id){
                return id == checkedStream;
            });
        }
    });
    $(".group .secondary-btn").click(function(){
        if(sourceGroupIDs.length == 0){
           showTemporaryMessage("select at least one group");
        }
        else if(selectedStreams.length == 0){
            showTemporaryMessage("select at least one stream");
        }
        else{
            var info = {
                sourceGroupIDs : sourceGroupIDs,
                currentUserName : currentUserName,
                targetGroup : targetGroup,
                selectedStreams : selectedStreams
            };
            jivePromises.importMembers(info)
                .then(function(success){
                    if(success.status == SUCCESS_STATUS_CODE){
                        $(".import-feature").hide();
                        gadgets.window.adjustHeight(100);
                        $('#success-div').show();
                    }
                    else{
                        messageHandler.showJiveErrorMessage("Internal error occurred. Please try again");
                    }
                })
        }
    });

    gadgets.window.adjustHeight();
    gadgets.window.adjustWidth(410);
    $(".block-group .primary-btn").click(displayTargetPlacePicker);
    $(".group .cancel-btn").click(function(){
        osapi.jive.core.container.closeApp();
    });

    $(".import-feature").on('click',".close-btn",function(){
        var groupID = this.closest("li").id;
        _.remove(sourceGroupIDs,function(id){
            return id == groupID;
        });
        $(this).closest("li").remove();
        var len= 10 - sourceGroupIDs.length;
        if(len == 1){
            $(".import-feature .info").text("You can add "+ len +" more group to this import");
        }
        else
            $(".import-feature .info").text("You can add "+ len +" more groups to this import");
        gadgets.window.adjustHeight();
    })
};
var displayRestrictedAccessMessage = function (groupAdmins) {

    $('#currentGroup p').html('<div class="alert alert-warn" role="alert">Only group admins can import members to a group. Please contact following administrator(s).</div>');
    $('#currentGroup p').append("<ul>");
    groupAdmins.list.splice(0,5).forEach(function (user) {
        $('#currentGroup p').append("<li><div class='admins' role='alert'>" + user.person.displayName + "</div></li>")
    });
    $('#currentGroup p').append("</ul>");
    $("#spinner").hide();
    gadgets.window.adjustHeight();
};

var showTemporaryMessage = function(message){
    $("#app-message").show();
    messageHandler.displayErrorMessage(message);
    gadgets.window.adjustHeight();
    setTimeout(function(){
        $("#app-message").hide();
        gadgets.window.adjustHeight();
    },3000);
};

var displayTargetPlacePicker = function () {
    $("#app-message").hide();
    var setTargetPlaceNameAndUrl = function (place) {
        if(sourceGroupIDs.indexOf(place.placeID) != -1){
          showTemporaryMessage("You have already selected this group.");
        }
        jivePromises.hasAccess(place,sourceGroupIDs,currentUserID).then(function(result){
            if(result){
                if(place.placeID == targetGroupID){
                    showTemporaryMessage("The source group can’t be the same as the target group.")
                }
                else{
                    sourceGroupIDs.push(place.placeID);
                    $("ul").append("<li class = 'place' id="+place.placeID+"><span class='import-group-label'>"+place.name+"</span><span class='close-btn'>X</span></li>");
                    var len= 10 - sourceGroupIDs.length;
                    if(len == 0){
                        $(".import-feature .info").text("You can't add any more groups to this import.");
                    }
                    else if(len == 1){
                        $(".import-feature .info").text("You can add "+ len +" more group to this import.");
                    }
                    else
                        $(".import-feature .info").text("You can add "+ len +" more groups to this import.");
                    gadgets.window.adjustHeight();
                }
            }
            else{
                showTemporaryMessage("Access Restricted");
            }
        }).fail(function(errorResponse){

                    messageHandler.showJiveErrorMessage("Error loading DL: " + errorResponse.error.message + " (" + errorResponse.error.code + ")");
        })
    };

    osapi.jive.corev3.search.requestPicker({
        excludeContent : true,
        excludePeople : true,
        success : function(place) {
            setTargetPlaceNameAndUrl(place)

        }
    });
};

$(document).ready(function(){
   init();
});
