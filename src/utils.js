(function(cwApi, $) {
    "use strict";
    // config
    var removeDiagramPopOut = true,
        historyBrowser = true;



    /********************************************************************************
    Custom Action for Single and Index Page : See Impact here http://bit.ly/2qy5bvB
    *********************************************************************************/
    cwCustomerSiteActions.doActionsForSingle_Custom = function(rootNode) {
        var currentView, url, i, cwView;
        currentView = cwAPI.getCurrentView();

        if (currentView) cwView = currentView.cwView;
        for (i in cwAPI.customLibs.doActionForSingle) {
            if (cwAPI.customLibs.doActionForSingle.hasOwnProperty(i)) {
                if (typeof(cwAPI.customLibs.doActionForSingle[i]) === "function") {
                    cwAPI.customLibs.doActionForSingle[i](rootNode, cwView);
                }
            }
        }
    };

    cwCustomerSiteActions.doActionsForIndex_Custom = function(rootNode) {
        var currentView, url, i, cwView;
        currentView = cwAPI.getCurrentView();

        if (currentView) cwView = currentView.cwView;
        for (i in cwAPI.customLibs.doActionForIndex) {
            if (cwAPI.customLibs.doActionForIndex.hasOwnProperty(i)) {
                if (typeof(cwAPI.customLibs.doActionForIndex[i]) === "function") {
                    cwAPI.customLibs.doActionForIndex[i](rootNode, cwView);
                }
            }
        }
    };

    var parseNode = function(child, callback) {
        for (var associationNode in child) {
            if (child.hasOwnProperty(associationNode) && child[associationNode] !== null) {
                for (var i = 0; i < child[associationNode].length; i += 1) {
                    var nextChild = child[associationNode][i];
                    callback(nextChild, associationNode,false);
                }
                if(child[associationNode].length === 0) callback({},associationNode,true);
            }
        }
    };

    var parseNodeForComplementary = function(child, callback) {
        for (var associationNode in child) {
            if (child.hasOwnProperty(associationNode) && child[associationNode] !== null) {
                for (var i = 0; i < child[associationNode].length; i += 1) {
                    var nextChild = child[associationNode][i];
                    callback(nextChild, associationNode,false);
                }
                if(child[associationNode].length === 0) callback({},associationNode,true);
            }
        }
    };

    var manageHiddenNodes = function(parent,config) {
        var childrenToRemove = [];

        parseNode(parent, function(child, associationNode,empty) {
            if(empty) {}
            else if (config.indexOf(associationNode) !== -1) { // jumpAndMerge when hidden
                childrenToRemove.push(associationNode);
                for (var nextassociationNode in child.associations) {
                    if (child.associations.hasOwnProperty(nextassociationNode)) {
                        if (!parent.hasOwnProperty(nextassociationNode)) parent[nextassociationNode] = [];

                        for (var i = 0; i < child.associations[nextassociationNode].length; i += 1) {
                            var nextChild = child.associations[nextassociationNode][i];
                            parent[nextassociationNode].push(nextChild);
                        }
                    }
                }
            } else {
                manageHiddenNodes(child.associations,config);
            }
        });

        childrenToRemove.forEach(function(c) {
            delete parent[c];
        });
    };


    var manageContextualNodes = function(parent,config,mainID) {
        var childrenToRemove = [];
        var context = true;

        for (let associationNode in parent) {
            if (parent.hasOwnProperty(associationNode) && parent[associationNode] !== null) {
                let objectToRemove = [];
                let contextualNode = (config.indexOf(associationNode) !== -1);
                if (contextualNode) {
                    context = false;
                    childrenToRemove.push(associationNode);
                }

                for (let i = 0; i < parent[associationNode].length; i += 1) {
                    let child = parent[associationNode][i];
                    if(contextualNode && mainID === child.object_id) context = true;
                    if(contextualNode === false && manageContextualNodes(child.associations,config,mainID) === false) {
                        objectToRemove.push(i);
                    }
                }
                for (let i = objectToRemove.length-1; i >= 0; i -= 1) {
                    delete parent[associationNode].splice(objectToRemove[i], 1);
                }
            }
        }

        childrenToRemove.forEach(function(c) {
            delete parent[c];
        });

        return context;
    };


    var getItemDisplayString = function(view,item){
        var l, getDisplayStringFromLayout = function(layout){
            return layout.displayProperty.getDisplayString(item);
        };

        if (!cwAPI.customLibs.utils.layoutsByNodeId.hasOwnProperty(view + "_" + item.nodeID)){
            if (cwAPI.getViewsSchemas()[view].NodesByID.hasOwnProperty(item.nodeID)){
                var layoutOptions = cwAPI.getViewsSchemas()[view].NodesByID[item.nodeID].LayoutOptions;
                cwAPI.customLibs.utils.layoutsByNodeId[view + "_" + item.nodeID] = new cwApi.cwLayouts[item.layoutName](layoutOptions, cwAPI.getViewsSchemas()[view]);
            } else {
                return item.name;
            }
        }
        return getDisplayStringFromLayout(cwAPI.customLibs.utils.layoutsByNodeId[view + "_" + item.nodeID]);
    };



    /********************************************************************************
    Configs : add trigger for single page
    *********************************************************************************/
    if (cwAPI.customLibs === undefined) {
        cwAPI.customLibs = {};
    }
    if (cwAPI.customLibs.doActionForSingle === undefined) {
        cwAPI.customLibs.doActionForSingle = {};
    }
    if (cwAPI.customLibs.doActionForIndex === undefined) {
        cwAPI.customLibs.doActionForIndex = {};
    }
    if (cwAPI.customLibs.utils === undefined) {
        cwAPI.customLibs.utils = {};

    }
    cwAPI.customLibs.utils.layoutsByNodeId = {};
    cwAPI.customLibs.utils.getItemDisplayString = getItemDisplayString;
    cwAPI.customLibs.utils.manageHiddenNodes = manageHiddenNodes;
    cwAPI.customLibs.utils.manageContextualNodes = manageContextualNodes;

}(cwAPI, jQuery));