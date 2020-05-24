(function (cwApi, $) {
  "use strict";
  // config
  var removeDiagramPopOut = true,
    historyBrowser = true;

  /********************************************************************************
    Custom Action for Single and Index Page : See Impact here http://bit.ly/2qy5bvB
    *********************************************************************************/
  cwCustomerSiteActions.doActionsForSingle_Custom = function (rootNode) {
    var currentView, url, i, cwView;
    currentView = cwAPI.getCurrentView();

    if (currentView) cwView = currentView.cwView;
    for (i in cwAPI.customLibs.doActionForSingle) {
      if (cwAPI.customLibs.doActionForSingle.hasOwnProperty(i)) {
        if (typeof cwAPI.customLibs.doActionForSingle[i] === "function") {
          cwAPI.customLibs.doActionForSingle[i](rootNode, cwView);
        }
      }
    }
  };

  cwCustomerSiteActions.doActionsForIndex_Custom = function (rootNode) {
    var currentView, url, i, cwView;
    currentView = cwAPI.getCurrentView();

    if (currentView) cwView = currentView.cwView;
    for (i in cwAPI.customLibs.doActionForIndex) {
      if (cwAPI.customLibs.doActionForIndex.hasOwnProperty(i)) {
        if (typeof cwAPI.customLibs.doActionForIndex[i] === "function") {
          cwAPI.customLibs.doActionForIndex[i](rootNode, cwView);
        }
      }
    }
  };

  var parseNode = function (child, callback) {
    for (var associationNode in child) {
      if (child.hasOwnProperty(associationNode) && child[associationNode] !== null) {
        for (var i = 0; i < child[associationNode].length; i += 1) {
          var nextChild = child[associationNode][i];
          callback(nextChild, associationNode, false);
        }
        if (child[associationNode].length === 0) callback({}, associationNode, true);
      }
    }
  };

  var parseNodeForComplementary = function (child, callback) {
    for (var associationNode in child) {
      if (child.hasOwnProperty(associationNode) && child[associationNode] !== null) {
        for (var i = 0; i < child[associationNode].length; i += 1) {
          var nextChild = child[associationNode][i];
          callback(nextChild, associationNode, false);
        }
        if (child[associationNode].length === 0) callback({}, associationNode, true);
      }
    }
  };

  var manageHiddenNodes = function (parent, config, bNodeIDOfParent) {
    var childrenToRemove = [],
      childrenToAdd = [],
      idTable = {};

    parseNode(parent, function (child, associationNode, empty) {
      if (empty) {
      } else {
        manageHiddenNodes(child.associations, config, bNodeIDOfParent);
        if (config.indexOf(associationNode) !== -1) {
          // jumpAndMerge when hidden
          childrenToRemove.push(associationNode);
          for (let nextassociationNode in child.associations) {
            if (child.associations.hasOwnProperty(nextassociationNode)) {
              for (let i = 0; i < child.associations[nextassociationNode].length; i += 1) {
                let nextChild = child.associations[nextassociationNode][i];
                if (idTable[associationNode] === undefined) idTable[associationNode] = [];
                if (idTable[associationNode].indexOf(nextChild.objectTypeScriptName + "_" + nextChild.object_id) === -1) {
                  idTable[associationNode].push(nextChild.objectTypeScriptName + "_" + nextChild.object_id);
                  if (bNodeIDOfParent) {
                    let o = {};
                    o.node = associationNode;
                    o.obj = nextChild;
                    childrenToAdd.push(o);
                  } else {
                    if (!parent.hasOwnProperty(nextassociationNode)) parent[nextassociationNode] = [];
                    parent[nextassociationNode].push(nextChild);
                  }
                }
              }
            }
          }
        }
      }
    });

    childrenToRemove.forEach(function (c) {
      delete parent[c];
    });

    childrenToAdd.forEach(function (c) {
      if (parent[c.node] === undefined) parent[c.node] = [];
      parent[c.node].push(c.obj);
    });

    for (let id in parent) {
      if (parent.hasOwnProperty(id)) {
        parent[id].sort(function (a, b) {
          return a.name.localeCompare(b.name);
        });
      }
    }
  };

  var cleanEmptyNodes = function (parent, config) {
    var hasData = true;
    if (config.indexOf(parent.nodeID) !== -1) hasData = false;
    for (let associationNode in parent.associations) {
      if (
        parent.associations.hasOwnProperty(associationNode) &&
        parent.associations[associationNode] !== null &&
        parent.associations[associationNode] !== undefined
      ) {
        let objectToRemove = [];

        for (let i = 0; i < parent.associations[associationNode].length; i += 1) {
          let child = parent.associations[associationNode][i];
          if (cleanEmptyNodes(child, config) === false) {
            objectToRemove.push(i);
          }
        }

        for (let i = objectToRemove.length - 1; i >= 0; i -= 1) {
          delete parent.associations[associationNode].splice(objectToRemove[i], 1);
        }

        if (config.indexOf(parent.nodeID) !== -1 && !hasData) hasData = parent.associations[associationNode].length > 0;
      }
    }

    return hasData;
  };

  var manageContextualNodes = function (parent, config, mainID) {
    var childrenToRemove = [];

    // we check if there is at least one contextual node, then put context to false
    var context = !Object.keys(parent).some(function (assNode) {
      return config.indexOf(assNode) !== -1;
    });

    for (let associationNode in parent) {
      if (parent.hasOwnProperty(associationNode) && parent[associationNode] !== null && parent[associationNode] !== undefined) {
        let objectToRemove = [];
        let contextualNode = config.indexOf(associationNode) !== -1;
        // we self delete if we are a contextual node
        if (contextualNode) {
          childrenToRemove.push(associationNode);
        }

        for (let i = 0; i < parent[associationNode].length; i += 1) {
          let child = parent[associationNode][i];
          if (contextualNode && mainID === child.object_id) context = true; // the main object is present inside the node; so we keep the parent node
          if (contextualNode === false && manageContextualNodes(child.associations, config, mainID) === false) {
            objectToRemove.push(i);
          }
        }
        for (let i = objectToRemove.length - 1; i >= 0; i -= 1) {
          delete parent[associationNode].splice(objectToRemove[i], 1);
        }
      }
    }

    // we remove the association used for contextual information
    childrenToRemove.forEach(function (c) {
      delete parent[c];
    });

    return context;
  };

  var manageFilterByBaseObjectNodes = function (parent, config, mainID) {
    for (let associationNode in parent) {
      if (parent.hasOwnProperty(associationNode) && parent[associationNode] !== null && parent[associationNode] !== undefined) {
        let objectToRemove = [];
        let contextualNode = config.indexOf(associationNode) !== -1;

        for (let i = 0; i < parent[associationNode].length; i += 1) {
          let child = parent[associationNode][i];
          manageFilterByBaseObjectNodes(child.associations, config, mainID);
          if (contextualNode === true && child.object_id !== mainID) {
            objectToRemove.push(i);
          }
        }
        for (let i = objectToRemove.length - 1; i >= 0; i -= 1) {
          delete parent[associationNode].splice(objectToRemove[i], 1);
        }
      }
    }
  };

  var getItemDisplayString = function (view, item) {
    if (!cwAPI.customLibs.utils.layoutsByNodeId.hasOwnProperty(view + "_" + item.nodeID)) {
      if (cwAPI.getViewsSchemas()[view].NodesByID.hasOwnProperty(item.nodeID) && cwAPI.getViewsSchemas()[view].NodesByID[item.nodeID].LayoutOptions) {
        var cds = cwAPI.getViewsSchemas()[view].NodesByID[item.nodeID].LayoutOptions.DisplayPropertyScriptName;
        return cwAPI.customLibs.utils.getCustomDisplayString(cds, item);
      }
    }
    return item.name;
  };

  var getCustomDisplayString = function (cds, item, nodeID, hasTooltip) {
    var itemDisplayName, titleOnMouseOver, link, itemLabel, markedForDeletion, linkTag, linkEndTag;
    var popOutEnableByDefault = true,
      defaultIcon = "fa fa-external-link";
    let config = cwAPI.customLibs.utils.getCustomLayoutConfiguration("cdsEnhanced");
    if (config) {
      popOutEnableByDefault = config.displayPopoutByDefault;
      if (config.defaultIcon) defaultIcon = config.defaultIcon;
    }
    // use the display property scriptname
    var p = new cwApi.CwDisplayProperties(cds, false);
    itemLabel = p.getDisplayString(item);
    link = cwApi.getSingleViewHash(item.objectTypeScriptName, item.object_id);
    titleOnMouseOver =
      hasTooltip && !cwApi.isUndefined(item.properties.description)
        ? cwApi.cwEditProperties.cwEditPropertyMemo.isHTMLContent(item.properties.description)
          ? $(item.properties.description).text()
          : item.properties.description
        : "";

    markedForDeletion = cwApi.isObjectMarkedForDeletion(item) ? " markedForDeletion" : "";

    linkTag = "<a class='" + nodeID + markedForDeletion + "' href='" + link + "'>";
    linkEndTag = "</a>";
    if (itemLabel.indexOf("<@") !== -1 && itemLabel.indexOf("\\<@") === -1) {
      let info = itemLabel.split("<@")[1].split("@>")[0];
      if (info.split("@")[0] === "contrib" && cwApi.cwUser.isCurrentUserSocial()) {
        itemDisplayName = itemLabel.replace(/<@.*@>/g, "");
      } else {
        itemDisplayName = itemLabel.replace(/<@[contrib@]*/g, linkTag).replace(/@>/g, linkEndTag);
      }
    } else {
      itemDisplayName = linkTag + itemLabel + linkEndTag;
    }
    if (cwApi.cwLayouts.CwLayout.prototype.getEnhancedDisplayItem) {
      itemDisplayName = cwApi.cwLayouts.CwLayout.prototype.getEnhancedDisplayItem(config, itemDisplayName, item);
    }
    itemDisplayName = '<a class="obj" >' + itemDisplayName + "</a>";

    $("span").attr("data-children-number");

    return itemDisplayName;
  };

  var copyToClipboard = function (str) {
    const el = document.createElement("textarea");
    el.value = str;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  };

  var trimCanvas = function (c) {
    var ctx = c.getContext("2d"),
      copy = document.createElement("canvas").getContext("2d"),
      pixels = ctx.getImageData(0, 0, c.width, c.height),
      l = pixels.data.length,
      i,
      bound = {
        top: null,
        left: null,
        right: null,
        bottom: null,
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
    bound.right = bound.right * 1.1;
    bound.left = bound.left * 0.9;

    // Calculate the height and width of the content
    var trimHeight = bound.bottom - bound.top,
      trimWidth = bound.right - bound.left,
      trimmed = ctx.getImageData(bound.left * 0.9, bound.top * 0.9, trimWidth * 1.2, trimHeight * 1.2);

    copy.canvas.width = trimWidth;
    copy.canvas.height = trimHeight;
    copy.putImageData(trimmed, 0, 0);

    // Return trimmed canvas
    return copy.canvas;
  };

  var getPaletteShape = function (obj, diagramTemplate, errors) {
    let palette;
    if (
      obj &&
      obj.properties.type_id &&
      diagramTemplate.diagram.paletteEntries[obj.objectTypeScriptName.toUpperCase() + "|" + obj.properties.type_id]
    ) {
      palette = diagramTemplate.diagram.paletteEntries[obj.objectTypeScriptName.toUpperCase() + "|" + obj.properties.type_id];
    } else if (obj && diagramTemplate.diagram.paletteEntries[obj.objectTypeScriptName.toUpperCase() + "|0"]) {
      palette = diagramTemplate.diagram.paletteEntries[obj.objectTypeScriptName.toUpperCase() + "|0"];
    } else {
      if (obj && obj.properties.type === undefined) {
        if (undefined === errors.properties) {
          errors.properties = {};
        }
        errors.properties.type = cwAPI.mm.getProperty(obj.objectTypeScriptName, "type").name;
      }
    }
    return palette;
  };

  var shapeToImage = function (obj, diagramTemplate, errors, size) {
    console.log("Drawing " + obj.name + " with " + diagramTemplate.name);
    if (errors === undefined) errors = {};
    var self = this;
    let palette;

    if (obj && diagramTemplate) {
      palette = getPaletteShape(obj, diagramTemplate, errors);
      if (palette) {
        var shape = {};

        palette.Regions.forEach(function (region) {
          if (region.RegionType >= 3 && region.RegionType < 8 && !obj.properties.hasOwnProperty(region.SourcePropertyTypeScriptName)) {
            if (undefined === errors.properties) {
              errors.properties = {};
            }
            errors.properties[region.SourcePropertyTypeScriptName] = cwAPI.mm.getProperty(
              obj.objectTypeScriptName,
              region.SourcePropertyTypeScriptName
            ).name;
          }
          if (region.RegionType < 3 && region.RegionData && !obj.associations.hasOwnProperty(region.RegionData.Key)) {
            if (undefined === errors.associations) {
              errors.associations = {};
            }
            errors.associations[region.RegionData.Key] =
              region.RegionData.AssociationTypeScriptName + " => " + cwAPI.mm.getObjectType(region.RegionData.TargetObjectTypeScriptName).name;
          }
        });

        shape.H = palette.Height * 4; // çorrespondance pixel taille modeler
        shape.W = palette.Width * 4;
        size.Width = palette.Width;
        size.Height = palette.Height;
        //node.size = (2 * 35 * palette.Height) / 32;
        var qualityFactor = 3;

        var canvas = document.createElement("canvas");
        var ctx = canvas.getContext("2d");
        canvas.id = "gImage";

        // avoid to big canva
        if (qualityFactor * Math.max(shape.W, shape.H) * 3 > 1000) qualityFactor = 1000 / Math.max(shape.W, shape.H) / 3;
        // taking margin for region outside of the shape, 100% each side
        canvas.width = qualityFactor * shape.W * 3;
        canvas.height = qualityFactor * shape.H * 3;

        shape.X = canvas.width / 2 / qualityFactor - shape.W / 2;
        shape.Y = canvas.height / 2 / qualityFactor - shape.H / 2;

        shape.cwObject = obj;
        ctx.scale(qualityFactor, qualityFactor);

        var diagC = {};
        diagC.objectTypesStyles = diagramTemplate.diagram.paletteEntries;
        diagC.json = {};
        diagC.json.diagram = {};
        diagC.json.diagram.Style = palette.Style;
        diagC.json.diagram.symbols = diagramTemplate.diagram.symbols;
        diagC.camera = {};
        diagC.camera.scale = 1;
        diagC.ctx = ctx;
        diagC.ctx.font = "10px sans-serif";
        diagC.CorporateModelerDiagramScale = 1;
        diagC.loop = 0;
        diagC.pictureGalleryLoader = new cwApi.CwPictureGalleryLoader.Loader(diagC);

        diagC.loadRegionExplosionWithRuleAndRefProp = function () {
          if (errors.explosionRegion !== true) {
            console.log("Explosion Region are not Supported Yet");
            errors.explosionRegion = true;
          }
        };
        diagC.getNavigationDiagramsForObject = function () {
          if (errors.navigationRegion !== true) {
            console.log("Navigation Region are not Supported Yet");
            errors.navigationRegion = true;
          }
        };
        diagC.getDiagramPopoutForShape = function () {};
        var shapeObj = new cwApi.Diagrams.CwDiagramShape(shape, palette, diagC);

        shapeObj.draw(ctx);
        let img = cwAPI.customLibs.utils.trimCanvas(canvas).toDataURL();
        return img;
      }
    }
  };

  var setLayoutToPercentHeight = function (elementHTML, percent) {
    // set height
    var titleReact = document.querySelector("#cw-top-bar").getBoundingClientRect();
    var topBarReact = document.querySelector(".page-top").getBoundingClientRect();
    var canvaHeight = ((window.innerHeight - titleReact.height - topBarReact.height) * percent) / 100;
    elementHTML.setAttribute("style", "height:" + canvaHeight + "px");
  };

  var getCustomLayoutConfiguration = function (configName) {
    let localConfiguration = localStorage.getItem(cwApi.getSiteId() + "_" + cwApi.getDeployNumber() + "_coffeeMakerConfiguration");

    if (localConfiguration) {
      try {
        cwApi.customLibs.utils.customLayoutConfiguration = JSON.parse(localConfiguration);
      } catch (e) {
        return null;
      }
    } else if (cwApi.customLibs.utils.customLayoutConfiguration === undefined) {
      let view = cwAPI.ViewSchemaManager.getPageSchema("z_custom_layout_configuration");
      if (view) {
        try {
          cwApi.customLibs.utils.customLayoutConfiguration = JSON.parse(view.NodesByID[view.RootNodesId].LayoutOptions.CustomOptions.config);
        } catch (e) {
          return null;
        }
      } else {
        return null;
      }
    }
    if (configName === undefined) return cwApi.customLibs.utils.customLayoutConfiguration;
    else return cwApi.customLibs.utils.customLayoutConfiguration[configName];
  };

  var setupWebSocketForSocial = function (callback) {
    cwApi.CwWebSocketConnection = null;

    cwApi.CwAsyncLoader.load("signalR", function () {
      var h = $.connection.cwEvolveHub,
        dataServicesHub = $.connection.cwEvolveDataServices,
        $connection,
        mConnectionSlow,
        mReconnecting,
        mDisconnected,
        mStateChange;

      if (cwApi.isUndefined($.connection)) {
        return callback && callback(null);
      }
      if (cwApi.signalRSeverPath !== undefined) {
        $.connection.hub.url = cwApi.signalRSeverPath;
      }

      cwApi.CwDiagramEditorLoader.info("start initialization of the ws connection...");
      h.client.updateUsersCount = function (users) {
        cwApi.CwDiagramEditorLoader.info("updateUsersCount (cwEvolveHub)", users);
      };
      cwApi.isWebSocketConnected = false;

      cwApi.CwDataServicesApi = new cwApi.CwBoomerang(dataServicesHub, cwApi.getSiteId(), ["flatQuery"], false);
      cwApi.CwDataServicesApi.registerWebSockets();

      cwApi.pluginManager.execute("CwBone.RegisterWebSockets");

      mConnectionSlow = function () {
        cwApi.Log.Info("web socket connection is slow...");
      };
      mReconnecting = function () {
        if (!cwApi.isUndefinedOrNull(cwApi.cwEModeler.CwDiagramEditor)) {
          cwApi.cwEModeler.CwDiagramEditorHelperStatic.updateConnectionStatus(false);
        }
        cwApi.Log.Info("web socket connection try reconnecting...");
      };

      mDisconnected = function () {
        cwApi.Log.Info("web socket has been disconnected...");
      };

      mStateChange = function (change) {
        cwApi.Log.Info(cwApi.format("web socket has been changed to {0}...", change.newState));
        cwApi.isWebSocketConnected = change.newState === $.signalR.connectionState.connected;

        // Check if Diagram Editor module is loaded
        if (!cwApi.isUndefined(cwApi.cwEModeler.CwDiagramEditorHelperStatic)) {
          cwApi.cwEModeler.CwDiagramEditorHelperStatic.updateConnectionStatus(cwApi.isWebSocketConnected);
        }
      };

      // unbind the events, if the user log off / login
      $connection = $($.connection.hub);
      $connection.unbind("onConnectionSlow");
      $connection.unbind("onReconnecting");
      $connection.unbind("onDisconnect");
      $connection.unbind("onStateChanged");

      $.connection.hub.connectionSlow(mConnectionSlow);
      $.connection.hub.reconnecting(mReconnecting);
      $.connection.hub.disconnected(mDisconnected);
      $.connection.hub.stateChanged(mStateChange);

      $.connection.hub.start(cwApi.getWebSocketOptions()).done(function () {
        if (!cwApi.isUndefinedOrNull(cwApi.cwEModeler.CwDiagramEditor)) {
          cwApi.cwEModeler.CwDiagramEditorHelperStatic.updateConnectionStatus(true);
        }
        cwApi.CwDiagramEditorLoader.info("connection done");
        h.server.hello();
        cwApi.CwWebSocketConnection = true;
        return callback && callback(null);
      });
    });
  };

  var createPopOutFormultipleObjects = function (objects) {
    var that, o, $div, $ul, i;
    if (objects.length === 0) return;
    cwApi.CwPopout.show(cwApi.mm.getObjectType(objects[0].objectTypeScriptName).pluralName);
    cwApi.CwPopout.onClose(function () {
      cwApi.unfreeze();
    });

    let popOutName = cwApi.replaceSpecialCharacters(objects[0].objectTypeScriptName) + "_diagram_popout";
    let popoutExist = cwAPI.ViewSchemaManager.pageExists(popOutName);
    //function outputImage($li, explodedDiagram) {
    //    var image = new Image();
    //    const random = cwApi.getRandomNumber();
    //    image.src = cwApi.getSiteMediaPath() + 'images/diagrams/diagram' + explodedDiagram.object_id + '.png?' + random;
    //    image.onload = function () {
    //        $li.children().first().before('<img class="cwMiniImageDiagramPreview" src="' + image.src + '"/>');
    //    };
    //}
    o = [];
    that = this;
    o.push('<form action="#" class="form-select">');
    o.push('<div class="cwDiagramExplosionMultipleChoice"><ul>');
    o.push("</ul></div>");
    o.push("</form>");
    $div = $(o.join(""));
    cwApi.CwPopout.setContent($div);

    function createDialog(obj) {
      var miniO = [],
        $li;
      miniO.push("<li>");
      if (cwAPI.customLibs && cwAPI.customLibs.utils && cwAPI.customLibs.utils.getCustomDisplayString) {
        let cds = "{name}";
        if (obj.properties.hasOwnProperty("displayname")) cds = "{displayname}";
        miniO.push(cwAPI.customLibs.utils.getCustomDisplayString(cds, obj));
        $li = $(miniO.join(""));
      } else {
        miniO.push("<div>", obj.name, "</div>", "</li>");
        $li = $(miniO.join(""));
        if (popoutExist) {
          $li.click(function () {
            cwAPI.cwDiagramPopoutHelper.openDiagramPopout(obj, popOutName);
          });
        }
      }

      $ul.append($li);
    }

    $ul = $div.find("ul").first();
    for (i = 0; i < objects.length; i += 1) {
      createDialog(objects[i]);
    }
  };

  var cwFilter = function () {
    this.filters = [];
  };

  cwFilter.prototype.initWithString = function (configString) {
    this.filters = configString.split("#").map(function (fString) {
      let split = fString.split(":");
      return {
        Asset: split[0],
        Operator: split.length > 1 ? split[1] : ">",
        Value: split.length > 1 ? split[2] : 0,
      };
    });
  };

  cwFilter.prototype.init = function (filters) {
    this.filters = filters;
  };

  cwFilter.prototype.addFilter = function (filter) {
    this.filters.push(filters);
  };

  cwFilter.prototype.isMatching = function (item) {
    let isActionToDo = true;
    var self = this;
    if (item) {
      return this.filters.every(function (filter) {
        return self.matchFilter(item, filter);
      });
    }
  };

  cwFilter.prototype.matchFilter = function (item, filter) {
    let objPropertyValue, value;
    // contributor
    if (filter.Asset === "contrib") {
      return !cwApi.cwUser.isCurrentUserSocial();
    } else if (item.associations.hasOwnProperty(filter.Asset)) {
      //associations
      objPropertyValue = item.associations[filter.Asset].length;
      value = filter.Value;
    } else if (item.properties.hasOwnProperty(filter.Asset)) {
      let propertyType = cwApi.mm.getProperty(item.objectTypeScriptName, filter.Asset);
      value = filter.Value;
      if (filter.Asset === "id") {
        // changing id to make usable like other property
        objPropertyValue = item.object_id;
      } else if (propertyType.type === "Lookup") {
        objPropertyValue = item.properties[filter.Asset + "_id"];
      } else if (propertyType.type === "Date") {
        objPropertyValue = new Date(item.properties[filter.Asset]);
        objPropertyValue = objPropertyValue.getTime();
        let d = filter.Value;
        if (d.indexOf("{@currentDate}") !== -1) {
          d = d.split("-");
          let dateOffset = 24 * 60 * 60 * 1000 * parseInt(d[1]);
          let today = new Date();
          value = today.getTime() - dateOffset;
        } else {
          d = new Date(d);
          value = d.getTime();
        }
      } else {
        objPropertyValue = item.properties[filter.Asset];
      }
    } else return;

    switch (filter.Operator) {
      case "=":
        return objPropertyValue == value;
      case "<":
        return objPropertyValue < value;
      case ">":
        return objPropertyValue > value;
      case "!=":
        return objPropertyValue != value;
      case "In":
        return value.indexOf(objPropertyValue) !== -1;
      default:
        return false;
    }
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
  cwAPI.customLibs.utils.version = 2.2;
  cwAPI.customLibs.utils.layoutsByNodeId = {};
  cwAPI.customLibs.utils.getItemDisplayString = getItemDisplayString;
  cwAPI.customLibs.utils.manageHiddenNodes = manageHiddenNodes;
  cwAPI.customLibs.utils.manageContextualNodes = manageContextualNodes;
  cwAPI.customLibs.utils.manageFilterByBaseObjectNodes = manageFilterByBaseObjectNodes;

  cwAPI.customLibs.utils.cleanEmptyNodes = cleanEmptyNodes;
  cwAPI.customLibs.utils.copyToClipboard = copyToClipboard;
  cwAPI.customLibs.utils.parseNode = parseNode;
  cwAPI.customLibs.utils.trimCanvas = trimCanvas;
  cwAPI.customLibs.utils.shapeToImage = shapeToImage;
  cwAPI.customLibs.utils.getPaletteShape = getPaletteShape;
  cwAPI.customLibs.utils.setLayoutToPercentHeight = setLayoutToPercentHeight;
  cwAPI.customLibs.utils.getCustomDisplayString = getCustomDisplayString;
  cwAPI.customLibs.utils.getCustomLayoutConfiguration = getCustomLayoutConfiguration;
  cwAPI.customLibs.utils.setupWebSocketForSocial = setupWebSocketForSocial;
  cwAPI.customLibs.utils.cwFilter = cwFilter;
  cwAPI.customLibs.utils.createPopOutFormultipleObjects = createPopOutFormultipleObjects;
})(cwAPI, jQuery);
