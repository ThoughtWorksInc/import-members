var req = require(process.cwd() + '/require-from-app-root').req;
var importMembers = req('services/import_members').importMembers;
var group = req('services/group');
var R = require('ramda');
var failureTemplate = process.cwd() + "/templates/MergeMembersFailureEmailTemplate.ejs";
var successTemplate = process.cwd() + "/templates/MergeMembersSuccessEmailTemplate.ejs";

module.exports = function (app) {
    app.post('/importMembers', function (req, res) {
        res.writeHead(200);
        res.end();
        var sourceGroupIDs = req.body.sourceGroupIDs;
        var currentUserName = req.body.currentUserName;
        var targetGroup = req.body.targetGroup;
        var selectedStreams = req.body.selectedStreams;
        var subject = "Import members task completion status";

        var mailInfo = {
            groupUrl : targetGroup.resources.html.ref,
            targetGroupName : targetGroup.name,
            currentUserName :currentUserName,
            subject : subject
        };
        importMembers(sourceGroupIDs, targetGroup.placeID, selectedStreams)
            .then(function (resultsImportMembers) {
                var failureResult = R.filter(function(result){
                    return !result.success;
                }, resultsImportMembers);
                if(failureResult.length > 0){
                    group.sendMessage(mailInfo, failureTemplate, failureResult);
                }else{
                    group.sendMessage(mailInfo, successTemplate);
                }

            }, function (err) {
                group.sendMessage(mailInfo, failureTemplate, {members: [], content: []});
            })
    });

}