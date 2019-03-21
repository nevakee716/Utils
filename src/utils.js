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
                if (
                    typeof cwAPI.customLibs.doActionForSingle[i] === "function"
                ) {
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
                if (
                    typeof cwAPI.customLibs.doActionForIndex[i] === "function"
                ) {
                    cwAPI.customLibs.doActionForIndex[i](rootNode, cwView);
                }
            }
        }
    };

    var parseNode = function(child, callback) {
        for (var associationNode in child) {
            if (
                child.hasOwnProperty(associationNode) &&
                child[associationNode] !== null
            ) {
                for (var i = 0; i < child[associationNode].length; i += 1) {
                    var nextChild = child[associationNode][i];
                    callback(nextChild, associationNode, false);
                }
                if (child[associationNode].length === 0)
                    callback({}, associationNode, true);
            }
        }
    };

    var parseNodeForComplementary = function(child, callback) {
        for (var associationNode in child) {
            if (
                child.hasOwnProperty(associationNode) &&
                child[associationNode] !== null
            ) {
                for (var i = 0; i < child[associationNode].length; i += 1) {
                    var nextChild = child[associationNode][i];
                    callback(nextChild, associationNode, false);
                }
                if (child[associationNode].length === 0)
                    callback({}, associationNode, true);
            }
        }
    };

    var manageHiddenNodes = function(parent, config) {
        var childrenToRemove = [];

        parseNode(parent, function(child, associationNode, empty) {
            if (empty) {
            } else if (config.indexOf(associationNode) !== -1) {
                // jumpAndMerge when hidden
                childrenToRemove.push(associationNode);
                for (var nextassociationNode in child.associations) {
                    if (
                        child.associations.hasOwnProperty(nextassociationNode)
                    ) {
                        if (!parent.hasOwnProperty(nextassociationNode))
                            parent[nextassociationNode] = [];

                        for (
                            var i = 0;
                            i < child.associations[nextassociationNode].length;
                            i += 1
                        ) {
                            var nextChild =
                                child.associations[nextassociationNode][i];
                            parent[nextassociationNode].push(nextChild);
                        }
                    }
                }
            } else {
                manageHiddenNodes(child.associations, config);
            }
        });

        childrenToRemove.forEach(function(c) {
            delete parent[c];
        });
    };

    var manageContextualNodes = function(parent, config, mainID) {
        var childrenToRemove = [];
        var context = true;

        for (let associationNode in parent) {
            if (
                parent.hasOwnProperty(associationNode) &&
                parent[associationNode] !== null && parent[associationNode] !== undefined
            ) {
                let objectToRemove = [];
                let contextualNode = config.indexOf(associationNode) !== -1;
                if (contextualNode) {
                    context = false;
                    childrenToRemove.push(associationNode);
                }

                for (let i = 0; i < parent[associationNode].length; i += 1) {
                    let child = parent[associationNode][i];
                    if (contextualNode && mainID === child.object_id)
                        context = true;
                    if (
                        contextualNode === false &&
                        manageContextualNodes(
                            child.associations,
                            config,
                            mainID
                        ) === false
                    ) {
                        objectToRemove.push(i);
                    }
                }
                for (let i = objectToRemove.length - 1; i >= 0; i -= 1) {
                    delete parent[associationNode].splice(objectToRemove[i], 1);
                }
            }
        }

        childrenToRemove.forEach(function(c) {
            delete parent[c];
        });

        return context;
    };

    var getItemDisplayString = function(view, item) {
        var l,
            getDisplayStringFromLayout = function(layout) {
                return layout.displayProperty.getDisplayString(item);
            };

        if (
            !cwAPI.customLibs.utils.layoutsByNodeId.hasOwnProperty(
                view + "_" + item.nodeID
            )
        ) {
            if (
                cwAPI
                    .getViewsSchemas()
                    [view].NodesByID.hasOwnProperty(item.nodeID)
            ) {
                var layoutOptions = cwAPI.getViewsSchemas()[view].NodesByID[
                    item.nodeID
                ].LayoutOptions;
                cwAPI.customLibs.utils.layoutsByNodeId[
                    view + "_" + item.nodeID
                ] = new cwApi.cwLayouts[item.layoutName](
                    layoutOptions,
                    cwAPI.getViewsSchemas()[view]
                );
            } else {
                return item.name;
            }
        }
        return getDisplayStringFromLayout(
            cwAPI.customLibs.utils.layoutsByNodeId[view + "_" + item.nodeID]
        );
    };

    var copyToClipboard = function(str) {
        const el = document.createElement("textarea");
        el.value = str;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
    };

    var trimCanvas = function(c) {
        var ctx = c.getContext("2d"),
            copy = document.createElement("canvas").getContext("2d"),
            pixels = ctx.getImageData(0, 0, c.width, c.height),
            l = pixels.data.length,
            i,
            bound = {
                top: null,
                left: null,
                right: null,
                bottom: null
            },
            x,
            y;

        // Iterate over every pixel to find the highest
        // and where it ends on every axis ()
        for (i = 0; i < l; i += 4) {
            if (pixels.data[i + 3] !== 0) {
                x = (i / 4) % c.width;
                y = ~~(i / 4 / c.width);

                if (bound.top === null) {
                    bound.top = y;
                }

                if (bound.left === null) {
                    bound.left = x;
                } else if (x < bound.left) {
                    bound.left = x;
                }

                if (bound.right === null) {
                    bound.right = x;
                } else if (bound.right < x) {
                    bound.right = x;
                }

                if (bound.bottom === null) {
                    bound.bottom = y;
                } else if (bound.bottom < y) {
                    bound.bottom = y;
                }
            }
        }
        bound.bottom = bound.bottom * 1.1;
        bound.top = bound.top * 0.9;
        bound.right = bound.right *1.1;
        bound.left = bound.left *0.9;


        // Calculate the height and width of the content
        var trimHeight = bound.bottom - bound.top,
            trimWidth = bound.right - bound.left,
            trimmed = ctx.getImageData(
                bound.left*0.9,
                bound.top*0.9,
                trimWidth*1.2,
                trimHeight*1.2
            );

        copy.canvas.width = trimWidth;
        copy.canvas.height = trimHeight;
        copy.putImageData(trimmed, 0, 0);

        // Return trimmed canvas
        return copy.canvas;
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
    cwAPI.customLibs.utils.version = 1.3;
    cwAPI.customLibs.utils.layoutsByNodeId = {};
    cwAPI.customLibs.utils.getItemDisplayString = getItemDisplayString;
    cwAPI.customLibs.utils.manageHiddenNodes = manageHiddenNodes;
    cwAPI.customLibs.utils.manageContextualNodes = manageContextualNodes;
    cwAPI.customLibs.utils.copyToClipboard = copyToClipboard;
    cwAPI.customLibs.utils.parseNode = parseNode;
    cwAPI.customLibs.utils.trimCanvas = trimCanvas;

})(cwAPI, jQuery);
